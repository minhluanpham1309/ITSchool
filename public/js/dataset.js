// Tab "Du lieu" — loc va xem 10.961 cap hoi dap.

import { $, MODELS, api, el, fillSelect, fmt, highlight, int } from './util.js';

const PAGE = 25;
let facets = {};
let offset = 0;
let timer;

export async function init() {
  const [f, stats] = await Promise.all([api('/api/facets'), api('/api/stats')]);
  facets = f;

  $('#ds-lede').textContent =
    `${int(stats.total)} cặp hỏi–đáp trên ${int(stats.contexts)} đoạn ngữ cảnh. ` +
    `Đáp án trung bình ${stats.answerLengthAvg} ký tự, ngữ cảnh trung bình ${stats.contextLengthAvg} ký tự. ` +
    `Train ${int(stats.bySplit.train)} · dev ${int(stats.bySplit.dev)} · test ${int(stats.bySplit.test)}.`;

  fillSelect($('#ds-grade'), (facets.grades || []).map((g) => ({ value: g, label: `Lớp ${g}` })), { placeholder: 'Tất cả' });
  fillSelect($('#ds-topic'), facets.topics || [], { placeholder: 'Tất cả' });
  fillSelect($('#ds-difficulty'), facets.difficulties || [], { placeholder: 'Tất cả' });
  fillSelect($('#ds-type'), facets.questionTypes || [], { placeholder: 'Tất cả' });
  fillSelect($('#ds-split'), facets.splits || [], { placeholder: 'Tất cả' });

  for (const id of ['#ds-grade', '#ds-topic', '#ds-difficulty', '#ds-type', '#ds-split']) {
    $(id).addEventListener('change', () => {
      offset = 0;
      load();
    });
  }
  $('#ds-q').addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      offset = 0;
      load();
    }, 220);
  });
  $('#ds-reset').addEventListener('click', () => {
    for (const id of ['#ds-q', '#ds-grade', '#ds-topic', '#ds-difficulty', '#ds-type', '#ds-split']) $(id).value = '';
    offset = 0;
    load();
  });

  load();
}

function query() {
  const params = new URLSearchParams({ limit: String(PAGE), offset: String(offset) });
  const map = {
    q: '#ds-q',
    grade: '#ds-grade',
    topic: '#ds-topic',
    difficulty: '#ds-difficulty',
    questionType: '#ds-type',
    split: '#ds-split',
  };
  for (const [key, sel] of Object.entries(map)) {
    const value = $(sel).value;
    if (value) params.set(key, value);
  }
  return params;
}

async function load() {
  const list = $('#ds-list');
  list.setAttribute('aria-busy', 'true');
  try {
    const data = await api(`/api/dataset?${query()}`);
    $('#ds-summary').textContent = data.total
      ? `${int(data.total)} câu khớp — đang xem ${int(data.offset + 1)}–${int(Math.min(data.offset + data.limit, data.total))}`
      : 'Không có câu nào khớp bộ lọc.';
    list.replaceChildren(...(data.items.length ? data.items.map(card) : [el('div', { class: 'empty-state', text: 'Thử bỏ bớt điều kiện lọc.' })]));
    renderPager(data);
  } catch (err) {
    list.replaceChildren(el('div', { class: 'alert alert-bad', text: err.message }));
  } finally {
    list.removeAttribute('aria-busy');
  }
}

function card(item) {
  const node = el('div', { class: 'qa-item' });
  node.append(
    el(
      'div',
      { class: 'qa-head' },
      el('div', { class: 'qa-q', text: item.question }),
      el(
        'div',
        { class: 'qa-tags' },
        el('span', { class: 'tag', text: `Lớp ${item.grade}` }),
        el('span', { class: 'tag', text: item.split }),
        el('span', { class: 'tag', text: item.difficulty }),
        el('span', { class: 'tag', text: item.questionType })
      )
    )
  );
  node.append(el('div', { class: 'qa-a', html: `Đáp án: <b>${item.answer}</b>` }));
  node.append(el('div', { class: 'qa-meta', text: `${item.id} · ${item.lesson} · trang ${item.page} · ${item.topic}` }));

  const ctx = el('details');
  ctx.append(el('summary', { text: 'Ngữ cảnh và vị trí đáp án' }));
  ctx.append(el('div', { class: 'context-box', html: highlight(item.context, item.answerStart, item.answerEnd) }));
  ctx.append(
    el('p', {
      class: 'cite',
      text: `ký tự ${item.answerStart}–${item.answerEnd} · ${item.contextId} · intent: ${item.intent || '—'}`,
    })
  );
  node.append(ctx);

  if (item.hasPredictions) {
    const preds = el('details');
    preds.append(el('summary', { text: 'Dự đoán của 6 mô hình' }));
    const slot = el('div', { class: 'loading', html: '<span class="spinner"></span> đang tải…' });
    preds.append(slot);
    preds.addEventListener(
      'toggle',
      async () => {
        if (!preds.open || preds.dataset.done) return;
        preds.dataset.done = '1';
        try {
          const row = await api(`/api/testset/${encodeURIComponent(item.id)}`);
          slot.replaceWith(predTable(row));
        } catch (err) {
          slot.replaceWith(el('p', { class: 'note', text: err.message }));
        }
      },
      { once: false }
    );
    node.append(preds);
  }
  return node;
}

function predTable(row) {
  return el(
    'div',
    { class: 'table-scroll' },
    el(
      'table',
      { class: 'table' },
      el('thead', {}, el('tr', {}, el('th', { text: 'Mô hình' }), el('th', { text: 'Trả lời' }), el('th', { text: 'EM' }), el('th', { text: 'F1' }))),
      el(
        'tbody',
        {},
        MODELS.map((m) => {
          const p = row.preds[m.key] || {};
          return el(
            'tr',
            {},
            el('td', {}, el('span', { class: 'mdl' }, el('span', { class: 'swatch', style: `background:${m.color}` }), m.label)),
            el('td', { style: 'text-align:left;white-space:normal', text: p.answer || '—' }),
            el('td', { class: 'num', text: p.em == null ? '—' : p.em ? '✓' : '✗' }),
            el('td', { class: `num ${p.f1 === 1 ? 'best' : ''}`, text: p.f1 == null ? '—' : fmt(p.f1, 2) })
          );
        })
      )
    )
  );
}

function renderPager(data) {
  const page = Math.floor(data.offset / data.limit) + 1;
  const pages = Math.max(Math.ceil(data.total / data.limit), 1);
  $('#ds-pager').replaceChildren(
    el('button', {
      class: 'btn',
      type: 'button',
      disabled: data.offset === 0,
      text: '← Trước',
      onclick: () => {
        offset = Math.max(offset - PAGE, 0);
        load();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
    }),
    el('span', { text: `Trang ${page} / ${pages}` }),
    el('button', {
      class: 'btn',
      type: 'button',
      disabled: data.offset + data.limit >= data.total,
      text: 'Sau →',
      onclick: () => {
        offset += PAGE;
        load();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
    })
  );
}
