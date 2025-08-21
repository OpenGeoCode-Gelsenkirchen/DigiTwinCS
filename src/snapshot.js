import {Math as CesiumMath} from '@cesium/engine';
import $ from 'jquery';
import jsPDF from 'jspdf';
import {app} from './Core/Application.js';
import {layerCollection} from './Core/LayerCollection.js';
import {loadSVG, svgToCanvas} from './Core/utilities.js';
import {Variables} from './global.js';
import {i18next} from './i18n.js';

/**
 * Viewer snapshot/print constants: used to control render resolution for higher quality output.
 * - targetResolutionScale: The scale factor applied during snapshot rendering (e.g., 2x for export).
 * - defaultResolutionScale: The normal application viewing scale (reset after snapshot).
 * @type {number}
 */
Variables.targetResolutionScale = 2.0;
Variables.defaultResolutionScale = 1.0;

/**
 * Dynamically inserts two snapshot (print) buttons into the UI, one for PDF export and one for PNG export.
 * Each is styled as a Cesium toolbar button with a "print" icon.
 * The first button is inserted into #printButton, the second into #printButton2.
 */
(function () {
    const printbutton = document.createElement('button');
    printbutton.id = 'snapshot';
    printbutton.title = 'Print Current View';
    printbutton.classList.add('cesium-button', 'cesium-toolbar-button');
    printbutton.innerHTML =
        '<img draggable="false" src="images/common/printbutton.svg" width="25" height="25" style="margin-top: 2.5px; margin-left: -0.5px;">';
    printbutton.style =
        'height: inherit; margin: 0px; box-shadow: unset; background: unset; border: unset;';
    $('#printButton')[0].insertBefore(printbutton, $('#printButton p')[0]);
    const printbutton2 = document.createElement('button');
    printbutton2.id = 'snapshot';
    printbutton2.title = 'Print Current View';
    printbutton2.classList.add('cesium-button', 'cesium-toolbar-button');
    printbutton2.innerHTML =
        '<img draggable="false" src="images/common/printbutton.svg" width="25" height="25" style="margin-top: 2.5px; margin-left: -0.5px;">';
    printbutton2.style =
        'height: inherit; margin: 0px; box-shadow: unset; background: unset; border: unset;';
    $('#printButton2')[0].insertBefore(printbutton2, $('#printButton2 p')[0]);
})();

/**
 * Asynchronously generates an HTMLImageElement from the given source/URL,
 * supporting either SVG (converted to canvas and rasterized) or PNG.
 *
 * @async
 * @param {string} source - The image (SVG/PNG) source path or data URL.
 * @param {number} [width=150] - Width for the generated image, for SVG sources.
 * @param {number} [height=150] - Height for the generated image, for SVG sources.
 * @returns {Promise<HTMLImageElement>} The rasterized or loaded image.
 */
async function generateImage(source, width = 150, height = 150) {
    if (source.endsWith('.svg')) {
        const svg = await loadSVG(source);
        const image = await svgToCanvas(svg, width, height);
        return image;
    } else if (source.endsWith('.png')) {
        const image = new Image();
        image.src = source;
        return image;
    }
}

/**
 * Handles snapshot→PDF export. Captures scene at double resolution, crops it to a square,
 * collects additional branding/assets, and uses jsPDF to create a PDF with meta info, date, and compass.
 * Restores viewer resolution after completion.
 */
