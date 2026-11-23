# ContentOS Development Plan

Principle: you write, AI structures. One task, one test, one thing broken at a time.
Cadence: Mon-Thu 30-40 min hustle tasks. Fri and Sat 2.5-hour sprints. Sunday is Sabbath: no code, no logistics.

## Where you are (Mon Nov 23, updated)
Phase 0 is done and tagged. The pipeline runs end to end (audio or text in, content_package.json out) with a PASS/FAIL stage table, retries, a stage-2 cache, and no stock footage. Code is in a private GitHub repo with a commit guard that blocks secrets. Slack alerts work: any failed stage posts to #content-os-alerts. persona.json holds your voice, 6 topics and 10 themes.
Now in Phase 1. Next: Supabase project and content_vault table (4A.1), then your first real weekly breakdown as test input. Task-level status lives in TASKS.md.

## Phase 0: Foundation (DONE Nov 21)
1. Back up your current transcribe.js (`cp transcribe.js transcribe.old.js`), then copy in the new files.
2. `node setup-folders.js` (creates all five folders plus fonts/music).
3. Remove `PIXABAY_API_KEY` from .env. Add `GEMINI_MODEL` only if the ping fails.
4. `node ping-model.js` must print `model=... reply=ok`. If it fails on the model name, fix it in .env, not in code.
5. `git check-ignore -v .env 01-Raw-Inbox` must list both.
6. `node transcribe.js --stage=0` -> PASS. Then `node transcribe.js --file=01-Raw-Inbox/testAusinConvoAudio.m4a --stage=3`.
Done when: a package folder appears in 02-Ready-To-Publish with content_package.json.

## Phase 1: MVP loop (Weeks 1-3) (IN PROGRESS)
Goal: your own writing in, your approved post out.
- Hustle: write persona.json (tone, banned words, 5-7 topics, default Bible translation); create Slack bot + #content-approvals; create Supabase project + content_vault table.
- Sprint: alert.js (Slack ping in every catch), persona injection on every call, schema validation with one retry, vault insert, text packs for Threads/X/LinkedIn with length validators, final.md gate (Slack never shows the AI draft), Make scenario with Approve button writing status back.
Done when: a real weekly breakdown goes .md -> packs -> your final.md -> Slack Approve -> status=approved.

## Phase 2: Scheduling and safety (Week 4)
Scheduler (Metricool or Buffer, decide first), scripture check against a real Bible API, technical-claim flags, end-to-end rehearsal.
Done when: one approval creates three queued posts.

## Phase 3: Personal media (Weeks 5-6)
brand_kit.json, B-roll vault (Gemini vision tagging on short proxies, 30-day cooldown), music vault (brother's beats plus written agreement), matcher, Brand Brief output.
Done when: a brief lists your own clips and beats by filename.

## Phase 4: Toggleable production (Weeks 7-8)
Audio clean + ducking, dead-air cut, 9:16 assembly, captions in your font, Remotion scripture cards behind requires_animation, long-form packaging.
This is the riskiest phase. If anything slips, slip this, not Phase 1-2.

## Phase 5: Compounding (Weeks 9-10)
Embeddings + semantic search, monthly podcast rollup, 30-day archive (dry-run default), Secret Manager notes, weekly analytics note fed back to the strategist.

## Definition of done for any task
It has one command that proves it works, it fails loudly (Slack alert), and it does not touch Sunday.

## Open decisions (lock by Week 4)
1. Scheduler: Metricool vs Buffer (check Make support on your plan).
2. Bible translation and API (public-domain translation is safest for reposting).
3. Which Make Slack module supports a button wait (verify in Make docs).

## Risks
- Model names change: keep it in config.js and re-run ping-model.js when something breaks.
- 65 MB .MOV uploads time out: extract audio with ffmpeg first (task 2B.4).
- Overbuilding: no new feature until the previous phase's "done when" passes.
