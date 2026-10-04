// Tab "So sanh 6 mo hinh".

import { $, MODELS, api, el, fmt, loading, post, toast } from './util.js';
import { contextBlock, modeSummary, normalize, resultCard, spaceErrorBox } from './results-view.js';

let busy = false;
let loadedGold = null;

export function init() {
  const picks = $('#cmp-models');
  for (const m of MODELS) {
    picks.append(
      el(
        'label',
        { class: 'pick' },
        el('input', { type: 'checkbox', value: m.key, checked: true }),
        el('span', { class: 'swatch', style: `background:${m.color}` }),
        m.label
      )
    );
  }

  $('#cmp-run').addEventListener('click', run);
  $('#cmp-load').addEventListener('click', loadSample);
  $('#cmp-clear').addEventListener('click', clear);
  for (const id of ['#cmp-context', '#cmp-question']) {
    $(id).addEventListener('input', () => {
      if (loadedGold) {
        loadedGold = null;
        $('#cmp-gold-field').hidden = true;
      }
    });
  }
}

function selected() {
  return [...$('#cmp-models').querySelectorAll('input:checked')].map((i) => i.value);
}

function clear() {
  $('#cmp-context').value = '';
  $('#cmp-question').value = '';
  $('#cmp-gold').value = '';
  $('#cmp-gold-field').hidden = true;
  loadedGold = null;
  $('#cmp-result').hidden = true;
  $('#cmp-result').replaceChildren();
}

export async function loadSample(item) {
  try {
    const row = item?.question ? item : await api('/api/sample');
    $('#cmp-context').value = row.context;
    $('#cmp-question').value = row.question;
    $('#cmp-gold').value = row.gold || '';
    $('#cmp-gold-field').hidden = !row.gold;
    loadedGold = row.gold || null;
    $('#cmp-result').hidden = true;
    $('#cmp-result').replaceChildren();
  } catch (err) {
    toast(err.message);
  }
}

async function run() {
  if (busy) return;
  const context = $('#cmp-context').value.trim();
  const question = $('#cmp-question').value.trim();
  const models = selected();

  if (!context || !question) return toast('Cần cả ngữ cảnh và câu hỏi.');
  if (!models.length) return toast('Chọn ít nhất một mô hình.');

  const target = $('#cmp-result');
  target.hidden = false;
  target.replaceChildren(
    loading(`Đang chạy ${models.length} mô hình… lần gọi đầu có thể mất vài phút vì Space phải tải checkpoint.`)
  );
  busy = true;
  $('#cmp-run').disabled = true;

  try {
    const payload = await post('/api/predict', { question, context, models });
    render(target, payload);
  } catch (err) {
    target.replaceChildren(spaceErrorBox(err.message));
  } finally {
    busy = false;
    $('#cmp-run').disabled = false;
  }
}

function render(target, payload) {
  const gold = loadedGold || payload.gold || null;

  const head = el('div', { class: 'card card-pad' });
  head.append(el('h2', { class: 'h2', text: 'Kết quả' }));
  head.append(el('p', { class: 'note', text: modeSummary(payload.results) + (payload.item_id ? ` · ${payload.item_id}` : '') }));
  if (gold) {
    const hit = payload.results.filter((r) => r.answer && normalize(r.answer) === normalize(gold)).length;
    head.append(
      el(
        'div',
        { class: 'answer-meta' },
        el('span', { class: 'tag', text: `đáp án chuẩn: ${gold}` }),
        el('span', { class: 'tag', text: `${hit}/${payload.results.length} mô hình khớp tuyệt đối` })
      )
    );
  }

  const grid = el('div', { class: 'result-grid' }, payload.results.map((r) => resultCard(r, { gold })));

  const ctxCard = el('div', { class: 'card card-pad' });
  ctxCard.append(el('h2', { class: 'h2', text: 'Ngữ cảnh' }));
  ctxCard.append(el('p', { class: 'note', text: 'Vùng tô vàng là đoạn mô hình trích xuất tốt nhất đã chọn.' }));
  const best = payload.results.find((r) => r.char_start != null);
  ctxCard.append(contextBlock(payload.context, best?.char_start, best?.char_end, payload.source));

  const table = el('table', { class: 'table' });
  table.append(
    el(
      'thead',
      {},
      el(
        'tr',
        {},
        el('th', { text: 'Mô hình' }),
        el('th', { text: 'Câu trả lời' }),
        el('th', { text: 'Chế độ' }),
        el('th', { text: 'Điểm' }),
        el('th', { text: 'ms' })
      )
    )
  );
  const tbody = el('tbody');
  for (const r of payload.results) {
    const meta = MODELS.find((m) => m.key === r.model);
    tbody.append(
      el(
        'tr',
        {},
        el('td', {}, el('span', { class: 'mdl' }, el('span', { class: 'swatch', style: `background:${meta?.color}` }), r.label)),
        el('td', { style: 'text-align:left;white-space:normal', text: r.answer || '—' }),
        el('td', { text: r.mode }),
        el('td', { class: 'num', text: r.score == null ? '—' : fmt(r.score, 3) }),
        el('td', { class: 'num', text: r.latency_ms ?? '—' })
      )
    );
  }
  table.append(tbody);

  const tableCard = el('div', { class: 'card card-pad' }, el('h2', { class: 'h2', text: 'Dạng bảng' }), el('div', { class: 'table-scroll' }, table));

  target.replaceChildren(head, grid, ctxCard, tableCard);
}
