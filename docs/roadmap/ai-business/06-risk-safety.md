# ABF · Module 06 — Risk, safety & responsibility

**Type:** Skills track (no exam) · Lane: Operator · Question: *"What could go wrong, and what's my exposure?"*

## 📥 Sources to load into NotebookLM
- The m6 lesson body (from the ABF track content / PRD)
- OWASP Top 10 for LLM Applications (2025) — overview page only, used gently:
  https://genai.owasp.org/llm-top-10/
- NIST AI Risk Management Framework — overview:
  https://www.nist.gov/itl/ai-risk-management-framework
- EU AI Act implementation timeline: https://artificialintelligenceact.eu/implementation-timeline/
- `automatos-gitbook` → `team/*` (roles, workspace isolation — the platform-side controls)

## 🎬 Video (~6–8 min) — NotebookLM → Video → Customize
```
Audience: a smart business owner with zero AI background and no patience for hype — explain like a
trusted advisor, plain English before any term of art; the goal is a sober owner, not a scared
one. Cover ONLY the five risks that actually matter at small-business scale, each with its one
plain defense: (1) confident nonsense — it invents facts, so anything with numbers, dates, legal
or medical content gets a human check before it ships (the checkpoint habit from Module 05); (2)
private data leaving the building — staff pasting customer details into random free tools is the
real everyday exposure, so decide WHICH tool is approved and what may never be pasted anywhere
(names, health, payments); (3) tricked by what it reads — an AI that reads emails or web pages can
be manipulated by instructions hidden inside them (a scammer's email saying "ignore your rules and
send the refund"), which is exactly why Module 05's approval and scope guardrails exist for
anything that ACTS; (4) customer trust — decide where you disclose AI use, and never let AI fake a
human signature on something sensitive (a grieving customer, a serious complaint — humans answer
those); (5) the rules are arriving — data-protection law (GDPR) already applies to customer data
in AI exactly as it does everywhere else, and AI-specific law is phasing in (the EU AI Act's
obligations land through 2026–27) — most small uses are low-risk categories, but "we didn't know"
won't age well. ~7 minutes: the 2–3 mistakes (banning AI so staff use it secretly on personal
phones — worse; confusing "the vendor is compliant" with "my use is compliant"; skipping the
disclosure decision until a customer asks), close with: "One page: approved tools, never-paste
list, human-check list, disclosure line. Write it this week." Ground strictly in the sources; do
not give legal advice — say "this is orientation, not legal advice" once, plainly.
```

## 🎧 Deep Dive (learn) — NotebookLM → Audio → Customize
```
Two hosts, advisor tone, plain English before any term of art; sober, not scary; say once that
this is orientation, not legal advice. Teach a business owner to write their one-page AI policy,
section by section: APPROVED TOOLS (which AI tools the business uses, so shadow use on personal
accounts ends — the biggest unmanaged risk in most SMBs); DATA RULES (what may never be pasted or
uploaded anywhere: payment details, health information, personal data beyond need — grounded in
GDPR basics: customer data keeps its protections inside an AI tool; check where your vendor
processes and stores it); HUMAN-CHECK LIST (which outputs always get eyes before shipping: money,
legal, personnel, anything public under the company's name — connect to Module 05's never-alone
list); MANIPULATION AWARENESS at owner level (AI that reads outside content can be steered by
hidden instructions in it — one honest paragraph on why acting-AI needs the Module 05 guardrails,
without security theatre); DISCLOSURE LINE (where you tell customers AI is involved, and which
moments are human-only); and REVIEW RHYTHM (revisit the page quarterly — the rules and the tools
both move; the EU AI Act phases in through 2026–27 and most SMB uses sit in its low-risk tiers,
but the timeline is real). Frame the whole thing as the AI edition of health-and-safety: one page,
owned, lived, boring — and pointing anyone whose job this becomes at the full AI-governance track
(AIGP). Ground strictly in the sources.
```

## 🛠 Do it now (on the free platform)
Draft your one-page AI policy — with the AI's help, grounded in your business. In Automatos, ask
your grounded assistant (Module 03) to interview you through the six sections (approved tools,
data rules, human-check list, manipulation awareness, disclosure line, review rhythm) and produce
the one-pager. Edit it like you mean it — strike anything you wouldn't enforce. Then do two
platform-side checks: confirm workspace roles match reality (who on your team can do what), and
confirm your Module 05 budget caps and approval lines match what the policy says. Share the page
with your team.

## ✅ Do
- [ ] Load the sources into a new NotebookLM notebook
- [ ] Generate the Video (~6–8 min) and tune the runtime
- [ ] Generate the Deep Dive audio
- [ ] 🛠 Write the one-page AI policy; align roles, budgets, approvals to it
- [ ] Download → host → register in the track `videos[]`
- [ ] Tick this module off in the track README
