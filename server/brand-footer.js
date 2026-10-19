// The family line every standalone Academy page carries: the SEO track shells
// (scripts/generate-shells.mjs), /cert (server.js), the /s share pages
// (server/share-routes.js) and the Wire post shells (server/wire/shell.js).
// /digest/unsubscribe (server/digest/routes.js) does not load academy.css, so
// it carries the same line as inline-styled text (FAMILY_ROW_INLINE_HTML)
// instead of this markup.
// Public facts sheet of 19 Oct 2026, section 2: every outlet shows the
// "Powered by Automatos AI" pill, and every site carries the one copyright
// form, "© 2026 Automatos AI". Same pill markup as the SPA footer in
// public/index.html; .ac-powered in academy.css (which each of these pages
// already loads) styles it. Static markup: nothing here is user input.

// The Automatos AI family row (Gerard, 19 Oct 2026; reverses the 6 Oct "no
// family column on product sites" rule). One small row at the bottom of the
// footer on every family site, the four sites in this order. The current
// site is shown but marked aria-current="page" instead of linking to itself.
// Plain links: no target, no rel. public/index.html carries the same row as
// static markup; tests/public-facts.test.mjs pins the two together.
export const FAMILY_LABEL = "The Automatos AI family";
export const FAMILY_SITES = Object.freeze([
  Object.freeze({ name: "Automatos AI", href: "https://automatos.app" }),
  Object.freeze({ name: "Automatos Studio", href: "https://studio.automatos.app" }),
  Object.freeze({ name: "Automatos Academy", href: "https://academy.automatos.app" }),
  Object.freeze({ name: "Automatos Markets", href: "https://markets.automatos.app" }),
]);
export const CURRENT_SITE = "Automatos Academy";

/** The family row as academy.css styles it (.ac-family). */
export function familyRowHtml(current = CURRENT_SITE) {
  const items = FAMILY_SITES.map(({ name, href }) => (name === current
    ? `<li><span aria-current="page">${name}</span></li>`
    : `<li><a href="${href}">${name}</a></li>`)).join("");
  return `<nav class="ac-family" aria-labelledby="ac-family-label">` +
    `<span class="ac-family-label" id="ac-family-label">${FAMILY_LABEL}</span>` +
    `<ul class="ac-family-links">${items}</ul></nav>`;
}

/** The same row for pages without academy.css: inline styles, white card. */
export function familyRowInlineHtml(current = CURRENT_SITE) {
  const items = FAMILY_SITES.map(({ name, href }) => (name === current
    ? `<span aria-current="page" style="font-weight:600;color:#1c2740;">${name}</span>`
    : `<a href="${href}" style="color:#40506e;">${name}</a>`)).join(" · ");
  return `<p style="margin:8px 0 0;font-size:12px;line-height:1.6;color:#5d6b85;">${FAMILY_LABEL}: ${items}</p>`;
}

export const FAMILY_ROW_HTML = familyRowHtml();
export const FAMILY_ROW_INLINE_HTML = familyRowInlineHtml();

export const BRAND_FOOTER_HTML =
  '<p><a class="ac-powered" href="https://automatos.app" target="_blank" rel="noopener">' +
  '<span class="ac-brand-mark" aria-hidden="true"></span>Powered by <strong>Automatos AI</strong></a></p>\n' +
  '  <p class="mono-label" style="margin-top:12px;text-transform:none;letter-spacing:0">© 2026 Automatos AI</p>\n' +
  `  ${FAMILY_ROW_HTML}`;
