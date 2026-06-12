# Video pipeline — NotebookLM → YouTube → registry

The video hub hosts short, focused overviews per domain. They're produced with **NotebookLM Video Overviews**, hosted **unlisted on YouTube**, and registered in each domain's `videos[]`. This doc is the repeatable SOP so the library grows.

## Steps

1. **Source.** Assemble the inputs for a NotebookLM notebook — the domain's lesson `body` text, the official Anthropic docs for that domain (see the domain's `resources[]`), and any of your own notes. One notebook per domain keeps each video focused on one learning objective.
2. **Generate.** Create a **Video Overview** in NotebookLM for the topic. Iterate the focus/prompt until the narrative matches the lesson's objective (not a generic ramble).
3. **Export.** Download the MP4.
4. **Publish.** Upload to YouTube as **Unlisted**. Copy the watch URL (`https://youtu.be/…` or `https://www.youtube.com/watch?v=…` — both work; the hub converts to an embed automatically).
5. **Register.** Find the placeholder slot in the domain file's `videos[]` and fill it in:

```jsonc
{
  "id": "v-d1-1",
  "title": "D1 · Choosing the right tier",
  "provider": "youtube",
  "url": "https://youtu.be/XXXXXXXXXXX",   // ← paste the unlisted URL
  "domainIds": ["d1-agentic-architectures"],
  "sourceNotebook": "cca-f / domain 1",
  "status": "published"                      // ← flip from "placeholder"
}
```

That's it — the hub picks it up on next load. `placeholder` slots render a tasteful "video coming" card, so the information architecture is complete before every video exists.

## Mapping the initial 10

The CCA-F track ships with placeholder slots across the five domains. Suggested coverage order (heaviest / highest-leverage first):

| Priority | Domain | Slots |
|---|---|---|
| 1 | D1 Agentic Architectures (27%) | 3 |
| 2 | D3 Agent Ops & Claude Code (20%) | (add as needed) |
| 3 | D4 Prompt Engineering (20%) | (add as needed) |
| 4 | D2 Tools & MCP (18%) | (add as needed) |
| 5 | D5 Context & Reliability (15%) | 2 |

A video can map to more than one domain — list each in `domainIds` and it appears in each domain's section of the hub.

## Tips

- Keep each video to one objective; short and sharp beats comprehensive.
- Name them `D<n> · <topic>` so they sort and scan well.
- Re-generate when the platform changes — note the `sourceNotebook` so you can find the inputs again.
