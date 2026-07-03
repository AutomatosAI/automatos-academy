# AIX · Module 01 — What is an agent?

**Type:** Skills track (no exam) · Lane: Foundations · Kills: *"Agent, chatbot, assistant — aren't they all the same thing?"*

## 📥 Sources to load into NotebookLM
- The m01 lesson body (from the AIX track content / PRD)
- `automatos-gitbook/about.md` — the line "agents are workers, not chatbots"
- `automatos-gitbook/agents/README.md` + `automatos-gitbook/agents/creating.md` (for the peek)

## 🎬 Video (~7 min) — NotebookLM → Video → Customize
```
Audience: a beginner who's used a chatbot once or twice and keeps hearing the word "agent" — no
technical background. Explain plainly first, then name the term. Cover ONLY: what an AI agent is and
how it's more than a chatbot. The plain idea: a chatbot answers when you type; an AGENT is that same
AI given a JOB, some KNOWLEDGE, and a set of TOOLS it's allowed to use — so it can actually go and
DO the task, not just talk about it. Use the new-hire analogy the whole way: a chatbot is a clever
person you can ask questions; an agent is that person hired into a ROLE ("you're our customer-support
assistant"), handed the company handbook (knowledge), and given a phone and an email account (tools).
The three parts every agent has, each in one sentence: a BRAIN (the model that thinks), a JOB (its
role and instructions — its persona), and TOOLS + KNOWLEDGE (what it can use and what it knows). Show
the difference with one example: "draft a refund reply" (chatbot writes words you then send) vs "an
agent that reads the support inbox and drafts replies grounded in the returns policy" (it has the
job, the knowledge and the tool). ~7 minutes: open with "a chatbot talks; an agent works," the three
parts via the analogy, the 2–3 confusions (thinking 'agent' is just a fancier chatbot; thinking an
agent acts without limits — it only does what you allow; thinking you need to code to make one),
close with "Same brain. Give it a job, knowledge and tools, and it becomes a worker." Ground
strictly in the sources.
```

## 🎧 Deep Dive (learn) — NotebookLM → Audio → Customize
```
Two hosts, warm and plain, for an absolute beginner. Teach what an AI agent is by contrast with a
chatbot: same underlying model, but wrapped with a defined role/persona, its own knowledge, and a
set of permitted tools so it can take actions, not just reply. Walk the three parts (brain / job /
tools + knowledge) with the new-hire analogy throughout. Be clear and reassuring that an agent only
ever does what it's been allowed to do — scope and permission are the whole point, and a later
module covers trusting it to act. Explain why "agent" is the word that matters: it's the shift from
"AI that answers" to "AI that gets things done." End with the everyday takeaway: you don't program
an agent, you HIRE and BRIEF one. Ground strictly in the sources.
```

## 🤝 The Automatos peek
This is exactly how Automatos works — it calls its AI workers *agents*, and its own docs put it
bluntly: "agents are workers, not chatbots." Creating one is closer to writing a job description
than writing code: you give it a name, a role, the knowledge it should use and the tools it's
allowed. You just met the thing the whole platform is built around.

## ✅ Do
- [ ] Load the sources into a new NotebookLM notebook
- [ ] Generate the Video (~7 min) and tune the runtime
- [ ] Generate the Deep Dive audio
- [ ] Download → CDN upload (slot-id filenames) → `register-videos.mjs --publish`
- [ ] Tick this module off in the track README
