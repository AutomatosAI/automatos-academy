// Mini-video payload → slides and timings (PRD-WAVE-LIVING-ACADEMY LA-14).
//
// Lane 2's second renderer, and the pure half of it — same split as LA-9's
// infographic module and for the same reason: the renderer is a browser plus
// an encoder, neither of which a node test can reach, so everything decidable
// WITHOUT them is decided here. What the slot is called, how many slides there
// are, how long each one is on screen, and whether a payload can be filmed at
// all are all answered by this file.
//
// D-LA7 chose ffmpeg-composited slides over Remotion (a licence tripwire under
// load-bearing infra) and Motion Canvas (still wants a UI button press, which
// FR-5 forbids). So a mini-video here is not an animation: it is the LA-9
// renderer's typography, one thought per slide, crossfaded. That is a
// deliberate ceiling, not a shortcut — the upgrade path if motion quality ever
// bites is Revideo, never Remotion.
//
// FR-5 (deterministic: same payload → same output) is why this module is pure,
// never reads a clock, and rounds every duration to whole frames. A timeline
// computed in floats would drift by an encoder frame between runs on different
// machines, and "same payload → same bytes" would quietly stop being true.

/** vertical — the 9:16 every short-form surface wants. The infographic's 4:5
 *  is a feed card; this is a full screen. */
export const MINIVIDEO_SIZE = { w: 1080, h: 1920 };

export const MINIVIDEO_LIMITS = {
  titleMax: 68,
  eyebrowMax: 24,
  pointMax: 88,
  // Three, not the infographic's two: a two-point video is a slideshow with
  // one idea in it, and would not fill the format's minimum runtime without
  // padding that the viewer reads as dead air.
  minPoints: 3,
  maxPoints: 5,
  sourceMax: 72,
};

export const MINIVIDEO_TIMING = {
  fps: 30,
  /** crossfade between slides. Long enough to read as a transition, short
   *  enough that it never eats a word. */
  fadeSeconds: 0.4,
  /** a slide has to be noticed before it can be read */
  leadSeconds: 1.6,
  wordsPerMinute: 190,
  minSlideSeconds: 2.8,
  maxSlideSeconds: 7.0,
  /** PRD §LA-14: 20–40s. Under it the video is a GIF; over it nobody finishes. */
  minTotalSeconds: 20,
  maxTotalSeconds: 40,
};

const clean = (v) => String(v == null ? "" : v).replace(/\s+/g, " ").trim();
const words = (s) => (s ? s.split(" ").filter(Boolean).length : 0);
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

/** Whole frames, so a timeline is exactly representable in the encoder. */
const toFrames = (seconds, fps) => Math.max(1, Math.round(seconds * fps));
const toSeconds = (frames, fps) => frames / fps;

/**
 * The slot a mini-video binds to: `mv-<domainId>-<n>`, 1-based.
 *
 * `mv-` was reserved by LA-9 and already maps to the `video` family in
 * server/media/validate.js, so this needs no new vocabulary — same assertion
 * on the domain id, because a slot id with a slash in it would escape the
 * `academy/<vendor>/<track>/` prefix the presign path locks writes to.
 */
export function minivideoSlotId(domainId, index) {
  const id = clean(domainId);
  if (!/^[a-z0-9][a-z0-9-]*$/i.test(id)) return null;
  const n = Number(index);
  if (!Number.isInteger(n) || n < 1 || n > 99) return null;
  return `mv-${id}-${n}`;
}

/**
 * Normalise a verified draft payload into render parameters.
 *
 * Intentionally the same shape as an infographic payload: the factory drafts
 * ONE verified payload and both renderers can film it. A card that has earned
 * an infographic has earned a mini-video, and asking the playbook to write the
 * same facts twice would be two things to keep in sync and two things to
 * fact-check.
 *
 * @returns { ok:true, params } | { ok:false, error, note? }
 */
