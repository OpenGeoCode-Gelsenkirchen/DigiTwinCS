/**
 * Configuration used to render a sensor or annotation icon as a circular
 * Cesium billboard marker.
 */
export interface RenderIconOptions {
    width?: number;
    height?: number;
    backgroundColor?: string;
    pinTailLength?: number;
    iconSize?: number;
}

/**
 * Renders an image into a circular canvas marker with a vertical pin tail.
 *
 * @param icon - Decoded source image drawn inside the circular marker area.
 * @param options - Canvas dimensions, background color, pin-tail length, and
 * relative icon size.
 * @returns Canvas suitable for assignment to `Billboard.image` or conversion
 * to a data URL.
 *
 * @throws {Error} Thrown when a 2D rendering context cannot be created.
 *
 * @remarks
 * The canvas height consists of the circular icon area plus the pin-tail
 * length:
 *
 * \[
 * \text{canvasHeight} = \text{height} + \text{pinTailLength}
 * \]
 *
 * The source icon is clipped to a circular path. Its effective rendered
 * dimensions are:
 *
 * \[
 * \text{renderedWidth} = \text{width} \times \text{iconSize}
 * \]
 *
 * \[
 * \text{renderedHeight} = \text{height} \times \text{iconSize}
 * \]
 *
 * @example
 * ```ts
 * const source = await IconCache.shared.get('online');
 *
 * if (source) {
 *   const marker = renderIcon(source, {
 *     width: 40,
 *     height: 40,
 *     backgroundColor: '#22c55e',
 *     pinTailLength: 24,
 *     iconSize: 0.65,
 *   });
 *
 *   billboard.image = marker;
 * }
 * ```
 */
export function renderIcon(
    icon: HTMLImageElement,
    {
        width = 32,
        height = 32,
        backgroundColor = '#00000000',
        pinTailLength = 64,
        iconSize = 1.0,
    }: RenderIconOptions = {},
): HTMLCanvasElement {
    const canvas = document.createElement('canvas');

    canvas.width = width;
    canvas.height = height + pinTailLength;

    /**
     * Center point of the circular icon area.
     */
    const halfWidth = Math.round(width / 2);
    const halfHeight = Math.round(height / 2);

    const clampedIconSize = Math.max(Math.min(iconSize, 1.0), 0.0);

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get 2D context');

    const radius = Math.min(halfWidth, halfHeight);

    /**
     * Fills the circular background before clipping and rendering the source
     * image.
     */
    ctx.beginPath();
    ctx.arc(halfWidth, halfHeight, radius, 0, Math.PI * 2);
    ctx.fillStyle = backgroundColor;
    ctx.fill();

    /**
     * Restricts the source icon to the previously created circular path.
     */
    ctx.save();
    ctx.clip();

    ctx.drawImage(
        icon,
        (width - width * clampedIconSize) / 2,
        (height - height * clampedIconSize) / 2,
        width * clampedIconSize,
        height * clampedIconSize,
    );

    ctx.restore();

    /**
     * Draws the marker tail from the bottom-center of the icon area to the bottom
     * edge of the canvas.
     */
    ctx.beginPath();
    ctx.strokeStyle = backgroundColor;
    ctx.lineWidth = 2;
    ctx.moveTo(halfWidth, height);
    ctx.lineTo(halfWidth, canvas.height);
    ctx.stroke();

    return canvas;
}
