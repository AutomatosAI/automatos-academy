# CCA-F · Module 03 — Claude Code Configuration & Workflows

**Exam tie-in:** D3 Claude Code Configuration & Workflows (**20%**)  ·  **Format:** external exam (mock-exam prep)

## 📥 Sources to load into NotebookLM
- The D3 lesson bodies (`public/content/anthropic/cca-f/d3-agent-ops-claude-code.json`): CLAUDE.md
  memory & precedence, commands/skills/subagents, hooks & plan mode, permissions/MCP/headless
- https://docs.claude.com/en/docs/claude-code/memory (precedence: managed > project incl. nested > user; `CLAUDE.local.md`; "context not enforcement")
- https://docs.claude.com/en/docs/claude-code/hooks (PreToolUse/PostToolUse/Stop; blocking via exit code 2 or a JSON `permissionDecision`)
- https://docs.claude.com/en/docs/claude-code/settings (settings.json precedence; the allow/ask/deny model where **deny wins**; skip-permissions)
- https://docs.claude.com/en/docs/claude-code/skills (commands in `.claude/commands/`, SKILL.md progressive disclosure, `$ARGUMENTS`, frontmatter)
- https://docs.claude.com/en/docs/claude-code/sub-agents (`.claude/agents/` with own context/tools/system prompt/permissionMode)
- https://docs.claude.com/en/docs/claude-code/mcp (three scopes: local / project via `.mcp.json` / user; the project-server approval gate)
- https://docs.claude.com/en/docs/claude-code/headless (`claude -p`, `--output-format json/stream-json`, piping, exit codes)
- https://platform.claude.com/docs/en/build-with-claude/batch-processing (Batches API — async bulk at 50% cost)
- The CCA-F Exam Guide task statements for **D3** (resolve memory precedence; pick command/skill/subagent; gate with a hook; govern with settings.json; run headless in CI)

## 🎬 Video Overview prompt (~8 min) — video 1 of 2: **CLAUDE.md memory, precedence & path rules**
```
Audience: a professional studying for the Anthropic CCA-F architect exam who uses Claude Code but
hasn't reasoned about config precedence. Explain plainly first, then precisely. Cover ONLY: the
CLAUDE.md memory hierarchy, how conflicts resolve, and the one caveat the exam hinges on. Establish
the throughline first: CLAUDE.md is CONTEXT the model tries to follow, NOT enforced configuration — to
guarantee an action is blocked you need a hook or a permission rule, never a line of CLAUDE.md. Then
teach the hierarchy, broadest to most specific, and that files are CONCATENATED not overridden, with
the most-specific scope read last so it effectively wins a conflict: managed policy (highest
authority, deployed by IT, cannot be excluded) > project (./CLAUDE.md or ./.claude/CLAUDE.md, PLUS
nested per-directory CLAUDE.md files in subtrees, shared via source control) > user
(~/.claude/CLAUDE.md, personal across projects). Cover CLAUDE.local.md as the gitignored, project-
specific personal variant (sandbox URLs, test data) loaded alongside CLAUDE.md but never committed,
and the path-scoped idea that a nested CLAUDE.md governs its subtree. Map each point to an exam
decision: given files at several scopes, which instruction wins, and which layer do you reach for to
ENFORCE vs merely guide. ~8 minutes: open with why misreading precedence loses easy D3 marks, work one
example (a managed-policy rule vs a project rule vs a nested-directory rule — resolve the winner),
then the top distractors — thinking a more-specific file "overrides" rather than concatenates-and-wins;
believing CLAUDE.md can block an action; committing CLAUDE.local.md. Close with "on the exam, remember:
CLAUDE.md is context that concatenates (most-specific wins); to enforce, use a hook or a permission
rule." Stay strictly grounded in the sources; do not invent file locations.
```

