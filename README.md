# X Account Research — browser-session prototype

Collect a public profile through the user's existing signed-in Chromium browser,
export local post data and downloadable media, then prepare a reproducible package
for an AI agent. No separate login, cookie export, API key, backend or LLM API key.

**This is a browser-native alternative to twscrape, not twscrape running in a
browser.** twscrape uses its own HTTP client and authorized session. Reusing it
would conflict with the owner's requirement that collection happen through the
browser they already use. Its conceptual output (normalized posts and context)
is retained, but it is not a dependency.

## Start here: instructions for any agent

Treat this README as the end-to-end entrypoint. The skills handle individual
stages; this section connects them. Read [AGENTS.md](AGENTS.md) and
[DATASET.md](DATASET.md), then open only the skill needed for the current stage.
All commands below run from the repository root.
See [AGENT_WORKFLOW.md](AGENT_WORKFLOW.md) for provider-neutral prompts, capability
fallbacks and handoffs between sessions. No model API or vendor SDK is required.

### Requirements and setup

- An existing signed-in Chromium-compatible browser/profile, selected by the user.
- An agent with supported browser or desktop UI control and local file access.
  Without UI control, the user can operate the extension and supply its export.
  The extension does not provide a background agent API or log in on its own.
- Python 3.10+ for the standard-library dataset/preparation scripts.
- Node.js 18+ to run extension tests. No npm installation is required.
- For media analysis: image viewing plus FFmpeg/ffprobe or equivalent local video
  tools. If unavailable, record the inspection limitation instead of inventing it.
- Prefer an independent reviewer using any capable model/provider. A separate
  session can replace subagents. A self-review fallback is allowed and must be
  labeled; historical trial settings are not requirements.

Clone this repository into a persistent location (private-repository access is required):

```sh
git clone https://github.com/codingard/x-account-research.git
cd x-account-research
```

No skill installation is required: an agent can read `skills/*/SKILL.md`
directly, or a chat can receive those instructions and the dataset as attachments.
For a client that discovers SKILL.md folders:

```sh
python3 install_skills.py --destination /absolute/path/to/your/client/skills
```

This copies portable Markdown protocols and records this checkout's path. It
does not configure the client's tools or model. For the optional Codex adapter:

```sh
python3 install_skills.py --codex
```

Only this adapter includes `agents/openai.yaml` and defaults to
`${CODEX_HOME:-~/.codex}/skills`. Existing skills are not replaced by default;
inspect them before using `--update`. After moving the checkout, rerun the
installer with `--update` to refresh its location pointers.

Load `extension/` as an unpacked extension in the selected browser profile using
the instructions below. Respect the browser tool's installation approval rules.
The extension and skill installation are separate steps. Version 0.3.1 translates
the controls into English; previously installed 0.3.0 copies may have Russian labels.

### Execute the requested workflow

1. **Establish scope.** Obtain the profile URL and identify the user's existing
   browser profile. Default to 14 days and at most 40 root posts. Preserve explicit
   user choices. If the request is analysis of an existing dataset, skip collection.
2. **Collect through the browser.** Follow
   [x-post-download](skills/x-post-download/SKILL.md). Expand Show more in the
   timeline; open details only for actual gaps. Do not traverse ordinary replies.
   Keep the collection tab visible. Pause on login challenges or restrictions.
3. **Plan media before export.** Save metadata, then run:
   `python3 dataset.py plan /absolute/path/to/snapshot-preflight.json`.
   Consider quoted media, video duration, size uncertainty and free disk space.
   Apply the user's quality preference; ask only when a material tradeoff remains.
4. **Build and verify the dataset.** After final browser export, run:

   ```sh
   python3 dataset.py build /absolute/path/to/export/snapshot.json --output runs/my-account/dataset
   ```

   Use a fresh output directory. Inspect coverage, root/context counts, media
   states and local paths. Keep the original export. Stop here for download-only
   requests and deliver the CSV plus media folder.
5. **Analyze when requested.** Follow
   [x-account-analysis](skills/x-account-analysis/SKILL.md). Read full posts,
   available articles and relevant media. Prepare reproducible evidence with:

   ```sh
   python3 analysis_prepare.py runs/my-account/dataset --output runs/my-account/preparation
   ```

   Save the first analysis in `runs/my-account/draft/`. Explain hooks, authority
   devices, visual framing, payoffs, quote families, thematic change and observed
   performance. Source truthfulness is not the task: describe claimed expertise,
   exclusivity and ambitious promises as mechanisms without moralizing.