export function toRenderParams(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { ok: false, error: "bad_payload" };
  }
  const L = MINIVIDEO_LIMITS;

  const title = clean(payload.title);
  if (!title) return { ok: false, error: "title_required" };
  if (title.length > L.titleMax) {
    return { ok: false, error: "title_too_long", note: `${title.length} > ${L.titleMax}` };
  }

  const rawPoints = Array.isArray(payload.points) ? payload.points : [];
  const points = rawPoints.map(clean).filter((p) => p.length > 0);
  if (points.length < L.minPoints) {
    return { ok: false, error: "too_few_points", note: `${points.length} < ${L.minPoints}` };
  }
  if (points.length > L.maxPoints) {
    return { ok: false, error: "too_many_points", note: `${points.length} > ${L.maxPoints}` };
  }
  const over = points.find((p) => p.length > L.pointMax);
  if (over) return { ok: false, error: "point_too_long", note: `"${over.slice(0, 40)}…"` };

  const eyebrow = clean(payload.eyebrow).slice(0, L.eyebrowMax);
  const source = clean(payload.source).slice(0, L.sourceMax);

  return { ok: true, params: { title, points, eyebrow, source, ...MINIVIDEO_SIZE } };
}

/**
 * Render params → the slides that get filmed.
 *
 * One thought per slide, in the order the payload wrote them: a title card
 * that states the claim, then one slide per point, then an end card carrying
 * the source. No slide holds two points — the whole reason this format works
 * on a phone is that the viewer never chooses what to read.
 */
export function toSlides(params) {
  const slides = [{ role: "title", title: params.title, text: "" }];
  for (const point of params.points) slides.push({ role: "point", title: params.title, text: point });
  slides.push({ role: "end", title: params.title, text: params.source || "" });
  // Position is a property of the slide, not of the timeline, so it is stamped
  // here — otherwise `toRenderQuery` would silently emit `index=undefined` for
  // anyone who passed slides straight from this function rather than from a
  // plan, and every such slide would render the same counter.
  return slides.map((s, index) => ({ ...s, index }));
}

/**
 * Slides → a timeline in whole frames.
 *
 * Each slide gets the time it takes to notice plus the time it takes to read,
 * clamped. Then the whole thing is stretched or refused to land inside the
 * format's runtime band:
 *
 *   too short → stretch every slide toward its own ceiling. A 3-point video of
 *     terse points is genuinely brief, and padding it evenly reads as pacing;
 *     padding the last slide alone reads as a stall.
 *   still too short with everything at its ceiling → the end card absorbs the
 *     remainder. It carries no sentence to read, so dwelling on it costs the
 *     viewer nothing.
 *   too long → REFUSED, never trimmed. Same rule as the infographic's text
 *     ceilings: a payload that cannot be filmed correctly is a rejected
 *     payload, not a video that cuts off mid-sentence.
 *
 * That last branch is a GUARD, not a routine path: five points of 88
 * characters is about 39s, so today's MINIVIDEO_LIMITS already keep every
 * legal payload inside the band and nothing a validator accepts can trip it.
 * It stays because the two ceilings are set independently — raise `maxPoints`
 * or `pointMax` without re-checking the runtime and this is what catches it,
 * instead of a 46-second video nobody finishes. The test exercises it with a
 * tightened timing rather than a payload, because there is no legal payload
 * that reaches it.
 *
 * Crossfades overlap, so the finished runtime is the sum of the slides minus
 * one fade per join.
 */
