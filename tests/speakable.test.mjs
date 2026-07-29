#!/usr/bin/env node
// PRD-VOICE §4.2 — the speakable transform, node port. What these tests pin is
// the OUTPUT CONTRACT shared with the app's src/audio/speakable.ts: same
// section announcements, same First/Next/Finally list narration, and above all
// the same absolute rule that fenced code is ANNOUNCED, never read. The mass
// audio job (§8.1) runs THIS transform before any TTS engine sees the text —
// a regression here becomes 19 hours of a voice reading JSON aloud.

import {
  MAX_SEGMENT_CHARS,
  SPOKEN,
  inlineText,
  narrateList,
  speakableLesson,
  speakableMarkdown,
  speechifyCode,
  splitLongText,
} from "../server/audio/speakable.js";

let pass = 0, fail = 0;
const ok = (cond, msg) => (cond ? (pass++, console.log("  ✓ " + msg)) : (fail++, console.error("  ✗ " + msg)));

console.log("inline spans collapse to their words");
{
  ok(inlineText("use `sessions.create()` **once**") === "use sessions create once",
    "inline code is SPEECH-NORMALISED (dots/parens → natural words), bold collapses");
  ok(inlineText("see [the docs](https://x.y) for more") === "see the docs for more", "links speak their text, never the URL");
  ok(inlineText("![diagram](img.png) then act") === "then act", "images say nothing");
  ok(inlineText("  spaced\t\tout  ") === "spaced out", "whitespace normalised");
}

console.log("speechifyCode — code a mouth can say (the robot-voice fix)");
{
  ok(speechifyCode("sessions.create()") === "sessions create", "call syntax → natural words");
  ok(speechifyCode("maxTokens") === "max Tokens".replace(" T", " T") && speechifyCode("maxTokens").toLowerCase() === "max tokens", "camelCase splits");
  ok(speechifyCode("snake_case_name") === "snake case name", "snake_case splits");
  ok(speechifyCode("a/b#c>d") === "a b c d", "path punctuation → spaces");
  ok(speechifyCode("MCP") === "MCP" && speechifyCode("RAG") === "RAG", "plain jargon terms untouched");
}

console.log("boldTag — engine-scoped emphasis, OFF by default (device TTS reads brackets)");
{
  ok(!inlineText("this is **vital** now").includes("["), "default: no tags anywhere");
  ok(inlineText("this is **vital** now", { boldTag: "[emphasis]" }) === "this is [emphasis] vital now",
    "Fish lane: short bold → [emphasis] words");
  const long = inlineText("**a fully bolded sentence of many words here**", { boldTag: "[emphasis]" });
  ok(!long.includes("[emphasis]"), "bold runs over 4 words stay plain — tagged sentences read as melodrama");
  ok(speakableMarkdown("- **key** point\n- b\n", { boldTag: "[emphasis]" })[0].includes("[emphasis] key"),
    "opts thread through lists");
}

console.log("fenced code — announced once, NEVER read (the load-bearing rule)");
{
  const md = "Intro line.\n\n```python\nsecret = os.getenv('KEY')\nprint(secret)\n```\n\nAfter.";
  const spoken = speakableMarkdown(md);
  ok(spoken.includes(SPOKEN.codeSample), "the announcement line is spoken");
  ok(!spoken.join(" ").includes("os.getenv"), "code content never reaches the voice");
  ok(spoken.filter((s) => s === SPOKEN.codeSample).length === 1, "announced ONCE per fence, not at open and close");
  ok(spoken[spoken.length - 1] === "After.", "prose resumes after the fence");
  const tildes = speakableMarkdown("~~~\nhidden()\n~~~");
  ok(tildes.length === 1 && tildes[0] === SPOKEN.codeSample && !tildes.join(" ").includes("hidden"), "~~~ fences behave identically");
}

console.log("headings become section announcements");
{
  const spoken = speakableMarkdown("## The #1 anti-pattern\n\nBody.");
  ok(spoken[0] === `${SPOKEN.sectionPrefix} The #1 anti-pattern.`, "heading announced with the section prefix");
  ok(spoken[1] === "Body.", "body follows");
}

console.log("lists narrate First / Next / Finally");
{
  const spoken = speakableMarkdown("- alpha\n- beta\n- gamma\n");
  ok(spoken.length === 3, "one segment per item");
  ok(spoken[0] === `${SPOKEN.listFirst} alpha` && spoken[1] === `${SPOKEN.listNext} beta` && spoken[2] === `${SPOKEN.listFinally} gamma`, "leads match the app's register");
  ok(speakableMarkdown("- only one\n")[0] === "only one", "a single item reads plainly, no lead");
  const numbered = speakableMarkdown("1. one\n2. two\n");
  ok(numbered[0].startsWith(SPOKEN.listFirst) && numbered[1].startsWith(SPOKEN.listFinally), "numbered lists narrate the same way");
}

console.log("long paragraphs split on sentence boundaries");
{
  const sentence = "This sentence is repeated to exceed the cap. ";
  const long = sentence.repeat(60); // ~2700 chars
  const parts = splitLongText(long.trim());
  ok(parts.length > 1, "splits at all");
  ok(parts.every((p) => p.length <= MAX_SEGMENT_CHARS), "every part under the utterance cap");
  ok(parts.join(" ").replace(/\s+/g, " ").trim() === long.replace(/\s+/g, " ").trim(), "no words lost in the split");
  const wall = "x".repeat(MAX_SEGMENT_CHARS * 2 + 10);
  ok(splitLongText(wall).every((p) => p.length <= MAX_SEGMENT_CHARS), "a pathological single sentence still hard-splits");
}

console.log("whole lesson: title first, then the body");
{
  const spoken = speakableLesson("Agents & tools", "Line one.");
  ok(spoken[0] === "Agents & tools." && spoken[1] === "Line one.", "title announced, body follows");
  ok(speakableLesson("", "Body.").length === 1, "empty title drops out");
  ok(speakableMarkdown(null).length === 0 && speakableMarkdown("").length === 0, "null/empty markdown is silence, not a crash");
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
