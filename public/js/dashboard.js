// Tab "Ket qua thuc nghiem".

import { barPanel, legend, linePanel } from './charts.js';
import { $, MODELS, api, byLabel, el, fmt, int } from './util.js';

const EXTRACTIVE = MODELS.filter((m) => m.kind === 'extractive');
const GENERATIVE = MODELS.filter((m) => m.kind === 'generative');

export async function init() {
  const [metrics, stats, errors] = await Promise.all([
    api('/api/metrics'),
    api('/api/stats'),
    api('/api/errors'),
  ]);

  renderTiles(metrics, stats);
  renderExtractive(metrics);
  renderGenerative(metrics);
  renderPerGrade(metrics);
  renderTable(metrics);
  renderErrors(errors.groups);
  renderLeakage(metrics);
}

const metricOf = (metrics, label) => metrics.models.find((m) => m.label === label) || {};

function renderTiles(metrics, stats) {
  const best = metrics.models.filter((m) => m.f1 != null).sort((a, b) => b.f1 - a.f1)[0];
  const bestGen = metrics.models.filter((m) => m.rougeL != null).sort((a, b) => b.rougeL - a.rougeL)[0];

  const tiles = [
    { label: 'Cặp hỏi–đáp', value: int(stats.total), sub: `${int(stats.contexts)} đoạn ngữ cảnh` },
    { label: 'Tập test', value: int(metrics.counts.test), sub: `train ${int(metrics.counts.train)} · dev ${int(metrics.counts.dev)}` },
    { label: 'Trích xuất tốt nhất', value: `${fmt(best.f1, 1)}%`, sub: `${best.label} · F1 (EM ${fmt(best.em, 1)}%)` },
    { label: 'Sinh tạo tốt nhất', value: `${fmt(bestGen.rougeL, 1)}%`, sub: `${bestGen.label} · ROUGE-L (BLEU ${fmt(bestGen.bleu, 1)})` },
    { label: 'Rò rỉ ngữ cảnh', value: '0%', sub: `chia theo ${int(metrics.split.contextClusters)} nhóm ngữ cảnh` },
  ];

  $('#dash-tiles').replaceChildren(
    ...tiles.map((t) =>
      el(
        'div',
        { class: 'tile' },
        el('div', { class: 'tile-label', text: t.label }),
        el('div', { class: 'tile-value', text: t.value }),
        el('div', { class: 'tile-sub', text: t.sub })
      )
    )
  );
}

function renderExtractive(metrics) {
  const items = (key) =>
    EXTRACTIVE.map((m) => ({ label: m.label, value: metricOf(metrics, m.label)[key], color: m.color }));
  $('#chart-extractive').replaceChildren(
    barPanel({ title: 'EM — khớp tuyệt đối', items: items('em'), max: 100 }),
    barPanel({ title: 'F1 — khớp từng từ', items: items('f1'), max: 100 }),
    legend(EXTRACTIVE)
  );
}

function renderGenerative(metrics) {
  const items = (key) =>
    GENERATIVE.map((m) => ({ label: m.label, value: metricOf(metrics, m.label)[key], color: m.color }));
  $('#chart-generative').replaceChildren(
    barPanel({ title: 'BLEU', items: items('bleu'), max: 100, unit: '' }),
    barPanel({ title: 'ROUGE-L', items: items('rougeL'), max: 100 }),
    legend(GENERATIVE)
  );
}

function renderPerGrade(metrics) {
  const grades = [...new Set(metrics.perGrade.map((r) => r.grade))].sort((a, b) => a - b);
  const seriesFor = (group, key) =>
    group.map((m) => ({
      label: m.label,
      color: m.color,
      points: grades.map((g, i) => {
        const row = metrics.perGrade.find((r) => r.label === m.label && r.grade === g);
        return { x: i, y: row ? row[key] : null };
      }),
    }));

  const wrap = el(
    'div',
    { class: 'grid-2' },
    el(
      'div',
      {},
      linePanel({
        title: 'Trích xuất — F1 theo lớp',
        series: seriesFor(EXTRACTIVE, 'f1'),
        xLabels: grades.map(String),
      })
    ),
    el(
      'div',
      {},
      linePanel({
        title: 'Sinh tạo — ROUGE-L theo lớp',
        series: seriesFor(GENERATIVE, 'rougeL'),
        xLabels: grades.map(String),
      })
    )
  );
  $('#chart-grade').replaceChildren(wrap, legend(MODELS));
}

