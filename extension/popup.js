const el=id=>document.getElementById(id);
async function message(type,extra={}) {const result=await chrome.runtime.sendMessage({type,...extra});if(result?.error)el('status').textContent=result.error;else render(result);return result;}
const phases={timeline:'Reading timeline',details:'Expanding posts and articles',ready:'Ready to download',paused:'Pause',downloading:'Downloading media',exporting:'Saving dataset',exported:'Dataset saved'};
function render(s){el('status').textContent=s ? `@${s.handle}\nStage: ${phases[s.phase] || s.phase}\nPosts: ${s.count}/${s.limit}\nAdditional visits: ${s.details}\nRecords including context: ${s.queued}\nMedia: ${s.media}/${s.mediaTotal}\n${s.reason||''}`:'Ready to collect';}
el('start').onclick=()=>message('START',{url:el('url').value.trim(),limit:el('limit').value,days:el('days').value});
el('pause').onclick=()=>message('PAUSE');el('resume').onclick=()=>message('RESUME');el('preflight').onclick=()=>message('PREFLIGHT');el('export').onclick=()=>message('EXPORT',{mode:el('mode').value});
message('STATE');setInterval(()=>message('STATE'),2000);

document.addEventListener("visibilitychange",()=>{if(!document.hidden)message("STATE")});
