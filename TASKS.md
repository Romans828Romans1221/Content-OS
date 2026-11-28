# ContentOS Task Tracker

Status as of Mon Nov 23, 2026: **Phase 0 complete. Phase 1 in progress: Slack alerts (1.0, 1.7, 1.8), dotenv fix (1.11) and persona.json (3A.1) done.** Next: Supabase (4A.1).

## How a task becomes "done" (version control rule)
1. Run the task's TEST. It must pass.
2. Commit with the task ID first: `git commit -m "3B.4: schema validator with one retry"`.
3. Tick the box here in the same commit.
4. When a phase's "done when" passes, tag it: `git tag phase-1-done`.
Never commit secrets (.env). Never commit media. Sunday: no commits.

Legend: `[x]` done, `[ ]` to do. Format: ID (priority, minutes, depends on) task. TEST: proof.

## Epic 1: Stabilize the prototype
- [x] 1.1 (P0, 15m) Harden .gitignore. TEST: `git check-ignore -v .env 01-Raw-Inbox/<any file>` lists both.
- [x] 1.2 (P0, 15m) Create the five folders plus fonts/music. TEST: `node setup-folders.js` prints ok for all.
- [x] 1.3 (P0, 20m) config.js holds model, mime map, folders. TEST: `node -e "console.log(require('./config').MODEL)"`.
- [x] 1.4 (P0, 25m, 1.3) Remove Pixabay. TEST: `grep -ril pixabay *.js .env` prints nothing.
- [x] 1.5 (P0, 15m, 1.3) Model ping. TEST: `node ping-model.js` prints `reply=`.
- [x] 1.6 (P0, 30m, 1.3) Stage flags and PASS/FAIL table (stages 0-4 done; stage 5 vault and 6 notify arrive with 4B.1 and 6A.2). TEST: `node transcribe.js --stage=0`.
- [x] 1.9 (P0, 45m) retry.js: IPv4-first, timeouts, retries network drops and 5xx/429. TEST: simulated 503 recovers after 2 tries.
- [x] 1.10 (P0, 30m) Cache Stage 2 so a failed Stage 3 does not repeat the transcription. TEST: second run shows "from cache".
- [x] 1.0 (P0, 35m) HUSTLE: Slack bot + private #content-os-alerts channel, token in .env. TEST: curl test message appears.
- [x] 1.7 (P0, 30m, 1.0) alert.js Slack helper. TEST: `node -e "require('./alert').send('test')"` posts.
- [x] 1.8 (P0, 30m, 1.7) Call alert in every stage catch. TEST: bad API key sends a Slack alert in about 10s.
- [x] 1.11 (P2, 10m) Load dotenv once. TEST: only one "injected env" line prints.
- [ ] 1.12 (P2, 15m) Save the commit guard in the repo as scripts/pre-commit.sh plus a one-line install note, because .git/hooks is not versioned and is lost on a re-clone. TEST: fresh clone, run the install line, a staged fake key is blocked.
- [x] 1.13 Model fallback chain: next model on 503/timeout/404, Slack note names the model used, model recorded in cache and package (generate.js)
- [ ] 1.14 check-models.js: tests every candidate model with a known-good control and prints a table

## Epic 2: Ingest
- [ ] 2A.1 (P0, 30m, 1.2) Inbox scanner. TEST: `node ingest.js --list` shows each file with its type.
- [ ] 2A.2 (P0, 25m, 2A.1) Processed ledger. TEST: second run prints `0 new items`.
- [x] 2B.1 (P0, 20m, 2A.1) Text path (.md/.txt). Code exists, untested. TEST: `--file=x.md --stage=1` prints character count.
- [x] 2B.2 (P0, 25m, 1.3) Audio upload with mime by extension. TEST: .m4a uploads (verified Nov 21).
- [x] 2B.3 (P0, 30m) One dated folder per item, no overwrites. TEST: `ls 02-Ready-To-Publish` shows dated folder.
- [ ] 2B.4 (P0, 30m, 2B.2) MOV to m4a via ffmpeg before upload. TEST: `ffprobe` shows no video stream.
- [ ] 2B.5 (P1, 30m, 1.10) Cache key includes a hash of prompt + model, so editing a prompt cannot return a stale cached result. TEST: change one word in the prompt, rerun, see a cache miss.
- [ ] 2C.1 (P2, 45m, 2B.1) RSS feed to .md in inbox. TEST: `node feed.js` drops 3 files.

