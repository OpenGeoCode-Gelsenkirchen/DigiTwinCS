/**
 * Extends Cesium's public TypeScript declarations with renderer-internal APIs.
 *
 * These APIs support custom WebGL rendering and compute workflows, including
 * shader compilation, GPU textures, framebuffer targets, draw commands, and
 * render-pass scheduling.
 *
 * @remarks
 * Cesium does not guarantee the long-term stability of many of these lower-level
 * renderer APIs. Keep this declaration aligned with the Cesium version used by
 * the application.
 */
declare module 'cesium' {
    /**
     * Source code and preprocessor definitions used to build a shader.
     */
    export class ShaderSource {
        /**
         * Creates a shader source definition.
         *
         * @param options - Shader source configuration.
         * @param options.sources - GLSL source fragments concatenated for compilation.
         * @param options.defines - Optional GLSL preprocessor definitions.
         */
        constructor(options: {sources: string[]; defines?: string[]});
    }

    /**
     * A linked GPU shader program used by a draw command.
     */
    export class ShaderProgram {
        /**
         * Gets or creates a cached shader program for a rendering context.
         *
         * @param options - Shader program configuration.
         * @param options.context - Cesium rendering context.
         * @param options.vertexShaderSource - Vertex-shader source definition.
         * @param options.fragmentShaderSource - Fragment-shader source definition.
         * @param options.attributeLocations - Optional mapping of vertex attribute
         * locations by attribute name.
         * @returns The cached or newly created shader program.
         */
        static fromCache(options: {
            context: any;
            vertexShaderSource: ShaderSource;
            fragmentShaderSource: ShaderSource;
            attributeLocations?: Record<string, number>;
        }): ShaderProgram;

        /**
         * Releases the underlying WebGL shader program.
         */
        destroy(): void;
    }

    /**
     * GPU-side vertex attributes and index data used for rendering geometry.
     */
    export class VertexArray {
        /**
         * Creates a vertex array from Cesium geometry.
         *
         * @param options - Vertex array configuration.
         * @param options.context - Cesium rendering context.
         * @param options.geometry - Geometry whose attributes are uploaded to the GPU.
         * @param options.attributeLocations - Optional mapping of geometry attributes
         * to shader attribute locations.
         * @param options.bufferUsage - Intended GPU usage pattern for created buffers.
         * @returns A vertex array ready for use by a {@link DrawCommand}.
         */
        static fromGeometry(options: {
            context: any;
            geometry: Geometry;
            attributeLocations?: Record<string, number>;
            bufferUsage: BufferUsage;
        }): VertexArray;

        /**
         * Releases the GPU buffers and vertex-array resources.
         */
        destroy(): void;
    }

    /**
     * A framebuffer with color and depth texture attachments.
     */
    export class Framebuffer {
        /**
         * Creates a framebuffer that renders into supplied texture attachments.
         *
         * @param options - Framebuffer configuration.
         * @param options.context - Cesium rendering context.
         * @param options.colorTextures - Color render-target textures.
         * @param options.depthTexture - Depth render-target texture.
         */
        constructor(options: {
            context: any;
            colorTextures: Texture[];
            depthTexture: Texture;
        });

        /**
         * Gets a color attachment by index.
         *
         * @param index - Zero-based color attachment index.
         * @returns The attached color texture.
         */
        getColorTexture(index: number): Texture;

        /**
         * Depth texture attached to the framebuffer.
         */
        depthTexture: Texture;
    }

    /**
     * WebGL buffer usage hints for geometry and vertex attribute data.
     */
    export enum BufferUsage {
        /** Buffer contents are uploaded once and drawn many times. */
        STATIC_DRAW,

        /** Buffer contents are updated repeatedly and drawn many times. */
        DYNAMIC_DRAW,
    }

    /**
     * A render command that submits geometry to Cesium's rendering pipeline.
     */
    export class DrawCommand {
        /**
         * Creates a draw command.
         *
         * @param options - Draw-command configuration.
         * @param options.owner - Object owning this command, used for resource and
         * debugging association.
         * @param options.vertexArray - Optional GPU vertex data to render.
         * @param options.primitiveType - Primitive topology used for drawing.
         * @param options.modelMatrix - Optional transform from model to world space.
         * @param options.renderState - WebGL render-state configuration.
         * @param options.framebuffer - Optional render target; defaults to the active
         * Cesium framebuffer.
         * @param options.shaderProgram - Shader program used to render the geometry.
         * @param options.uniformMap - Functions returning shader uniform values.
         * @param options.pass - Cesium render pass in which to execute the command.
         */
        constructor(options: {
            owner: any;
            vertexArray?: VertexArray;
            primitiveType?: PrimitiveType;
            modelMatrix?: Matrix4;
            renderState?: any;
            framebuffer?: Framebuffer;
            shaderProgram: ShaderProgram;
            uniformMap: Record<string, () => any>;
            pass: Pass;
        });

