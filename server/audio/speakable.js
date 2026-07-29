// Speakable text (PRD-VOICE §4.2) — the node port of the app's shipped
// transform (automatos-academy-app src/audio/speakable.ts), for publish-time
// audio generation. Same semantics on purpose: a learner who hears a lesson
// on the phone and again on the web must hear the SAME lesson.
//
//   headings   → "Section: <text>."           (announced, never bare)
//   lists      → "First: … Next: … Finally:"  (one segment per item)
//   fenced code→ "Code sample — it's on screen when you want it."  (NEVER read
//                aloud — syntax is unlistenable; this line is the whole reason
//                the transform must run BEFORE any TTS engine sees the text)
//   inline     → `code`/**bold**/*em*/[links] collapse to their text
//
// Pure and dependency-free: raw lesson markdown in, spoken segments out.
// The app walks its parsed block model; this port walks the markdown directly
// (the web repo has no shared block parser in node) — the OUTPUT contract is
// what both sides pin in tests, not the walk.

export const MAX_SEGMENT_CHARS = 1800;

export const SPOKEN = {
  sectionPrefix: "Section:",
  listFirst: "First:",
  listNext: "Next:",
  listFinally: "Finally:",
  codeSample: "Code sample — it's on screen when you want it.",
};

/**
 * Inline code → something a mouth can say. `sessions.create()` spoken
 * literally is "sessions dot create open paren" — the robot voice everyone
 * hates. Deterministic normalisation instead: dots/underscores/slashes become
 * spaces, camelCase splits, call/bracket noise drops. `sessions.create()` →
 * "sessions create"; `maxTokens` → "max tokens"; plain terms (`MCP`, `RAG`)
 * pass through untouched. Shared semantics — device TTS robot-reads the same
 * spans, so this is for every engine, not a Fish decoration.
 */
export function speechifyCode(code) {
  return String(code ?? "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")            // camelCase → camel Case
    .replace(/[._/\\:#>-]+/g, " ")                     // path/call punctuation → space
    .replace(/[(){}[\]<>;,`'"|=+*!?$%^&~@]+/g, " ")    // symbol noise → space
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * inline markdown → speakable text.
 *
 * opts.boldTag — ENGINE-SCOPED, default null: when set (the Fish lane passes
 * "[emphasis]"), short bold runs become `[emphasis] <words>` — the author's
 * bold already marks what deserves stress, so it is a free, deterministic tag
 * source. Only runs of ≤ 4 words are tagged (a whole bolded sentence tagged
 * reads as melodrama); longer runs stay plain. NEVER the default: the app's
 * device TTS would read the bracket literally.
 */
export function inlineText(s, opts = {}) {
  const boldTag = opts.boldTag ?? null;
  const bold = (words) => {
    const text = String(words).trim();
    if (!boldTag) return text;
    return text.split(/\s+/).length <= 4 ? `${boldTag} ${text}` : text;
  };
  return String(s ?? "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")              // images: nothing to say
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")           // links → their text
    .replace(/`([^`]*)`/g, (_, code) => ` ${speechifyCode(code)} `) // code → speech
    .replace(/\*\*([^*]+)\*\*/g, (_, w) => bold(w))    // bold → words (or tagged)
    .replace(/\*([^*]+)\*/g, "$1")                     // emphasis
    .replace(/__([^_]+)__/g, (_, w) => bold(w))
    .replace(/\s+/g, " ")
    .trim();
}

/** split one long text into ≤ MAX_SEGMENT_CHARS chunks on sentence
 *  boundaries (a pathological single sentence still hard-splits) —
 *  ported verbatim from the app's splitLongText */
export function splitLongText(text) {
  if (text.length <= MAX_SEGMENT_CHARS) return [text];
  const sentences = text.match(/[^.!?]+[.!?]*\s*/g) ?? [text];
  const out = [];
  let current = "";
  for (const sentence of sentences) {
    if (sentence.length > MAX_SEGMENT_CHARS) {
      if (current.trim()) { out.push(current.trim()); current = ""; }
      for (let at = 0; at < sentence.length; at += MAX_SEGMENT_CHARS) {
        const piece = sentence.slice(at, at + MAX_SEGMENT_CHARS).trim();
        if (piece) out.push(piece);
      }
      continue;
    }
    if (current && current.length + sentence.length > MAX_SEGMENT_CHARS) {
      out.push(current.trim());
      current = "";
    }
    current += sentence;
  }
  if (current.trim()) out.push(current.trim());
  return out;
}

/** narrate list items — one spoken segment per item; a single item reads
 *  plainly; empties drop out (app parity) */
export function narrateList(items, opts = {}) {
  const spoken = items.map((i) => inlineText(i, opts)).filter((i) => i.length > 0);
  if (spoken.length <= 1) return spoken;
  return spoken.map((text, i) => {
    const lead = i === 0 ? SPOKEN.listFirst
      : i === spoken.length - 1 ? SPOKEN.listFinally
      : SPOKEN.listNext;
    return `${lead} ${text}`;
  });
}

/**
 * Raw lesson markdown → spoken segments.
 *
 * A line-walker rather than a full parser, on purpose: lessons are authored
 * markdown-lite (headings, paragraphs, lists, fences) and every construct
 * this misses degrades to "read the line as prose", which is the safe
 * failure. Fenced code is the one construct that must NEVER degrade that
 * way, so fences are handled first and absolutely.
 */
export function speakableMarkdown(markdown, opts = {}) {
  const segments = [];
  const lines = String(markdown ?? "").split("\n");
  let inFence = false;
  let paragraph = [];
  let list = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    const text = inlineText(paragraph.join(" "), opts);
    if (text) segments.push(...splitLongText(text));
    paragraph = [];
  };
  const flushList = () => {
    if (!list.length) return;
    segments.push(...narrateList(list, opts));
    list = [];
  };

  for (const raw of lines) {
    const line = raw ?? "";
    if (/^\s*(```|~~~)/.test(line)) {
      flushParagraph(); flushList();
      if (!inFence) segments.push(SPOKEN.codeSample);   // announce ONCE, at open
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;                              // never read syntax aloud

    const heading = line.match(/^\s*#{1,6}\s+(.*)$/);
    if (heading) {
      flushParagraph(); flushList();
      const text = inlineText(heading[1], opts);
      if (text) segments.push(`${SPOKEN.sectionPrefix} ${text}.`);
      continue;
    }
    const item = line.match(/^\s*(?:[-*+]|\d+[.)])\s+(.*)$/);
    if (item) {
      flushParagraph();
      list.push(item[1]);
      continue;
    }
    if (!line.trim()) { flushParagraph(); flushList(); continue; }
    flushList();
    paragraph.push(line.trim());
  }
  flushParagraph(); flushList();
  return segments;
}

/** whole-lesson convenience: title announced first, then the body */
export function speakableLesson(title, markdown, opts = {}) {
  const head = inlineText(title);
  return [...(head ? [`${head}.`] : []), ...speakableMarkdown(markdown, opts)];
}