## 🎬 Video Overview prompt (~8 min) — video 2 of 2: **Commands, skills, subagents, hooks, plan mode & headless CI**
```
Audience: a CCA-F candidate operating Claude Code as a real harness. Explain plainly first, then
precisely. Cover ONLY: extending Claude Code and governing/running it deterministically. First, pick
the right extension and scope it: a slash command is a Markdown file (.claude/commands/deploy.md →
/deploy for the project; the same file in ~/.claude/commands/ is personal across projects), supporting
$ARGUMENTS/$1/$2 and frontmatter like allowed-tools; a skill is a SKILL.md with a description that
tells Claude WHEN to use it and a body that loads only on invocation — PROGRESSIVE DISCLOSURE, so long
reference material is nearly free until needed (the opposite of CLAUDE.md, which loads in full every
session); a subagent (.claude/agents/) runs with its OWN context window, system prompt, tools, and
model. Second, deterministic control with hooks (configured in settings.json): PreToolUse fires before
a tool and can BLOCK it (exit code 2 feeds stderr back as the reason, or exit 0 + JSON with a
permissionDecision of deny/allow/ask), PostToolUse fires after success (auto-format/lint an edited
file), Stop/SessionEnd fires at the end; matchers select tools by name (exact Bash, piped Edit|Write,
regex, or *). Make the decision explicit: if something MUST happen at a specific point, write a hook,
not a CLAUDE.md line. Third, govern with settings.json permissions — allow/ask/deny arrays in
tool-pattern syntax (Bash(npm run test:*), Read(./.env)) where DENY WINS over allow, plan mode as the
safe read-only-until-approved posture, MCP at three scopes (local default / project via .mcp.json with
an approval gate / user), and --dangerously-skip-permissions as a sharp sandbox-only tool. Fourth,
headless: claude -p "..." with --output-format text/json/stream-json, piping stdin, and --allowedTools
for CI gates — and choose the Batches API for non-latency-sensitive BULK work at 50% cost. ~8 minutes:
open with why D3 tests operating the harness, not API theory; work one example (a CI gate that runs
claude -p with a tight permission posture and a PreToolUse hook blocking rm -rf); then the top
distractors — using a CLAUDE.md instruction where a hook is required; forgetting deny wins;
reaching for the interactive session where headless/Batches fits. Close with "on the exam, remember:
CLAUDE.md guides, hooks and permissions enforce (deny wins), and claude -p / Batches run it
unattended." Stay strictly grounded in the sources; do not invent events or flags.
```

## 🎧 Deep Dive (learn) — NotebookLM → Audio → Customize
```
Two hosts, expert level, no basics. Teach the whole D3 "Claude Code Configuration & Workflows" domain
for the Anthropic CCA-F exam. Cover: the CLAUDE.md memory hierarchy (managed > project incl. nested >
user), concatenation with most-specific-wins, CLAUDE.local.md, and the load-bearing caveat that
CLAUDE.md is context not enforcement; the three extensions and their scopes — slash commands in
.claude/commands/ vs ~/.claude/commands/, skills (SKILL.md) with progressive disclosure, subagents
in .claude/agents/ with isolated context/tools/system prompt; deterministic hooks (PreToolUse blocks
via exit 2 or JSON permissionDecision, PostToolUse reacts, Stop finalises) with matchers, and when a
hook beats a CLAUDE.md line; the settings.json permission model (allow/ask/deny where deny wins), plan
mode, MCP scopes (local/project via .mcp.json/user with the approval gate), and
--dangerously-skip-permissions; and headless usage — claude -p with --output-format json/stream-json,
piping and exit codes for CI, plus the Batches API at 50% cost for bulk. For each, make the exam
decision explicit: enforce vs guide, which scope, which output format. Ground strictly in the sources;
when they conflict, prefer the official docs.
```

## 🎧 Brief (revise, ~8–12 min)
```
Tight pre-exam recap of the must-know D3 distinctions and top distractors: CLAUDE.md concatenates,
most-specific-scope wins, and it's context NOT enforcement (hooks/permissions enforce); command vs
skill (progressive disclosure) vs subagent (isolated context), and their project vs personal scopes;
PreToolUse blocks (exit 2 / JSON permissionDecision), PostToolUse reacts, matchers select by tool
name; settings.json allow/ask/deny where DENY WINS; MCP local/project(.mcp.json)/user with the
approval gate; claude -p with --output-format json/stream-json for CI, and Batches at 50% cost for
bulk. Grounded in the sources. For the week before the exam.
```

## 🤖 Apply it in Automatos
This is the one domain the learner is *already inside* — Automatos is developed with Claude Code, so
point at the repo. Show a real `CLAUDE.md` hierarchy (global user rules + a project `CLAUDE.md` +
nested per-directory files) and resolve which wins; show `.claude/settings.json` permissions with
`deny` winning, a **PreToolUse hook** that enforces something CLAUDE.md only asks for, and
`.claude/agents/` subagents with isolated context. Then have them run **headless** (`claude -p …`)
as a CI gate against the platform — exactly how the platform's own PR checks and the Ralph overnight
runners drive Claude Code non-interactively. The exam's "enforce vs guide, run it unattended" is the
platform's daily operating model.

## ✅ Do
- [ ] Load the D3 sources into a new NotebookLM notebook (one per video block)
- [ ] Generate both Video Overviews (memory & precedence · extensions/hooks/permissions/headless), each ~8 min
- [ ] Generate the Deep Dive (+ Brief) audio for the domain
- [ ] Download → host → register each in the D3 `videos[]` with its `sourceNotebook`
- [ ] Tick this module off in the track README
