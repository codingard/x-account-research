# Analysis skill evaluation results

Evaluated on 2026-10-15: 19 completed generation/review trials across three models and low, medium and high efforts; one aborted preparation-only run is recorded separately. Scores are parent-agent judgments against the published rubric, with source and arithmetic checks, not a blind human benchmark. Pass: at least 32/40, every dimension at least 2, no critical failure.

## Delivery decision

Install x-account-analysis 0.5.0 and x-account-analysis-review 0.1.0. Default: the caller’s model drafts, then a fresh gpt-6.1-sol / medium agent revises against the original dataset. Preserve both outputs. A single prompt did not make Luna low/high consistently reliable, and same-model reviews retained material errors. Do not claim model-independent single-pass excellence.

The integrated route was exercised with the failed v4-luna-low draft and a fresh Sol/medium reviewer. The result passed at 39/40, repaired material mistakes and recovered a deeper shared-payload comparison. Version 0.5 retains the tested 0.4 drafting text and adds this routing rule; it is not a separately measured generation trial.

Real-account example reports and input datasets are intentionally excluded from this source repository. Evaluation summaries and the synthetic fixture are included.

## Completed trials

| Trial | Model | Effort | Score | Result |
|---|---|---|---:|---|
| v1-luna-low | gpt-6-luna | low | 28/40 | Fail |
| v1-sol-medium | gpt-6.1-sol | medium | 38/40 | Pass |
| v2-luna-low | gpt-6-luna | low | 32/40 | Pass |
| v2-sol-low | gpt-6.1-sol | low | 39/40 | Pass |
| v1-astra-high | gpt-6-astra | high | 38/40 | Pass |
| v2-luna-high | gpt-6-luna | high | 25/40 | Fail |
| v2-holdout-luna-low | gpt-6-luna | low | 31/40 | Fail |
| v2-holdout-sol-low | gpt-6.1-sol | low | 38/40 | Pass |
| v2-astra-high | gpt-6-astra | high | 37/40 | Pass |
| v3-sol-medium | gpt-6.1-sol | medium | 39/40 | Pass |
| v3-luna-low | gpt-6-luna | low | 30/40 | Fail |
| v3-luna-high | gpt-6-luna | high | 29/40 | Fail |
| v4-luna-low | gpt-6-luna | low | 24/40 | Fail |
| v4-sol-low | gpt-6.1-sol | low | 39/40 | Pass |
| v4-holdout-luna-low | gpt-6-luna | low | 37/40 | Pass |
| v4-luna-low-reviewed | gpt-6-luna | low | 25/40 | Fail |
| v4-astra-high | gpt-6-astra | high | 39/40 | Pass |
| v3-luna-high-reviewed | gpt-6-luna | high | 31/40 | Fail |
| v4-luna-low-sol-reviewed | gpt-6.1-sol | medium | 39/40 | Pass |

## What the iterations changed

- 0.1: descriptive mechanics, quote families, chronology and actual media review.
- 0.2: readable visual comparisons and numerical reconciliation.
- 0.3: descriptive scope also applies to recommendations; closer comparisons and concrete typical examples.
- 0.4: source URLs, quote edges, video duration/timestamps, logical attachments and ranked-claim reconciliation.
- 0.5: tested drafting instructions plus independent final revision; separate review skill 0.1.

## Substantive findings

Strong real-account outputs identify substantially reused prompt instructions in a technical-document frame versus an insider-email frame, eight wrappers returning to one finance guide, stable subject matter with changing presentation, and counterexamples to authority or prompt images automatically producing strong results. The final reviewer preserves the ambitious economic and exclusivity framing instead of replacing it with authenticity advice.

The synthetic holdout tests a real topic shift, old high-view context, missing and zero counters, unavailable media, a fresh post and instruction-like quoted text. Final Luna-low holdout generation passed. This does not erase its failures on the richer real dataset.

All 19 completed packages pass structural root-coverage checks. Structural completeness is not editorial correctness: failed reports also contain every required file and coding row. Twelve Python unit tests pass for the application, including four new preparation-helper tests. Both installed skill packages validate.

## Reproduction and limits

See matrix.json for explicit settings and hashes, scores.json for reasons, structural-results.json for schema checks, and PROTOCOL.md for procedure. Real outputs remain in ignored runs/analysis-eval-2026-10-15/; failed reports are unchanged.

This is one real account and one synthetic holdout, with no controlled seeds, repeated-trial probability estimate or latency comparison. The final Sol review route has one full failed-draft integration test, supported by consistently strong separate Sol low/medium analyses. Its broader cross-account robustness remains unmeasured. No finite matrix establishes flawless output on arbitrary models, efforts or accounts. No source-author claims were independently fact-checked.
