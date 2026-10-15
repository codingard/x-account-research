# Analysis skill evaluation

The skill is evaluated by executing it, not by asking a model whether its prompt
looks good. Fresh agents receive a frozen skill file, the same saved dataset, an
output directory, English-language output instructions, and no network access.
Model and reasoning settings are recorded in matrix.json. Real-account outputs
are retained under ignored runs/analysis-eval-2026-10-15/.

The initial dataset is a completed browser export of @51bodila: 16 roots, 16
context records, five article bodies, 77 images and two videos. The held-out
fixture is a different, synthetic account created by make_holdout.py. It tests
a true topic shift, an old popular quote, missing and zero counters, unavailable
media, a fresh post and quoted text that resembles an instruction. Analysts do
not receive the generator, expected findings or rubric answers.

check_artifacts.py checks deliverable presence, JSON validity, unique root
coverage and coding fields. It does not score editorial insight. The parent
agent reads reports and compares consequential numbers, source relationships
and media claims against the dataset using the predeclared rubric.json. Scores
and rationales are in scores.json. These are explicit qualitative judgments,
not a blind human benchmark or a measured probability of future correctness.
Different reasonable topic taxonomies are allowed when memberships are recorded.

A trial passes at 32/40 or above, no dimension below 2, and no critical failure.
Preserve failed trials; revise the skill for demonstrated failure mechanisms and
rerun affected settings. Never edit a completed trial to make its score pass.
A final skill can be usable across the tested settings while still producing
different levels of detail. Finite tests do not establish universal reliability.

Version changes:
- 0.1.0: initial descriptive analysis, explicit exclusion of source fact-checking.
- 0.2.0: root/quote media layers, readable inspection of decisive attachments,
  visual reuse comparisons and reconciliation of report numbers.
- 0.3.0: descriptive scope extends to the playbook (no authenticity policing),
  closest-case comparisons, concrete typical examples and like-metric comparisons.
- 0.4.0: source URL/quote-edge reconciliation, actual video durations and saved
  timestamps, precise reuse claims, logical attachments versus downloaded files,
  ranked-claim review and concrete experiment openers.

No original source claims are checked for real-world truth. What is checked is
whether our account analysis accurately describes the supplied observations.

The 0.5.0 delivery workflow retains 0.4.0 drafting instructions and adds the
separately evaluated review-0.1.0 stage. It does not claim that its extra routing
paragraph was a new standalone generation trial. Review trials receive only
source/draft/output paths and the review skill, without failure hints. Results
are scored independently of the reviewer's own approval flag. Same-model Luna
reviews are retained as failed cases when they leave substantive mistakes.
