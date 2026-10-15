"""Structural checks only; editorial quality requires reading the output and evidence."""
import argparse
import json
from pathlib import Path
REQUIRED=('post_id','topic','format','hook','promised_payoff','delivered_payoff','authority_device','cta','quote_role','content_family','media_review','notes')
def check(dataset,output):
    data=json.loads((dataset/'snapshot.json').read_text());expected=set(map(str,data['manifest']['selected']));issues=[]
    for name in ('report.md','calculations.json','post-coding.jsonl'):
        if not (output/name).is_file():issues.append('Missing '+name)
    rows=[]
    if (output/'post-coding.jsonl').exists():
        try:rows=[json.loads(s) for s in (output/'post-coding.jsonl').read_text().splitlines() if s.strip()]
        except (ValueError,TypeError) as e:issues.append('Invalid coding JSONL: '+str(e))
    ids=[str(r.get('post_id')) for r in rows]
    if set(ids)!=expected:issues.append('Coding IDs differ from root IDs: '+str(sorted(set(ids)^expected)))
    if len(ids)!=len(set(ids)):issues.append('Duplicate coded root IDs')
    for row in rows:
        missing=[k for k in REQUIRED if k not in row]
        if missing:issues.append(str(row.get('post_id'))+' missing fields '+str(missing))
    if (output/'calculations.json').exists():
        try:json.loads((output/'calculations.json').read_text())
        except ValueError as e:issues.append('Invalid calculations JSON: '+str(e))
    return {'structural_issues':issues,'coded_roots':len(rows),'expected_roots':len(expected),'quality_scored':False}
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('dataset',type=Path);p.add_argument('output',type=Path);a=p.parse_args();print(json.dumps(check(a.dataset,a.output),indent=2))
