import * as Cesium from '@cesium/engine';
import {
    Math as CesiumMath,
    Color,
    CullFace,
    DataSource,
    DepthFunction,
    Geometry,
    GeometryInstance,
    GeometryPipeline,
    JulianDate,
    PolygonGeometry,
    Rectangle,
    RectangleGeometry,
    Resource,
    defined,
    destroyObject,
} from '@cesium/engine';
import type {DrawCommand} from 'cesium';

/**
 * Configurable water-material parameters used by {@link WaterPrimitive}.
 *
 * @remarks
 * The values are forwarded to the custom GLSL fragment shader through the
 * draw-command uniform map.
 */
export interface WaterShaderOptions {
    baseWaterColor: Color;
    frequency: number;
    animationSpeed: number;
    amplitude: number;
    specularIntensity: number;
    fadeFactor: number;
    normalMapUrl: string;
    show: boolean;
}

/**
 * Construction options for {@link WaterPrimitive}.
 */
export interface WaterPrimitiveConstructorOptions extends WaterShaderOptions {
    geometry: GeometryInstance | GeometryInstance[];
    height?: number;
}

/**
 * Cesium frame-state members required by {@link WaterPrimitive}.
 *
 * @remarks
 * Cesium provides this object internally to primitives through `update()`.
 * It is deliberately modeled narrowly here instead of using `any`.
 */
interface WaterFrameState {
    context: unknown;
    commandList: DrawCommand[];
}

/**
 * Custom Cesium water-surface primitive rendered with a normal-map-based GLSL
 * material.
 *
 * @remarks
 * This class follows Cesium's custom primitive contract:
 *
 * - Cesium invokes {@link update} during rendering.
 * - The primitive lazily loads its normal map.
 * - Geometry is baked and combined into a GPU vertex array.
 * - A custom shader program and draw command are created once.
 * - The cached draw command is submitted on subsequent frames.
 *
 * The primitive uses low-level Cesium renderer APIs including `DrawCommand`,
 * `ShaderProgram`, `RenderState`, `Texture`, and `VertexArray`. These APIs are
 * not part of Cesium's most stable public surface and should be retested after
 * Cesium upgrades.
 *
 * @example
 * ```ts
 * const water = WaterPrimitive.fromRectangle({
 *   rectangle: Rectangle.fromDegrees(6.9, 51.4, 7.0, 51.5),
 *   height: 10,
 *   options: {
 *     ...WaterPrimitive.DefaultOptions(),
 *     show: true,
 *     baseWaterColor: new Color(0.13, 0.34, 0.48, 0.75),
 *   },
 * });
 *
 * viewer.scene.primitives.add(water);
 * ```
 */
export class WaterPrimitive {
    private _geometry: GeometryInstance[];
    //@ts-ignore
    private _drawCommand?: Cesium.DrawCommand;
    private _normalMapUrl: string;
    //@ts-ignore
    private _normalMapTexture?: Cesium.Texture;
    private _height: number;
    private _textureLoading: boolean;

    public baseWaterColor: Color;
    public frequency: number;
    public animationSpeed: number;
    public amplitude: number;
    public specularIntensity: number;
    public fadeFactor: number;

    public show: boolean;

    static DefaultOptions(): WaterShaderOptions {
        return {
            baseWaterColor: new Color(0.13, 0.34, 0.48),
            frequency: 5000.0,
            animationSpeed: 0.0025,
            amplitude: 150.0,
            specularIntensity: 0.43,
            fadeFactor: 1.0,
            normalMapUrl: './images/common/waterNormals.jpg',
            show: false,
        };
    }

    /**
     * Creates a water primitive from polygon entities in a Cesium data source.
     *
     * @param dataSource - Data source whose polygon entities define water areas.
     * @param options - Optional water shader overrides.
     * @returns Water primitive containing one geometry instance per valid polygon.
     *
     * @remarks
     * Only entities with `polygon` graphics are used. Polygon hierarchy is
     * evaluated at the current Cesium time, and geometry is configured with
     * `perPositionHeight: true` to preserve source vertex heights.
     *
     * Entities with an unresolved polygon hierarchy should be skipped explicitly
     * if dynamic or incomplete polygon properties are expected.
     */
    static fromDatasource(
        dataSource: DataSource,
        options?: WaterShaderOptions,
    ) {
        const instances = dataSource.entities.values.flatMap(entity => {
            const hierarchy = entity.polygon?.hierarchy?.getValue(
                JulianDate.now(),
            );

            if (!hierarchy) {
                return [];
            }

            return [
                new GeometryInstance({
                    geometry: new PolygonGeometry({
                        polygonHierarchy: hierarchy,
                        perPositionHeight: true,
                    }),
                }),
            ];
        });

        return new WaterPrimitive({
            ...WaterPrimitive.DefaultOptions(),
            ...options,
            geometry: instances,
        });
    }

