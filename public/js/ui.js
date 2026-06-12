// Tiny DOM helpers. No framework — just ergonomic element construction.

export function el(tag, attrs = {}, children = []) {
  const n = document.createElement(tag);
  for (const k in attrs) {
    const v = attrs[k];
    if (v == null || v === false) continue;
    if (k === "class") n.className = v;
    else if (k === "html") n.innerHTML = v;
    else if (k === "text") n.textContent = v;
    else if (k === "dataset") Object.assign(n.dataset, v);
    else if (k === "style" && typeof v === "object") Object.assign(n.style, v);
    else if (k.startsWith("on") && typeof v === "function") n.addEventListener(k.slice(2).toLowerCase(), v);
    else n.setAttribute(k, v === true ? "" : v);
  }
  const kids = Array.isArray(children) ? children : [children];
  for (const c of kids) {
    if (c == null || c === false) continue;
    n.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  }
  return n;
}

export function frag(...nodes) {
  const f = document.createDocumentFragment();
  nodes.flat().forEach((x) => {
    if (x == null || x === false) return;
    f.appendChild(typeof x === "string" ? document.createTextNode(x) : x);
  });
  return f;
}

export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
  return node;
}

// label/value pair with mono kicker (used everywhere)
export function kicker(text) {
  return el("span", { class: "mono-label", text });
}

// Map a letter grade to its seal modifier class.
export function sealClass(grade) {
  const g = (grade || "").toUpperCase();
  if (g === "A+") return "s-aplus";
  if (g.startsWith("A")) return "s-a";
  if (g.startsWith("B")) return "s-b";
  if (g === "C") return "s-c";
  if (g === "D") return "s-d";
  return "s-f";
}

// A grade seal element.
export function seal(grade, label = "Readiness", size = "") {
  return el("div", { class: `seal ${sealClass(grade)} ${size}`.trim() }, [
    el("span", { class: "g", text: grade || "—" }),
    label ? el("span", { class: "gl", text: label }) : null,
  ]);
}

// Progress ring (0..100).
export function ring(pct) {
  const p = Math.max(0, Math.min(100, Math.round(pct)));
  const r = el("div", { class: "ring", style: { "--p": String(p) } }, [
    el("span", { text: p + "%" }),
  ]);
  return r;
}

export const fmtTime = (sec) => {
  const m = Math.floor(sec / 60), s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};