        /**
         * Functions that resolve shader uniform values at command execution time.
         */
        uniformMap: Record<string, () => any>;

        /**
         * Shader program used by the command.
         */
        shaderProgram?: ShaderProgram;

        /**
         * Vertex data rendered by the command.
         */
        vertexArray?: VertexArray;

        /**
         * Optional framebuffer used as the render target.
         */
        framebuffer?: Framebuffer;

        /**
         * Optional texture produced by the command.
         */
        outputTexture?: Texture;
    }

    /**
     * A GPU compute command that writes fragment-shader output into a texture.
     */
    export class ComputeCommand {
        /**
         * Creates a compute command.
         *
         * @param options - Compute-command configuration.
         * @param options.owner - Object owning the command.
         * @param options.fragmentShaderSource - Fragment shader that performs the
         * computation.
         * @param options.uniformMap - Functions returning shader uniform values.
         * @param options.outputTexture - Texture receiving the computed output.
         * @param options.persists - Whether Cesium should retain the command after
         * execution rather than releasing transient resources.
         */
        constructor(options: {
            owner: any;
            fragmentShaderSource: ShaderSource;
            uniformMap: Record<string, () => any>;
            outputTexture: Texture;
            persists: boolean;
        });

        /**
         * Functions that resolve shader uniform values at execution time.
         */
        uniformMap: Record<string, () => any>;

        /**
         * Optional shader program associated with the command.
         */
        shaderProgram?: ShaderProgram;

        /**
         * Optional vertex array used internally to execute the full-screen pass.
         */
        vertexArray?: VertexArray;

        /**
         * Optional framebuffer used during computation.
         */
        framebuffer?: Framebuffer;

        /**
         * Texture receiving the compute-shader output.
         */
        outputTexture?: Texture;
    }

    /**
     * A command that clears color and depth buffers of a framebuffer.
     */
    export class ClearCommand {
        /**
         * Creates a clear command.
         *
         * @param options - Clear-command configuration.
         * @param options.color - Color used to clear color attachments.
         * @param options.depth - Depth value used to clear the depth attachment.
         * @param options.framebuffer - Optional framebuffer to clear.
         * @param options.pass - Cesium render pass in which to execute the command.
         */
        constructor(options: {
            color: Color;
            depth: number;
            framebuffer?: Framebuffer;
            pass: Pass;
        });

        /**
         * Optional framebuffer to clear.
         */
        framebuffer?: Framebuffer;

        /**
         * Executes the clear operation.
         *
         * @param context - Cesium rendering context.
         */
        execute(context: any): void;
    }

    /**
     * Factory for cached WebGL render-state objects.
     */
    export class RenderState {
        /**
         * Gets or creates a cached render-state object.
         *
         * @param options - Cesium render-state options.
         * @returns A cached render-state object.
         */
        static fromCache(options: any): any;
    }

    /**
     * Cesium rendering passes used to order command execution.
     */
    export enum Pass {
        /** Opaque geometry pass. */
        OPAQUE,

        /** Translucent geometry pass. */
        TRANSLUCENT,

        /** Off-screen GPU compute pass. */
        COMPUTE,
    }

    /**
     * GPU primitive topologies supported by draw commands.
     */
    export enum PrimitiveType {
        /** Independent points. */
        POINTS,

        /** Independent line segments. */
        LINES,

        /** Independent triangles. */
        TRIANGLES,
    }

    /**
     * Component data types used by Cesium geometry attributes.
     */
    export enum ComponentDatatype {
        /** IEEE 754 single-precision floating-point values. */
        FLOAT,
    }

