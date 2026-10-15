const {test}=require('node:test');const assert=require('node:assert/strict');const vm=require('node:vm');const fs=require('node:fs');const C=require('../extension/core.js');
function worker(initial){let job=initial,listener,downloads=[],tabs=[];const ctx={XResearch:C,importScripts(){},URL,Date,BigInt,Set,Promise,encodeURIComponent,chrome:{storage:{local:{async get(){return{job:structuredClone(job)}},async set(x){job=structuredClone(x.job)}}},tabs:{async create(){return{id:7}},async update(id,x){tabs.push(x)}},runtime:{onMessage:{addListener(fn){listener=fn}}},downloads:{async download(x){downloads.push(x);return downloads.length},async search(){return[{state:'complete'}]},onChanged:{addListener(){}}},alarms:{async create(){},async clear(){},onAlarm:{addListener(){}}}}};vm.runInNewContext(fs.readFileSync(require.resolve('../extension/background.js'),'utf8'),ctx);return{send:(m,tab=7)=>new Promise(resolve=>listener(m,{tab:{id:tab}},resolve)),get:()=>job,tabs,downloads};}
const p=id=>({id,author:'demo',url:`https://x.com/demo/status/${id}`,created_at:new Date().toISOString(),text:'Post',text_source:'legacy',media:[],metrics:{},conversation_id:id});
test('workflow isolates collection tab, selects roots, visits details, stops on restrictions',async()=>{let w=worker();await w.send({type:'START',url:'https://x.com/demo',limit:1});await w.send({type:'INGEST',status:200,op:'UserTweets',path:'/demo',posts:[p('2'),p('1')],profiles:[]},99);assert.equal(Object.keys(w.get().posts).length,0);await w.send({type:'INGEST',status:200,op:'UserTweets',path:'/demo',posts:[{...p('2'),possibly_truncated:true},p('1')],profiles:[]});await w.send({type:'TICK',path:'/demo',visibleIds:['2','1']});assert.equal(w.get().phase,'details');assert.deepEqual(w.get().selected,['2']);await w.send({type:'INGEST',status:429,op:'TweetDetail',path:'/demo/status/2',posts:[],profiles:[]});assert.equal(w.get().phase,'paused');assert.equal(w.tabs.length,2);});
test('detail timeout is explicit and export does not fetch arbitrary hosts',async()=>{let w=worker();await w.send({type:'START',url:'https://x.com/demo',limit:1});let post=p('2');post.media=[{type:'photo',url:'https://evil.test/private'}];await w.send({type:'INGEST',status:200,op:'UserTweets',path:'/demo',posts:[post,p('1')],profiles:[]});await w.send({type:'TICK',path:'/demo',visibleIds:['2','1']});for(let i=0;i<8;i++)await w.send({type:'TICK',path:'/demo/status/2'});assert.equal(w.get().phase,'ready');assert.equal(w.get().visited[0].status,'timed_out');await w.send({type:'EXPORT'});assert.equal(w.downloads.length,1);assert.ok(w.downloads[0].url.startsWith('data:application/json'));});
test('preview-only article triggers normal browser navigation and preserves body',async()=>{let w=worker();await w.send({type:'START',url:'https://x.com/demo',limit:1});let post=p('2');post.article={id:'555',text:null};await w.send({type:'INGEST',status:200,op:'UserOriginalsTimeline',path:'/demo',posts:[post,p('1')],profiles:[]});await w.send({type:'TICK',path:'/demo',visibleIds:['2','1']});await w.send({type:'INGEST',status:200,op:'TweetDetail',path:'/demo/status/2',posts:[post],profiles:[]});for(let i=0;i<3;i++)await w.send({type:'TICK',path:'/demo/status/2'});assert.equal(w.tabs.at(-1).url,'https://x.com/i/article/555');await w.send({type:'INGEST',status:200,op:'ArticleResultByRestId',path:'/i/article/555',posts:[],profiles:[],articles:[{id:'555',text:'The complete article body',completeness:'text_received_unverified'}]});for(let i=0;i<3;i++)await w.send({type:'TICK',path:'/i/article/555'});assert.equal(w.get().phase,'ready');assert.equal(w.get().posts['2'].article.text,'The complete article body');});
test('old nested quote does not enter primary sample; date cutoff keeps recent roots',async()=>{let w=worker();await w.send({type:'START',url:'https://x.com/demo',limit:2,days:30});let recent=p('100'),old=p('50');recent.created_at=new Date().toISOString();old.created_at='2020-01-01T00:00:00Z';recent.quoted_id='50';await w.send({type:'INGEST',status:200,op:'UserOriginalsTimeline',path:'/demo',posts:[recent,old],profiles:[]});await w.send({type:'TICK',path:'/demo',visibleIds:['100']});const state=await w.send({type:'STATE'});assert.equal(state.count,1);});

