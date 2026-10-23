/* 静态资源自愈。
 *
 * 部署到 GitHub Pages 后，从部分网络访问会出现 `net::ERR_CONNECTION_CLOSED`：
 * 连接在传输中途被掐断，HTTP 状态码根本没回来。文件本身是好的（同一份字节
 * 用 HEAD 校验过 65/65 都对得上），但浏览器对失败的 <img> 和字体**不会重试**，
 * 于是断开的那几张就永久停在破损图标 / 空格子 / alt 文字上——每次刷新换一批，
 * 表现成"有些图能显示、有些不能"。
 *
 * 这里只做两件事：给断掉的图片和字体各重发几次请求。不改路径、不改尺寸、
 * 不改配色、不改排版，正常情况下（一次就成功）这段代码完全不动 DOM。
 */
(() => {
  'use strict';

  const MAX_RETRY = 3;
  const DELAY = [500, 1500, 3500];

  // 在原 src 上挂一个 retry 参数。GitHub Pages 对静态文件忽略查询串，
  // 拿到的还是同一份字节；但浏览器会把"带新参数的 URL"当成新资源，
  // 绕开失败缓存，真的重新发请求。
  const bust = (raw, n) => {
    try {
      const url = new URL(raw, document.baseURI);
      url.searchParams.set('retry', String(n));
      return url.href;
    } catch {
      return null;
    }
  };

  const attempts = new WeakMap();

  const retryImage = img => {
    const tried = attempts.get(img) || 0;
    if (tried >= MAX_RETRY) return;
    // 首次失败时才记录原始 src，之后每次重试都从它派生，避免参数越叠越长。
    if (!img.dataset.srcOriginal) {
      const raw = img.getAttribute('src');
      if (!raw) return;
      img.dataset.srcOriginal = raw;
    }
    const url = bust(img.dataset.srcOriginal, tried + 1);
    if (!url) return;
    attempts.set(img, tried + 1);
    setTimeout(() => {
      // 先摘掉 src 再赋值：少数浏览器遇到"同一个 URL 已经失败过"会直接复用
      // 失败结果，不真正发请求。
      img.removeAttribute('src');
      img.src = url;
    }, DELAY[tried]);
  };

  // 一、之后的失败：error 不冒泡，但捕获阶段能在 document 上收到。
  //     music.js 动态创建的封面同样是 <img>，一并覆盖。
  document.addEventListener(
    'error',
    event => {
      if (event.target instanceof HTMLImageElement) retryImage(event.target);
    },
    true
  );

  // 二、解析期间就失败的：监听器挂上之前 error 已经发过了，靠扫一遍补回来。
  //     complete && naturalWidth === 0 才是"失败"，还没加载的 lazy 图 naturalWidth 也是 0
  //     但 complete 为 false，不会被误判。
  const sweepBroken = () => {
    for (const img of document.images) {
      if (img.complete && img.naturalWidth === 0) retryImage(img);
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(sweepBroken, 300), { once: true });
  } else {
    setTimeout(sweepBroken, 300);
  }

  /* 三、.paper 是 CSS 背景图，拿不到时只剩一层底色（看着就是"空白"），
   *     而且背景图失败后浏览器同样不会重试。用一张探针图走同一套重试，
   *     成功后再把带参数的 URL 写回元素——此时已在缓存里，不会二次下载。
   *     探针一直失败就保持原样，底色本身是设计里的一部分。 */
  const retryBackground = () => {
    const paper = document.querySelector('.paper');
    if (!paper) return;
    const raw = (getComputedStyle(paper).backgroundImage.match(/url\("?([^")]+)"?\)/) || [])[1];
    if (!raw) return;
    let round = 0;
    const probe = new Image();
    probe.onload = () => {
      if (round > 0) paper.style.backgroundImage = `url("${probe.src}")`;
    };
    probe.onerror = () => {
      if (round >= MAX_RETRY) return;
      round += 1;
      setTimeout(() => {
        const url = bust(raw, round);
        if (url) probe.src = url;
      }, DELAY[round - 1]);
    };
    probe.src = raw;
  };
  setTimeout(retryBackground, 1200);

  /* 四、字体。--script（Huiwen Mincho）是 2.2MB 的那一个，断掉就会一直停在
   *     兜底衬线体上，看起来就是"字体不对"。失败后重新声明同一族名 + 新 URL，
   *     后声明的 @font-face 覆盖前者，字形来自同一份文件，渲染结果不变。 */
  const FACES = [
    { family: 'IM Fell English', file: 'assets/IMFellEnglish-Regular-latin.woff2', format: 'woff2', weight: '400', style: 'normal' },
    { family: 'Architects Daughter', file: 'assets/ArchitectsDaughter-Regular-latin.woff2', format: 'woff2', weight: '400', style: 'normal' },
    { family: 'Oswald', file: 'assets/Oswald-Medium-latin.woff2', format: 'woff2', weight: '500', style: 'normal' },
    { family: 'Space Mono', file: 'assets/SpaceMono-Bold-latin.woff2', format: 'woff2', weight: '700', style: 'normal' },
    { family: 'Special Elite', file: 'assets/SpecialElite-Regular.ttf', format: 'truetype', weight: '400', style: 'normal' },
    {
      family: 'Huiwen Mincho',
      file: 'assets/HuiwenMincho-Regular-subset.woff2',
      format: 'woff2',
      weight: '400',
      style: 'normal',
      range: 'U+0000-00FF,U+2000-206F,U+3000-303F,U+4E00-9FFF,U+FF00-FFEF'
    }
  ];

  const redeclare = (face, n) => {
    const url = bust(face.file, n);
    if (!url) return;
    const rule =
      `@font-face{font-family:"${face.family}";src:url("${url}") format("${face.format}");` +
      `font-weight:${face.weight};font-style:${face.style};font-display:swap;` +
      (face.range ? `unicode-range:${face.range}}` : '}');
    const style = document.createElement('style');
    style.textContent = rule;
    document.head.appendChild(style);
    // 真正触发请求；document.fonts 里同名同描述符的新面孔会顶替掉失败的那张。
    document.fonts.load(`${face.weight === 'normal' ? '400' : face.weight} 16px "${face.family}"`).catch(() => {});
  };

  const healFonts = async () => {
    if (!document.fonts) return;
    try {
      await document.fonts.ready;
    } catch {
      return;
    }
    for (let round = 1; round <= 2; round += 1) {
      const broken = FACES.filter(face => {
        for (const loaded of document.fonts) {
          if (loaded.family.replace(/["']/g, '') === face.family && loaded.status === 'error') return true;
        }
        return false;
      });
      if (!broken.length) return;
      for (const face of broken) redeclare(face, round);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  };

  healFonts();
})();