function renderTable(metrics) {
  const cols = [
    { key: 'em', label: 'EM' },
    { key: 'f1', label: 'F1' },
    { key: 'bleu', label: 'BLEU' },
    { key: 'rougeL', label: 'ROUGE-L' },
  ];
  const best = {};
  for (const c of cols) {
    best[c.key] = Math.max(...metrics.models.map((m) => m[c.key] ?? -1));
  }

  const table = $('#dash-table');
  table.replaceChildren(
    el(
      'thead',
      {},
      el(
        'tr',
        {},
        el('th', { text: 'Mô hình' }),
        el('th', { text: 'Hướng' }),
        ...cols.map((c) => el('th', { text: c.label }))
      )
    ),
    el(
      'tbody',
      {},
      metrics.models.map((m) => {
        const meta = byLabel(m.label);
        return el(
          'tr',
          {},
          el('td', {}, el('span', { class: 'mdl' }, el('span', { class: 'swatch', style: `background:${meta?.color}` }), m.label)),
          el('td', { style: 'text-align:left', text: m.kind === 'extractive' ? 'Trích xuất' : 'Sinh tạo' }),
          ...cols.map((c) =>
            el('td', {
              class: `num ${m[c.key] == null ? 'dash' : m[c.key] === best[c.key] ? 'best' : ''}`,
              text: m[c.key] == null ? '—' : fmt(m[c.key], 2),
            })
          )
        );
      })
    )
  );
}

function renderErrors(groups) {
  const box = $('#dash-errors');
  box.replaceChildren(
    ...groups.map((group) => {
      const details = el('details');
      details.append(
        el(
          'summary',
          {},
          el('span', { text: group.group }),
          el('span', { class: 'count', text: `${group.items.length} câu` })
        )
      );
      const body = el('div', { class: 'acc-body' });
      for (const item of group.items) {
        const rows = MODELS.map((m) => {
          const pred = item.preds[m.key] || {};
          return el(
            'tr',
            {},
            el('td', {}, el('span', { class: 'mdl' }, el('span', { class: 'swatch', style: `background:${m.color}` }), m.label)),
            el('td', { style: 'text-align:left;white-space:normal', text: pred.answer || '—' }),
            el('td', { class: `num ${pred.f1 === 1 ? 'best' : ''}`, text: pred.f1 == null ? '—' : fmt(pred.f1, 2) })
          );
        });
        body.append(
          el(
            'div',
            {},
            el('div', { class: 'qa-q', text: item.question }),
            el('div', { class: 'qa-meta', text: `${item.id} · Lớp ${item.grade} · ${item.lesson}` }),
            el('div', { class: 'qa-a', html: `Đáp án chuẩn: <b>${item.gold}</b>` }),
            el(
              'div',
              { class: 'table-scroll' },
              el(
                'table',
                { class: 'table' },
                el('thead', {}, el('tr', {}, el('th', { text: 'Mô hình' }), el('th', { text: 'Trả lời' }), el('th', { text: 'F1' }))),
                el('tbody', {}, rows)
              )
            ),
            el('details', {}, el('summary', { text: 'Ngữ cảnh' }), el('div', { class: 'context-box', text: item.context }))
          )
        );
      }
      details.append(body);
      return details;
    })
  );
}

function renderLeakage(metrics) {
  const rows = ['dev', 'test'].map((split) => {
    const d = metrics.split.leakage[split] || {};
    return el(
      'tr',
      {},
      el('td', { text: split }),
      el('td', { class: 'num', text: int(d.n) }),
      el('td', { class: 'num best', text: `${fmt(d.context_overlap_pct, 1)}%` }),
      el('td', { class: 'num best', text: `${fmt(d.qa_pair_overlap_pct, 1)}%` }),
      el('td', { class: 'num', text: `${fmt(d.question_overlap_pct, 1)}%` }),
      el('td', { class: 'num', text: `${fmt(d.answer_string_overlap_pct, 1)}%` })
    );
  });

  $('#dash-leak').replaceChildren(
    el(
      'thead',
      {},
      el(
        'tr',
        {},
        el('th', { text: 'Tập' }),
        el('th', { text: 'Số câu' }),
        el('th', { text: 'Trùng ngữ cảnh' }),
        el('th', { text: 'Trùng cặp (hỏi, đáp)' }),
        el('th', { text: 'Trùng câu hỏi' }),
        el('th', { text: 'Trùng chuỗi đáp án' })
      )
    ),
    el('tbody', {}, rows)
  );
}
