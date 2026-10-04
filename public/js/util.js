export const MODELS = [
  { key: 'phobert', label: 'PhoBERT', kind: 'extractive', color: 'var(--series-1)' },
  { key: 'mbert', label: 'mBERT', kind: 'extractive', color: 'var(--series-2)' },
  { key: 'xlmr', label: 'XLM-RoBERTa', kind: 'extractive', color: 'var(--series-3)' },
  { key: 'vit5', label: 'ViT5', kind: 'generative', color: 'var(--series-4)' },
  { key: 'bartpho', label: 'BARTpho', kind: 'generative', color: 'var(--series-5)' },
  { key: 'gpt', label: 'GPT', kind: 'generative', color: 'var(--series-6)' },
];
export const MODEL_BY_KEY = Object.fromEntries(MODELS.map((m) => [m.key, m]));
export const byLabel = (label) => MODELS.find((m) => m.label === label) || null;

export const KIND_VI = { extractive: 'Trích xuất', generative: 'Sinh tạo', seq2seq: 'Sinh tạo', causal: 'Sinh tạo' };

export const MODE_VI = {
  live: 'suy diễn thật',
  base: 'base model',
  recorded: 'dự đoán đã ghi',
  unavailable: 'chưa có checkpoint',
  error: 'lỗi',
};

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k === 'text') node.textContent = v;
    else if (k === 'style') node.setAttribute('style', v);
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v === true ? '' : String(v));
  }
  for (const child of children.flat()) {
    if (child == null || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

export function esc(text) {
  return String(text ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/** Boc <mark> quanh doan [start, end) trong ngu canh. */
export function highlight(context, start, end) {
  if (start == null || end == null || start < 0 || end > context.length || start >= end) return esc(context);
  return `${esc(context.slice(0, start))}<mark>${esc(context.slice(start, end))}</mark>${esc(context.slice(end))}`;
}

export async function api(pathname, options) {
  const res = await fetch(pathname, options);
  let payload = null;
  try {
    payload = await res.json();
  } catch {
    payload = null;
  }
  if (!res.ok) {
    const err = new Error(payload?.error || `Lỗi ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return payload;
}

export const post = (pathname, body) =>
  api(pathname, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

let toastTimer;
export function toast(message) {
  const node = $('#toast');
  node.textContent = message;
  node.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { node.hidden = true; }, 3600);
}

export const fmt = (value, digits = 2) =>
  value == null || Number.isNaN(value) ? '—' : Number(value).toFixed(digits);
export const int = (value) => (value == null ? '—' : Number(value).toLocaleString('vi-VN'));

export function loading(text = 'Đang xử lý…') {
  return el('div', { class: 'card card-pad' }, el('div', { class: 'loading' }, el('span', { class: 'spinner' }), text));
}

export function alertBox(title, detail, kind = 'bad') {
  return el('div', { class: `alert alert-${kind}` }, el('strong', { text: title }), el('span', { html: detail || '' }));
}

export function fillSelect(select, options, { placeholder } = {}) {
  select.innerHTML = '';
  if (placeholder) select.append(el('option', { value: '', text: placeholder }));
  for (const opt of options) {
    const { value, label } = typeof opt === 'object' ? opt : { value: opt, label: String(opt) };
    select.append(el('option', { value, text: label }));
  }
}