test('default scope, metadata-only preflight and economical export preserve media records',async()=>{
 const w=worker();await w.send({type:'START',url:'https://x.com/demo'});assert.equal(w.get().limit,40);assert.equal(w.get().days,14);
 const post=p('2');post.media=[{type:'video',url:'https://pbs.twimg.com/media/test?format=png',video_url:'https://video.twimg.com/high.mp4',duration_ms:600000,variants:[{content_type:'video/mp4',bitrate:8000000,url:'https://video.twimg.com/high.mp4'},{content_type:'video/mp4',bitrate:2000000,url:'https://video.twimg.com/low.mp4'}]}];
 await w.send({type:'INGEST',status:200,op:'UserOriginalsTimeline',path:'/demo',posts:[post],profiles:[]});await w.send({type:'TICK',path:'/demo',visibleIds:['2']});await w.send({type:'PAUSE'});
 await w.send({type:'PREFLIGHT'});assert.equal(w.downloads.length,1);assert.ok(w.downloads[0].url.startsWith('data:'));assert.equal(w.get().phase,'paused');
 const snap=JSON.parse(decodeURIComponent(w.downloads[0].url.split(',').slice(1).join(',')));assert.equal(snap.preflight,true);assert.equal(snap.manifest.media.length,2);
 await w.send({type:'EXPORT',mode:'balanced'});assert.equal(w.get().downloads[1].url,'https://video.twimg.com/low.mp4');assert.equal(w.get().downloads[0].path,'media/2/0_preview.png');
});
test('images-only export retains skipped video provenance',async()=>{
 const w=worker();await w.send({type:'START',url:'https://x.com/demo',limit:1});let post=p('2');post.media=[{type:'video',video_url:'https://video.twimg.com/a.mp4'}];
 await w.send({type:'INGEST',status:200,op:'UserOriginalsTimeline',path:'/demo',posts:[post,p('1')],profiles:[]});await w.send({type:'TICK',path:'/demo',visibleIds:['2','1']});await w.send({type:'PAUSE'});await w.send({type:'EXPORT',mode:'images'});
 assert.equal(w.get().downloads[0].state,'skipped');assert.ok(w.downloads.every(d=>d.url.startsWith('data:')));
});

test('complete timeline roots and quotes need no extra pages; ordinary replies excluded',async()=>{
 const w=worker();await w.send({type:'START',url:'https://x.com/demo',limit:1});
 const root={...p('20'),author_id:'9',quoted_id:'10'};
 const self={...p('21'),author_id:'9',reply_to_user_id:'9',reply_to_id:'20',conversation_id:'20'};
 const ordinary={...p('22'),author_id:'9',reply_to_user_id:'8',reply_to_id:'99',conversation_id:'20'};
 await w.send({type:'INGEST',status:200,op:'UserOriginalsTimeline',path:'/demo',posts:[root,self,ordinary,p('10'),p('1')],profiles:[]});
 await w.send({type:'TICK',path:'/demo',visibleIds:['20','1']});
 assert.equal(w.get().phase,'ready');assert.deepEqual(w.get().queue,['20','10','21']);assert.equal(w.tabs.length,1);
});
test('missing quote opens once, stays an explicit gap after timeout',async()=>{
 const w=worker();await w.send({type:'START',url:'https://x.com/demo',limit:1});
 await w.send({type:'INGEST',status:200,op:'UserOriginalsTimeline',path:'/demo',posts:[{...p('20'),quoted_id:'10'},p('1')],profiles:[]});
 await w.send({type:'TICK',path:'/demo',visibleIds:['20','1']});assert.equal(w.tabs.at(-1).url,'https://x.com/i/status/10');
 for(let i=0;i<8;i++)await w.send({type:'TICK',path:'/i/status/10'});
 assert.equal(w.get().phase,'ready');assert.equal(w.tabs.length,2);
 await w.send({type:'PREFLIGHT'});const snap=JSON.parse(decodeURIComponent(w.downloads[0].url.split(',').slice(1).join(',')));
 assert.equal(snap.manifest.remaining_gaps[0].reason,'missing_quoted_original');
});
test('Show more is authorized only in collection tab and successful expansion avoids detail',async()=>{
 const w=worker();await w.send({type:'START',url:'https://x.com/demo',limit:1});
 await w.send({type:'INGEST',status:200,op:'UserOriginalsTimeline',path:'/demo',posts:[{...p('20'),possibly_truncated:true},p('1')],profiles:[]});
 const tick={type:'TICK',path:'/demo',visibleIds:['20','1'],cards:[{id:'20',text:'Post',showMore:true,canExpand:true}]};
 assert.equal(await w.send(tick,99),null);assert.equal((await w.send(tick)).expand,'20');
 await w.send({...tick,cards:[{id:'20',text:'Post expanded complete text',showMore:false}]});
 assert.equal(w.get().phase,'ready');assert.equal(w.get().posts['20'].text_source,'dom_expanded');assert.equal(w.tabs.length,1);
});
test('failed expansion falls back once; article body on a quote is not assigned to root',async()=>{
 const w=worker();await w.send({type:'START',url:'https://x.com/demo',limit:1});
 await w.send({type:'INGEST',status:200,op:'UserOriginalsTimeline',path:'/demo',posts:[p('20'),p('1')],profiles:[]});
 const tick={type:'TICK',path:'/demo',visibleIds:['20','1'],cards:[{id:'20',text:'Post',showMore:true,canExpand:true}]};
 await w.send(tick);await w.send(tick);assert.equal(w.get().phase,'details');
 await w.send({type:'TICK',path:'/demo/status/20',articleText:'x'.repeat(200)});assert.equal(w.get().posts['20'].article,undefined);
});