    /**
     * Creates a water primitive covering a geographic rectangle.
     *
     * @param options - Rectangle and shader configuration.
     * @param options.rectangle - Geographic rectangle covered by the water.
     * @param options.granularity - Angular spacing between generated vertices.
     * @param options.height - Height offset applied by the vertex shader.
     * @param options.options - Water shader-option overrides.
     * @returns Configured water primitive.
     */
    static fromRectangle({
        rectangle,
        granularity = CesiumMath.RADIANS_PER_DEGREE / 100,
        height = 0,
        options,
    }: {
        rectangle: Rectangle;
        granularity: number;
        height: number;
        options?: Partial<WaterShaderOptions>;
    }) {
        return new WaterPrimitive({
            ...WaterPrimitive.DefaultOptions(),
            ...options,
            geometry: new GeometryInstance({
                geometry: new RectangleGeometry({
                    rectangle: rectangle,
                    granularity: granularity,
                }),
            }),
            height,
        });
    }

    /**
     * Creates a water primitive from source geometry and shader parameters.
     *
     * @param options - Geometry, surface height, and shader configuration.
     */
    constructor(options: WaterPrimitiveConstructorOptions) {
        const defaults = WaterPrimitive.DefaultOptions();

        this._geometry = Array.isArray(options.geometry)
            ? options.geometry
            : [options.geometry];

        this._textureLoading = false;
        this.show = options.show ?? true;

        this._height = options.height ?? 0;

        this.baseWaterColor = options.baseWaterColor ?? defaults.baseWaterColor;

        this.frequency = options.frequency ?? defaults.frequency;
        this.animationSpeed = options.animationSpeed ?? defaults.animationSpeed;
        this.amplitude = options.amplitude ?? defaults.amplitude;
        this.specularIntensity =
            options.specularIntensity ?? defaults.specularIntensity;
        this.fadeFactor = options.fadeFactor ?? defaults.fadeFactor;
        this._normalMapUrl = options.normalMapUrl || defaults.normalMapUrl;
    }

    /**
     * Submits the water draw command during Cesium's primitive update phase.
     *
     * @param frameState - Cesium rendering state for the current frame.
     *
     * @remarks
     * The normal map and draw command are initialized lazily. No command is
     * submitted until the normal map has been decoded and uploaded to the GPU.
     */
    update(frameState: WaterFrameState): void {
        if (!this.show || this._textureLoading) return;

        if (!this._normalMapTexture && !this._textureLoading) {
            this._textureLoading = true;
            this._loadNormalMap(this._normalMapUrl, frameState.context);
            return;
        }

        if (!this._normalMapTexture) {
            return;
        }

        if (defined(this._drawCommand)) {
            frameState.commandList.push(this._drawCommand);
            return;
        }

        this._createDrawCommand(frameState);
    }

    destroy() {
        return destroyObject(this);
    }

    isDestroyed() {
        return false;
    }

    /**
     * Fetches the water normal map and uploads it as a Cesium GPU texture.
     *
     * @param url - Normal-map image URL.
     * @param context - Cesium rendering context used to create the texture.
     *
     * @remarks
     * Failure to fetch or decode the normal map currently leaves
     * `_textureLoading` set to `true`, which permanently suppresses rendering.
     * A `try`/`catch`/`finally` block should reset this flag and surface the
     * failure appropriately.
     */
    _loadNormalMap(url: string, context: unknown) {
        const resource = new Resource({url: url});
        if (resource) {
            resource.fetchImage()!.then(image => {
                //@ts-ignore
                this._normalMapTexture = new Cesium.Texture({
                    context: context,
                    source: image,
                });
                this._textureLoading = false;
            });
        }
    }

