(() => {
  'use strict';
  if (window.__xResearchBridge) return;
  window.__xResearchBridge = true;
  // Observe only relevant responses. Never replay a request or read request headers/cookies.
  const allowed = /\/(UserOriginalsTimeline|UserTweets|UserTweetsAndReplies|TweetDetail|UserByScreenName|TweetResultByRestId|Article\w*)\b/;
  function relevant(url) { try { const u = new URL(url, location.href); return ['x.com','api.x.com'].includes(u.hostname) && u.protocol==='https:' && allowed.test(u.pathname); } catch { return false; } }
  function emit(url, body, status) {
    const op = new URL(url, location.href).pathname.split('/').pop();
    const payload = body ? XResearch.extract(body) : {posts:[],profiles:[]};
    window.postMessage({source:'x-research-response-v1', op, status, path:location.pathname, ...payload}, location.origin);
  }
  const originalFetch = window.fetch;
  window.fetch = async function(...args) {
    const response = await originalFetch.apply(this, args);
    const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || String(args[0]);
    if (relevant(url)) {
      if (!response.ok) emit(url,null,response.status);
      else response.clone().json().then(body => emit(url,body,response.status)).catch(() => {});
    }
    return response;
  };
  const open = XMLHttpRequest.prototype.open, send = XMLHttpRequest.prototype.send;
  const urls = new WeakMap();
  XMLHttpRequest.prototype.open = function(method,url,...rest) { urls.set(this,String(url)); return open.call(this,method,url,...rest); };
  XMLHttpRequest.prototype.send = function(...args) {
    const url=urls.get(this);
    if (relevant(url)) this.addEventListener('load', () => {
      try { emit(url,this.status===200 ? (this.responseType==='json' ? this.response : JSON.parse(this.responseText)) : null,this.status); } catch {}
    }, {once:true});
    return send.apply(this,args);
  };
})();
