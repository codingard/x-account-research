#!/usr/bin/env python3
"""Offline download planning and CSV dataset assembly. Never makes network requests."""
import argparse
import csv
import hashlib
import json
import pathlib
import shutil
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from urllib.parse import urlparse, parse_qs


def read(path):
    data = json.loads(path.read_text())
    if data.get('schema_version') != 1:
        raise ValueError('Unsupported snapshot schema')
    return data


def estimate(data, mode):
    seen = set(); videos = []; images = 0; unknown = 0; total = 0
    for p in data['posts']:
        for m in p.get('media', []):
            if m.get('url') and m['url'] not in seen:
                seen.add(m['url']); images += 1
            url = m.get('video_url')
            if not url or url in seen:
                continue
            seen.add(url)
            variants = sorted((v for v in m.get('variants', []) if v.get('content_type') == 'video/mp4'), key=lambda v:v.get('bitrate', 0), reverse=True)
            chosen = next((v for v in variants if 0 < v.get('bitrate', 0) <= 2500000), variants[-1] if variants else {}) if mode == 'balanced' else (variants[0] if variants else {})
            duration = m.get('duration_ms'); bitrate = chosen.get('bitrate')
            size = duration / 1000 * (bitrate + 128000) / 8 if duration and bitrate else None
            if size is None: unknown += 1
            else: total += size
            videos.append({'post_id':p['id'], 'duration_seconds':duration/1000 if duration else None, 'estimated_bytes':round(size) if size else None, 'url':chosen.get('url',url)})
    # Include article images and any videos not represented by normalized media.
    for m in data['manifest'].get('media', []):
        url = m.get('url')
        if not url or url in seen: continue
        seen.add(url)
        if m.get('kind') == 'image': images += 1
        else:
            unknown += 1
            videos.append({'post_id':m.get('post_ids',[None])[0], 'duration_seconds':None, 'estimated_bytes':None, 'url':url})
    seconds = sum(v['duration_seconds'] or 0 for v in videos)
    return {'mode':mode, 'images':images, 'videos':len(videos), 'video_minutes':round(seconds/60,2),
            'long_videos_over_5min':sum((v['duration_seconds'] or 0)>300 for v in videos),
            'video_estimated_mib':round(total/1048576,1), 'video_sizes_unknown':unknown,
            'image_allowance_mib':images*2, 'estimated_total_mib':round(total/1048576+images*2,1),
            'estimate_is_upper_bound':False, 'notes':'Bitrate × duration plus 128 kbps audio allowance; 2 MiB per image planning allowance. Excludes browsing traffic. Unknowns are not zero.', 'items':videos}


def plan(source):
    data=read(source); best=estimate(data,'best'); balanced=estimate(data,'balanced')
    result={'root_posts':len(data['manifest']['selected']), 'context_posts':len(data['posts'])-len(data['manifest']['selected']),
            'best':best, 'balanced':balanced, 'free_disk_mib':round(shutil.disk_usage(source.parent).free/1048576),
            'needs_size_decision':best['estimated_total_mib']>500 or best['video_minutes']>20 or best['video_sizes_unknown']>0}
    return result


def safe_path(base, value):
    path=(base/value).resolve()
    if not path.is_relative_to(base.resolve()): raise ValueError('Unsafe media path')
    return path


def iso(value):
    if not value: return ''
    try:
        try: date=datetime.fromisoformat(value.replace('Z','+00:00'))
        except ValueError: date=parsedate_to_datetime(value)
        if date.tzinfo is None: date=date.replace(tzinfo=timezone.utc)
        return date.astimezone(timezone.utc).isoformat().replace('+00:00','Z')
    except (ValueError,TypeError): return value


def csv_text(value):
    if value is None: return ''
    if isinstance(value,(dict,list)): value=json.dumps(value,ensure_ascii=False)
    if isinstance(value,str) and value.lstrip().startswith(('=','+','-','@','\t','\r')): return "'"+value
    return value


def write_csv(path, rows, fields):
    with path.open('w',newline='',encoding='utf-8-sig') as f:
        writer=csv.DictWriter(f,fieldnames=fields);writer.writeheader()
        writer.writerows({k:csv_text(row.get(k)) for k in fields} for row in rows)