## Epic 3: Voice and strategy
- [x] 3A.1 (P0, 40m) HUSTLE: persona.json (tone, banned words, 5-7 topics, translation, no emojis). TEST: parses; has tone, banned, topics.
- [x] 3B.1 (P0, 25m, 3A.1) Persona prepended to every call. TEST: `--debug` prints start of system prompt with your tone.
- [x] 3B.2 (P0, 45m) One call: transcript + 3 angles as JSON. TEST: `--stage=2` PASS (verified Nov 21).
- [ ] 3B.3 (P0, 30m, 3B.2) check-fidelity.js: every source_quote exists in the source. TEST: prints OK for all quotes; flags a planted fake quote.
- [x] 3B.4 (P0, 40m, 1.7) Schema validator, one retry, then alert. TEST: malformed fixture retries once then alerts.
- [x] 3B.5 (P0, 30m, 3B.4) Angles may return `not_present` instead of being padded; `unsupported` must be an array. Found Nov 21: forced "faith" and "technical" angles on a thin audio. TEST: the Austin sample returns technical as not_present.
- [ ] 3B.6 (P1, 45m, 3B.3) Intensifier check: flag strengthening words in the script (completely, deeply, absolutely) that are not in the source. Found Nov 21: "very different" became "completely different". TEST: Austin item flags "completely".

## Epic 4: Vault
- [x] 4A.1 (P0, 40m) HUSTLE: Supabase project + content_vault table. TEST: `select count(*) from content_vault` returns 0.
- [ ] 4B.1 (P0, 35m, 4A.1, 3B.4) Supabase client + insertVault() (becomes stage 5). TEST: row id visible in dashboard.
- [ ] 4B.2 (P0, 20m, 4B.1) source_type from filename prefix (bible_, sermon_, life_, tech_). TEST: 4 fixtures map correctly.
- [ ] 4C.1 (P2, 30m, 4B.1) pgvector column. TEST: column exists.
- [ ] 4C.2 (P2, 30m, 4C.1) Embed on insert. TEST: new rows have embeddings.
- [ ] 4C.3 (P2, 45m, 4C.2) `node search.js "patience"` returns top 5. TEST: 5 rows with scores.

## Epic 5: Writing and creative direction
- [ ] 5A.1 (P0, 45m, 3B.4) Text pack: hook, outline, draft for Threads, X, LinkedIn. TEST: 3 platform objects.
- [ ] 5A.2 (P0, 30m, 5A.1) Length validator (X 280, Threads 500) with regenerate. TEST: `node validate.js <item>` PASS.
- [ ] 5A.3 (P0, 35m, 3B.4) 30-60s voiceover script. TEST: 75-150 words.
- [ ] 5A.4 (P0, 25m, 3B.4) Talking-head outline. TEST: 4-7 bullets.
- [x] 5A.5 (P0, 45m) Creative Director JSON (v1: hook, script_body, camera_setup, editing_cues, broll_query, beat_query). TEST: `--stage=3` PASS. Needs schema validation (3B.4).
- [x] 5A.6 (P0, 30m) content_package.json written to item folder. TEST: file exists and parses. (brief.md still to do.)
- [ ] 5A.7 (P0, 20m, 5A.6) Require your final.md before notify. TEST: stage 6 without final.md exits with a clear message.

## Epic 6: Approval, distribution, safety
- [ ] 6A.1 (P0, 60m, 1.0) Make scenario: webhook to Slack with Approve button. TEST: test payload shows a button.
- [ ] 6A.2 (P0, 30m, 5A.7) Webhook payload: item_id, platform, final.md text. TEST: `--stage=6` posts to Slack.
- [ ] 6A.3 (P0, 60m, 4B.1, 6A.1) Approve click sets status=approved. TEST: row status changes.
- [ ] 6A.4 (P0, 40m, 6A.3) publish.js moves folder 02 to 03, status=scheduled. TEST: folder moves.
- [ ] 6B.1 (P2, 35m) HUSTLE: choose Metricool or Buffer, connect accounts. TEST: accounts show connected.
- [ ] 6B.2 (P2, 60m, 6A.3, 6B.1) Approved item to scheduler. TEST: test post in queue.
- [ ] 6B.3 (P2, 45m, 6B.2) Platform routing and time slots. TEST: one item makes 3 queued posts.
- [ ] 6C.1 (P0, 60m, 5A.6) Scripture check against a Bible API. TEST: John 3:99 FAIL, John 3:16 PASS.
- [ ] 6C.2 (P0, 45m, 5A.6) Technical-claim flag for cloud content. TEST: wrong GCP claim fixture flagged.
- [ ] 6C.3 (P0, 45m) End-to-end rehearsal. TEST: one log shows every stage PASS.

## Epic 7: Brand and personal media vaults
- [ ] 7A.1 (P1, 40m) HUSTLE: brand_kit.json. TEST: parses; 3 angles.
- [ ] 7A.2 (P1, 30m) HUSTLE: fonts + beats into 00-Brand-Assets; written beat agreement with your brother. TEST: files and agreement saved.
- [ ] 7B.1 (P1, 30m) b_roll_vault table. TEST: queryable.
- [ ] 7B.2 (P1, 30m) music_vault table. TEST: queryable.
- [ ] 7C.1 (P1, 60m, 7B.1) Tag one clip with Gemini vision (short proxy). TEST: row has activity, mood, energy, duration.
- [ ] 7C.2 (P1, 40m, 7C.1) Batch tag, skip tagged. TEST: second run `0 new`.
- [ ] 7C.3 (P1, 30m, 7B.1) 30-day cooldown query. TEST: clip used yesterday not returned.
- [ ] 7D.1 (P1, 45m, 7B.2) Catalog beats from CSV. TEST: row count equals CSV rows.
- [ ] 7E.1 (P1, 45m, 7C.3, 7D.1) Matcher: queries to your own clips and beat. TEST: 3 clips + 1 beat returned.
- [ ] 7E.2 (P1, 40m, 7E.1) Brand Brief output when requires_ai_editing=false. TEST: brief.md lists filenames and cues.
- [ ] 7E.3 (P1, 25m, 7A.1) brand_kit applied by angle. TEST: debug prints correct palette and font.

