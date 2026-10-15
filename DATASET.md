# Download dataset v1

`dataset.py plan snapshot-preflight.json` estimates media before downloading.
`dataset.py build snapshot.json --output <new-directory>` creates the final package.
Both commands are offline and use Python 3.9+ with no dependencies.

```
dataset/
  posts.csv
  media.csv
  media/<post_id>/001.jpg, 002.mp4, ...
  articles/<post_id>.txt
  posts.jsonl
  snapshot.json
  coverage.json
  README.txt
```

posts.csv contains one row per root or context post. Columns: post_id, role,
author, published_at_utc, observed_at_utc, text, post_url; views, likes, reposts,
replies, quotes, bookmarks; quoted_post_id, quote_url, quote_relationship;
reply_to_id, conversation_id; media_dir, media_paths, media_urls, media_statuses;
links, article_title, article_path, article_completeness, text_possibly_truncated.

List columns are JSON arrays inside quoted CSV cells. media.csv provides a simpler
one-file-per-row view with post_id, kind, source_url, local_path, status, bytes and
SHA-256. All paths are relative to the dataset; all timestamps normalized to UTC.
Import identifier columns as text in spreadsheets to avoid 19-digit ID rounding.
CSV is UTF-8 with BOM, quoted multiline text; formula-like strings are escaped
with an apostrophe. Exact strings remain in snapshot.json and posts.jsonl.
Unknown counters are blank; actual zero stays zero. No counter is unique reach.

Quotes retain their own row plus original row when available, including originals
outside the time window. Original media lives under the original's ID. Shared media
is copied to each associated post folder, making folders usable independently.
Replies are context; conversation membership alone does not prove a self-thread.

Only completed files that exist are copied. Skipped/pending/failed/missing records
remain in media.csv with URL and no local path. coverage.json records missing files,
collector errors, chronology/thread caveats, counts and actual copied bytes.
A preflight snapshot can be packaged as a metadata-only partial dataset; pending
media must not be called downloaded. The builder refuses existing output folders.

Planning estimates MP4 bytes from bitrate × duration with an audio allowance;
images use a 2 MiB planning allowance. They are NOT upper bounds. Unknown video
sizes remain explicit. Best and balanced variants are compared without HTTP HEAD
or separate authenticated requests. Embedded article images may include duplicate
resolutions and previews. Avatars are excluded from new exports. HLS-only media,
external linked websites, speech, OCR and complete hidden threads are not supplied.

Analysis is outside this download contract. Existing analyze.py/ANALYSIS.md are
legacy prototype helpers, not an automatic step or the future analysis skill.

Selective collection exports `manifest.remaining_gaps` (post ID + reason), also
copied into coverage.json. `manifest.details` lists attempted extra visits and
why they were needed; `manifest.expansions` records in-feed Show more outcomes.
The post set includes roots, quoted originals and observed connected self-replies;
ordinary reply conversations are not crawled. Missing quote records keep their
quote URL. A zero gap count means no detected gap, not exhaustive hidden threads.

`python3 compare.py old-snapshot.json new-snapshot.json --output comparison.json`
compares common IDs, text lengths, missing media IDs, metric availability, article
body lengths and collection wall time. It separates added/removed roots because
a rolling date window and new publications can change the sample between runs.
