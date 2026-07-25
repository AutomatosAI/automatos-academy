# Sample infographic payloads

These are **spike samples, not approved content.** They exist so the render
workflow can be dispatched on a fresh clone and produce something to look at
without waiting for the factory or an approved draft.

Real infographics travel Lane 1 first: a playbook drafts the payload, the
fact-checker cites it, Gerard approves it in `#/admin`, and only then does the
renderer turn it into pixels. Verification happens before the pixels exist —
that ordering is the point, not an implementation detail.

`d1`, `d2` and `d5` are typical cards: three short points. `d3` is the
deliberate opposite — a title near the 68-character ceiling and five points
near the 88-character one, which is the densest payload the server will
accept. Keep it that way. The layout sizes the list to fill the card, so the
sparse cards prove it grows and `d3` proves where it stops: at `d3` the type
must stay at the 34px floor, nothing may clip, and the footer must still be
on the card. A renderer change that only looks right on `d1` is not proven.
