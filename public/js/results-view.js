// Dung chung cho tab "Hoi bai" va "So sanh": the ket qua tung mo hinh.

import { KIND_VI, MODEL_BY_KEY, MODE_VI, el, esc, fmt, highlight } from './util.js';

export function contextBlock(context, start, end, source) {
  const box = el('div', { class: 'context-box', html: highlight(context, start, end) });
  const wrap = el('div', {}, box);
  if (source) {
    const bits = [
      source.lesson,
      source.page ? `trang ${source.page}` : null,
      source.section ? `mục “${source.section}”` : null,
      source.score != null ? `độ khớp ${fmt(source.score * 100, 0)}%` : null,
    ].filter(Boolean);
    wrap.append(el('p', { class: 'cite', text: bits.join(' · ') }));
  }
  return wrap;
}

export function resultCard(result, { gold } = {}) {
  const meta = MODEL_BY_KEY[result.model] || { label: result.label, color: 'var(--border-strong)' };
  const exact = gold && result.answer && normalize(result.answer) === normalize(gold);

  const foot = [];
  if (result.score != null) foot.push(`điểm ${fmt(result.score, 3)}`);
  if (result.latency_ms != null) foot.push(`${result.latency_ms} ms`);
  if (result.checkpoint) foot.push(result.checkpoint);

  return el(
    'div',
    { class: 'result-card', style: `--mdl:${meta.color}` },
    el(
      'div',
      { class: 'result-head' },
      el('span', { class: 'result-name' }, el('span', { class: 'swatch' }), meta.label),
      el(
        'span',
        { class: 'qa-tags' },
        exact ? el('span', { class: 'tag tag-exact', text: 'khớp đáp án' }) : null,
        el('span', { class: `tag tag-${result.mode}`, text: MODE_VI[result.mode] || result.mode })
      )
    ),
    el('div', {
      class: result.answer ? 'result-answer' : 'result-answer empty',
      text: result.answer || '(không có câu trả lời)',
    }),
    el('div', { class: 'result-foot' }, el('span', { text: KIND_VI[result.kind] || result.kind }), foot.map((f) => el('span', { text: f }))),
    result.note ? el('p', { class: 'note', text: result.note }) : null
  );
}

export function normalize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function spaceErrorBox(message) {
  return el(
    'div',
    { class: 'alert alert-bad' },
    el('strong', { text: 'Không gọi được HF Space' }),
    el('span', { text: message }),
    el('p', {
      class: 'note',
      html:
        'Kiểm tra <code>HF_SPACE_URL</code> trong <code>web/.env</code>. ' +
        'Space ở chế độ free sẽ ngủ sau 48 giờ không dùng — lần gọi đầu có thể mất 1–2 phút để khởi động lại. ' +
        'Dữ liệu ở tab <em>Kết quả thực nghiệm</em> và <em>Dữ liệu</em> vẫn dùng được bình thường vì lấy từ file cục bộ.',
    })
  );
}

export function modeSummary(results) {
  const counts = {};
  for (const r of results) counts[r.mode] = (counts[r.mode] || 0) + 1;
  const parts = Object.entries(counts).map(([mode, n]) => `${n} ${MODE_VI[mode] || mode}`);
  return parts.join(' · ');
}

export { esc };