    /**
     * Merges baked geometries into one indexed triangle geometry.
     *
     * @param geometries - Already baked Cesium geometries with position, normal,
     * texture-coordinate, and index attributes.
     * @returns Combined triangle geometry.
     *
     * @throws {Error} Thrown when a supplied geometry does not provide the
     * required attributes or indices.
     *
     * @remarks
     * Vertex indices from each geometry are offset by the total number of
     * vertices preceding it in the combined buffers.
     *
     * The method uses `Uint16Array` for indices. It can represent at most 65,536
     * vertices. Use `Uint32Array` when combined geometry can exceed that count
     * and the target WebGL capabilities support it.
     */
    _combineGeometries(geometries: Geometry[]) {
        let vertexOffset = 0;
        const combinedPositions: number[] = [];
        const combinedNormals: number[] = [];
        const combinedST: number[] = [];
        const combinedIndices: number[] = [];

        geometries.forEach(geom => {
            const posAttr = geom.attributes.position;
            combinedPositions.push(...posAttr!.values);

            const normAttr = geom.attributes.normal;
            combinedNormals.push(...normAttr!.values);

            const stAttr = geom.attributes.st;
            combinedST.push(...stAttr!.values);

            const vertexCount = posAttr!.values.length / 3;
            combinedIndices.push(...geom.indices!.map(i => i + vertexOffset));
            vertexOffset += vertexCount;
        });

        // Erstelle neue kombinierte Geometry
        return new Cesium.Geometry({
            //@ts-ignore
            attributes: {
                position: new Cesium.GeometryAttribute({
                    componentDatatype: Cesium.ComponentDatatype.DOUBLE,
                    componentsPerAttribute: 3,
                    values: new Float64Array(combinedPositions),
                }),
                normal: new Cesium.GeometryAttribute({
                    componentDatatype: Cesium.ComponentDatatype.FLOAT,
                    componentsPerAttribute: 3,
                    values: new Float32Array(combinedNormals),
                }),
                st: new Cesium.GeometryAttribute({
                    componentDatatype: Cesium.ComponentDatatype.FLOAT,
                    componentsPerAttribute: 2,
                    values: new Float32Array(combinedST),
                }),
            },
            indices: new Uint16Array(combinedIndices),
            primitiveType: Cesium.PrimitiveType.TRIANGLES,
            boundingSphere:
                Cesium.BoundingSphere.fromVertices(combinedPositions),
        });
    }

    /**
     * Bakes source geometries and creates the GPU resources required for drawing.
     *
     * @param frameState - Cesium rendering state containing the GPU context.
     *
     * @remarks
     * Geometry constructors such as `PolygonGeometry` and `RectangleGeometry`
     * expose static `createGeometry()` methods. This implementation invokes that
     * factory dynamically because `GeometryInstance.geometry` may contain
     * different geometry-factory types.
     */
    _createDrawCommand(frameState: WaterFrameState) {
        const bakedGeometries = this._geometry.map(instance => {
            const geometry = instance.geometry;
            //@ts-ignore
            if (geometry.constructor.createGeometry) {
                return (geometry.constructor as any).createGeometry(geometry);
            }
        });

        const combinedGeometries = this._combineGeometries(bakedGeometries);

        const context = frameState.context;
        const attributeLocations = GeometryPipeline.createAttributeLocations(
            //@ts-ignore
            combinedGeometries,
        );

        //@ts-ignore
        const vertexArray = Cesium.VertexArray.fromGeometry({
            context: context,
            geometry: combinedGeometries,
            attributeLocations,
        });

        //@ts-ignore
        const boundingSphere = combinedGeometries.boundingSphere;

        if (boundingSphere) boundingSphere.radius += Math.abs(this._height);

        //@ts-ignore
        const shaderProgram = Cesium.ShaderProgram.fromCache({
            context: context,
            attributeLocations,
            vertexShaderSource: this._getVertexShader(),
            fragmentShaderSource: this._getFragmenShader(),
        });

        const uniformMap = {
            normalMap: () => this._normalMapTexture,
            u_height: () => this._height,
            baseWaterColor: () => this.baseWaterColor,
            frequency: () => this.frequency,
            animationSpeed: () => this.animationSpeed,
            amplitude: () => this.amplitude,
            specularIntensity: () => this.specularIntensity,
            fadeFactor: () => this.fadeFactor,
        };

        //@ts-ignore
        this._drawCommand = new Cesium.DrawCommand({
            owner: this,
            boundingVolume: boundingSphere,
            //@ts-ignore
            primitiveType: combinedGeometries.primitiveType,
            vertexArray: vertexArray,
            shaderProgram,
            uniformMap,
            //@ts-ignore
            renderState: Cesium.RenderState.fromCache({
                depthMask: true,
                depthTest: {
                    enabled: true,
                    func: DepthFunction.LESS_OR_EQUAL,
                },
                cull: {
                    enabled: true,
                    face: CullFace.BACK,
                },
            }),
            //@ts-ignore
            pass: Cesium.Pass.OPAQUE,
            receiveShadows: true,
            castShadows: false,
            derivedCommands: {},
        });
    }

