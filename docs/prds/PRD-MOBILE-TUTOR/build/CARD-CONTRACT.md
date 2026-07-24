# Card Contract v1 — the typed feed

**Story:** PRD-WAVE-LIVING-ACADEMY LA-1 · **Endpoint:** `GET /api/catalog/cards` · **Status:** BUILT
**Companion to:** [CONTENT-API-CONTRACT.md](./CONTENT-API-CONTRACT.md) (same envelope rules: ETag, `X-Content-Version`, `public, max-age=300`, permissive CORS)

One typed shape so any client can render a mixed feed, and so new content
*types* ship without an app release. New *renderers* still need a release —
forward-compatible skipping (FR-1) is what makes that safe.

---

## 1. The card

```jsonc
{
  "uid": "anthropic/cca-f/q-d3-1",   // globally unique — USE THIS as a key
  "id": "q-d3-1",                    // the ITEM id, verbatim
  "type": "quiz",
  "scope":  { "vendorId": "anthropic", "trackId": "cca-f", "domainId": "d3-agent-ops-claude-code" },
  "conceptKeys": ["anthropic/cca-f/d3-agent-ops-claude-code"],
  "locale": "en",
  "payload": { /* per type — §3 */ },
  "media":  { "slotId": "mv-d3-1", "kind": "video", "url": "https://cdn…", "contentType": "video/mp4" },
  "source": { "lessonRef": "l1-memory", "chunkRef": null, "refs": ["r-d3-memory"] }
}
```

### `uid` vs `id` — the one thing not to get wrong

`id` is the **item** id, verbatim. `progress` rows key on
`(user_id, vendor_id, track_id, item_id)`, so a graded card writes SM-2 state
through the existing path with no translation layer.

But item ids are unique only **within a track**: 827 of the catalog's 864 item
ids repeat across tracks (`q-m00-1` exists in several). **Anything that
dedupes, keys a list, or indexes a registry must use `uid`.** A whole-catalog
pull keyed on `id` would silently discard ~half the feed.

### Fields

| Field | Notes |
|---|---|
| `uid` | `vendorId/trackId/id`. Stable, globally unique, safe as a React key. |
| `id` | The item id. Pair with `scope.vendorId` + `scope.trackId` to write progress. |
| `type` | One of §2. **Clients MUST skip unknown types** without error (FR-1). |
| `scope` | Stamped by the server from the card's position in the content tree — never read from the card body, so a draft cannot lie about where it lives. `domainId` is `null` for track-scope cards. |
| `conceptKeys` | Language-neutral topic ids, finest → coarsest (§4). Always ≥1. |
| `locale` | BCP-47-ish, canonicalised (`pt-BR`). Defaults to `"en"`. |
| `payload` | Type-specific, ≤64 KB, always an object. |
| `media` | Present only on `infographic`/`minivideo`. `slotId` always; `kind`/`url`/`contentType` only once the slot is bound. |
| `source` | Always present. `lessonRef` is **nullable** — a standalone domain question genuinely belongs to no lesson, and the honest answer is `null`. `chunkRef` is the factory's cite-or-die citation (LA-7). `refs[]` carries existing `sourceRefs`. |

## 2. Types

| Type | Lane | Payload | Ships |
|---|---|---|---|
| `quiz` | 1 | §3.1 | **now** — projected from existing questions + knowledge checks |
| `flashcard` | 1 | `{front, back}` | LA-5 renderer · LA-7 factory |
| `infographic` | 2 | `{title, alt}` + `media.slotId` | LA-9 |
| `minivideo` | 2 | `{title, durationMs}` + `media.slotId` | LA-14 |
| `explainback` | 1 | `{prompt, rubric}` | LA-10 |
| `changelog` | 1 | `{entry, date, what}` | LA-11 |

Lane 1 = structured payload (agents write it, via drafts). Lane 2 = rendered
media in a `media_bindings` slot (CI renderers write it). Agents have **no**
media write path, by design (PRD §3).

### 2.1 Media binding kinds

`minivideo` resolves against the existing `video` kind. `infographic` needs an
`image` kind, which **LA-9 adds** — until then an infographic card serves its
`slotId` with no `url`, exactly as a video placeholder does today. The contract
is stable; only the pixels are pending.

