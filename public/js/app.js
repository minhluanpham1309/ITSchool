// Khoi dong: nen sang/toi, badge trang thai, va tab hoi dap.

import { $, api, toast } from './util.js';
import * as demo from './demo.js';

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
      badge.textContent = 'Chưa cấu hình';
      badge.title = 'Đặt HF_SPACE_URL để bật suy diễn';
      return;
    }
    if (!data.space.reachable) {
      badge.className = 'badge badge-bad';
      badge.textContent = 'Không gọi được máy chủ';
      badge.title = data.space.error || '';
      return;
    }
    const configured = Object.values(data.space.health?.checkpoints_configured || {}).filter(Boolean).length;
    badge.className = configured ? 'badge badge-ok' : 'badge badge-warn';
    badge.textContent = configured ? `${configured}/6 mô hình` : 'Chế độ tra cứu';
    badge.title = configured
      ? `${data.space.url} · thiết bị ${data.space.health?.device || '?'}`
      : 'Chưa nạp checkpoint fine-tune — trả lời từ dữ liệu đã có';
  } catch (err) {
    badge.className = 'badge badge-bad';
    badge.textContent = 'Lỗi';
    badge.title = err.message;
  }
}

demo.init().catch((err) => toast(`Không tải được dữ liệu: ${err.message}`));
checkHealth();
