importScripts('core.js');
let serial=Promise.resolve();
const read=async()=> (await chrome.storage.local.get('job')).job;
const save=job=>chrome.storage.local.set({job});
function primary(j,limit=j.limit) {
  const visible=j.timelineIds ? Object.fromEntries(j.timelineIds.filter(id=>j.posts[id]).map(id=>[id,j.posts[id]])) : j.posts;
  const list=XResearch.select(visible,j.handle,10000);
  return list.filter(p=>!j.cutoff || Date.parse(p.created_at)>=Date.parse(j.cutoff)).slice(0,limit);
}
function summary(j) { if (!j) return null; return {handle:j.handle,phase:j.phase,count:primary(j).length,limit:j.limit,details:j.visited.length,queued:j.queue.length,reason:j.reason,diagnostic:j.diagnostic,days:j.days,media:j.downloads?.filter(d=>d.state==='complete').length||0,mediaTotal:j.downloads?.length||0}; }
async function navigate(j,url) { await save(j); await chrome.tabs.update(j.tab,{url,active:true}); }
function addContext(j) {
  const ids=new Set(j.selected);
  // Follow explicit quote edges and connected self-reply edges, never the whole conversation.
  for(let depth=0;depth<12;depth++) {
    const before=ids.size;
    for(const id of [...ids]) {
      const p=j.posts[id];if(p?.quoted_id && /^\d+$/.test(p.quoted_id))ids.add(p.quoted_id);
    }
    for(const p of Object.values(j.posts)) {
      const parent=j.posts[p.reply_to_id];
      if(ids.has(p.reply_to_id) && parent && p.author.toLowerCase()===j.handle.toLowerCase() &&
        p.author_id && p.author_id===parent.author_id && p.reply_to_user_id===p.author_id)ids.add(p.id);
    }
    if(ids.size===before || ids.size>=300)break;
  }
  j.queue=[...ids].slice(0,300);
}
function gaps(j,id) {
  const p=j.posts[id];if(!p)return ['missing_quoted_original'];
  const out=[];
  if(p.possibly_truncated || j.expansions?.[id]?.unresolved)out.push('truncated_text');
  if(!p.created_at)out.push('missing_date');
  if(p.article && !p.article.text)out.push('article_body');
  if(p.media.some(m=>!XResearch.mediaURL(m.url) || (['video','animated_gif'].includes(m.type) && !XResearch.mediaURL(m.video_url))))out.push('media_source');
  return out;
}
async function nextDetail(j) {
  addContext(j);
  const id=j.queue.find(id=>gaps(j,id).length && !j.visited.some(v=>v.id===id));
  if(!id){finish(j,j.timeline_reason);await save(j);return;}
  j.detailCurrent=id;j.detailReasons=gaps(j,id);j.detailTicks=0;j.detailReceived=null;j.articlePost=null;
  await navigate(j,j.posts[id]?.url || `https://x.com/i/status/${id}`);
}
function observeCards(j,cards) {
  j.expansions ||= {};
  for(const card of cards || []) {
    const p=j.posts[card.id],attempt=j.expansions[card.id];if(!p || !attempt)continue;
    // Only an explicit expansion followed by disappearance of its control proves DOM expansion.
    if(!card.showMore && typeof card.text==='string' && card.text.length>attempt.beforeLength) {
      if(p.text_source!=='note_tweet' && card.text.length>=p.text.length) {
        p.text=card.text;p.text_source='dom_expanded';p.possibly_truncated=false;
      }
      attempt.unresolved=false;attempt.completed=true;
    }
  }
}
function finish(j,reason) { j.phase='ready'; j.reason=reason; j.finished_at=new Date().toISOString(); }
function prepareDownloads(j, mode="best") {
  const files=[], seen=new Map();
  function add(url,postId,kind,index, duration_ms=null, bitrate=null) {
    url=XResearch.mediaURL(url); if(!url || (kind==='video' && !/\.mp4(?:\?|$)/i.test(url)))return;
    if(seen.has(url)) { seen.get(url).post_ids.push(postId); return; }
    const format=new URL(url).searchParams.get('format');
    const ext=kind==='video'?'mp4':(['png','webp','gif','jpg','jpeg'].includes(format)?format:(/\.(png|webp|gif)(?:\?|$)/i.exec(url)?.[1] || 'jpg'));
    const item={url,post_ids:[postId],kind,path:`media/${postId}/${index}.${ext}`,duration_ms,bitrate,state:mode==='none'||(mode==='images'&&kind==='video')?'skipped':'pending'};
    files.push(item); seen.set(url,item);
  }
  for(const id of j.queue) {
    const p=j.posts[id]; if(!p)continue;
    p.media.forEach((m,i)=> {
      add(m.url,id,'image',`${i}_preview`);
      const variants=(m.variants||[]).filter(v=>v.content_type==='video/mp4').sort((a,b)=>(b.bitrate||0)-(a.bitrate||0));
      const chosen=mode==='balanced'?(variants.find(v=>v.bitrate && v.bitrate<=2500000)||variants.at(-1)):variants[0];
      if(m.video_url)add(chosen?.url||m.video_url,id,'video',i,m.duration_ms,chosen?.bitrate||null);
    });
    let index=0;
    function walk(x) {
      if(typeof x==='string' && XResearch.mediaURL(x) && !x.includes('/profile_images/')) add(x,id,x.includes('video.twimg.com')?'video':'image',`article_${index++}`);
      else if(x && typeof x==='object') Object.values(x).forEach(walk);
    }
    walk(p.article?.source);
  }
  return files;
}
function makeBundle(j,downloads) {
  const posts=j.queue.map(id=>j.posts[id]).filter(Boolean);
  return {schema_version:1,collector:'browser-observed-v1',manifest:{handle:j.handle,requested:j.limit,days:j.days,cutoff:j.cutoff,selected:j.selected,
    collected_at:j.started_at,finished_at:j.finished_at,exported_at:new Date().toISOString(),stop_reason:j.reason,
    selection:'latest observed original root posts and quotes; excludes reposts and replies; thread context extra',
    chronology_verified:false,collector_views_may_affect_counts:true,thread_completeness:'observed_self_reply_edges_only',details:j.visited,errors:j.errors,
    expansions:j.expansions||{},remaining_gaps:j.queue.flatMap(id=>gaps(j,id).map(reason=>({id,reason}))),
    collection_strategy:'timeline_first_selective_details',
    media:downloads,media_mode:j.mediaMode||null,limitations:['Only data delivered by X to this browser session.','Thread and article completeness require review.','No external linked pages, OCR, or transcription in collection stage.']},
    profile:j.profiles[j.handle.toLowerCase()] || null,posts};
}
async function downloadNext(j) {
  const active=j.downloads.find(d=>d.state==='in_progress');
  if(active) {
    const [entry]=await chrome.downloads.search({id:active.downloadId});
    if(entry?.state==='in_progress')return;
    if(entry?.state==='complete' && entry.filename) {
      const normalized=entry.filename.replace(/\\/g,'/'), marker=`/${j.folder}/`;
      const at=normalized.lastIndexOf(marker);
      if(at>=0)active.path=normalized.slice(at+marker.length);
    }
    active.state=entry?.state==='complete'?'complete':'failed'; active.error=entry?.error || (entry ? null : 'download_missing');
  }
  const next=j.downloads.find(d=>d.state==='pending');
  if(next) {
    try { next.downloadId=await chrome.downloads.download({url:next.url,filename:`${j.folder}/${next.path}`,conflictAction:'overwrite',saveAs:false}); next.state='in_progress'; }
    catch(e) { next.state='failed'; next.error=String(e); }
    await save(j); return;
  }
  const bundle=makeBundle(j,j.downloads);
  try {
    j.bundleDownload=await chrome.downloads.download({url:'data:application/json;charset=utf-8,'+encodeURIComponent(JSON.stringify(bundle,null,2)),filename:`${j.folder}/snapshot.json`,conflictAction:'overwrite',saveAs:false});
    j.phase='exporting';
  } catch(e) { j.phase='ready'; j.errors.push({stage:'export',error:String(e)}); }
  await save(j);
}
async function handle(m,sender) {
  let j=await read();
  if(m.type==='STATE')return summary(j);
  if(m.type==='START') {
    if(j && !['ready','exported','paused'].includes(j.phase))throw Error('Pause or finish the current collection first.');
    const u=new URL(m.url); const match=/^\/([A-Za-z0-9_]{1,15})\/?$/.exec(u.pathname);
    if(!['x.com','twitter.com','www.x.com','www.twitter.com'].includes(u.hostname)||!match || ['home','explore','notifications','messages','settings','search','i'].includes(match[1].toLowerCase()))throw Error('Enter a profile URL, for example https://x.com/name');
    const limit=Number(m.limit ?? 40); if(!Number.isInteger(limit)||limit<1||limit>100)throw Error('Choose 1–100 posts.');
    const tab=await chrome.tabs.create({url:'about:blank',active:true});
    const days=Number(m.days ?? 14);if(!Number.isInteger(days)||days<0||days>365)throw Error('Period must be 0–365 days.');
    j={handle:match[1],limit,days,cutoff:days ? new Date(Date.now()-days*86400000).toISOString():null,timelineIds:[],tab:tab.id,phase:'timeline',posts:{},profiles:{},expansions:{},selected:[],queue:[],visited:[],errors:[],ticks:0,idle:0,lastCount:0,detailTicks:0,started_at:new Date().toISOString()};
    await navigate(j,`https://x.com/${j.handle}`); return summary(j);
  }
  if(!j)return null;
  if(m.type==='PAUSE') { if(!['timeline','details'].includes(j.phase))return summary(j); j.resumePhase=j.phase;j.phase='paused';await save(j);return summary(j); }
  if(m.type==='RESUME') { if(j.phase!=='paused')return summary(j);j.phase=j.resumePhase; j.detailTicks=0; await save(j); await chrome.tabs.update(j.tab,{active:true});return summary(j); }
  if(m.type==='PREFLIGHT') {
    if(!['ready','paused','exported'].includes(j.phase))throw Error('Finish or pause collection first.');
    if(!j.selected.length){j.selected=primary(j).map(p=>p.id);j.queue=[...j.selected];addContext(j);}
    const files=prepareDownloads(j);
    j.folder=`x-research/${j.handle}-${j.started_at.replace(/[:.]/g,'-')}`;
    await chrome.downloads.download({url:'data:application/json;charset=utf-8,'+encodeURIComponent(JSON.stringify({...makeBundle(j,files),preflight:true},null,2)),filename:`${j.folder}/snapshot-preflight.json`,conflictAction:'overwrite',saveAs:false});
    await save(j);return summary(j);
  }
  if(m.type==='EXPORT') {
    if(!['ready','paused','exported'].includes(j.phase))throw Error('Pause collection before export.');
    if(!j.selected.length) {j.selected=primary(j).map(p=>p.id);j.queue=[...j.selected];addContext(j);}
    j.folder=`x-research/${j.handle}-${j.started_at.replace(/[:.]/g,'-')}`;
    j.mediaMode=m.mode||'best';
    if(!['best','balanced','images','none'].includes(j.mediaMode))throw Error('Unknown media mode');
    j.downloads=prepareDownloads(j,j.mediaMode);j.phase='downloading';await save(j);
    await chrome.alarms.create('media',{periodInMinutes:0.5});await downloadNext(j);return summary(j);
  }
  if(sender.tab?.id!==j.tab || !['timeline','details'].includes(j.phase))return null;
  if(m.type==='INGEST') {
    if(m.status===429 || m.status===401 || m.status===403) { j.resumePhase=j.phase;j.phase='paused';j.reason=`X returned ${m.status}; inspect browser before resuming.`;j.errors.push({status:m.status,op:m.op});await save(j);return; }
    if(m.status!==200)return;
    j.diagnostic={op:m.op,posts:m.posts.length,...m.diagnostic};
    for(const p of m.posts)if(/^\d+$/.test(p.id) && /^[A-Za-z0-9_]{1,15}$/.test(p.author) && typeof p.text==='string' && Array.isArray(p.media))j.posts[p.id]=XResearch.merge(j.posts[p.id],{...p,url:`https://x.com/${p.author}/status/${p.id}`});
    if(j.articlePost && j.posts[j.articlePost]) {
      const found=(m.articles || []).find(a=>a.id===j.posts[j.articlePost].article?.id && a.text);
      if(found)j.posts[j.articlePost].article=found;
    }
    for(const p of m.profiles)if(typeof p.handle==='string')j.profiles[p.handle.toLowerCase()]=p;
    const id=/\/status\/(\d+)/.exec(m.path)?.[1];
    if(id && /TweetDetail|TweetResult|PageBootstrap/.test(m.op) && m.posts.some(p=>p.id===id))j.detailReceived=id;
    if(j.phase==='details'){
      for(const p of m.posts)if(j.expansions?.[p.id] && p.text_source==='note_tweet' && !p.possibly_truncated)j.expansions[p.id].unresolved=false;
      addContext(j);
    }
    await save(j);return;
  }
  if(m.type==='TICK') {
    observeCards(j,m.cards);
    if(m.blocked) {j.resumePhase=j.phase;j.phase='paused';j.reason='Login or verification page; user action required.';await save(j);return;}
    if(j.phase==='timeline') {
      if(m.path.replace(/\/$/,'').toLowerCase()!==`/${j.handle.toLowerCase()}`)return;
      for(const id of m.visibleIds || [])if(/^\d+$/.test(id) && !j.timelineIds.includes(id))j.timelineIds.push(id);
      const selected=primary(j,j.limit+1);
      const expand=(m.cards||[]).find(c=>c.showMore && !j.expansions?.[c.id] && selected.some(p=>p.id===c.id));
      if(expand) {
        j.expansions ||= {};j.expansions[expand.id]={beforeLength:expand.text?.length||0,unresolved:true,clicked:!!expand.canExpand};
        if(expand.canExpand){await save(j);return {expand:expand.id};}
      }
      const oldRoots=j.timelineIds.map(id=>j.posts[id]).filter(p=>p && XResearch.eligible(p,j.handle) && j.cutoff && Date.parse(p.created_at)<Date.parse(j.cutoff));
      const periodReached=oldRoots.length>=3;
      j.ticks++;j.idle=selected.length===j.lastCount?j.idle+1:0;j.lastCount=selected.length;
      // One extra root prevents an old pinned item from displacing the latest N.
      if(selected.length>j.limit || periodReached || j.idle>=8 || j.ticks>=150) {
        j.selected=selected.slice(0,j.limit).map(p=>p.id);j.queue=[...j.selected];addContext(j);
        if(!j.queue.length){finish(j,'No posts captured. Check session and response format.');await save(j);return;}
        j.timeline_reason=selected.length>j.limit?'target_reached':periodReached?'period_reached':j.idle>=8?'timeline_stalled':'scroll_limit';
        j.phase='details';await nextDetail(j);return;
      }
      await save(j);return {scroll:true};
    }
    const current=j.detailCurrent;
    if(!current){finish(j,j.timeline_reason);await save(j);return;}
    const articleMode=j.articlePost===current;
    if(articleMode ? !(/\/article\/\d+/.test(m.path) || m.path.includes(`/status/${current}`)) : !m.path.includes(`/status/${current}`))return;
    if(typeof m.articleText==='string' && m.articleText.length>100 && articleMode && m.path===`/i/article/${j.posts[current]?.article?.id}` && j.posts[current]) {
      const prev=j.posts[current].article || {};
      j.posts[current].article={...prev,text:m.articleText,completeness:'rendered_body_received_unverified',source:{...prev.source,rendered_images:m.articleImages}};
    }
    j.detailTicks++;
    if(j.detailTicks>=3 && (articleMode || j.detailReceived===current || j.detailTicks>=8)) {
      const article=j.posts[current]?.article;
      if(!articleMode && article?.id && /^\d+$/.test(article.id) && !article.text) {
        j.articlePost=current;j.detailTicks=0;await navigate(j,`https://x.com/i/article/${article.id}`);return;
      }
      if(articleMode && !j.posts[current].article?.text)j.errors.push({id:current,stage:'article',error:'Article body unavailable after browser visit'});
      j.articlePost=null;
      j.visited.push({id:current,status:j.detailReceived===current?'response_received':'timed_out',reasons:j.detailReasons,remaining:gaps(j,current)});
      if(j.detailReceived!==current)j.errors.push({id:current,stage:'detail',error:'No matching response captured'});
      j.detailTicks=0;j.detailReceived=null;addContext(j);
      await nextDetail(j);return;
    }
    await save(j);return {scroll:j.detailTicks===2};
  }
}
chrome.runtime.onMessage.addListener((m,sender,reply)=>{
  serial=serial.catch(()=>{}).then(()=>handle(m,sender));
  serial.then(reply,e=>reply({error:String(e)}));return true;
});
function pump(){ serial=serial.catch(()=>{}).then(async()=>{const j=await read();if(j?.phase==='downloading')await downloadNext(j);else if(j?.phase==='exporting') { const [d]=await chrome.downloads.search({id:j.bundleDownload});if(d?.state==='complete'){j.phase='exported';await save(j);await chrome.alarms.clear('media');}else if(d?.state==='interrupted'){j.phase='ready';j.errors.push({stage:'export',error:d.error});await save(j);} }}); }
chrome.downloads.onChanged.addListener(d=>{if(d.state && d.state.current!=='in_progress')pump();});
chrome.alarms.onAlarm.addListener(a=>{if(a.name==='media')pump();});
