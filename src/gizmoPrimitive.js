import {
    BoxGeometry,
    Cartesian3,
    Math as CesiumMath,
    ColorGeometryInstanceAttribute,
    CylinderGeometry,
    EllipsoidGeometry,
    GeometryInstance,
    Matrix3,
    Matrix4,
    PerInstanceColorAppearance,
    Primitive,
    Transforms,
} from '@cesium/engine';

/**
 * The shared appearance configuration for all primitives created by this module.
 * Uses per-instance color, disables depth testing and face culling, and enables flat shading.
 *
 * @type {PerInstanceColorAppearance}
 */
const appearance = new PerInstanceColorAppearance({
    flat: true,
    renderState: {
        depthTest: {
            enabled: false,
        },
        cull: {
            enabled: false,
        },
    },
});

/**
 * Creates a 3D coordinate axis primitive (X, Y, Z lines) using colored cylinders,
 * each orthogonally aligned, and adds a center sphere to visualize the origin.
 *
 * @param {number} length - The length of each axis line.
 * @param {number} radius - The radius of each axis cylinder.
 * @param {number} radii - The radius of the center sphere.
 * @returns {Primitive} The composite primitive with colored axes and center sphere.
 */
export function createLinePrimitive(length, radius, radii) {
    const xEnu = Transforms.eastNorthUpToFixedFrame(
        new Cartesian3(length / 2, 0.0, 0.0),
    );
    const yEnu = Transforms.eastNorthUpToFixedFrame(
        new Cartesian3(0.0, length / 2, 0.0),
    );
    const zEnu = Transforms.eastNorthUpToFixedFrame(
        new Cartesian3(0.0, 0.0, length / 2),
    );

    const xLine = new GeometryInstance({
        geometry: new CylinderGeometry({
            length: length,
            topRadius: radius,
            bottomRadius: radius,
        }),
        attributes: {
            color: new ColorGeometryInstanceAttribute(1.0, 0.0, 0.0, 1.0),
        },
        id: 'x',
        modelMatrix: xEnu,
    });

    const yLine = new GeometryInstance({
        geometry: new CylinderGeometry({
            length: length,
            topRadius: radius,
            bottomRadius: radius,
        }),
        attributes: {
            color: new ColorGeometryInstanceAttribute(0.0, 1.0, 0.0, 1.0),
        },
        id: 'y',
        modelMatrix: yEnu,
    });

    const zLine = new GeometryInstance({
        geometry: new CylinderGeometry({
            length: length,
            topRadius: radius,
            bottomRadius: radius,
        }),
        attributes: {
            color: new ColorGeometryInstanceAttribute(0.0, 0.0, 1.0, 1.0),
        },
        id: 'z',
        modelMatrix: zEnu,
    });

    return new Primitive({
        geometryInstances: [
            xLine,
            yLine,
            zLine,
            createCenterSpherePrimitive(radii),
        ],
        //appearance: new PerInstanceColorAppearance(),
        appearance: appearance,
        modelMatrix: Matrix4.IDENTITY,
    });
}

/**
 * Creates a 3D direction marker primitive using cone-like cylinders for X/Y/Z
 * axes and a central sphere to represent the origin.
 *
 * @param {number} length - The length of each cone (direction marker).
 * @param {number} radii - The radius of the central sphere.
 * @returns {Primitive} The composite primitive with axis cones and center sphere.
 */
