/* 分级资源加载。
 *
 * 本站五个栏目都是 .page{position:absolute;inset:0} 平移堆叠，所有栏目始终在
 * 视口内——原生 loading="lazy" 在这种布局下完全不起作用（实测冷启动首页会一次
 * 发出全部 54 个图片请求）。所以这里显式分三级，按"用户真的打开了哪个栏目"来取：
 *
 *   P0  home（HTML 里保留真实 src，不经过本文件）—— 首屏必须可见
 *   P1  music                                       —— 首次进入 Music 时取
 *   P2  travel / about / works / thoughts            —— 首次进入各自栏目时取
 *
 * 非 P0 的图片在 HTML 里只带 data-src（或 <picture> 里的 data-srcset），栏目第一次
 * 被激活时才开始下载。这样做有两个直接结果：首访不再被 Music/Travel 的流量挤占；
 * 用户没打开的栏目一个字节都不花。
 *
 * 与 assets.js 的分工：assets.js 负责"失败了再要一次"（换查询串绕开失败缓存），
 * 本文件负责"什么时候要"。两者共用同一套 URL 和同一个重试节奏，不会重复下载：
 * 这里预载成功后写回 DOM 的地址与预载地址完全相同，浏览器命中同一份内存缓存。
 */
(() => {
  'use strict';

  const MAX_RETRY = 3;
  const DELAY = [500, 1500, 3500];      // 与 assets.js 一致
  const PRELOAD_TIMEOUT = 1500;         // 栏目切换动画 600ms，超过这个点就别等了

  const root = document.documentElement;
  const seen = new Set();               // 已完整处理过的栏目 id
  const running = new Map();            // id -> Promise（并发去重）
  const cache = new Map();              // url -> Promise<string>（同一地址只发一次）
  const stats = { requested: 0, deduped: 0, failed: 0, retried: 0, timeout: 0 };

  // AVIF 支持探测。探测本身用 64 字节的 data URI，不发网络请求。
  // 只有真的存在 <source data-srcset>（阶段二之后）才会被求值。
  const AVIF_PROBE =
    'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADrbWV0YQAAAAAAAAAhaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAAAAAAAOcGl0bQAAAAAAAQAAAB5pbG9jAAAAAEQAAAEAAQAAAAEAAAETAAAAKAAAAChpaW5mAAAAAAABAAAAGmluZmUCAAAAAAEAAGF2MDFDb2xvcgAAAABqaXBycAAAAEtpcGNvAAAAFGlzcGUAAAAAAAAAAgAAAAIAAAAQcGl4aQAAAAADCAgIAAAADGF2MUOBAAwAAAAAE2NvbHJuY2x4AAEADQAGgAAAABdpcG1hAAAAAAAAAAEAAQQBAoMEAAAAMG1kYXQSAAoIGAA2iAhoNCAyGhlHh4Yhh5555oAAAJBAyRxhSytNj1FFTqSg';
  let avifPromise = null;
  const wantAVIF = () => {
    if (!avifPromise) {
      avifPromise = new Promise(resolve => {
        const im = new Image();
        im.onload = () => resolve(true);
        im.onerror = () => resolve(false);
        im.src = AVIF_PROBE;
      });
    }
    return avifPromise;
  };

  const bust = (raw, n) => {
    try {
      const url = new URL(raw, document.baseURI);
      url.searchParams.set('r', String(n));
      return url.pathname + url.search;
    } catch {
      return null;
    }
  };

  // 预载 + 解码。成功时 resolve 成"最终生效的地址"（可能带重试参数）。
  function preload(url) {
    if (cache.has(url)) { stats.deduped += 1; return cache.get(url); }
    stats.requested += 1;
    const task = new Promise((resolve, reject) => {
      const im = new Image();
      im.decoding = 'async';
      let attempt = 0;
      let current = url;
      const settleOk = () => {
        if (im.decode) im.decode().then(() => resolve(current), () => resolve(current));
        else resolve(current);
      };
      im.onload = settleOk;
      im.onerror = () => {
        if (attempt >= MAX_RETRY) { stats.failed += 1; reject(new Error('image failed: ' + url)); return; }
        attempt += 1;
        stats.retried += 1;
        const next = bust(url, attempt);
        if (!next) { stats.failed += 1; reject(new Error('image failed: ' + url)); return; }
        setTimeout(() => { current = next; im.removeAttribute('src'); im.src = next; }, DELAY[attempt - 1]);
      };
      im.src = url;
    });
    cache.set(url, task);
    return task;
  }

  // 把一个 <picture>（或裸 <img>）里暂存的地址真正写进 DOM。幂等。
  function apply(unit, url, useAVIF) {
    const { img, source } = unit;
    if (useAVIF && source) {
      if (source.dataset.srcset) {
        source.srcset = url;
        source.removeAttribute('data-srcset');
        // img.src 也指向同一地址：assets.js 的失败重试要能从 src 上取到原始地址；
      }
      if (img && img.dataset.src) {
        img.dataset.fallback = img.dataset.src;      // avif 404 时退到这一份
        img.loading = 'eager';
        img.src = url;
        img.removeAttribute('data-src');
        img.removeAttribute('data-avif');
      }
      return;
    }
    if (img && img.dataset.src) {
      if (useAVIF) img.dataset.fallback = img.dataset.src;
      img.loading = 'eager';
      img.src = url;
      img.removeAttribute('data-src');
      img.removeAttribute('data-avif');
    }
    if (source) source.remove();          // 不支持 AVIF 时这个 <source> 已经没有意义
  }

  function collect(page) {
    const units = [];
    for (const pic of page.querySelectorAll('picture')) {
      const source = pic.querySelector('source[data-srcset]');
      const img = pic.querySelector('img[data-src]');
      if (source || img) units.push({ img, source });
    }
    for (const img of page.querySelectorAll('img[data-src]')) {
      if (!img.closest('picture')) units.push({ img, source: null });
    }
    return units;
  }

  async function loadUnit(unit, globalAVIF) {
    // 地址优先取 img[data-avif]（内页的常规挂法），其次 <picture> 里的 source[data-srcset]。
    const avifURL = unit.img && unit.img.dataset.avif
      ? unit.img.dataset.avif
      : (unit.source ? unit.source.dataset.srcset : null);
    const useAVIF = globalAVIF && !!avifURL;
    const url = useAVIF ? avifURL : (unit.img ? unit.img.dataset.src : null);
    if (!url) return;

    let settled = false;
    const fallback = setTimeout(() => {
      // 超时：不再等解码，直接把地址写回去。浏览器已经在下载同一个 URL，
      // 写回 src 不会产生第二个请求，只是让它自己在到达时上屏。
      if (settled) return;
      settled = true;
      stats.timeout += 1;
      apply(unit, url, useAVIF);
    }, PRELOAD_TIMEOUT);

    try {
      const finalURL = await preload(url);
      clearTimeout(fallback);
      if (settled) return;                // 超时已经写回，不再重复
      settled = true;
      apply(unit, finalURL, useAVIF);
    } catch {
      clearTimeout(fallback);
      if (settled) return;
      // avif 彻底失败（文件没了 / 被拦），先在同一次预载里退到 webp，
      // 别把破图写进 DOM 再等 assets.js 去救——那要多绕一个来回。
      const fb = unit.img && unit.img.dataset.src;
      if (useAVIF && fb) {
        try {
          const finalFallback = await preload(fb);
          if (settled) return;
          settled = true;
          apply(unit, finalFallback, false);
          return;
        } catch { /* webp 也不行，落到下面交给 assets.js */ }
      }
      if (settled) return;
      settled = true;
      // 预载彻底失败：仍然把地址写回，交给 assets.js 的那套重试继续争取，
      // 否则这一格会一直是空的（assets.js 只对"有 src 的失败图"生效）。
      apply(unit, url, useAVIF);
    }
  }

  async function run(page, id) {
    const units = collect(page);
    if (!units.length) { seen.add(id); return; }
    const wantsAVIF = units.some(u => (u.img && u.img.dataset.avif) || (u.source && u.source.dataset.srcset));
    const globalAVIF = wantsAVIF ? await wantAVIF() : false;
    await Promise.all(units.map(unit => loadUnit(unit, globalAVIF)));
    seen.add(id);
    root.dataset.tierReady = id;
  }

  function activate(page) {
    const id = page && page.id;
    if (!id) return;
    if (seen.has(id)) return;
    if (running.has(id)) return;
    const task = run(page, id).catch(() => { running.delete(id); });
    running.set(id, task);
    task.then(() => running.delete(id));
  }

  /* 与路由解耦：app.js 是 IIFE，没有暴露 navigate()。这里盯 .page 的 is-active
   * 变化就行，将来换路由实现也不必改这个文件。 */
  const pages = document.querySelector('.pages');
  const scan = () => {
    if (!pages) return;
    pages.querySelectorAll('.page.is-active').forEach(activate);
  };
  if (pages && 'MutationObserver' in window) {
    new MutationObserver(scan).observe(pages, { subtree: true, attributes: true, attributeFilter: ['class'] });
  }
  scan();

  // 直接用 #music 这类深链进来时，is-active 在解析期就已就位，上面的 scan() 已覆盖；
  // 这里再兜一次 hash 变化，防止将来改成 hash 驱动的路由。
  addEventListener('hashchange', () => {
    const page = document.getElementById(location.hash.slice(1));
    if (page) activate(page);
  });

  window.__tiered = stats;
})();