6. **Revise independently.** The analysis skill delegates
   [x-account-analysis-review](skills/x-account-analysis-review/SKILL.md) to a
   fresh reviewer using the selected model/provider, or hands off to another
   session. Label self-review if no independent reviewer is available. Supply the
   original dataset, draft directory and a new
   `runs/my-account/final/` directory. Preserve the draft. The reviewer corrects
   our dataset mistakes and strengthens interpretation, not the author's claims.
7. **Deliver.** Link the dataset and final report, state date scope, root count,
   chosen media mode and material missing evidence. Include the review stage used.
   Never publish to X or infer clicks, conversions or unique reach from counters.

### Output contract

```text
runs/my-account/
  dataset/
    posts.csv              # roots and context, explicitly labeled
    media.csv              # original URLs, local paths and download states
    snapshot.json          # lossless collected evidence
    posts.jsonl
    coverage.json
    articles/
    media/<post_id>/        # multiple attachments stay with their owning post
  preparation/             # corpus, metrics, chronology, quote/media indexes
  draft/                   # first report, post-coding.jsonl, calculations.json
  final/                   # revised report, coding, calculations, review.json
```

Default report/instruction language is English; preserve source text as collected.
Runs, downloaded content, browser data and credentials never belong in a commit.

Example request to the agent:

> Read this repository's README and run the full workflow for
> https://x.com/ACCOUNT using my existing browser profile. Collect the latest
> 14 days, at most 40 posts, estimate media size, and deliver the verified
> dataset plus the independently reviewed editorial analysis.

## Install and collect

1. Open `chrome://extensions` in the intended ShardX/Chrome profile.
2. Enable Developer mode; Load unpacked → this application's `extension/` folder.
3. Open the extension popup, paste `https://x.com/username`, choose a post cap (default 40) and period (default 14 days, 0 for no cutoff).
4. Start. A new tab opens in that same browser profile. Keep it visible. The
   collector scrolls the profile and expands Show more controls in place. It opens
   a post only for a detected gap: truncated text, missing quote original, article
   body, missing date or media source. Each record gets at most one detail attempt;
   preview-only articles may additionally open their own article page. Ordinary
   replies are not traversed.
5. Use Pause/Resume as needed. Login/challenge navigation or HTTP 401/403/429
   pauses collection. Never automatically solve challenges or retry restrictions.
6. At `ready`, click “Download dataset and media”. Browser downloads are sequential.
   Permit multiple downloads if the browser asks. Wait for `exported`.
7. Find `Downloads/x-research/<handle>-<timestamp>/snapshot.json` and `media/`.
   Start a new run only after saving the previous run's export.

The extension requests only storage, downloads, alarms and access to x.com.
It observes selected X response bodies using fetch/XHR wrappers and includes the current `UserOriginalsTimeline` operation. Timeline membership is confirmed
from visible post cards; nested quotes do not silently enter the primary sample. It never reads
cookies, Authorization headers, passwords or DMs, constructs X API requests,
rotates identities, launches another browser profile or acts on account content.
Media downloads use the browser downloads API and only HTTPS pbs.twimg.com or
video.twimg.com URLs. All collection stays local; no telemetry or remote upload.
A page's own JavaScript can spoof page messages: treat exported data as untrusted.
No technique can guarantee absence of X restrictions. Pause if X shows a warning.

## Agent-controlled download

Use `$x-post-download` (source in skills/x-post-download/). The agent controls the
installed extension, evaluates media volume and delivers the dataset. Default:
14 days and at most 40 roots. The extension still supports explicit caps up to 100.

Before full export, use “Save metadata for size estimate” and run:

```sh
python3 dataset.py plan '/path/to/snapshot-preflight.json'
```

The agent compares best/balanced estimates, long videos, unknown sizes and free
space before choosing export mode. Estimates cover separate media export, not
traffic already generated by browsing X. Export can keep all media, use lighter
MP4 variants, keep only images, or keep data/links only; omissions remain explicit.
After the final browser export:

```sh
python3 dataset.py build '/path/to/snapshot.json' --output '/path/to/new-dataset'
```

