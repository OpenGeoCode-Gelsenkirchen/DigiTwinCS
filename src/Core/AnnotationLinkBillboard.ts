/**
 * Renders a text label into a canvas suitable for use as a Cesium billboard
 * image.
 *
 * @param text - Text rendered in the billboard label.
 * @param options - Optional font, color, padding, and text-outline settings.
 * @returns Canvas containing the rendered rounded label.
 *
 *
 * The canvas dimensions are derived from the measured text width and an
 * estimated font size. The resulting image can be passed directly to Cesium:
 *
 * @example
 * ```ts
 * const canvas = createAnnotationLinkBillboard('Open documentation', {
 *   font: '600 16px sans-serif',
 *   textColor: '#ffffff',
 *   backgroundColor: '#1d4ed8cc',
 *   padding: 8,
 * });
 *
 * billboard.image = canvas;
 * ```
 */
export function createAnnotationLinkBillboard(
    text: string,
    options: {
        font?: string;
        textColor?: string;
        backgroundColor?: string;
        padding?: number;
        borderColor?: string;
    } = {},
) {
    //nullish coalescing operator because attributes can be undefined OR null
    const font = options.font ?? '20px sans serif';
    const textColor = options.textColor ?? '#FFFFFF';
    const backgroundColor = options.backgroundColor ?? '#00000055';
    const padding = options.padding ?? 6;

    const borderColor = options.borderColor;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    ctx.font = font;

    const measured = ctx.measureText(text);
    const fontSize = parseInt(font);

    canvas.width = measured.width + padding * 2;
    canvas.height = fontSize + padding * 2;

    ctx.fillStyle = backgroundColor; //'#00000055';
    //ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.roundRect(0, 0, canvas.width, canvas.height, 12);
    ctx.fill();

    ctx.font = font;
    ctx.fillStyle = textColor;
    ctx.fillText(text, padding, fontSize + padding / 2);

    if (borderColor) {
        ctx.strokeStyle = borderColor;
        ctx.strokeText(text, padding, fontSize + padding / 2);
    }

    return canvas;
}
