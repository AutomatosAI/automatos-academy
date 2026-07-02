# ABF · Module 03 — Teach the AI your business

**Type:** Skills track (no exam) · Lane: Operator · Question: *"How does it know MY products and policies?"*

## 📥 Sources to load into NotebookLM
- The m3 lesson body (from the ABF track content / PRD)
- `automatos-gitbook` → `knowledge/*` (documents, knowledge base, how grounding works on the platform)

## 🎬 Video (~6–8 min) — NotebookLM → Video → Customize
```
Audience: a smart business owner with zero AI background and no patience for hype — explain like a
trusted advisor, plain English before any term of art. Cover ONLY: how to give an AI permanent
knowledge of YOUR business instead of pasting the same documents into every chat. The idea in plain
words: you upload your documents once — price lists, policies, product sheets, FAQs, past proposals
— into a knowledge base, and from then on the AI looks things up in YOUR material before it
answers, and can show you where it read what it claims. (This is called RAG — retrieval-augmented
generation — and now you can forget the name.) Use the e-commerce shop as the worked example:
upload the returns policy, shipping table, and product sheet; ask "customer wants to return a
personalised mug after 40 days — what do we say?" and watch it answer FROM the policy, citing it —
then contrast the Module 00 failure where it invented a policy. Then the two rules that make or
break it: garbage in, garbage out (an out-of-date price list makes a confidently wrong assistant —
assign an owner and an update rhythm), and don't upload what's private beyond need (payroll,
personal data — Module 06 covers the rules). ~7 minutes: the 2–3 mistakes (uploading everything
including drafts and stale versions; expecting mind-reading about things never written down —
tacit knowledge needs writing down first; never updating), close with: "One folder of true
documents beats a thousand clever prompts." Ground strictly in the sources.
```

## 🎧 Deep Dive (learn) — NotebookLM → Audio → Customize
```
Two hosts, advisor tone, plain English before any term of art. Teach a business owner to build the
knowledge foundation for an AI that actually knows their business: what belongs in the knowledge
base first (the documents behind your ten most repeated questions — policies, prices, product
facts, processes, tone examples like past proposals and best emails); what "grounded answering"
means and why citations matter (you can check where it read something — trust through
verifiability, connecting back to Module 00's hallucination lesson); the curation discipline
(one owner, a review rhythm, version out the stale — an AI reading last year's prices is worse
than no AI); writing down tacit knowledge (the stuff only in your head — the AI can interview you
to extract it, one page at a time); and the privacy line at owner level: upload what a trusted
employee could see, keep out what even they shouldn't, and hold Module 06's rules for the rest.
End with the artifact: a grounded assistant that answers your ten most common questions correctly,
with citations. Ground strictly in the sources; do not invent platform features.
```

## 🛠 Do it now (on the free platform)
Build your grounded assistant. In Automatos, upload 3–5 core documents (price list, main policy,
product/service sheet, one great past proposal or email) to the knowledge base. Then ask the ten
questions customers and staff actually ask you, and check each answer against the source it cites.
Where it's wrong or blank, the gap is almost always a document that doesn't exist yet — write it
(or have the AI interview you and draft it), upload, and re-test. Keep this assistant: Modules 04
and 05 put it to work.

## ✅ Do
- [ ] Load the sources into a new NotebookLM notebook
- [ ] Generate the Video (~6–8 min) and tune the runtime
- [ ] Generate the Deep Dive audio
- [ ] 🛠 Upload core docs, run the ten-question test, fix the gaps
- [ ] Download → host → register in the track `videos[]`
- [ ] Tick this module off in the track README