## Epic 8: Toggleable production (all P2)
- [ ] 8A.1 (20m, 5A.6) Flags requires_ai_editing / requires_animation default false. TEST: keys present in every package (already written by stage 4).
- [ ] 8A.2 (45m) FFmpeg voice clean + loudness normalize. TEST: about -14 LUFS.
- [ ] 8A.3 (60m, 8A.2) Duck beat under voice. TEST: listen test.
- [ ] 8B.1 (60m, 8A.2) Cut dead air. TEST: shorter, no pauses over about 1s.
- [ ] 8B.2 (90m, 7E.1, 8B.1) Assemble VO + B-roll + beat, 9:16. TEST: ffprobe 1080x1920 plays.
- [ ] 8B.3 (90m, 8B.2) Burn captions in your font, safe zone. TEST: readable, clear of UI zones.
- [ ] 8C.1 (60m, 7A.1) Remotion skeleton with your font. TEST: test clip renders.
- [ ] 8C.2 (90m, 8C.1) Scripture card template. TEST: verse + reference in your colors.
- [ ] 8C.3 (45m, 8C.2, 8A.1) Render only when requires_animation=true. TEST: false makes no render.
- [ ] 8D.1 (60m, 3B.4) Long-form packaging with beat credit. TEST: output has credit line.
- [ ] 8D.2 (60m, 4B.2) Monthly podcast run-of-show. TEST: 40-minute outline file.
- [ ] 8D.3 (45m, 8D.2) Podcast show notes. TEST: notes file generated.

## Epic 9: Maintenance and feedback
- [ ] 9.1 (P2, 45m) 30-day archive script, dry-run default. TEST: `node archive.js --dry` lists, moves nothing.
- [ ] 9.2 (P3, 45m) GCP Secret Manager migration note. TEST: one-page doc in repo.
- [ ] 9.3 (P3, 30m) HUSTLE: weekly analytics note into inbox. TEST: appears in `--list`.
- [ ] 9.4 (P3, 60m, 9.3) Strategist reads latest analytics note. TEST: angles mention it.

## Next up (week of Nov 23)
- Tue hustle: 4A.1 Supabase project + content_vault table.
- Wed hustle: write one real weekly breakdown as a .md file into 01-Raw-Inbox (the real test input).
- Thu hustle: 2B.1 test the text (.md) path with that file.
- Fri sprint: 3B.1, 3B.5, 3B.4, 3B.3 (persona on every call, not_present angles, schema check + retry + alert, fidelity script).
- Sat sprint: 5A.1, 5A.2, 5A.7, 4B.1 (text packs, length checks, final.md gate, vault insert).
- Following week: 6A.1-6A.4 (Make approval flow), then tag phase-1-done.
- Sunday: Sabbath. No code, no commits.

## Phase gates (tag when true)
- [x] phase-0-done: package folder with content_package.json exists (Nov 21, 2026).
- [ ] phase-1-done: a real weekly breakdown goes .md -> packs -> your final.md -> Slack Approve -> status=approved.
- [ ] phase-2-done: one approval creates three queued posts.
- [ ] phase-3-done: a brief lists your own clips and beats by filename.
- [ ] phase-4-done: rough cut renders from a toggle.
- [ ] phase-5-done: semantic search + archive + feedback loop working.

## Progress log
- Sat Nov 21, 2026: Phase 0 done and tagged phase-0-done. Private GitHub repo live (Romans828Romans1221/Content-OS). Commit guard hook installed and tested (blocks .env and secret patterns). Secret scan of history clean.
- Sat Nov 21, 2026: Slack alerts done. 1.0 bot + #content-os-alerts, 1.7 alert.js, 1.8 alert on every pipeline failure (all pushed).
- Mon Nov 23, 2026: 1.11 dotenv loads once. 3A.1 persona.json done: 6 topics, 10 themes (3 own and approved; AI-suggested themes are used only after status is set to approved), Bible translation chosen, banned words and scripture rules set.
- Open: 1.12 guard hook not yet versioned; 2B.5 stale-cache risk; 3B.5/3B.6 quality issues found on the Austin sample (forced angles, "very" became "completely"); scripture_needed on three themes; verify the meekness and Barnabas notes before use.
- Channels: #content-os-alerts (code errors, bot token in .env) and #content-approvals (reserved for the Make Approve button, Phase 1 end).
