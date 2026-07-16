# Learning-Platform Competitor Scan — Progress Surfaces & Daily-Engagement Mechanics
**Date:** 2026-07-16 · **For:** Automatos Academy next-wave planning (web SPA + Expo mobile, free, cert-prep + skills tracks)
**Method:** Web research (official product pages/blogs/help centers preferred; third-party teardowns flagged as such). Claims marked **[3P]** are third-party analyses, **[inference]** where noted.

**Judged against what Academy already has:** SM-2 engine (no review surface), readiness score + grade ramp + A+ gate, mock exams, scenarios, labs, videos, podcasts (offline), AI tutor chat + voice, server-computed cross-device streak, new profile page (time/coverage/readiness rings/mock history), signed badges/certs, paths + level lanes, mobile quick-fire feed + tabs, notifications & widget **scaffolds** (not shipped), exam-date setting, unified account (just shipped).

---

## 1. Duolingo (deep dive — the daily-return benchmark)

### Profile / progress surfaces
- Profile shows streak, total XP, current league, achievements (split into **Personal Records** — longest streak, most XP in a day — and Awards), and friends. ([Achievements wiki](https://duolingo.fandom.com/wiki/Achievements))
- **Duolingo Score**: a 0–160 course-progress score anchored to CEFR levels, shown on the path, profile, and cross-device; can be added to LinkedIn. It converts "how far through the course am I" into one portable number with a "what you can do at this level" explanation. ([Official blog](https://blog.duolingo.com/duolingo-score/))
- Streak calendar with a "perfect streak" visual state (flame gains a halo; calendar renders as a continuous bar when no freezes were used). ([Deconstructor of Fun streak teardown [3P]](https://duolingo.deconstructoroffun.com/mechanics/streaks))

### Engagement loops (with measured impact)
- **Streak + streak freeze**: free users hold up to 2 freezes; long-streak users accumulate up to 5 via Streak Society; 3 freezes granted at each 100-day tier; freezes **auto-deploy silently**. Allowing 2 equipped freezes alone raised DAU **+0.38%**; milestone-day celebration animations raised new-learner D7 retention **+1.7%**; learners reaching a 7-day streak are **3.6x more likely to complete the course**. ([Official streak-design post](https://blog.duolingo.com/how-duolingo-streak-builds-habit/); freeze rules per [DoF [3P]](https://duolingo.deconstructoroffun.com/mechanics/streaks))
- Duolingo calls streaks "the single most effective retention lever in the product"; ~32M DAU carry a 7+ day streak. ([DoF [3P]](https://duolingo.deconstructoroffun.com/mechanics/streaks))
- **Friend Streak**: shared streak with up to 5 friends; both must complete a lesson daily or it breaks; nudge button. Learners with ≥1 friend streak are **22% more likely to complete their daily lesson**, scaling with more friend streaks. Biggest funnel problem was getting the first invite sent. ([Official product-lessons post](https://blog.duolingo.com/product-lessons-friend-streak/))
- **Leagues**: weekly 30-person cohorts matched on similar study habits/timezone, across all courses; 10 tiers (Bronze→Diamond) with promote/demote every Sunday; Diamond top-10 feeds a tournament. ([Official](https://blog.duolingo.com/duolingo-leagues-leaderboards/); [help](https://www.duolingo.com/help/leaderboards-and-league)) A teardown credits leagues with **+25% lesson completion** [3P]. ([DoF leagues](https://duolingo.deconstructoroffun.com/mechanics/leagues))
- **Daily quests** (3 rotating missions with chest rewards) and **Monthly Quests** (complete N daily quests in a month → collectible badge) layer short- and mid-term goals on top of the streak. ([DoF](https://duolingo.deconstructoroffun.com/mechanics/daily-quests); [trophy.so case study [3P]](https://trophy.so/blog/duolingo-gamification-case-study))
- **Home-screen widget**: born at an internal hackathon; deliberately shows only two data points — current streak and whether today's lesson is done — with character art whose **mood shifts through the day** as the deadline nears (cheerful → asleep-and-disappointed by 11pm). Duolingo: widget users "had far better retention… even when controlling for the fact that learners who add the widget tend to be more committed." ([Official widget post](https://blog.duolingo.com/widget-feature/); mood-shift detail per [DoF [3P]](https://duolingo.deconstructoroffun.com/mechanics/streaks)) A third-party case study claims ~60% commitment lift [3P, unverified]. ([trophy.so](https://trophy.so/blog/duolingo-gamification-case-study))
- **Notifications**: "streak at risk" push fires ~10 minutes before midnight [3P]. Reminder **copy is chosen by a published multi-armed bandit** (Recovering Difference Softmax; KDD 2020) that rotates templates and penalizes recently-seen ones: **+0.5% DAU and +2% new-user retention** from copy optimization alone. ([Yancey & Settles, KDD 2020 PDF](https://research.duolingo.com/papers/yancey.kdd20.pdf))
- **Share cards**: designed milestone share images drove **5–10x organic sharing**; 6M+ streak shares attributed to card design [3P]. ([DoF](https://duolingo.deconstructoroffun.com/mechanics/streaks))
- Achievement completion on day 1 correlates with 33.4% vs 20.4% D14 retention [3P]. ([trophy.so](https://trophy.so/blog/duolingo-gamification-case-study))

### Exam-prep-specific
- Duolingo Score doubles as a proficiency estimate aligned to the Duolingo English Test scale — a consumer-grade "readiness number" precedent. ([blog](https://blog.duolingo.com/duolingo-score/))

### AI-teaching-specific
- **Duolingo Max**: *Explain My Answer* (contextual grammar explanation of your mistake — now free to all users as of Jan 2026), *Roleplay* (AI conversation side-quests that earn XP and live on the path), *Video Call with Lily* (AI character who opens with topics you've studied, **remembers previous calls**, and leaves a reviewable transcript). ([Official Max post](https://blog.duolingo.com/duolingo-max/); [Video Call AI post](https://blog.duolingo.com/ai-and-video-call/))

---

## 2. Brilliant

- **Progress**: XP for lessons/problems; streak counts consecutive days with a concrete daily bar — **3 problems or 1 full lesson**. ([Help center](https://brilliant.org/help/using-brilliant/))
- **Streak charges**: hold up to 2; earned back through completing lessons/practice — i.e., protection is **earned by studying**, not only bought. ([Features help](https://brilliant.org/help/features/))
- **Leagues**: weekly 30-learner cohorts, 10 element-named tiers (Hydrogen→Einsteinium), Sunday reset. ([Leagues help](https://brilliant.org/help/using-brilliant/what-are-leagues-and-leaderboards/))
- **Daily challenge**: one fresh problem per day, free tier — a reason to open the app that isn't course progress. ([FAQ](https://brilliant.org/faq/))
- **AI**: "Koji" tutor inside foundational math/coding courses — steps through the thinking, never hands over the answer. ([Features help](https://brilliant.org/help/features/))

## 3. Sololearn

- **Progress/profile**: XP, streak, league placement, and "Bits" currency; profile displays certificates and code portfolio.
- **Leagues**: weekly XP leaderboard vs randomly picked peers; top-15 promote; terminal "Saturn league" is defend-your-rank; weekly XP resets. ([Sololearn on Medium](https://medium.com/sololearn/ready-to-rise-up-our-leaderboard-get-rewarded-for-learning-8b23738e38d0))
- **AI**: **Kodie** copilot — explains errors in plain language, generates practice quizzes **targeted at each learner's weak areas**, and (stated roadmap) proactively jumps in based on observed behavior rather than waiting to be asked; 6.2M "code helps" served. ([Fierce Network](https://www.fierce-network.com/technology/sololearn-debuts-ai-copilot-support-learn-code-experience); [reworked.co](https://www.reworked.co/the-wire/ai-tutor-kodie-provides-62m-code-helps-in-worlds-most-popular-learn-to-code-app-with-30m-learners/))

## 4. DataCamp

- **Daily goal is an XP quota**: streak day = **250 XP earned** (≈1 lesson or a practice session), local-timezone midnight reset; streak freezes exist. ([Streaks support](https://support.datacamp.com/hc/en-us/articles/360014799594-DataCamp-s-Daily-Streaks); [freezes](https://support.datacamp.com/hc/en-us/articles/27165027716887-Streak-freezes); [XP overview](https://support.datacamp.com/hc/en-us/articles/34043400793495-Understanding-XP-and-Progress-on-DataCamp))
- Runs **time-boxed XP challenges** with real prizes (e.g., $500 XP Learner Challenge) as seasonal engagement spikes. ([DataCamp blog](https://www.datacamp.com/blog/xp-learner-challenge))

## 5. Codecademy

- **Weekly targets instead of daily streaks**: learner picks N days/week; weeks start Monday; meeting the target increments a **weekly streak**, and an escalating badge ladder hangs off consecutive target weeks — a forgiving cadence for adult schedules. ([Weekly Targets](https://help.codecademy.com/hc/en-us/articles/360056218734-Weekly-Targets); [Badges & Weekly Targets](https://help.codecademy.com/hc/en-us/articles/115003050088-About-Badges-and-Weekly-Targets))
- Clean split of **"home" (private stats dashboard) vs "profile" (public showcase)** — achievements, projects, certs public; goals and streak stats personal. ([Profile updates](https://help.codecademy.com/hc/en-us/articles/1260806913469-Profile-Updates))

## 6. Khan Academy / Khanmigo

- **Mastery levels per skill**: Attempted → Familiar → Proficient → Mastered, worth 50/80/100 mastery points; **Mastered requires proving it on a unit test or course challenge**, not just in practice — levels can also *decay* on wrong answers, forcing re-proof. Unit and course mastery percentages roll up from these points. ([Mastery levels help](https://support.khanacademy.org/hc/en-us/articles/5548760867853--How-do-Khan-Academy-s-Mastery-levels-work); [Course/Unit Mastery](https://support.khanacademy.org/hc/en-us/articles/115002552631-What-are-Course-and-Unit-Mastery))
- **Khanmigo** ($4/mo): Socratic tutor on every exercise/video/article — never gives the answer; **knows the student's mastery of the skill and its prerequisites** when tutoring; voice in/out; energy points redeemable to customize the tutor's appearance. ([khanmigo.ai/learners](https://www.khanmigo.ai/learners); [KA blog on tutor learnings](https://blog.khanacademy.org/how-khan-academy-is-building-a-better-ai-tutor-our-most-recent-learnings/))

## 7. Anki (review UX gold standard) + Quizlet

- **Anki**: the home screen IS the review queue — decks with due counts, nothing else. FSRS orders the queue by **ascending retrievability** (most-at-risk first); a **load balancer** nudges intervals so daily review counts stay even (no 500-card Mondays); postpone/advance tools exist for exam-date compression. ([Deck options manual](https://docs.ankiweb.net/deck-options.html); [FSRS Helper add-on](https://ankiweb.net/shared/info/759844606); [FSRS tutorial](https://github.com/open-spaced-repetition/fsrs4anki/blob/main/docs/tutorial.md))
- **Review Heatmap**: GitHub-style contribution grid of daily reviews + streaks is one of the most-installed add-ons — evidence learners *want* a consistency visualization badly enough to bolt it on. ([Interactive Heatmap](https://ankiweb.net/shared/info/1782362167))
- **Quizlet**: **Memory Score** — a per-set number representing how well the material is currently memorized, which *decays* and drives "time to review" recommendations; completing scheduled reviews raises it. Answer streaks (5+ correct in a row) inside sessions. **Q-Chat** conversational AI tutor. ([Spaced repetition page](https://quizlet.com/gb/features/spaced-repetition); [official Memory Score explainer](https://quizlet.com/829233297/official-how-memory-score-with-scheduled-review-works-spaced-repetition-flash-cards/); [Answer streaks help](https://help.quizlet.com/hc/en-us/articles/40011154960653-Studying-with-Answer-Streaks))

## 8. Pocket Prep (cert-prep engagement leader)

- **Study plan from exam date**: enter exam date, set **daily study reminders**, get pacing toward the date. ([6 ways to study](https://www.pocketprep.com/posts/6-effective-ways-to-study-with-pocket-prep/))
- **Study modes as a menu of small commitments**: Question of the Day, **Quick 10**, Timed Quiz, Missed Questions, **Weakest Subject** (auto-serves the lowest-scoring domain), Build Your Own Quiz, Level Up, full Mock Exams. ([Premium help](https://help.pocketprep.com/en/articles/3697228-what-do-i-get-with-premium-access))
- **Exam Readiness surface**: automatically surfaces your worst subjects; tap a subject → cumulative score, attempted/remaining counts. Stats tab adds study duration and **community comparison** (your numbers vs everyone prepping the same exam). ([Google Play listing](https://play.google.com/store/apps/details?id=com.pocketprep.android.pocketprep); [EduReviewer review [3P]](https://edureviewer.com/test-prep/pocket-prep-review/))
- Streaks + level-up gamification, and a **Pass Guarantee** on premium. ([FAQ](https://www.pocketprep.com/frequently-asked-questions/))

## 9. Tutorials Dojo

- Five practice modes per exam: **Timed** (65-question exam sim), **Review** (answers as you go), **Section/Topic-based**, **Final Test**, **Bonus Flashcards**; every answer key carries full explanations + reference links + cheat sheets; question bank updated from student exam feedback. ([SAA practice-exam page](https://portal.tutorialsdojo.com/courses/aws-certified-solutions-architect-associate-practice-exams/))

## 10. ExamPro

- **Readiness meter** to gauge exam preparedness; **practice-exam mastery system that substitutes previously-missed questions with variants** so you can't pass by memorizing answer positions; flashcard spaced repetition; "journey" study paths; free tiers of full courses. ([SitePoint feature overview](https://www.sitepoint.com/how-exampro-helps-developers-get-cloud-certified/); [exampro.co](https://www.exampro.co/))

## 11. MeasureUp / Whizlabs

- **MeasureUp score report**: overall score + duration; question summary (correct/incorrect/unanswered, filterable); **score breakdown by official exam objective**; attempt history across modes; **Preparation Tracker** — an explicit "readiness level relative to the official certification exam." ([Score report docs](https://docs.measureup.com/how-to-review-a-practice-test-score-report))
- **Whizlabs**: 25k+ questions, 1,000+ hands-on labs, **cloud sandboxes**, exam simulator that identifies skill gaps. ([whizlabs.com/learn](https://www.whizlabs.com/learn/); [business page](https://business.whizlabs.com/))

## 12. Microsoft Learn

- **XP on every unit/module/path**, levels, **badges** (module completion) and **trophies** (path completion) on a public Learn profile, shareable. ([Learn FAQ](https://learn.microsoft.com/en-us/training/support/faq))
- **Cloud Skills Challenges**: time-boxed curated module sets; completion earns badges; some run **sweepstakes with 1 entry per 1,000 XP** — corporate-scale seasonal quests. ([MS community blog](https://techcommunity.microsoft.com/blog/mvp-blog/the-global-cloud-skills-challenge-learning-on-ms-learn/2642660); [OCPScale challenge page](https://one-commercial-partner.github.io/OCPScale/Events/CloudSkillsChallenge.html); [Octalysis case study [3P]](https://octalysisgroup.com/case-studies/microsoft-learn/))

## 13. Google Cloud Skills Boost — The Arcade

- Free perpetual event layer: **2 new games/month** (Level 1 + Level 2, each 8–15 labs) + monthly trivia; **1 point per game/trivia badge, 0.5 per skill badge; points expire in 6 months**; prize tiers (Trooper→Ranger→Champion→Legend) redeemed at a limited-window **prize counter** for swag; badges public on profile/LinkedIn. ([Official GC blog](https://cloud.google.com/blog/topics/training-certifications/the-arcade-with-google-cloud-game-helps-boost-cloud-skills); [Arcade page](https://go.cloudskillsboost.google/arcade))

## 14. DeepLearning.AI (instructive negative example)

- Short courses with plain progress bars ("My Learning" list + per-course %), forums/community, no streaks/XP/leagues at all — retention rides on brand + content freshness cadence (new short course drops). Progress surfaces are minimal. ([learn.deeplearning.ai](https://learn.deeplearning.ai/); [courses](https://www.deeplearning.ai/courses))

---

# Synthesis — patterns vs Automatos Academy

**Where Academy is already at or ahead of market:** readiness score + A+ gate (≈ MeasureUp Preparation Tracker / ExamPro readiness meter, arguably better-integrated), mock exams + branching scenarios + labs (≈ Tutorials Dojo/Whizlabs), AI tutor with voice (≈ Khanmigo/Kodie in capability), signed certs, cross-device streak + profile page. The **content and assessment stack is competitive; the daily-return stack is not.**

**The gap cluster (what everyone who wins daily engagement has, that Academy lacks):**

1. **A "today" surface with a due number.** Anki, Quizlet Memory Score, Pocket Prep QOTD/Quick 10, Duolingo's path all reduce "what should I do right now?" to one tap. Academy has SM-2 *with per-item due dates already computed* and no surface showing them. This is the single largest engine-built-but-invisible asset.
2. **Streak protection + milestones.** A bare streak punishes one bad day with total loss — Duolingo's data says protection (freezes, auto-deploy) and milestone celebration are where the retention actually comes from (+0.38% DAU, +1.7% D7), not the counter itself.
3. **A concrete daily goal/quest** distinct from the streak (250 XP at DataCamp; 3 problems at Brilliant; 3 daily quests at Duolingo; weekly targets at Codecademy for adult-friendly cadence).
4. **Exam-date → daily quota pacing.** Pocket Prep turns the exam date into a plan + reminders; MeasureUp turns attempts into a readiness trajectory. Academy stores the exam date and computes readiness but (per the brief) doesn't convert them into "do N items today to be ready by Sep 12."
5. **The widget as deadline theater.** Duolingo's widget works because it shows exactly two things (streak, done-today?) and *changes mood as midnight approaches*. Academy has the scaffold and the server-side streak — unshipped.
6. **Notification craft.** Deadline-anchored "streak at risk" pushes + rotated copy (bandit-optimized at Duolingo: +0.5% DAU / +2% new-user retention). Academy has the scaffold.
7. **Peer surfaces.** Weekly 30-person leagues (Duolingo/Brilliant/Sololearn), community comparison stats (Pocket Prep), friend streaks (+22% daily completion). Academy is fully single-player today.
8. **Micro-achievements & share cards.** Personal records, night-owl-style quirk badges, milestone share images (5–10x organic sharing) — cheap surface area on top of existing signed-badge infra.
9. **Seasonal/time-boxed events.** Arcade seasons, Cloud Skills Challenges, XP challenges — a cadence layer, lower priority for a small platform.
10. **Progress-aware proactive AI tutoring.** Khanmigo tutors *with knowledge of skill mastery + prerequisites*; Kodie generates drills from your weak areas and aims to intervene proactively; Lily remembers past sessions. Academy's tutor + rich progress data exist but (per brief) aren't fused into a tutor that opens the conversation with your state.

**Thesis fit:** for a "bossy tutor that makes you study daily," the winning loop across all evidence is: *a due-review number the learner can't unsee (widget + push) → a 3–10 minute session that clears it (review queue / weak-area drill) → visible protection and celebration (freeze, milestone) → a pacing narrative tied to the exam date ("on track / behind").* Every component has a proven analog; Academy owns every prerequisite (SM-2 due dates, readiness, exam date, streak, scaffolds) and ships none of the surfaces.