## 3. Payloads

### 3.1 `quiz`

```jsonc
{
  "stem": "Which CLAUDE.md location has the highest authority?",
  "options": [{ "id": "a", "text": "Managed policy…" }, { "id": "b", "text": "Project…" }],
  "correctOptionIds": ["a"],
  "multi": false,
  "explanation": "Managed policy CLAUDE.md is deployed by IT…",
  "difficulty": 1
}
```

Field-for-field the app's `QuestionFeedCard`, so it consumes cards with no
adapter. Options are served **unshuffled** — shuffling is the client's seeded
presentation concern (US-051).

`multi` is derived from the answer key, not the declared `type`: content that
says `single` but marks two correct answers is multi *in practice*. The content
validator warns about the disagreement separately.

## 4. Concept keys

`vendor/track/domain[/lessonRef]` — lowercase, slug-safe, **language-neutral**.

- Labels localize; **keys never do**. A learner switching to pt-BR keeps every
  ounce of mastery, because the key carrying it never mentioned a language.
- Finer KG-extracted concepts (D-LA3) become a **fourth** segment under the
  lesson, so nothing built on these keys has to move.
- Cards default to their own position (lesson concept when they have a
  `lessonRef`, then their domain concept). A card may **declare**
  `conceptKeys[]` instead — that is the seam the later enrichment playbook
  writes into.

Same module both sides of the wire: `server/concepts/keys.js` mints the keys
the catalog serves *and* the keys the Spine rolls up, so they agree by
construction.

## 5. `GET /api/catalog/cards`

| Param | Meaning |
|---|---|
| `vendor`, `track` | Narrow scope. Omit both to walk the whole catalog (~1 700 cards today). |
| `domain` | Narrow further. **Requires `vendor`+`track`** (a domain id is unique only inside its track) → else `400 domain_needs_vendor_and_track`. Drops track-scope cards, which belong to no domain. |
| `locale` | Requested locale (§6). Unusable values fall back to `en` rather than 400ing a content read. |
| `type` | Comma-separated filter. **Unknown types are dropped, not rejected** — a newer client asking for a type this deploy doesn't know gets the types it *does* know. |

```jsonc
{ "version": 1, "locale": "en", "count": 189, "invalidCards": 0, "cards": [ /* … */ ] }
```

`invalidCards` is an honest, non-leaking count of authored cards that failed
validation after merge (an approved draft can introduce one). Messages stay
server-side; the pre-merge content validator catches the rest.

An unknown track is an **empty 200**, not a 404 — a feed asks, it doesn't
assert.

### Caching

Cards are a **view**, recomputed per request from the same (overlaid) documents
the catalog already serves. There is no card store to keep in sync, and an
approved draft changes the feed the instant it changes the document. The ETag
folds every contributing document hash plus the locale and type filter, so any
of them moving busts the cache. Two scopes resolving to an identical document
set share an ETag — that is what an ETag means.

No pagination this wave. If the feed ever pulls the whole catalog per session
rather than per track, add it then.

## 6. Locale resolution (FR-6)

Per **card**, best first: exact tag → same base language → `en`. Resolution is
per-uid, so a partially translated track serves its translated cards translated
and the rest in English, rather than falling back wholesale. Serve order
follows first appearance, so switching locale never reshuffles the feed.

A card that exists in *no* requested-or-fallback locale is still served,
labelled with its own `locale` — dropping it would be worse than showing it.

## 7. How cards change

Cards are derived, so there are exactly two ways to change them:

1. **Change the content document.** Edit in git, or ship an approved draft —
   the serve-time overlay swaps the whole document and the cards move with it,
   with no republish (PRD-CONTENT-LIFECYCLE #65).
2. **Author `cards[]` on the document.** Any domain or track document may carry
   a `cards[]` array. Authored cards **replace** a derived card of the same id
   *in place* (order preserved) and otherwise append. This is how the factory
   adds flashcards and how a revision replaces a bad quiz card.

Both paths go through the same validator, which runs pre-merge in
`npm run validate` — a malformed card is a merge-time error, never a serve-time
surprise.
