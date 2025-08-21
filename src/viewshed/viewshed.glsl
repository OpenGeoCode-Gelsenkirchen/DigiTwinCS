//Modified on 02/2024
//
// Viewshed/Shadow GLSL Fragment Shader
//
// This shader blends a color or shadow overlay onto the scene depending on whether each pixel
// is inside/outside the viewshed, using real camera/scene geometry, shadow maps, and optional terrain exclusion.
//

/**
 * Uniforms
 * --------
 * depthBias            - Offset for shadow mapping and depth calculations (reduces shadowing artifacts).
 * maxDistance          - Viewshed/shadow fade-out distance (maximum).
 * lightColor           - RGBA color for areas "seen" by the light/source (viewshed).
 * shadowColor          - RGBA color for areas "not seen" (out of viewshed/shadowed by an occluder).
 * alpha                - Alpha blend for overlay color (0-1).
 * colorTexture         - The main scene/image color texture.
 * depthTexture         - The depth buffer/texture.
 * shadowMapTexture     - The shadow map/sampler for occlusion.
 * shadowMapMatrix      - Matrix for transforming world or eye coords into the shadow map texture space.
 * shadowMapPositionEC  - Position of the viewshed/shadow camera/light in eye coordinates.
 * ellipsoidInverseRadii- Inverse radii for ellipsoid calculations (e.g., for globe).
 * excludeTerrain       - If true, skips applying the effect for terrain features.
 *
 * Varying/inputs:
 * v_textureCoordinates - Per-fragment texture coordinates.
 *
 * Output:
 * FragColor            - Final RGBA output color (with viewshed/post-process overlay).
 */

uniform float depthBias;
uniform float maxDistance;

uniform vec4 lightColor;
uniform vec4 shadowColor;
uniform float alpha;

uniform sampler2D colorTexture;
uniform sampler2D depthTexture;

uniform sampler2D shadowMapTexture;
uniform mat4 shadowMapMatrix;
uniform vec4 shadowMapPositionEC;

uniform vec3 ellipsoidInverseRadii;
uniform bool excludeTerrain;

in vec2 v_textureCoordinates;
out vec4 FragColor;

/**
 * Converts (uv, depth) pair from screen space to camera/eye (EC) coordinates.
 * @param uv - Fragment coordinates in [0,1] x [0,1].
 * @param depth - NDC depth value for this fragment.
 * @returns position in eye/camera coordinates (vec4)
 */
vec4 toEye(in vec2 uv, in float depth) {
    float x = uv.x * 2.0 - 1.0;
    float y = uv.y * 2.0 - 1.0;
    vec4 camPosition = czm_inverseProjection * vec4(x, y, depth, 1.0);
    float reciprocalW = 1.0 / camPosition.w;
    camPosition *= reciprocalW;
    return camPosition;
}

/**
 * Unpacks and linearizes a fragment's depth texture value into a normalized float.
 * Applies near/far-plane corrections.
 * @param depth - Packed depth (as texture), typically .r channel.
 * @returns linearized NDC z value (-1 to +1)
 */
float getDepth(in vec4 depth) {
    float z_window = czm_unpackDepth(depth);
    z_window = czm_reverseLogDepth(z_window);
    float n_range = czm_depthRange.near;
    float f_range = czm_depthRange.far;
    return ((z_window - n_range) / (f_range - n_range)) * 2.0 - 1.0;
}


/**
 * Main Shader Logic:
 * 1. Fetches scene color and depth at each pixel.
 * 2. If the pixel is not rendered/logged, it is passed through.
 * 3. If terrain exclusion is active and pixel is terrain/globe, passes through.
 * 4. Projects pixel into light's/shadow's texture space (coordinate transform).
 * 5. If outside shadow map bounds, passes through.
 * 6. Builds shadowParameters struct for Cesium's shadow functions (incl. bias).
 * 7. Computes the shadow/visibility value.
 * 8. Blends the pixel color with lightColor or shadowColor based on visibility, using "alpha."
 */
void main() {
    vec4 color = texture(colorTexture, v_textureCoordinates);
    vec4 logDepth = texture(depthTexture, v_textureCoordinates);
    float depth = getDepth(logDepth);

    if(logDepth.r >= 1.0) {
        FragColor = color;
        return;
    }

    vec4 positionEC = toEye(v_textureCoordinates, depth);

    if(excludeTerrain && czm_ellipsoidContainsPoint(ellipsoidInverseRadii, positionEC.xyz)) {
        FragColor = color;
        return;
    }

    vec3 difference = positionEC.xyz - shadowMapPositionEC.xyz;

    vec4 shadowPosition = shadowMapMatrix * positionEC;
    shadowPosition /= shadowPosition.w;

    if(any(lessThan(shadowPosition.xyz, vec3(0.0))) || any(greaterThan(shadowPosition.xyz, vec3(1.0)))) {
        FragColor = color;
        return;
    }

    czm_shadowParameters shadowParameters;

    shadowParameters.darkness = 0.0;
    vec3 directionEC = normalize(difference);

    shadowParameters.nDotL = dot(vec3(1.0), -directionEC);
    shadowParameters.depthBias = depthBias; // * 5.0 / distance;
    shadowParameters.normalShadingSmooth = 1.;
    shadowParameters.texCoords = clamp(shadowPosition.xy, 0.0, 1.0);
    shadowParameters.depth = shadowPosition.z;

    float visibility = czm_shadowVisibility(shadowMapTexture, shadowParameters);
    if(visibility == 1.0) {
        FragColor = mix(texture(colorTexture, v_textureCoordinates), lightColor, alpha);
    } else {
        FragColor = mix(texture(colorTexture, v_textureCoordinates), shadowColor, alpha);
    }
}