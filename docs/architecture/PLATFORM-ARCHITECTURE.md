# Automatos Academy — Platform Architecture

The canonical reference for how content and data move across the three consumers of the Academy:
**Web/Mobile UI · the Mobile Tutor app · Automatos (KGs for the tutor + daily content generation).**
Written 2026-07-23 from a full read of `automatos-academy`, `automatos-academy-app`, and `automatos-ai`.

> **The headline:** ~80% of the unified plane is **already built but dormant**, gated on three switches —
> `DATABASE_URL` (Postgres), `SPINE_ENABLED=true` + prod Clerk, and the voice-generation pipeline.
> This is an *activation + fill-the-gaps* program, not a rewrite.

---

## 1. The three surfaces + one server

```mermaid
flowchart TB
    subgraph AUTO["AUTOMATOS PLATFORM (automatos-ai)"]
        DOCS["documents plane\n(upload/list/delete, dedup)"]
        KG["Knowledge Graph\n(tutor RAG)"]
        MIS["missions · watches · scheduled_tasks"]
    end
    subgraph SRV["ACADEMY SERVER (Express — academy.automatos.app)"]
        CAT["Content API  /api/catalog\n(files │ db)"]
        SPINE["Spine  /api/me · /api/sync\n(Clerk-authed)"]
        MEDIA["Media plane  /api/admin/media\n(presign · bind · overlay)"]
        ADMIN["Admin console  /api/admin/*\n(users · payments · progress)"]
    end
    WEB["Web SPA\n(vanilla JS)"]
    APP["Mobile Tutor\n(Expo/RN)"]
    subgraph STORE["STORAGE"]
        CDN["Widget CDN (S3+CloudFront)\nvideo · audio"]
        PG["Postgres\ncontent · spine · media_bindings"]
        GIT["git public/content/**\ncurriculum JSON"]
    end

    WEB --> CAT & SPINE & MEDIA & ADMIN
    APP --> CAT & SPINE
    CAT --> PG & GIT
    SPINE --> PG
    MEDIA --> PG & CDN
    AUTO -- "corpus sync (BUILT)" --> DOCS
    SRV -- "inventory read (BUILT)" --> AUTO
    AUTO -- "media bind · text write-back (NEW)" --> MEDIA
    KG --> APP

    classDef dormant fill:#3a2f1a,stroke:#c90,color:#fc6;
    classDef absent fill:#3a1a1a,stroke:#c33,color:#f99;
    class SPINE,MEDIA dormant;
    class ADMIN absent;
```