export function createConePrimitive(length, radii) {
    const xEnu = Transforms.eastNorthUpToFixedFrame(
        new Cartesian3(length, 0.0, 0.0),
    );
    const yEnu = Transforms.eastNorthUpToFixedFrame(
        new Cartesian3(0.0, length, 0.0),
    );
    const zEnu = Transforms.eastNorthUpToFixedFrame(
        new Cartesian3(0.0, 0.0, length),
    );

    const xCone = new GeometryInstance({
        geometry: new CylinderGeometry({
            length: length / 10,
            topRadius: length / 1000,
            bottomRadius: length / 20,
        }),
        attributes: {
            color: new ColorGeometryInstanceAttribute(1.0, 0.0, 0.0, 1.0),
        },
        id: 'x',
        modelMatrix: xEnu,
    });

    const yCone = new GeometryInstance({
        geometry: new CylinderGeometry({
            length: length / 10,
            topRadius: length / 1000,
            bottomRadius: length / 20,
        }),
        attributes: {
            color: new ColorGeometryInstanceAttribute(0.0, 1.0, 0.0, 1.0),
        },
        id: 'y',
        modelMatrix: yEnu,
    });

    const zCone = new GeometryInstance({
        geometry: new CylinderGeometry({
            length: length / 10,
            topRadius: length / 1000,
            bottomRadius: length / 20,
        }),
        attributes: {
            color: new ColorGeometryInstanceAttribute(0.0, 0.0, 1.0, 1.0),
        },
        id: 'z',
        modelMatrix: zEnu,
    });

    return new Primitive({
        geometryInstances: [
            xCone,
            yCone,
            zCone,
            createCenterSpherePrimitive(radii),
        ],
        //appearance: new PerInstanceColorAppearance(),
        appearance: appearance,
        modelMatrix: Matrix4.IDENTITY,
    });
}

/**
 * Creates a coordinate system with cubes at the end of each axis and a central sphere at the origin.
 *
 * @param {number} length - The distance from the origin to each cube.
 * @param {number} radii - The radius of the central sphere.
 * @returns {Primitive} The primitive with cubes for each axis and a center sphere.
 */
export function createCubePrimitive(length, radii) {
    const cubePos = length / 20.0;

    const xEnu = Transforms.eastNorthUpToFixedFrame(
        new Cartesian3(length, 0.0, 0.0),
    );
    const yEnu = Transforms.eastNorthUpToFixedFrame(
        new Cartesian3(0.0, length, 0.0),
    );
    const zEnu = Transforms.eastNorthUpToFixedFrame(
        new Cartesian3(0.0, 0.0, length),
    );

    const xCube = new GeometryInstance({
        geometry: new BoxGeometry({
            minimum: new Cartesian3(-cubePos, -cubePos, -cubePos),
            maximum: new Cartesian3(cubePos, cubePos, cubePos),
        }),
        attributes: {
            color: new ColorGeometryInstanceAttribute(1.0, 0.0, 0.0, 1.0),
        },
        id: 'x',
        modelMatrix: xEnu,
    });

    const yCube = new GeometryInstance({
        geometry: new BoxGeometry({
            minimum: new Cartesian3(-cubePos, -cubePos, -cubePos),
            maximum: new Cartesian3(cubePos, cubePos, cubePos),
        }),
        attributes: {
            color: new ColorGeometryInstanceAttribute(0.0, 1.0, 0.0, 1.0),
        },
        id: 'y',
        modelMatrix: yEnu,
    });

    const zCube = new GeometryInstance({
        geometry: new BoxGeometry({
            minimum: new Cartesian3(-cubePos, -cubePos, -cubePos),
            maximum: new Cartesian3(cubePos, cubePos, cubePos),
        }),
        attributes: {
            color: new ColorGeometryInstanceAttribute(0.0, 0.0, 1.0, 1.0),
        },
        id: 'z',
        modelMatrix: zEnu,
    });

    return new Primitive({
        geometryInstances: [
            xCube,
            yCube,
            zCube,
            createCenterSpherePrimitive(radii),
        ],
        //appearance: new PerInstanceColorAppearance(),
        appearance: appearance,
        modelMatrix: Matrix4.IDENTITY,
    });
}

/**
 * Creates three colored circular (ring or disk) primitives aligned with the coordinate axes,
 * with customizable radii and cone angles, and a central sphere.
 *
 * @param {number} xRadii - Outer radii of the circle in X-axis direction.
 * @param {number} yRadii - Outer radii of the circle in Y-axis direction.
 * @param {number} zRadii - Outer radii of the circle in Z-axis direction.
 * @param {number} xInnerRadii - Inner radii for x circle (for rings).
 * @param {number} yInnerRadii - Inner radii for y circle.
 * @param {number} zInnerRadii - Inner radii for z circle.
 * @param {number} minCone - Minimum cone angle (degrees) for each ring/disk.
 * @param {number} maxCone - Maximum cone angle (degrees) for each ring/disk.
 * @param {number} radii - Radius for the central sphere.
 * @returns {Primitive} The primitive with three colored circles/disks and center sphere.
 */
