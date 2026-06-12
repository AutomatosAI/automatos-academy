// Small shared building blocks for list-style sections.
import { el } from "../ui.js";
import { md } from "../markdown.js";

export const subhead = (t) =>
  el("h2", { class: "serif-i", style: { fontSize: "26px", margin: "40px 0 14px" }, text: t });

export function linkList(items) {
  return el("div", { class: "res-list" }, items.map((it) =>
    el("a", { class: "res-row", href: it.href }, [
      el("span", { class: "kind", text: it.kind || "Open" }),
      el("div", {}, [
        el("div", { class: "serif", style: { fontSize: "18px" }, text: it.label }),
        it.note ? el("div", { class: "ann", text: it.note }) : null,
      ]),
      el("span", { class: "arr serif-i", text: "→" }),
    ])
  ));
}

export function resList(resources) {
  return el("div", { class: "res-list" }, resources.map((r) =>
    el("a", { class: "res-row", href: r.url, target: "_blank", rel: "noopener" }, [
      el("span", { class: "kind", text: (r.kind || "link").replace(/-/g, " ") }),
      el("div", {}, [
        el("div", { class: "serif", style: { fontSize: "18px" }, text: r.title }),
        r.annotation ? el("div", { class: "ann", html: md(r.annotation).replace(/^<p>|<\/p>$/g, "") }) : null,
      ]),
      el("span", { class: "arr serif-i", text: "↗" }),
    ])
  ));
}