    /**
     * A GPU texture, usable as a shader input, framebuffer attachment, or compute
     * command output.
     */
    export class Texture {
        /**
         * Creates a texture.
         *
         * @param options - Texture configuration.
         * @param options.context - Cesium rendering context.
         * @param options.width - Texture width in pixels.
         * @param options.height - Texture height in pixels.
         * @param options.pixelFormat - Layout of each texel.
         * @param options.pixelDatatype - Data type of each texel component.
         * @param options.source - Optional initial texture data.
         * @param options.source.width - Optional source width.
         * @param options.source.height - Optional source height.
         * @param options.source.arrayBufferView - Typed-array pixel data.
         * @param options.sampler - Optional sampling and texture wrapping settings.
         */
        constructor(options: {
            context: any;
            width: number;
            height: number;
            pixelFormat: PixelFormat;
            pixelDatatype: PixelDatatype;
            source?: {
                width?: number;
                height?: number;
                arrayBufferView: Uint8Array | Float32Array;
            };
            sampler?: Sampler;
        });

        /**
         * Replaces texture data with pixels from an in-memory source.
         *
         * @param options - Texture copy configuration.
         * @param options.source - Pixel source copied into this texture.
         */
        copyFrom(options: {
            source:
                | ArrayBufferView
                | ImageData
                | HTMLImageElement
                | HTMLCanvasElement
                | HTMLVideoElement;
        }): void;

        /**
         * Releases the underlying GPU texture.
         */
        destroy(): void;
    }

    /**
     * Texture-coordinate behavior outside the normalized range \(0\) to \(1\).
     */
    export enum TextureWrap {
        /** Clamp coordinates to the nearest texture edge. */
        CLAMP_TO_EDGE,

        /** Repeat the texture for every integer coordinate interval. */
        REPEAT,

        /** Repeat the texture while mirroring every alternating interval. */
        MIRRORED_REPEAT,
    }

    /**
     * Sampling configuration for a {@link Texture}.
     */
    export class Sampler {
        /**
         * Creates a texture sampler.
         *
         * @param options - Sampler configuration.
         * @param options.minificationFilter - Filter used when a texture is displayed
         * smaller than its native resolution.
         * @param options.magnificationFilter - Filter used when a texture is displayed
         * larger than its native resolution.
         * @param options.wrapS - Horizontal texture-coordinate wrapping behavior.
         * @param options.wrapT - Vertical texture-coordinate wrapping behavior.
         */
        constructor(options: {
            minificationFilter?: TextureMinificationFilter;
            magnificationFilter?: TextureMagnificationFilter;
            wrapS?: TextureWrap;
            wrapT?: TextureWrap;
        });
    }

    /**
     * Filters used when texture pixels are minified.
     */
    export enum TextureMinificationFilter {
        /** Select the nearest source texel. */
        NEAREST,

        /** Linearly interpolate adjacent source texels. */
        LINEAR,
    }

    /**
     * Filters used when texture pixels are magnified.
     */
    export enum TextureMagnificationFilter {
        /** Select the nearest source texel. */
        NEAREST,

        /** Linearly interpolate adjacent source texels. */
        LINEAR,
    }

    /**
     * Texture pixel layouts.
     */
    export enum PixelFormat {
        /** Four-component red, green, blue, and alpha texture format. */
        RGBA,
    }

    /**
     * Texture component storage types.
     */
    export enum PixelDatatype {
        /** Unsigned 8-bit integer texture components. */
        UNSIGNED_BYTE,

        /** IEEE 754 single-precision floating-point texture components. */
        FLOAT,
    }

    /**
     * Cesium scene members used by the custom rendering extension.
     */
    export interface Scene {
        /**
         * Low-level Cesium rendering context.
         */
        context: any;

        /**
         * Frame state for Cesium's normal rendering path.
         */
        frameStateNormal: any;

        /**
         * Event raised after Cesium completes rendering a frame.
         */
        postRender: Event;

        /**
         * Requests that Cesium render a new frame when explicit rendering is enabled.
         */
        requestRender(): void;
    }

    /**
     * A Cesium event with listener registration and dispatch support.
     */
    export class Event {
        /**
         * Registers an event listener.
         *
         * @param listener - Callback invoked when the event is raised.
         * @param scope - Optional `this` binding for the listener.
         * @returns A function that unregisters the listener.
         */
        addEventListener(
            listener: (...args: any[]) => void,
            scope?: any,
        ): (...args: any[]) => void;

        /**
         * Unregisters a previously registered event listener.
         *
         * @param listener - Listener to remove.
         * @param scope - Optional `this` binding supplied during registration.
         * @returns `true` if a matching listener was removed; otherwise `false`.
         */
        removeEventListener(
            listener: (...args: any[]) => void,
            scope?: any,
        ): boolean;

        /**
         * Invokes all registered listeners with the supplied arguments.
         *
         * @param args - Values passed to registered listeners.
         */
        raiseEvent(...args: any[]): void;
    }
}
