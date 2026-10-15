(() => {
  const send = msg => chrome.runtime.sendMessage(msg).catch(() => null);
  window.addEventListener('message', event => {
    if (event.source !== window || event.origin !== location.origin || event.data?.source !== 'x-research-response-v1') return;
    const {op,status,path,posts,profiles,articles,diagnostic} = event.data;
    if (!Array.isArray(posts) || posts.length > 1000 || !Array.isArray(profiles)) return;
    send({type:'INGEST', op,status,path,posts,profiles,articles,diagnostic});
  });
  let busy=false;
  setInterval(async () => {
    if (busy || document.readyState==='loading' || document.hidden) return;
    busy=true;
    try {
      const blocked = !!document.querySelector('iframe[src*="arkoselabs"],iframe[src*="captcha"]') || location.pathname.startsWith('/i/flow/') || location.pathname.startsWith('/account/access');
      const nodes=[...document.querySelectorAll('article[data-testid="tweet"]')];
      const cards=nodes.map(a=>{
        const id=a.querySelector('a[href*="/status/"] time')?.closest('a')?.getAttribute('href')?.match(/\/status\/(\d+)/)?.[1];
        const more=a.querySelector('[data-testid="tweet-text-show-more-link"]');
        const text=a.querySelector('[data-testid="tweetText"]')?.innerText || '';
        // A navigation link is deferred to the bounded detail queue, never clicked as an expansion.
        return {id,text,showMore:!!more,canExpand:!!more && !more.getAttribute('href')};
      }).filter(c=>c.id);
      const visibleIds=cards.map(c=>c.id);
      const article=document.querySelector('[data-testid="twitterArticleRichTextView"]');
      const articleText=article?.innerText || null;
      const articleImages=article ? [...article.querySelectorAll('img')].map(i=>i.src).filter(u=>u.startsWith('https://pbs.twimg.com/')) : [];
      const action=await send({type:'TICK',path:location.pathname,blocked,visibleIds,cards,articleText,articleImages});
      if(action?.expand && !document.hidden) {
        const index=cards.findIndex(c=>c.id===action.expand);
        const more=nodes.find(a=>a.querySelector('a[href*="/status/"] time')?.closest('a')?.getAttribute('href')?.includes(`/status/${action.expand}`))?.querySelector('[data-testid="tweet-text-show-more-link"]');
        if(index>=0 && more && !more.getAttribute('href'))more.click();
      }
      if (action?.scroll) window.scrollBy({top:Math.round(innerHeight*0.8),behavior:'smooth'});
    } finally { busy=false; }
  },5000);
})();
