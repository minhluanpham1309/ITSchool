// Khoi dong: tabs, nen sang/toi, badge trang thai Space.

import { $, $$, api, toast } from './util.js';
import * as compare from './compare.js';
import * as dashboard from './dashboard.js';
import * as dataset from './dataset.js';
import * as demo from './demo.js';

const VIEWS = {
  demo: { init: demo.init, done: false },
  compare: { init: async () => compare.init(), done: false },
  dashboard: { init: dashboard.init, done: false },
  dataset: { init: dataset.init, done: false },
};

// ------------------------------------------------------------------- theme
const THEME_KEY = 'itschool-theme';
function applyTheme(value) {
  if (value) document.documentElement.setAttribute('data-theme', value);
  else document.documentElement.removeAttribute('data-theme');
}
try {
  applyTheme(localStorage.getItem(THEME_KEY));
} catch {
  /* private mode */
}
$('#theme-toggle').addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme');
  const dark = matchMedia('(prefers-color-scheme: dark)').matches;
  const next = current ? (current === 'dark' ? 'light' : 'dark') : dark ? 'light' : 'dark';
  applyTheme(next);
  try {
    localStorage.setItem(THEME_KEY, next);
  } catch {
    /* bo qua */
  }
});

// --------------------------------------------------------------------- tabs
async function show(name) {
  if (!VIEWS[name]) name = 'demo';
  for (const tab of $$('.tab')) tab.setAttribute('aria-selected', String(tab.dataset.view === name));
  for (const view of $$('.view')) view.hidden = view.id !== `view-${name}`;
  location.hash = name;

  const entry = VIEWS[name];
  if (entry.done) return;
  entry.done = true;
  try {
    await entry.init();
  } catch (err) {
    entry.done = false;
    toast(`Không tải được tab: ${err.message}`);
  }
}

for (const tab of $$('.tab')) tab.addEventListener('click', () => show(tab.dataset.view));
window.addEventListener('hashchange', () => show(location.hash.slice(1)));

// ------------------------------------------------------------------- health
async function checkHealth() {
  const badge = $('#space-badge');
  try {
    const data = await api('/api/health');
    const info = data.space?.health?.data;
    if (info?.build?.builtAt) {
      $('#footer-build').textContent = `Dữ liệu build lúc ${new Date(info.build.builtAt).toLocaleString('vi-VN')} · ${info.items} cặp hỏi–đáp · ${info.contexts} đoạn ngữ cảnh.`;
    }
    if (!data.space.configured) {
      badge.className = 'badge badge-warn';
      badge.textContent = 'Space: chưa cấu hình';
      badge.title = 'Đặt HF_SPACE_URL trong web/.env để bật suy diễn';
      return;
    }
    if (!data.space.reachable) {
      badge.className = 'badge badge-bad';
      badge.textContent = 'Space: không gọi được';
      badge.title = data.space.error || '';
      return;
    }
    const configured = Object.values(data.space.health?.checkpoints_configured || {}).filter(Boolean).length;
    badge.className = configured ? 'badge badge-ok' : 'badge badge-warn';
    badge.textContent = configured ? `Space: ${configured}/6 checkpoint` : 'Space: chế độ dự đoán đã ghi';
    badge.title = `${data.space.url} · thiết bị ${data.space.health?.device || '?'}`;
  } catch (err) {
    badge.className = 'badge badge-bad';
    badge.textContent = 'Lỗi backend';
    badge.title = err.message;
  }
}

show(location.hash.slice(1) || 'demo');
checkHealth();