$('#printButton')[0].addEventListener('click', async function () {
    // Set high resolution for export and re-render
    app.viewer.resolutionScale = Variables.targetResolutionScale;
    app.viewer.render();

    // calculate variables for cropping the image to a square
    const aspect =
        app.viewer.scene.canvas.width / app.viewer.scene.canvas.height;
    let sides = 0;
    let cropX = 0;
    let cropY = 0;
    if (aspect >= 1) {
        sides = app.viewer.scene.canvas.height;
        cropX =
            (app.viewer.scene.canvas.width - app.viewer.scene.canvas.height) /
            2;
        cropY = 0;
    } else if (aspect < 1) {
        sides = app.viewer.scene.canvas.width;
        cropX = 0;
        cropY =
            (app.viewer.scene.canvas.height - app.viewer.scene.canvas.width) /
            2;
    }

    // create Image from app.viewer.content (base64 encoded) and crop it to aspect 1:1
    const dataURL = app.viewer.scene.canvas.toDataURL('image/jpeg', 0.95);
    const cropped = new Image();
    const temp = new Image();
    temp.onload = start;
    temp.src = dataURL;

    function start() {
        const croppedURL = cropPlusExport(temp, cropX, cropY, sides, sides);
        cropped.src = croppedURL;
    }

    function cropPlusExport(temp, cropX, cropY, sides) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = sides;
        canvas.height = sides;
        ctx.drawImage(temp, cropX, cropY, sides, sides, 0, 0, sides, sides);
        return canvas.toDataURL('image/jpeg', 0.95);
    }

    // Wait (1s) so cropped image ready before making pdf
    setTimeout(async function () {
        const logo = await generateImage(app.config.pdfIcon, 800, 200);
        const compass = await generateImage(app.config.compass, 500, 500);

        // Timestamp string
        const current = new Date();
        const datetime = `${current.getFullYear()}${`0${current.getMonth() + 1}`.slice(-2)}${`0${current.getDate()}`.slice(-2)}-${`0${current.getHours()}`.slice(-2)}h${current.getMinutes()}`;

        // Correct compass math for rendering/overlay in PDF
        const degree = Math.floor(
            CesiumMath.toDegrees(app.viewer.camera.heading),
        );
        const degree2 = degree - 90;
        const dX = 20 * Math.sin((degree / 180) * Math.PI);
        const dY = 20 - 20 * Math.cos((degree / 180) * Math.PI);
        const dX_2 =
            10 *
            (Math.cos((degree2 / 180) * Math.PI) -
                Math.sin((degree2 / 180) * Math.PI));
        const dY_2 =
            10 *
            (Math.cos((degree / 180) * Math.PI) -
                Math.sin((degree / 180) * Math.PI));
        const newX = 186.5 + dX - dX_2;
        const newY = 33.5 - dY - dY_2;

        // Create and compose the PDF document
        const pdf = new jsPDF({
            orientation: 'p',
            unit: 'mm',
            format: 'a4',
            putOnlyUsedFonts: true,
            compress: true,
        });

        // Section: add header title
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(16);
        pdf.text(i18next.t('common:body.tools.print.pdf.title'), 9, 18, {
            align: 'left',
            baseline: 'bottom',
        });

        // Section: blue box for snapshot image
        pdf.setFillColor(0, 110, 167);
        pdf.rect(9, 19, 192, 192, 'F');

        // Section: snapshot
        pdf.addImage(cropped, 'jpeg', 10, 20, 190, 190);
        pdf.addImage(logo, 'png', 150, 274, 50, 13);

        // Section: contact headline and text
        pdf.setFontSize(12);
        pdf.text(i18next.t('common:body.tools.print.pdf.contact'), 9, 262, {
            align: 'left',
            baseline: 'bottom',
        });

        // add contacts
        pdf.setFont('helvetica', 'normal');
        pdf.text(
            i18next.t('common:body.tools.print.pdf.contact-content'),
            35,
            262,
            {
                align: 'left',
                baseline: 'bottom',
            },
        );

        pdf.text(
            `${`0${current.getDate()}`.slice(-2)}.${`0${current.getMonth() + 1}`.slice(-2)}.${current.getFullYear()}`,
            201,
            216,
            {align: 'right', baseline: 'bottom'},
        );

        // Section: add compass with background
        pdf.setFillColor(72, 72, 72);
        pdf.setGState(new pdf.GState({opacity: 0.3}));
        pdf.circle(186.5, 33.5, 10, 'F');
        pdf.setGState(new pdf.GState({opacity: 1.0}));
        pdf.addImage(
            compass,
            'png',
            newX,
            newY,
            20,
            20,
            'COMPASS',
            'NONE',
            degree,
        );

        // Section: license/information
        pdf.setFont('helvetica', 'italic');
        pdf.setFontSize(14);
        pdf.setTextColor(100, 100, 100);

        if (
            layerCollection.getContentByTags(['internalOnly']).some(l => l.show)
        ) {
            pdf.text(
                i18next.t('common:body.tools.print.pdf.internal-license'),
                105,
                236,
                {
                    align: 'center',
                    baseline: 'middle',
                },
            );
        } else {
            pdf.text(
                i18next.t('common:body.tools.print.pdf.license'),
                105,
                236,
                {
                    align: 'center',
                    baseline: 'middle',
                },
            );
        }

        pdf.save(
            `${i18next.t('common:body.tools.print.pdf.file-prefix')}${datetime}.pdf`,
        );
    }, 1000);

    // Reset viewer resolution to default after rendering
    app.viewer.resolutionScale = Variables.defaultResolutionScale;
});

/**
 * Handles snapshot→PNG export. Captures scene at double resolution and saves PNG image at base quality.
 * Resets viewer resolution to normal after export.
 */
$('#printButton2')[0].addEventListener('click', function () {
    app.viewer.resolutionScale = Variables.targetResolutionScale;
    app.viewer.render();

    // Get PNG image data of current viewer
    const dataURL = app.viewer.scene.canvas.toDataURL('image/png');

    // Create timestamp
    const current = new Date();
    const datetime = `${current.getFullYear()}${`0${current.getMonth() + 1}`.slice(-2)}${`0${current.getDate()}`.slice(-2)}-${`0${current.getHours()}`.slice(-2)}h${current.getMinutes()}`;

    // Save PNG file
    const link = document.createElement('a');
    link.href = dataURL;
    link.download = `${i18next.t('common:body.tools.print.png.file-prefix')}${datetime}.png`;
    link.click();

    // resolution of app.viewer.back to default
    app.viewer.resolutionScale = Variables.defaultResolutionScale;
});
