# Account analysis entrypoint

The maintained editorial analysis protocol is
[skills/x-account-analysis/SKILL.md](skills/x-account-analysis/SKILL.md).
Use it for descriptive analysis of downloaded account data. Source claim
truthfulness is outside the default task; dataset arithmetic and attribution
remain accurate.

Prepare new datasets with analysis_prepare.py. analyze.py remains available for
legacy exports, but its old per-post-detail completeness assumptions do not
apply to the current timeline-first collector. Collection and analysis are
separate steps. New reports and evaluation artifacts default to English.

Default delivery uses a fresh `x-account-analysis-review` revision after drafting,
with the tested Sol/medium reviewer configuration. Drafting can use the caller's
model; single-pass small-model reliability has not been established. Preserve
both stages and the review record.
