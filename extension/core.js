/* Pure normalization; no HTTP, cookies, or browser storage. */
(function (root) {
  'use strict';
  const number = x => x === null || x === undefined || x === '' || !Number.isFinite(Number(x)) ? null : Number(x);
  function unwrap(x) { return x?.tweet || x; }
  function normalizeArticle(a) {
    if (!a || !a.rest_id) return null;
    const text=a.plain_text || a.content_state?.blocks?.map(b=>b.text || '').join('\n') || null;
    return {id:a.rest_id,title:a.title || null,text,source:a,completeness:text?'text_received_unverified':'preview_only'};
  }
  function normalize(input, observedAt = new Date().toISOString()) {
    const t = unwrap(input), l = t?.legacy;
    const u = t?.core?.user_results?.result;
    const handle = u?.core?.screen_name || u?.legacy?.screen_name;
    if (!l || !/^\d+$/.test(t.rest_id || '') || !handle) return null;
    const note = t.note_tweet?.note_tweet_results?.result;
    const article = t.article?.article_results?.result || null;
    const articleText = article?.plain_text || article?.content_state?.blocks?.map(b => b.text || '').join('\n') || null;
    const media = (l.extended_entities?.media || l.entities?.media || []).map(m => {
      const variants = (m.video_info?.variants || []).filter(v => v.content_type === 'video/mp4').sort((a,b) => (b.bitrate || 0) - (a.bitrate || 0));
      return {id: m.id_str || m.media_key, type: m.type, url: m.media_url_https || null,
        video_url: variants[0]?.url || null, duration_ms: m.video_info?.duration_millis ?? null,
        alt_text: m.ext_alt_text || null, variants: m.video_info?.variants || []};
    });
    return {id: t.rest_id, url: `https://x.com/${handle}/status/${t.rest_id}`, author: handle,
      author_id: u.rest_id, created_at: l.created_at || null, observed_at: observedAt,
      text: note?.text || l.full_text || '', text_source: note?.text ? 'note_tweet' : 'legacy',
      possibly_truncated: !note?.text && (!!l.truncated || /…\s*https:\/\/t\.co\/\S+$/.test(l.full_text || '')),
      conversation_id: l.conversation_id_str || null, reply_to_id: l.in_reply_to_status_id_str || null,
      reply_to_user_id: l.in_reply_to_user_id_str || null,
      repost_id: unwrap(l.retweeted_status_result?.result)?.rest_id || null,
      quoted_id: l.quoted_status_id_str || unwrap(t.quoted_status_result?.result)?.rest_id || null,
      metrics: {likes: number(l.favorite_count), replies: number(l.reply_count), reposts: number(l.retweet_count),
        quotes: number(l.quote_count), bookmarks: number(l.bookmark_count), views: number(t.views?.count)},
      media, links: (note?.entity_set?.urls || l.entities?.urls || []).map(x => ({url: x.expanded_url || x.url, display: x.display_url})),
      card: t.card?.legacy || null,
      article: article ? {id: article.rest_id, title: article.title || null, text: articleText,
        source: article, completeness: articleText ? 'text_received_unverified' : 'preview_only'} : null};
  }
  function extract(body) {
    const posts = new Map(), profiles = new Map(), articles = new Map();
    const seen = new WeakSet();
    function walk(x) {
      if (!x || typeof x !== 'object' || seen.has(x)) return;
      seen.add(x);
      if(x.rest_id && x.title && (x.content_state || x.plain_text || x.__typename==='Article'))articles.set(x.rest_id,normalizeArticle(x));
      const p = normalize(x);
      if (p) posts.set(p.id, p);
      if (x.__typename === 'User' && x.rest_id && (x.core?.screen_name || x.legacy?.screen_name)) {
        profiles.set(x.rest_id, {id:x.rest_id, handle:x.core?.screen_name || x.legacy.screen_name,
          name:x.core?.name || x.legacy?.name, bio:x.legacy?.description || x.profile_bio?.description || null,
          followers:number(x.legacy?.followers_count), following:number(x.legacy?.friends_count),
          pinned_ids:x.legacy?.pinned_tweet_ids_str || [], observed_at:new Date().toISOString()});
      }
      for (const v of Object.values(x)) walk(v);
    }
    walk(body);
    return {posts:[...posts.values()], profiles:[...profiles.values()],articles:[...articles.values()]};
  }
  function eligible(p, handle) { return p.author.toLowerCase() === handle.toLowerCase() && !p.reply_to_id && !p.repost_id; }
  function select(posts, handle, count) {
    return Object.values(posts).filter(p => eligible(p, handle)).sort((a,b) => BigInt(a.id) > BigInt(b.id) ? -1 : 1).slice(0,count);
  }
  function merge(old, fresh) {
    if (!old) return fresh;
    const keepOld=(['note_tweet','dom_expanded'].includes(old.text_source) && fresh.text_source==='legacy') || old.text.length>fresh.text.length;
    const chosen=keepOld?old:fresh;
    return {...old, ...fresh, text:chosen.text,text_source:chosen.text_source,
      possibly_truncated:chosen.possibly_truncated,
      article: fresh.article?.text ? fresh.article : old.article || fresh.article,
      media: fresh.media.length ? fresh.media : old.media};
  }
  function mediaURL(value) {
    try { const u=new URL(value); return u.protocol==='https:' && ['pbs.twimg.com','video.twimg.com'].includes(u.hostname) ? u.href : null; } catch { return null; }
  }
  const api = {normalize, extract, eligible, select, merge, mediaURL};
  if (typeof module !== 'undefined') module.exports = api;
  root.XResearch = api;
})(globalThis);
