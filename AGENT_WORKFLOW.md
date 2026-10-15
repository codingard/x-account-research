# Provider-neutral agent workflow

This project is a set of local tools and Markdown task protocols. It does not
call a model API or require OpenAI, Anthropic, Google, a particular SDK, or a
particular orchestration framework. Select the model in your own client/runtime.
Compatibility means the instructions and files can be used across providers;
it is not a claim of equal analysis quality or successful testing on all models.

## Choose the available execution mode

| Capability | Supported route | If unavailable |
|---|---|---|
| Existing-browser UI control | Agent operates the extension in the user's selected session | User operates the extension and supplies its export; no substitute login |
| Local Python execution | Build CSV dataset and deterministic statistics | Run scripts outside the chat, then supply their outputs; do not pretend commands ran |
| File access / adequate context | Read roots, connected context, articles and indexes | Supply bounded batches with post IDs and relationships, then reconcile the full sample |
| Image input | Inspect decisive images plus an overview of others | Produce text-only analysis and state omitted visual evidence |
| Local video tools + image input | Probe duration and inspect timestamped frames | Use supplied frames/transcripts with provenance or mark video unreviewed |
| Fresh agents or sessions | Independent review of source and draft | Separate self-review, clearly labeled; single-pass when requested |

No provider-specific effort level is mandatory. Prefer the user's configuration.
Choose a reviewer capable of the evidence modalities used in the draft. Do not
silently send local datasets to another provider: use only the user's selected
or authorized runtime. The collector and preparation scripts themselves make
no model calls and do not upload datasets.

## Entry prompts

The following are reusable instructions, with placeholders replaced by actual
paths. Attach/read the named Markdown protocol; no special skill syntax is needed.

### Full workflow

> Read README.md and AGENTS.md in <repository>. Collect <profile URL> through
> my existing <browser/profile>, defaulting to 14 days and 40 root posts. Follow
> skills/x-post-download/SKILL.md, assess media volume, build and verify the
> dataset. Then follow skills/x-account-analysis/SKILL.md and arrange an
> independent review using the available model/session. Save outputs under
> <new run directory>. Report actual inspection scope and review mode.

### Analysis of an existing dataset

> Read skills/x-account-analysis/SKILL.md in <repository>. Analyze <dataset>
> and save report.md, post-coding.jsonl and calculations.json in <draft directory>.
> Describe the author's editorial mechanics, including ambitious claims and
> authority devices, without fact-checking those source claims. Use supplied
> evidence and actual calculations. Record any unavailable modalities.

### Reviewer handoff

> Read skills/x-account-analysis-review/SKILL.md in <repository>. Independently
> revise <draft directory> against <original dataset>. Save revised report.md,
> post-coding.jsonl, calculations.json and review.json in <new final directory>.
> Preserve the original draft. Strengthen useful interpretations and correct
> errors about the dataset without auditing the truthfulness of the author.

## Installation choices

- Any agent/chat: read the Markdown files directly. If your client does not load
  local files, attach their contents and the required dataset evidence.
- Clients supporting SKILL.md folders: use
  `python3 install_skills.py --destination /your/client/skills`.
  Confirm your client's discovery conventions; this installer copies files and
  does not configure arbitrary clients automatically.
- Codex adapter: `python3 install_skills.py --codex` installs optional
  `agents/openai.yaml` metadata along with the same portable protocols.
- Existing folders are preserved unless `--update` is supplied. The installer
  records the checkout path; rerun after moving it. No model keys are needed.

Historical evaluation results remain in evals/analysis/. Those trials used
specific available models; cross-provider execution and quality remain untested.