export function planTimeline(slides, timing = MINIVIDEO_TIMING) {
  const T = timing;
  const fadeFrames = toFrames(T.fadeSeconds, T.fps);
  const minFrames = toFrames(T.minSlideSeconds, T.fps);
  const maxFrames = toFrames(T.maxSlideSeconds, T.fps);

  const natural = slides.map((s) => {
    const readSeconds = words(s.text || s.title) / T.wordsPerMinute * 60;
    return clamp(toFrames(T.leadSeconds + readSeconds, T.fps), minFrames, maxFrames);
  });

  // Overlapped runtime: every join eats one fade.
  const joins = Math.max(0, slides.length - 1);
  const runtime = (frames) => frames.reduce((a, b) => a + b, 0) - joins * fadeFrames;

  const minTotal = toFrames(T.minTotalSeconds, T.fps);
  const maxTotal = toFrames(T.maxTotalSeconds, T.fps);

  let frames = natural.slice();
  if (runtime(frames) > maxTotal) {
    return {
      ok: false,
      error: "too_long_for_format",
      note: `${toSeconds(runtime(frames), T.fps).toFixed(1)}s > ${T.maxTotalSeconds}s`,
    };
  }

  if (runtime(frames) < minTotal) {
    // Stretch proportionally toward each slide's own ceiling.
    const deficit = minTotal - runtime(frames);
    const headroom = frames.map((f) => maxFrames - f);
    const totalHeadroom = headroom.reduce((a, b) => a + b, 0);
    if (totalHeadroom > 0) {
      const share = Math.min(1, deficit / totalHeadroom);
      frames = frames.map((f, i) => f + Math.round(headroom[i] * share));
    }
    // Whatever rounding or ceilings left behind goes on the end card, which
    // has nothing to read and so cannot feel slow.
    const left = minTotal - runtime(frames);
    if (left > 0) frames[frames.length - 1] += left;
  }

  const cuts = [];
  let offset = 0;
  for (let i = 0; i < frames.length; i++) {
    cuts.push({ ...slides[i], index: i, frames: frames[i], seconds: toSeconds(frames[i], T.fps), offsetFrames: offset });
    // The next slide starts one fade BEFORE this one ends — that overlap is
    // the crossfade, and it is why offsets are not a running sum of lengths.
    offset += frames[i] - fadeFrames;
  }

  return {
    ok: true,
    fps: T.fps,
    fadeFrames,
    fadeSeconds: toSeconds(fadeFrames, T.fps),
    slides: cuts,
    totalFrames: runtime(frames),
    totalSeconds: toSeconds(runtime(frames), T.fps),
  };
}

/** render params + one slide → the renderer's URL query. Key order is fixed so
 *  the same slide always produces the same URL, and therefore the same frame. */
export function toRenderQuery(params, slide) {
  const q = new URLSearchParams();
  q.set("role", slide.role);
  q.set("title", params.title);
  if (slide.text) q.set("text", slide.text);
  if (params.eyebrow) q.set("eyebrow", params.eyebrow);
  if (params.source) q.set("source", params.source);
  q.set("index", String(slide.index));
  q.set("count", String(params.points.length));
  return q.toString();
}

/**
 * The timeline as WebVTT.
 *
 * Written now, while the timings are exact, rather than derived later from the
 * finished file. Two things need it: accessibility (a silent video still has
 * to be readable by someone who cannot see it), and PRD-VOICE-PIPELINE, which
 * will narrate these payloads — when it does, these cues are the script and
 * its timings, not something to re-derive from audio.
 */
export function toVtt(plan) {
  const stamp = (frames) => {
    const total = frames / plan.fps;
    const h = String(Math.floor(total / 3600)).padStart(2, "0");
    const m = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
    const s = String(Math.floor(total % 60)).padStart(2, "0");
    const ms = String(Math.round((total % 1) * 1000)).padStart(3, "0");
    return `${h}:${m}:${s}.${ms}`;
  };
  const lines = ["WEBVTT", ""];
  for (let i = 0; i < plan.slides.length; i++) {
    const slide = plan.slides[i];
    // The end card is skipped: it carries no sentence — the claim is a
    // bookend and the source is chrome. A caption track that announces
    // "CCA-F · D1" is noise to a screen reader and a line the narrator would
    // have to be told not to speak.
    if (slide.role === "end") continue;
    const text = slide.role === "title" ? slide.title : slide.text;
    if (!text) continue;

    // A cue ends where the NEXT slide begins, not where its own slide ends.
    // Slides overlap by one fade — that overlap is the crossfade — so ending
    // a cue at `offset + frames` would have every cue overlap its successor
    // by 0.4s. Two captions render at once on every transition, and read as a
    // narration script it asks the voice to speak two lines simultaneously.
    const next = plan.slides[i + 1];
    const end = next ? next.offsetFrames : slide.offsetFrames + slide.frames;
    lines.push(`${stamp(slide.offsetFrames)} --> ${stamp(end)}`);
    lines.push(text, "");
  }
  return lines.join("\n");
}
