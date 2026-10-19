// The family line every standalone Academy page carries: the SEO track shells
// (scripts/generate-shells.mjs), /cert (server.js), the /s share pages
// (server/share-routes.js) and the Wire post shells (server/wire/shell.js).
// /digest/unsubscribe (server/digest/routes.js) does not load academy.css, so
// it carries the same line as inline-styled text instead of this markup.
// Public facts sheet of 19 Oct 2026, section 2: every outlet shows the
// "Powered by Automatos AI" pill, and every site carries the one copyright
// form, "© 2026 Automatos AI". Same pill markup as the SPA footer in
// public/index.html; .ac-powered in academy.css (which each of these pages
// already loads) styles it. Static markup: nothing here is user input.
export const BRAND_FOOTER_HTML =
  '<p><a class="ac-powered" href="https://automatos.app" target="_blank" rel="noopener">' +
  '<span class="ac-brand-mark" aria-hidden="true"></span>Powered by <strong>Automatos AI</strong></a></p>\n' +
  '  <p class="mono-label" style="margin-top:12px;text-transform:none;letter-spacing:0">© 2026 Automatos AI</p>';