export function createCirclePrimitive(
    xRadii,
    yRadii,
    zRadii,
    xInnerRadii,
    yInnerRadii,
    zInnerRadii,
    minCone,
    maxCone,
    radii,
) {
    const xRot = Matrix4.fromRotation(
        Matrix3.fromRotationY(CesiumMath.toRadians(90)),
        new Matrix4(),
    );
    const yRot = Matrix4.fromRotation(
        Matrix3.fromRotationX(CesiumMath.toRadians(90)),
        new Matrix4(),
    );
    const enu = Transforms.eastNorthUpToFixedFrame(
        new Cartesian3(0.0, 0.0, 0.0),
    );

    Matrix4.multiply(xRot, enu, xRot);
    Matrix4.multiply(yRot, enu, yRot);

    const xCircle = new GeometryInstance({
        geometry: new EllipsoidGeometry({
            vertexFormat: PerInstanceColorAppearance.VERTEX_FORMAT,
            radii: new Cartesian3(xRadii, xRadii, xRadii),
            innerRadii: new Cartesian3(xInnerRadii, xInnerRadii, xInnerRadii),
            minimumCone: CesiumMath.toRadians(minCone),
            maximumCone: CesiumMath.toRadians(maxCone),
        }),
        attributes: {
            color: new ColorGeometryInstanceAttribute(1.0, 0.0, 0.0, 1.0),
        },
        id: 'x',
        modelMatrix: xRot,
    });

    const yCircle = new GeometryInstance({
        geometry: new EllipsoidGeometry({
            vertexFormat: PerInstanceColorAppearance.VERTEX_FORMAT,
            radii: new Cartesian3(yRadii, yRadii, yRadii),
            innerRadii: new Cartesian3(yInnerRadii, yInnerRadii, yInnerRadii),
            minimumCone: CesiumMath.toRadians(minCone),
            maximumCone: CesiumMath.toRadians(maxCone),
        }),
        attributes: {
            color: new ColorGeometryInstanceAttribute(0.0, 1.0, 0.0, 1.0),
        },
        id: 'y',
        modelMatrix: yRot,
    });

    const zCircle = new GeometryInstance({
        geometry: new EllipsoidGeometry({
            vertexFormat: PerInstanceColorAppearance.VERTEX_FORMAT,
            radii: new Cartesian3(zRadii, zRadii, zRadii),
            innerRadii: new Cartesian3(zInnerRadii, zInnerRadii, zInnerRadii),
            minimumCone: CesiumMath.toRadians(minCone),
            maximumCone: CesiumMath.toRadians(maxCone),
        }),
        attributes: {
            color: new ColorGeometryInstanceAttribute(0.0, 0.0, 1.0, 1.0),
        },
        id: 'z',
        modelMatrix: Matrix4.IDENTITY,
    });

    return new Primitive({
        geometryInstances: [
            xCircle,
            yCircle,
            zCircle,
            createCenterSpherePrimitive(radii),
        ],
        //appearance: new PerInstanceColorAppearance(),
        appearance: appearance,
        modelMatrix: Matrix4.IDENTITY,
    });
}

/**
 * Creates a small colored sphere primitive for use as the origin marker in 3D primitives.
 *
 * @param {number} radii - The radius of the sphere.
 * @returns {GeometryInstance} The geometry instance representing the sphere at the origin.
 */
export function createCenterSpherePrimitive(radii) {
    return new GeometryInstance({
        geometry: new EllipsoidGeometry({
            vertexFormat: PerInstanceColorAppearance.VERTEX_FORMAT,
            radii: new Cartesian3(radii / 7, radii / 7, radii / 7),
        }),
        attributes: {
            color: new ColorGeometryInstanceAttribute(1.0, 0.6, 0.0, 1.0),
        },
        id: 'center',
        modelMatrix: Matrix4.IDENTITY,
    });
}
