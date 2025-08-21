import {
    Cartesian3,
    CustomShader,
    CustomShaderMode,
    CustomShaderTranslucencyMode,
    UniformType,
} from '@cesium/engine';

/**
 * ShaderFactory – Static utility factory for initializing common CustomShader configurations
 * for Cesium 3D Tiles, models, and point clouds.
 *
 * Provides reusable methods to create shaders for white, green, debug, texture, opaque, alpha,
 * and point cloud effects, making it easy to apply material overrides and visualization tweaks.
 *
 * @class
 *
 * @static
 * @method createWhiteShader() - Returns a CustomShader rendering pure white, rough, fully opaque.
 * @method createGreenShader() - Returns a CustomShader rendering a greenish color, rough, opaque.
 * @method createTextureShader() - Returns a CustomShader with very faint diffuse value and lowered alpha (for custom texturing).
 * @method createDebugShader() - Returns a CustomShader using a uniform value u_colorIndex for debugging.
 * @method createOpaqueShader() - Returns a CustomShader with OPAQUE mode for full alpha rendering.
 * @method createAlphaShader() - Returns a CustomShader forcing 0.6 alpha with roughness and no specular.
 * @method createPointCloudShader() - Returns a CustomShader with vertex shader to control Cesium point size by Z/elevation.
 *
 * @example
 * const whiteShader = ShaderFactory.createWhiteShader();
 * myTileset.customShader = whiteShader;
 */
export class ShaderFactory {
    /**
     * @returns {CustomShader} Shader with white color, fully opaque.
     */
    static createWhiteShader() {
        return new CustomShader({
            mode: CustomShaderMode.MODIFY_MATERIAL,
            fragmentShaderText: `
		void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material) {
			material.diffuse = vec3(1.0, 1.0, 1.0);
			material.alpha = 1.0;
			material.specular = vec3(0.0, 0.0, 0.0);
			material.roughness = 1.0;
			material.occlusion = 1.0;
			material.emissive = vec3(0.0, 0.0, 0.0);
		}`,
        });
    }
    /**
     * @returns {CustomShader} Shader with pastel/greenish hue, fully opaque.
     */
    static createGreenShader() {
        return new CustomShader({
            mode: CustomShaderMode.MODIFY_MATERIAL,
            fragmentShaderText: `
		void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material) {
			//material.diffuse = vec3(1.0, 0.0, 0.0);
			material.diffuse = vec3(0.67, 1, 0.5);
			material.alpha = 1.0;
			material.specular = vec3(0.0, 0.0, 0.0);
			material.roughness = 1.0;
			material.occlusion = 1.0;
			material.emissive = vec3(0.0, 0.0, 0.0);
		}`,
        });
    }

    /**
     * @returns {CustomShader} Lightly tinted, mostly transparent shader, intended for textures.
     */
    static createTextureShader() {
        new CustomShader({
            mode: CustomShaderMode.MODIFY_MATERIAL,
            //translucencyMode: CustomShaderTranslucencyMode.OPAQUE,
            fragmentShaderText: `
		void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material) {
			material.roughness = 0.5;
			material.diffuse = vec3(0.001, 0.0, 0.0);
			material.alpha = 0.01;
		}`,
        });
    }

    /**
     * @returns {CustomShader} Debug shader with u_colorIndex uniform (default red).
     */
    static createDebugShader() {
        return new CustomShader({
            uniforms: {
                u_colorIndex: {
                    type: UniformType.VEC3,
                    value: new Cartesian3(1.0, 0.0, 0.0),
                },
            },
            fragmentShaderText: `
		void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material) {
					material.diffuse = u_colorIndex;
					material.alpha = 1.0;
					material.specular = vec3(0.0, 0.0, 0.0);
					material.roughness = 1.0;
					material.occlusion = 1.0;
					material.emissive = vec3(0.0, 0.0, 0.0);
		}`,
        });
    }

    /**
     * @returns {CustomShader} Opaque shader (no transparency).
     */
    static createOpaqueShader() {
        return new CustomShader({
            translucencyMode: CustomShaderTranslucencyMode.OPAQUE,
        });
    }

    /**
     * @returns {CustomShader} Alpha-blended shader (semi-transparent, alpha=0.6).
     */
    static createAlphaShader() {
        return new CustomShader({
            translucencyMode: CustomShaderTranslucencyMode.TRANSLUCENT,
            fragmentShaderText: `
		void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material) {
			material.alpha = 0.6;
			material.specular = vec3(0.0, 0.0, 0.0);
			material.roughness = 1.0;
			material.occlusion = 1.0;
			material.emissive = vec3(0.0, 0.0, 0.0);
		}`,
        });
    }

    /**
     * @returns {CustomShader} Shader for point cloud: controls vertex size by z range/height.
     */
    static createPointCloudShader() {
        return new CustomShader({
            uniforms: {
                u_zMin: {
                    type: UniformType.FLOAT,
                    value: 100.0,
                },
                u_zMax: {
                    type: UniformType.FLOAT,
                    value: 5000.0,
                },
                u_exp: {
                    type: UniformType.FLOAT,
                    value: 30.0,
                },
                u_scale: {
                    type: UniformType.FLOAT,
                    value: 17, //22.5
                },
            },
            vertexShaderText: `
		void vertexMain(VertexInput vsInput, inout czm_modelVertexOutput vsOutput) {
			vec4 positionWC = czm_model * vec4(vsInput.attributes.positionMC, 1.0);
			vec4 positionEC = czm_view * positionWC;

			float normalizedZ = 1.0 - (length(positionEC.xyz) - u_zMin) / (u_zMax - u_zMin);
			normalizedZ = clamp(normalizedZ, 0.0, 1.0);			
			normalizedZ = pow(normalizedZ, u_exp);
			vsOutput.pointSize = normalizedZ * u_scale;
		}`,
        });
    }
}

/**
 * SHADERS – A preset mapping of layer/asset categories to commonly used shaders.
 *
 * @type {object}
 * @property {CustomShader} buildings         - Pure white opaque shader for buildings.
 * @property {CustomShader} stadtinventar     - White shader for city inventory.
 * @property {CustomShader} freileitungen     - Point cloud size/height shader for power lines.
 * @property {CustomShader} gltf              - Greenish shader for glTF models.
 * @property {CustomShader} bruecken          - Alpha/translucent shader for bridges.
 * @property {CustomShader} planned_buildings - Texture shader for planned buildings.
 * @property {CustomShader} debug             - Debug coloring shader.
 *
 * @example
 * SHADERS.buildings // returns white shader, use as tileset.customShader = ...
 */
export const SHADERS = {
    buildings: ShaderFactory.createWhiteShader(),
    stadtinventar: ShaderFactory.createWhiteShader(),
    freileitungen: ShaderFactory.createPointCloudShader(),
    gltf: ShaderFactory.createGreenShader(),
    bruecken: ShaderFactory.createAlphaShader(),
    planned_buildings: ShaderFactory.createTextureShader(),
    debug: ShaderFactory.createDebugShader(),
};
