/* Thoughts 001 reader: opens the archive card as a dialog over the current page.
   Scope is deliberately narrow — it only touches #reader-001 and the card that opens it. */
(() => {
  'use strict';
  const reader = document.querySelector('#reader-001');
  if (!reader) return;
  const panel = reader.querySelector('.reader-panel');
  const scroller = reader.querySelector('.reader-scroll');
  const pagesWrap = document.querySelector('.pages');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const root = document.documentElement;
  let opener = null;
  let scrollPage = null;
  let savedTop = 0;
  let hideTimer = 0;

  const isOpen = () => reader.classList.contains('is-open');
  panel.setAttribute('tabindex', '-1');

  function focusables() {
    return [...panel.querySelectorAll('button, a[href], [tabindex]:not([tabindex="-1"])')]
      .filter(el => !el.hasAttribute('disabled') && el.offsetParent !== null);
  }

  function open(trigger) {
    if (isOpen()) return;
    opener = trigger;
    // The portfolio scrolls inside the active .inner-page, not the document.
    const active = document.querySelector('.page.is-active');
    scrollPage = active && active.classList.contains('inner-page') ? active : document.scrollingElement;
    savedTop = scrollPage.scrollTop || 0;
    reader.hidden = false;
    scroller.scrollTop = 0;
    if (scrollPage === document.scrollingElement) document.body.style.overflow = 'hidden';
    else scrollPage.style.overflow = 'hidden';
    root.classList.add('is-reader-open');
    if (pagesWrap) pagesWrap.inert = true;
    document.addEventListener('keydown', onKey, true);
    clearTimeout(hideTimer);
    // Two frames so the entry transition actually runs from the hidden state.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      reader.classList.add('is-open');
      panel.focus({ preventScroll: true });
    }));
  }

  function close() {
    if (reader.hidden || !isOpen()) return;
    reader.classList.remove('is-open');
    root.classList.remove('is-reader-open');
    document.removeEventListener('keydown', onKey, true);
    if (scrollPage === document.scrollingElement) document.body.style.overflow = '';
    else if (scrollPage) scrollPage.style.overflow = '';
    if (scrollPage) scrollPage.scrollTop = savedTop;
    // Clear inert before refocusing — a focus() into an inert subtree is silently dropped.
    if (pagesWrap) pagesWrap.inert = false;
    if (opener) opener.focus({ preventScroll: true });
    const hide = () => { reader.hidden = true; };
    if (reduce.matches) hide();
    else hideTimer = setTimeout(hide, 220);
  }

  function scrollToPart(id) {
    const target = reader.querySelector('#' + id);
    if (!target) return;
    const top = target.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop - 20;
    scroller.scrollTo({ top: Math.max(0, top), behavior: reduce.matches ? 'auto' : 'smooth' });
  }

  function onKey(event) {
    if (!isOpen()) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      // Keep the app's own Escape handler (go home) from firing while reading.
      event.stopPropagation();
      close();
      return;
    }
    if (event.key !== 'Tab') return;
    const list = focusables();
    if (!list.length) return;
    const first = list[0];
    const last = list[list.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && (active === first || active === panel)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  document.addEventListener('click', event => {
    const trigger = event.target.closest('[data-reader-open]');
    if (trigger) {
      event.preventDefault();
      open(trigger);
      return;
    }
    if (!isOpen()) return;
    if (event.target.closest('[data-reader-close]')) {
      event.preventDefault();
      close();
      return;
    }
    const jump = event.target.closest('[data-goto]');
    if (jump && reader.contains(jump)) {
      event.preventDefault();
      scrollToPart(jump.dataset.goto);
    }
  });

  // Keep focus inside the dialog if it is moved by something other than Tab.
  document.addEventListener('focusin', event => {
    if (isOpen() && !reader.contains(event.target)) panel.focus({ preventScroll: true });
  });
})();