def build(source, output):
    data=read(source)
    if output.exists(): raise ValueError('Output already exists; choose a new dataset directory')
    posts={p['id']:p for p in data['posts']}; selected=set(data['manifest']['selected'])
    if any(not str(i).isdigit() for i in posts): raise ValueError('Unsafe post ID')
    # Validate every source path before creating output.
    for m in data['manifest'].get('media',[]): safe_path(source.parent,m['path'])
    output.mkdir(parents=True);(output/'media').mkdir();(output/'articles').mkdir()
    shutil.copy2(source,output/'snapshot.json')
    media_rows=[]; by_post={i:[] for i in posts}; issues=[]
    for n,m in enumerate(data['manifest'].get('media',[]),1):
        src=safe_path(source.parent,m['path'])
        if not src.is_file():
            fmt=parse_qs(urlparse(m.get('url','')).query).get('format',[''])[0]
            if fmt in ('jpg','jpeg','png','webp','gif'): src=safe_path(source.parent,str(pathlib.Path(m['path']).with_suffix('.'+fmt)))
        for pid in dict.fromkeys(m.get('post_ids',[])):
            if pid not in posts: raise ValueError('Media references unknown post')
            state=m.get('state','unknown'); rel=''; size=None; digest=''
            if state=='complete' and src.is_file():
                suffix=src.suffix.lower()
                if suffix not in ('.jpg','.jpeg','.png','.gif','.webp','.mp4'): suffix='.bin'
                rel=f'media/{pid}/{n:03d}{suffix}';dst=output/rel;dst.parent.mkdir(exist_ok=True)
                shutil.copy2(src,dst);size=dst.stat().st_size;digest=hashlib.sha256(dst.read_bytes()).hexdigest()
            elif state=='complete': state='missing';issues.append(f'Missing: {m["path"]}')
            elif state not in ('skipped','pending'): issues.append(f'{pid}: media {state}')
            media_rows.append({'post_id':pid,'kind':m.get('kind'),'source_url':m.get('url'),'local_path':rel,'status':state,'bytes':size,'sha256':digest})
            by_post[pid].append(media_rows[-1])
    rows=[]
    for pid,p in posts.items():
        quote=posts.get(p.get('quoted_id')); article=p.get('article') or {}; article_path=''
        if article.get('text'):
            article_path=f'articles/{pid}.txt';(output/article_path).write_text(article['text'],encoding='utf-8')
        files=by_post[pid]; media_dir=f'media/{pid}';(output/media_dir).mkdir(exist_ok=True)
        rows.append({'post_id':pid,'role':'root' if pid in selected else 'context','author':p.get('author'),
            'published_at_utc':iso(p.get('created_at')),'observed_at_utc':iso(p.get('observed_at')),'text':p.get('text'),
            'post_url':p.get('url'),**{k:(p.get('metrics') or {}).get(k) for k in ('views','likes','reposts','replies','quotes','bookmarks')},
            'quoted_post_id':p.get('quoted_id'),'quote_url':quote.get('url') if quote else (f'https://x.com/i/status/{p["quoted_id"]}' if p.get('quoted_id') else ''),
            'quote_relationship':('self' if quote.get('author','').lower()==p.get('author','').lower() else 'external') if quote else ('unknown' if p.get('quoted_id') else ''),
            'reply_to_id':p.get('reply_to_id'),'conversation_id':p.get('conversation_id'),'media_dir':media_dir,
            'media_paths':[m['local_path'] for m in files if m['local_path']], 'media_urls':[m['source_url'] for m in files],
            'media_statuses':[m['status'] for m in files], 'links':p.get('links',[]),
            'article_title':article.get('title'),'article_path':article_path,'article_completeness':article.get('completeness'),
            'text_possibly_truncated':p.get('possibly_truncated',False)})
    fields=['post_id','role','author','published_at_utc','observed_at_utc','text','post_url','views','likes','reposts','replies','quotes','bookmarks','quoted_post_id','quote_url','quote_relationship','reply_to_id','conversation_id','media_dir','media_paths','media_urls','media_statuses','links','article_title','article_path','article_completeness','text_possibly_truncated']
    write_csv(output/'posts.csv',rows,fields)
    write_csv(output/'media.csv',media_rows,['post_id','kind','source_url','local_path','status','bytes','sha256'])
    (output/'posts.jsonl').write_text(''.join(json.dumps(p,ensure_ascii=False)+'\n' for p in posts.values()),encoding='utf-8')
    coverage={'roots':len(selected),'context':len(posts)-len(selected),'downloaded_files':sum(bool(m['local_path']) for m in media_rows),'bytes':sum(m['bytes'] or 0 for m in media_rows),'issues':issues,'media_states':{s:sum(m['status']==s for m in media_rows) for s in {m['status'] for m in media_rows}},'remaining_gaps':data['manifest'].get('remaining_gaps',[]),'collector_errors':data['manifest'].get('errors',[]),'chronology_verified':data['manifest'].get('chronology_verified',False),'thread_completeness':data['manifest'].get('thread_completeness','unknown'),'preflight_only':data.get('preflight',False)}
    (output/'coverage.json').write_text(json.dumps(coverage,ensure_ascii=False,indent=2))
    (output/'README.txt').write_text('posts.csv: one root/context post per row. Filter role=root for the requested sample.\nmedia.csv: one file association per row; paths relative to this folder.\nmedia/<post_id>/: local files owned by that post, including quoted originals in their own folders.\narticles/<post_id>.txt: article text. snapshot.json and posts.jsonl: lossless source fields.\nCSV: UTF-8 BOM, RFC-style quoting, JSON arrays in list cells. Import IDs as TEXT to avoid spreadsheet rounding. Formula-like cells have an apostrophe; raw JSON retains original text. Blank metric means unknown, not zero.\nPublic counters are snapshots, not unique reach. Context is not another root post. Skipped, pending and missing media are explicit. No AI analysis has been performed.\n',encoding='utf-8')
    return coverage


if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('command',choices=['plan','build']);parser.add_argument('snapshot',type=pathlib.Path);parser.add_argument('--output',type=pathlib.Path);args=parser.parse_args()
    if args.command=='plan': result=plan(args.snapshot)
    else:
        if not args.output: parser.error('build requires --output')
        result=build(args.snapshot,args.output)
    print(json.dumps(result,ensure_ascii=False,indent=2))
