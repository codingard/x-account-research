# Validation — 2026-10-13

## Confirmed

- 9 JavaScript and 4 Python tests pass. Includes root/date selection, nested quotes,
  article navigation, restrictions, tab isolation, missing metrics, self-quotes,
  unsafe local paths and browser-corrected image suffixes.
- Installed and updated in ShardX profile “Х emmy” with its existing signed-in X
  session. No cookie extraction, separate login or HTTP scraping client.
- Two live smoke runs on https://x.com/supr3mmy completed end to end. Each selected
  3 root posts and visited 6/6 root/context pages with matching responses.
- Final installed-source run: 2026-10-13T14:42:06.849Z; exported at
  2026-10-13T14:44:48.855Z. No collector errors. 28/28 media paths exist exactly as
  recorded, including two playable MP4 files. Offline preparation reports 0 issues.
- Final run is retained in ignored runs/emmy-final-smoke-2026-10-13/.
- Article body: 40,662 characters, title “The AI Memory Stack: What to Keep, Load,
  and Forget”. Beginning, sections and conclusion inspected. DOM text also contains
  embedded posts; rich-body completeness is not certified.
- Evidence-based Russian report and evidence table are in the first run's
  runs/emmy-smoke-2026-10-13/analysis/. Numbers refer to that first snapshot, not
  the later run. Images and video frame samples reviewed; audio not transcribed.
- The design post really quotes @0xwhrrari's memory article: verified in X UI.
  This topic mismatch is source content, not an invented relationship.
- Current X timeline endpoint UserOriginalsTimeline is supported.
- Chromium changed two requested .jpg names to .png in the first export. Fixed
  URL format detection and recorded actual download filename in final collector;
  offline reader also resolves legacy exports with URL-specified format.

## Limits / not claimed

- 100-post collection has not been live-tested; profile UI showed 27 posts.
- Complete timeline, all thread replies, all nested article attachments and unique
  reach are not guaranteed. Missing material must remain explicit.
- Self-quotes and preview-only article navigation have fixture coverage; the live
  sample contains an external quote whose full article rendered on its post page.
- Article media collection includes duplicate resolutions, avatars and preview
  images from embedded posts. 28 files do not mean 28 independent attachments.
- Popup accessibility status can lag until interaction; completion was verified
  against actual exported JSON and files, not only its label.
- Collection itself may affect view counts. No assertion of zero account risk.

## Workspace check

`python3 tests/check_workspace_layout.py` fails on unrelated root file `ddds.png`.
This task did not create, move or delete it. App tests pass independently.

## v0.2 download workflow

- Defaults changed to 14 days / 40 roots in popup and worker fallback.
- Added metadata-only preflight and best/balanced/images/none export modes;
  direct browser media paths now use media/<post_id>/.
- Added offline size planner and dataset builder with CSV, quote relationships,
  UTC dates, per-post media, article text, raw evidence and coverage states.
- 11 JavaScript + 7 Python tests pass, including preflight without media requests,
  lighter video selection, explicit skipped records, multiline CSV, unknown vs zero,
  unsafe path rejection, per-post copying and large/unknown media estimates.
- Converted the real six-record Emmy snapshot to dataset-v1: 3 roots, 3 context,
  28 files, 10,956,392 bytes; all CSV local paths verified, no missing files.
- x-post-download skill validated and installed in ~/.codex/skills/.
- New collection behavior has fixture coverage; no new 40-post live run claimed.

- ShardX UI confirmed installed/reloaded version 0.2.0, defaults 40/14, media modes
  and metadata export button. Live preflight on retained job produced JSON with
  pending media only; no repeat collection or full-media export was needed.

## v0.3 timeline-first live comparison — 2026-10-14

- Installed 0.3.0 in existing the selected ShardX test profile; defaults 14 days / 40 roots.
- New live run: 2026-10-14T11:13:09.561Z, collection wall time 326.004 seconds.
  Prior run: 1198.966 seconds. Approximately 3.68× faster in these two runs;
  not a controlled network benchmark. No request-count or traffic-byte claim.
- 10/10 in-feed Show more attempts completed; full note text was also delivered
  by normal timeline responses. Five detail visits, all for missing article bodies,
  versus 67 in the prior run. No ordinary reply traversal.
- 16 roots and 16 context records (7 quote originals, 9 observed self-replies).
  Prior dataset had 16 roots and 51 context records, including 44 replies.
- 15 roots common to both runs: exact text, quote IDs and media IDs retained; no
  previously available metric fields lost. Values themselves are new observations.
- All five article bodies exactly match the old snapshot. No collector errors or
  detected remaining gaps. Hidden thread completeness is explicitly unverified.
- One old root aged out of the rolling window; one new root appeared. Two old media
  files belonged to the excluded old root / an omitted reply; one new image added.
- Exported balanced mode: 79/79 files, 32,243,719 bytes; 77 images and 2 MP4 files.
  Final CSV contains 32 rows, 16 roots; all media paths exist, coverage issues empty.
- Evidence: ignored runs/51bodila-2026-10-14/{snapshot-preflight.json,comparison.json,dataset/}.
- 15 JavaScript + 8 Python tests pass, including selection without extra visits,
  explicit self-reply edges, missing quote fallback, Show more success/failure,
  tab isolation and comparisons across shifted windows. Installed skill updated.

## Descriptive analysis skills — 2026-10-15

- Added offline analysis_prepare.py: full root/context corpus, article bodies,
  root-only statistics, observation ages, chronological bins, separate quote
  counters and safe local media paths. Twelve Python tests pass (four new tests
  cover missing/zero counters, chronology/freshness, quote context and safe paths).
- Created and installed English x-account-analysis and x-account-analysis-review
  skills. Both skill packages pass the skill-creator validator. Collection remains
  separate; no new browser traffic was required for these tests.
- Real model trials use the preserved 51bodila dataset and a synthetic holdout.
  See evals/analysis/RESULTS.md, matrix.json and scores.json for exact settings,
  versions, failures and limitations. Structural artifact checks are separate
  from editorial quality scores. Failed trial outputs remain unchanged.
- Source-claim truthfulness is outside scope. Analysis-quality checks concern
  what the supplied records actually contain, not whether the account's claims
  about the world are true.

## Repository packaging — 2026-10-15

- Added portable skill installation with checkout pointers; clean install,
  existing-target refusal and explicit update were smoke-tested.
- Added the end-to-end agent workflow to README.md.
- Extension 0.3.1 changes popup text to English; collection behavior is unchanged.
  No new live-browser collection test is claimed for this text-only UI change.
- All 15 JavaScript and 12 Python tests pass; all three skill packages validate.
- Private source repository: https://github.com/codingard/x-account-research .
  Real runs and media are excluded. Public-facing source exports may normalize
  local paths in historical prompts; original evaluation hashes stay recorded.

## Provider-neutral workflow — 2026-10-15

- Analysis 0.6.0 and review 0.2.0 remove mandatory provider/model routing.
- Added direct Markdown prompts, session handoffs and capability fallbacks.
- Installer now requires an explicit destination or the optional --codex adapter;
  generic installations omit OpenAI UI metadata.
- Historical model trials remain unchanged. These portability changes do not
  establish cross-provider quality or a live integration with another client.