    /**
     * Produces the vertex shader used to elevate the water surface and pass
     * model-, eye-, and texture-space values to the fragment shader.
     *
     * @returns GLSL vertex shader source.
     *
     * @remarks
     * `u_height` displaces every vertex along the WGS84 ellipsoid surface normal,
     * rather than the geometry's supplied normal attribute.
     */
    _getVertexShader() {
        return `
            in vec3 position3DHigh;
            in vec3 position3DLow;
            
            in vec3 normal;
            in vec2 st;

            out vec3 v_positionMC;
            out vec3 v_positionEC;
            out vec3 v_positionVC;

            out vec3 v_normalEC;
            out vec2 v_st;

            uniform float u_height;

            void main() {
                vec3 positionAbsolute = position3DHigh + position3DLow;
                vec3 surfaceNormal = czm_geodeticSurfaceNormal(positionAbsolute, vec3(0.0), vec3(1.0));
                positionAbsolute += surfaceNormal * u_height;
    
                vec3 positionRTE = positionAbsolute - czm_encodedCameraPositionMCHigh - czm_encodedCameraPositionMCLow;
                vec4 p = vec4(positionRTE, 1.0);
    
                v_positionMC = positionAbsolute;
                v_positionEC = (czm_modelViewRelativeToEye  * p).xyz; 
                v_positionVC = (czm_modelView * p).xyz;

                v_st = st;
                v_normalEC = czm_normal * surfaceNormal;
                gl_Position = czm_modelViewProjectionRelativeToEye * p;
            }
        `;
    }

    /**
     * Produces the water-material fragment shader.
     *
     * @returns GLSL fragment shader source.
     *
     * @remarks
     * The shader uses Cesium's `czm_getWaterNoise()` helper to sample animated
     * tangent-space normal data. It then computes diffuse, normal, specular, and
     * phong-lighting components from the configured water parameters.
     */
    _getFragmenShader() {
        return `
            in vec3 v_positionMC;
            in vec3 v_positionEC;
            in vec3 v_positionVC;
            in vec2 v_st;
        
            uniform sampler2D normalMap;
            uniform vec4 baseWaterColor;
            uniform vec4 blendColor;
            uniform float frequency;
            uniform float animationSpeed;
            uniform float amplitude;
            uniform float specularIntensity;
            uniform float fadeFactor;
        
            czm_material czm_getMaterial(czm_materialInput materialInput) {
                czm_material material = czm_getDefaultMaterial(materialInput);
        
                float time = czm_frameNumber * animationSpeed;
                float fade = max(1.0, (length(materialInput.positionToEyeEC) / 10000000000.0) * frequency * fadeFactor);
        
                vec4 noise = czm_getWaterNoise(normalMap, materialInput.st * frequency, time, 0.0);
                vec3 normalTangentSpace = noise.xyz * vec3(1.0, 1.0, (1.0 / amplitude));
                normalTangentSpace.xy /= fade;
                normalTangentSpace = normalize(normalTangentSpace);
        
                float tsPerturbationRatio = clamp(dot(normalTangentSpace, vec3(0.0, 0.0, 1.0)), 0.0, 1.0);
        
                material.alpha = baseWaterColor.a;
                material.diffuse = baseWaterColor.rgb + (0.1 * tsPerturbationRatio);
                material.normal = normalize(materialInput.tangentToEyeMatrix * normalTangentSpace);
                material.specular = specularIntensity;
                material.shininess = 10.0;
        
                return material;
            }
        
            void main() {
                czm_materialInput materialInput;
                
                materialInput.s = v_st.s;
                materialInput.st = v_st;
                materialInput.str = vec3(v_st, 0.0);
                materialInput.positionToEyeEC = -v_positionVC;
                
                vec3 normalMC = czm_geodeticSurfaceNormal(v_positionMC, vec3(0.0), vec3(1.0));
                materialInput.normalEC = normalize(czm_normal3D * normalMC);
                
                vec3 tangentMC = normalize(cross(normalMC, vec3(0.0, 0.0, 1.0)));

                if (length(tangentMC) < 0.001) {
                    tangentMC = normalize(cross(normalMC, vec3(1.0, 0.0, 0.0)));
                }

                vec3 bitangentMC = normalize(cross(normalMC, tangentMC));
                
                mat3 tangentToWorld = mat3(tangentMC, bitangentMC, normalMC);
                materialInput.tangentToEyeMatrix = czm_normal3D * tangentToWorld;
                
                czm_material material = czm_getMaterial(materialInput);
                
                vec3 positionToEyeEC = -v_positionVC;
                vec4 color = czm_phong(normalize(positionToEyeEC), material, czm_lightDirectionEC);
                
                color.a = material.alpha;
                out_FragColor = color;
            }
        `;
    }

    get height(): number {
        return this._height;
    }

    set height(value) {
        this._height = value;
    }
}