- **Web + mobile read the identical Content API** (`/api/catalog/*`, ETag'd) — `public/js/content.js` and `automatos-academy-app/src/content/client.ts`.
- **Automatos is academy-driven** — the platform has no academy-aware code; the academy pushes corpus in and reads inventory back.

---

## 2. Current state — what's live vs dormant

| Concern | Store | Access API | Status |
|---|---|---|---|
| Curriculum (canonical) | git `public/content/**` | Content API (files mode) | ✅ **live** |
| Curriculum (mirror) | Postgres `content_documents/versions/current` | Content API (db mode) | 🟡 built, **dormant** (`CONTENT_SOURCE=files`, no `DATABASE_URL`) |
| Videos | Widget CDN `widgets.automatos.app/academy/` | JSON urls + media overlay | ✅ **66 live** (via git-JSON publish) |
| Podcast audio | **git `.m4a`** (academy origin) | Content API `/podcasts` | ✅ live, but a **fork** (gitignore only blocks `.mp4/.mp3`) |
| TTS / read-aloud audio | (planned) CDN `academy/audio/<voiceKey>/<sha>.mp3` | media overlay `kind:audio` | ⛔ **generation unbuilt** |
| Profiles + progress | Postgres **Spine** (7+2 tables) + Clerk | `/api/me` · `/api/sync` | 🟡 built, **`SPINE_ENABLED=false`** |
| Progress mirror | web `localStorage` · mobile AsyncStorage+blobs | — | ✅ **primary today (per-device islands)** |
| Operational media urls | Postgres `media_bindings` + overlay | media plane | 🟡 built, **dormant** (mounted only under Spine) |
| Admin (users/payments/progress) | — | — | ⛔ **absent** (only media-upload exists) |

**The keystone:** the Spine (Clerk + Postgres) gates cross-device sync **and** the media admin plane **and** DB-served content. One deploy lights up three systems.

---

## 3. Target state — the unified plane

```mermaid
flowchart LR
    subgraph CONCERNS["ONE CONTRACT PER CONCERN"]
        C1["Curriculum → Content API (DB mode)"]
        C2["Media (video·podcast·TTS) → media_bindings + overlay"]
        C3["Profiles + progress → Spine (Clerk identity)"]
    end
    WEB["Web SPA"] --> C1 & C2 & C3
    APP["Mobile app"] --> C1 & C2 & C3
    AUTO["Automatos"] --> C1 & C2
    C1 --> PG[(Postgres)]
    C2 --> CDN[(CDN/S3)]
    C3 --> PG
```

Three contracts, every surface reads them; the per-device forks close; all media (video + podcast audio + TTS) sits behind one `media_bindings` plane; curriculum ships from the DB without redeploys.

---

## 4. Content lifecycle — Automatos generates + reviews + verifies daily

```mermaid
sequenceDiagram
    participant M as Automatos daily Mission
    participant A as Academy
    participant KG as Knowledge Graph
    participant T as Tutor
    M->>A: 1. GET /api/catalog/inventory (id+title+hash) — dedup (BUILT, C6)
    M->>M: 2. GENERATE draft lesson/question/video/audio (grounded in sourceOfTruth)
    M->>M: 3. REVIEW — mission approval + budget cap (BUILT)
    M->>A: 4. VERIFY — Watch each sourceOfTruth URL, diff facts → drift (cert-watch, UNBUILT)
    M->>A: 5a. PUBLISH media → POST /api/admin/media/bind (BUILT, needs Spine)
    M->>A: 5b. PUBLISH text → POST /api/admin/content (NEW write-back API — ABSENT)
    A->>KG: 6. corpus sync → documents plane → KG rebuild (manual today)
    T->>KG: tutor grounds via rag/retrieve
```

**Must-build for the loop:** the platform tags-persist fix (🔴 below), the academy **text write-back API**, the **cert-watch mission**, and **composing the daily routine** (KG rebuild is manual — `knowledge_graph.py:102`).

**🔴 Critical break to fix first:** `automatos-ai/orchestrator/api/documents.py:206-218` parses `tags` but writes the row with `tags=` commented out ("SQLAlchemy array bug"). The corpus-sync's per-course tagging is **silently dead** → the tutor KG can't map chunks to their course.

---

## 5. Ingress / egress map — every content + data path

```mermaid
flowchart LR
    subgraph IN["INGRESS"]
        i1["admin Upload (Clerk)"]
        i2["bulk-bind / deploy-media (X-Admin-Key)"]
        i3["git → publish-content → DB (CI)"]
        i4["Automatos mission → /api/admin/content (NEW)"]
        i5["web/mobile → /api/sync (Clerk)"]
    end
    subgraph OUT["EGRESS"]
        o1["/api/catalog/* (+/inventory)"]
        o2["/api/me/state · /export"]
        o3["corpus → documents plane"]
        o4["CDN media"]
    end
    i1 & i2 --> MEDIA[media_bindings]
    i3 & i4 --> CONTENT[content DB]
    i5 --> SPINE[Spine]
    CONTENT --> o1
    SPINE --> o2
    CONTENT --> o3
    MEDIA --> o4
```

**Hygiene to close:** the academy holds an over-privileged `ORCHESTRATOR_API_KEY` (scoped keys rejected — D-CO6 #1); podcast audio leaks into git; two video-publish paths coexist (git-JSON vs bindings).

---

## 6. Admin console (net-new)

```mermaid
flowchart TB
    ADM["#/admin (Clerk + users.role RBAC)"]
    ADM --> U["Users — list/search/edit/suspend/delete"]
    ADM --> P["Progress — per-user mastery/streak"]
    ADM --> B["Payments — Stripe checkout/subs/webhooks → users.plan"]
    ADM --> C["Content — media (extended plane) + text editor (DB drafts)"]
    U --> SPINE[(Spine users)]
    P --> SPINE
    B --> STRIPE["Stripe"]
    B --> SPINE
    C --> MEDIA[(media_bindings)]
    C --> CONTENT[(content DB)]
```

Replaces the binary `ACADEMY_ADMIN_CLERK_IDS` env allowlist with a real `users.role` column; **academy-native Stripe** (owner decision 2026-07-23) writes the `plan` column and gates track access.

---

## 7. Roadmap / sequencing

```mermaid
flowchart LR
    P1["Part 1 — video fixes\n+ domain-slot media plane"] --> ACT["PRD-PLATFORM-ACTIVATION\nSpine+DB deploy"]
    ACT --> ADMIN["PRD-ADMIN-CONSOLE\nusers·payments·progress·content"]
    ACT --> VOICE["PRD-VOICE-PIPELINE\nJSON→MP3 (Kokoro→ElevenLabs)"]
    ADMIN --> LIFE["PRD-CONTENT-LIFECYCLE\ntext write-back + daily mission"]
    LIFE --> DOCS["PRD-PLATFORM-DOCUMENTS-FIXES\n(automatos-ai / D-CO6)"]
```

See `docs/prds/PRD-*.md` for each. **Owner decisions locked 2026-07-23:** academy-native Stripe · admin console is the first build after Part 1 (activation runs in parallel as owner env work).
