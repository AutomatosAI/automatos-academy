// Structured data (schema.org JSON-LD) shared by every Academy page that
// carries it: the SPA shell (public/index.html, static copy pinned by
// tests/public-facts.test.mjs), the SEO track shells
// (scripts/generate-shells.mjs) and the Wire post shells (server/wire/shell.js).
//
// One Organization entity across the four family sites (Gerard, 19 Oct 2026):
// automatos.app, studio.automatos.app, academy.automatos.app and
// markets.automatos.app each describe the same node by the same @id. The
// Academy describes itself as an EducationalOrganization whose
// parentOrganization points at that @id.
//
// What the node may say (public facts sheet of 19 Oct 2026, section 2):
// name "Automatos AI", no legalName, no address, no founding claims. The logo
// is the mark automatos.app serves (and its own Organization node uses); the
// sameAs profiles are the X, Instagram, LinkedIn and GitHub links on the
// automatos.app footer (GitHub as the org profile, github.com/AutomatosAI).
// Each returned 200 on 19 Oct 2026.
export const AUTOMATOS_ORG_ID = "https://automatos.app/#organization";

export const AUTOMATOS_ORGANIZATION = Object.freeze({
  "@type": "Organization",
  "@id": AUTOMATOS_ORG_ID,
  name: "Automatos AI",
  url: "https://automatos.app",
  logo: "https://automatos.app/images/automatos-mark-black.png",
  sameAs: Object.freeze([
    "https://x.com/automatosai",
    "https://www.instagram.com/automatosai",
    "https://www.linkedin.com/company/automatos-ai",
    "https://github.com/AutomatosAI",
  ]),
});

export const ACADEMY_URL = "https://academy.automatos.app";

/** The Academy as an EducationalOrganization under Automatos AI. */
export function academyOrganization(base = ACADEMY_URL) {
  return {
    "@type": "EducationalOrganization",
    "@id": `${base}/#academy`,
    name: "Automatos Academy",
    url: base,
    parentOrganization: { "@id": AUTOMATOS_ORG_ID },
  };
}

/** Wrap page entities in a graph that also defines the shared Organization,
 *  so every parentOrganization reference resolves inside the same document. */
export function pageJsonLd(...nodes) {
  return {
    "@context": "https://schema.org",
    "@graph": [AUTOMATOS_ORGANIZATION, ...nodes],
  };
}

/** The site-wide graph the SPA shell carries in its <head>. */
export function siteJsonLd(base = ACADEMY_URL) {
  return pageJsonLd(academyOrganization(base));
}
