"""Offline comparison of two browser-exported snapshots; no requests to X."""
import argparse
import datetime as dt
import json
from pathlib import Path


def compare(old, new):
    before={p['id']:p for p in old['posts']}; after={p['id']:p for p in new['posts']}
    roots_old=set(old['manifest']['selected']);roots_new=set(new['manifest']['selected'])
    common=roots_old & roots_new
    def seconds(data):
        m=data['manifest']
        return (dt.datetime.fromisoformat(m['finished_at'].replace('Z','+00:00'))-dt.datetime.fromisoformat(m['collected_at'].replace('Z','+00:00'))).total_seconds()
    def describe(data):
        return {'seconds':seconds(data),'roots':len(data['manifest']['selected']),'records':len(data['posts']),
                'detail_visits':len(data['manifest']['details']),'article_bodies':sum(bool(p.get('article',{}).get('text')) for p in data['posts'] if p.get('article')),
                'media_files':len(data['manifest']['media']),'errors':data['manifest']['errors'],'remaining_gaps':data['manifest'].get('remaining_gaps'),
                'show_more_attempts':len(data['manifest'].get('expansions',{})),
                'show_more_completed':sum(bool(x.get('completed')) for x in data['manifest'].get('expansions',{}).values())}
    def fields(ids):
        rows=[]
        for pid in sorted(ids):
            a,b=before[pid],after[pid]
            ma={str(m.get('id')) for m in a.get('media',[])};mb={str(m.get('id')) for m in b.get('media',[])}
            rows.append({'id':pid,'text_equal':a['text']==b['text'],'text_lengths':[len(a['text']),len(b['text'])],
                'quote_equal':a.get('quoted_id')==b.get('quoted_id'),'missing_media_ids':sorted(ma-mb),
                'missing_metric_fields':[k for k,v in a.get('metrics',{}).items() if v is not None and b.get('metrics',{}).get(k) is None],
                'article_equal':(a.get('article') or {}).get('text')==(b.get('article') or {}).get('text'),
                'article_lengths':[len((p.get('article') or {}).get('text') or '') for p in (a,b)]})
        return rows
    return {'before':describe(old),'after':describe(new),'common_roots':len(common),'only_before_roots':sorted(roots_old-roots_new),'only_after_roots':sorted(roots_new-roots_old),
            'root_comparison':fields(common),'common_record_comparison':fields(before.keys() & after.keys()),
            'removed_context':[{'id':i,'author':before[i]['author'],'reply_to_id':before[i].get('reply_to_id')} for i in before.keys()-after.keys()-roots_old],
            'caveats':['Wall time includes page loads and time spent with collection tab hidden.','Different collection times shift the rolling date window and counters.','Hidden replies are intentionally not crawled. No byte/network-request comparison is measured.']}

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('before',type=Path);parser.add_argument('after',type=Path);parser.add_argument('--output',type=Path);args=parser.parse_args()
    result=compare(json.loads(args.before.read_text()),json.loads(args.after.read_text()))
    text=json.dumps(result,ensure_ascii=False,indent=2)
    if args.output:args.output.write_text(text+'\n')
    else:print(text)
