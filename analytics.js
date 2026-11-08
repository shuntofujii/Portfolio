/**
 * GA4（G-FD7TYG4S7P）を、文書の load 後かつ requestIdleCallback のあとで読む。
 * HTML 先頭の同期スクリプトにはしない（PageSpeed の TBT を避ける）。
 */

export const GA_MEASUREMENT_ID = 'G-FD7TYG4S7P';

const GTAG_SRC = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;

let loadScheduled = false;
let gtagReady = false;
const pendingViews = [];

function pageSnapshot() {
  return {
    send_to: GA_MEASUREMENT_ID,
    page_path: `${window.location.pathname}${window.location.search}`,
    page_location: window.location.href,
    page_title: document.title
  };
}

function rememberView(view) {
  const last = pendingViews[pendingViews.length - 1];
  if (last && last.page_path === view.page_path) return;
  pendingViews.push(view);
}

function ensureStub() {
  window.dataLayer = window.dataLayer || [];
  if (typeof window.gtag !== 'function') {
    window.gtag = function gtag() {
      window.dataLayer.push(arguments);
    };
  }
}

/** gtag/js を挿入し、溜めた page_view を測定IDへ送る。load / idle 後に呼ぶ。 */
export function loadGa4Script() {
  if (gtagReady || typeof document === 'undefined') return;
  gtagReady = true;
  ensureStub();
  if (pendingViews.length === 0) rememberView(pageSnapshot());
  window.gtag('js', new Date());
  window.gtag('config', GA_MEASUREMENT_ID, { send_page_view: false });
  const queued = pendingViews.splice(0, pendingViews.length);
  for (const view of queued) {
    window.gtag('event', 'page_view', view);
  }
  const script = document.createElement('script');
  script.async = true;
  script.fetchPriority = 'low';
  script.src = GTAG_SRC;
  (document.head || document.documentElement).appendChild(script);
}

/** パス変更時の page_view。スクリプト未挿入のあいだはキューする。 */
export function trackPageView() {
  const view = pageSnapshot();
  if (!gtagReady) {
    rememberView(view);
    return;
  }
  ensureStub();
  window.gtag('event', 'page_view', view);
}

function runWhenIdle() {
  const ric = window.requestIdleCallback;
  if (typeof ric === 'function') {
    ric(() => loadGa4Script(), { timeout: 2000 });
    return;
  }
  loadGa4Script();
}

export function installGa4() {
  if (loadScheduled || typeof window === 'undefined') return;
  loadScheduled = true;
  rememberView(pageSnapshot());
  if (document.readyState === 'complete') {
    runWhenIdle();
    return;
  }
  window.addEventListener('load', runWhenIdle, { once: true });
}

installGa4();
