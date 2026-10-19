// The footer every standalone Academy page carries (pill, copyright, the
// legal links, then the family row): the SEO track shells
// (scripts/generate-shells.mjs), /cert (server.js), the /s share pages
// (server/share-routes.js) and the Wire post shells (server/wire/shell.js).
// /digest/unsubscribe (server/digest/routes.js) does not load academy.css, so
// it carries the same links as inline-styled rows (LEGAL_ROW_INLINE_HTML, then
// FAMILY_ROW_INLINE_HTML) instead of this markup.
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

// The legal links (public facts sheet 8b): Terms, Privacy, Cookies and EU AI
// Act on every site, on automatos.app where a site has no page of its own.
// The Academy has its own privacy policy (the App Store and Play listings
// link it), so Privacy stays on /privacy; Terms, Cookies and the EU AI Act
// page are automatos.app's. The SPA footer's Legal column (public/index.html)
// carries the same links, labels and order as static markup;
// tests/public-facts.test.mjs pins the two together. The ↗ that marks a new
// tab is aria-hidden, so each link's name is its label ("EU AI Act").
export const LEGAL_LINKS = Object.freeze([
  Object.freeze({ label: "Privacy", href: "/privacy" }),
  Object.freeze({ label: "Terms", href: "https://automatos.app/terms" }),
  Object.freeze({ label: "Cookies", href: "https://automatos.app/cookies" }),
  Object.freeze({ label: "EU AI Act", href: "https://automatos.app/eu-ai-act" }),
]);

/** One legal link: off-site ones open a new tab with the ↗ mark. `style` is
 *  for pages without academy.css; only a non-empty string adds the attribute,
 *  so `.map(legalLinkHtml)` (index as the 2nd argument) stays unstyled. */
export function legalLinkHtml({ label, href }, style = "") {
  const css = typeof style === "string" && style ? ` style="${style}"` : "";
  return href.startsWith("https://")
    ? `<a href="${href}" target="_blank" rel="noopener"${css}>${label}<span aria-hidden="true"> ↗</span></a>`
    : `<a href="${href}"${css}>${label}</a>`;
}

/** The legal row for the standalone pages, styled by .ac-legal-links in academy.css. */
export function legalRowHtml() {
  const items = LEGAL_LINKS.map((link) => `<li>${legalLinkHtml(link)}</li>`).join("");
  return `<nav class="ac-legal" aria-label="Legal"><ul class="ac-legal-links">${items}</ul></nav>`;
}

export const LEGAL_ROW_HTML = legalRowHtml();

/** The same links for pages without academy.css: inline styles, white card,
 *  set like the inline family row below it. */
export function legalRowInlineHtml() {
  const items = LEGAL_LINKS.map((link) => legalLinkHtml(link, "color:#40506e;")).join(" · ");
  return `<nav aria-label="Legal" style="margin:8px 0 0;font-size:12px;line-height:1.6;color:#5d6b85;">${items}</nav>`;
}

export const LEGAL_ROW_INLINE_HTML = legalRowInlineHtml();

export const BRAND_FOOTER_HTML =
  '<p><a class="ac-powered" href="https://automatos.app" target="_blank" rel="noopener">' +
  '<span class="ac-brand-mark" aria-hidden="true"></span>Powered by <strong>Automatos AI</strong></a></p>\n' +
  '  <p class="mono-label" style="margin-top:12px;text-transform:none;letter-spacing:0">© 2026 Automatos AI</p>\n' +
  `  ${LEGAL_ROW_HTML}\n` +
  `  ${FAMILY_ROW_HTML}`;