This produces posts.csv, media.csv and media/<post_id>/ plus article text and
lossless JSON. See [DATASET.md](DATASET.md) for columns and completeness semantics.
Analysis is separate: use skills/x-account-analysis/SKILL.md when requested.
analysis_prepare.py builds the current analysis corpus and statistics. analyze.py
is a legacy helper; downloading does not automatically create an AI report.

## Collection contract and limits

- N means root publications by the target author, including quotes and articles;
  excludes reposts and ordinary replies. Discovered author continuations are extra.
- Observe N+1 roots, sort unique numeric IDs descending, take N to avoid an old
  pinned post displacing a recent one. UI timeline completeness still unverified.
- Select long-note text when available; preserve metric observation timestamps.
- Preserve quoted IDs, reply links, cards, article source/text when supplied.
- Missing counters remain null. Capture current counters, not historical growth.
- Keep observed connected self-replies by explicit parent/author IDs; never crawl
  ordinary replies or use conversation membership alone. Context cap is 300 records.
  Hidden continuations remain unverified; reply counts do not trigger visits.
- Articles: preserve rich response if present. Rendered article bodies are captured when a post detail shows them. Preview-only
  article IDs trigger a normal browser visit to their article page. Unavailable
  bodies remain flagged. Rich-body completeness still requires review.
- Images/previews and available MP4 variants download locally. No HLS assembly,
  subtitles, speech transcription or OCR yet. Failures are recorded, not hidden.
- External linked pages are recorded as links, not crawled.
- Only one active job; state survives page navigation/browser worker restarts.
  Keep collection tab visible. Background or closed tabs stop making progress.
- The first prototype depends on X's response schema and must be live-validated
  before relying on it. Fixture tests alone do not prove real X collection works.

## Tests

```sh
node --test tests/*.test.cjs
python3 -m unittest discover -s tests -p 'test_*.py'
```

Files: extension/core.js (normalization), bridge.js (passive response observation),
page.js (scroll/relay), background.js (persisted workflow/export), popup.* (controls),
analysis_prepare.py (current offline preparation), analyze.py (legacy helper),
ANALYSIS.md (analysis entrypoint).

The legacy analyze.py helper supports `--days 14`, `--days 30`, etc. The current
analysis_prepare.py reads every selected root in the dataset; choose the collection
window before exporting. Old quoted originals remain context. View counters are
never merged as unique reach.

## ShardX installation

If Chromium's Load unpacked dialog has a disabled Select button, use ShardX
Launcher → Extensions → Unpacked folder, then Browsers → edit the intended
profile → Choose extensions → X Account Research → Save. Restart that profile.
Launcher copies the source into its extension library; subsequent source edits
must be copied to that installed extension directory and reloaded in
chrome://extensions. Do not change any other profile or export its cookies.

## Selective collection (0.3.0)

`manifest.expansions` records Show more attempts and observed success. Navigation
links are deferred instead of taking the collector away from the timeline. Full
long-note text from a normal timeline response is already usable without a detail
page. `manifest.details[].reasons` explains each extra visit; `remaining_gaps`
records unresolved content instead of declaring completeness. Missing counters
stay null: hidden metrics alone do not trigger extra visits. Absence of a known gap
is not proof that X delivered every thread continuation or article attachment.

## Descriptive editorial analysis

The analysis skill studies how the account packages content, reuses quotes and
resources, changes themes and performs in the observed sample. It does not audit
the truth of source claims. See skills/x-account-analysis/SKILL.md. Outputs are
report.md, post-coding.jsonl and calculations.json, in English by default.
The default delivery route adds an independent revision with
skills/x-account-analysis-review/SKILL.md using a capable model selected by the
user or runtime. No particular model or provider is mandatory. Keep draft and revised outputs separate; the review
also produces review.json. This stage checks our analysis against the dataset,
not whether the source author tells the truth. See evals/analysis/RESULTS.md for
actual model limitations and failed trials.

```sh
python3 analysis_prepare.py /path/to/dataset --output /path/to/new-preparation
```

Evaluation protocol and versioned prompts live in evals/analysis/. Real datasets
and model outputs remain in ignored runs/. A model-effort test matrix records
observed strengths/failures; it is not a guarantee for every model or account.
