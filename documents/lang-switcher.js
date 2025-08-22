import {JSX} from 'typedoc';

const dropdownTemplate = `
<select onchange="location.href = event.target.selectedOptions[0].dataset.url;">
  <option data-url="/en/{PAGE}" lang="en">English</option>
  <option data-url="/de/{PAGE}" lang="de">Deutsch</option>
</select>
`;

export function load(app) {
    app.renderer.hooks.on('pageSidebar.begin', context => {
        const currentLang = app.options.getValue('lang');
        const html = dropdownTemplate
            .replace(`lang="${currentLang}"`, `lang="${currentLang}" selected`)
            .replace(/{PAGE}/g, context.page.url);
        return JSX.createElement(JSX.Raw, {html});
    });
}
