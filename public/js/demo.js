// Tab "Hoi bai" — che do don gian cho hoc sinh.

import { $, MODELS, api, el, fillSelect, int, loading, post, toast } from './util.js';
import { contextBlock, modeSummary, resultCard, spaceErrorBox } from './results-view.js';

// Thu tu uu tien khi chon cau tra loi hien thi lon: trich xuat tot nhat truoc
const PRIMARY_ORDER = ['phobert', 'xlmr', 'vit5', 'bartpho', 'mbert', 'gpt'];

let lessonTree = [];
let busy = false;

export async function init() {
  const { grades } = await api('/api/lessons');
  lessonTree = grades;

  const gradeSelect = $('#demo-grade');
  fillSelect(gradeSelect, grades.map((g) => ({ value: g.grade, label: `Lớp ${g.grade}` })));
  gradeSelect.addEventListener('change', () => {
    refreshLessons();
    loadSuggestions();
  });
  refreshLessons();
  loadSuggestions();

  $('#demo-ask').addEventListener('click', ask);
  $('#demo-question').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') ask();
  });
  $('#demo-random').addEventListener('click', loadSuggestions);
}

function currentGrade() {
  return Number($('#demo-grade').value);
}

function refreshLessons() {
  const node = lessonTree.find((g) => g.grade === currentGrade());
  const options = [];
  for (const topic of node?.topics || []) {
    for (const lesson of topic.lessons) {
      options.push({ value: lesson.lesson, label: `${lesson.lesson} — ${lesson.questions} câu` });
    }
  }
  fillSelect($('#demo-lesson'), options, { placeholder: 'Tất cả bài của lớp này' });
}

async function loadSuggestions() {
  const box = $('#demo-suggestions');
  box.innerHTML = '';
  try {
    const picks = await Promise.all([
      api(`/api/sample?grade=${currentGrade()}`),
      api(`/api/sample?grade=${currentGrade()}`),
      api(`/api/sample?grade=${currentGrade()}`),
    ]);
    const seen = new Set();
    for (const item of picks) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      box.append(
        el('button', {
          class: 'chip',
          type: 'button',
          title: item.question,
          text: item.question,
          onclick: () => {
            $('#demo-question').value = item.question;
            ask();
          },
        })
      );
    }
  } catch {
    /* goi y la phu, loi thi bo qua */
  }
}

async function ask() {
  if (busy) return;
  const question = $('#demo-question').value.trim();
  if (!question) {
    toast('Em hãy gõ câu hỏi trước nhé.');
    return;
  }

  const target = $('#demo-result');
  target.hidden = false;
  target.replaceChildren(loading('Đang tìm trong sách giáo khoa và hỏi các mô hình…'));
  busy = true;
  $('#demo-ask').disabled = true;

  try {
    const payload = await post('/api/predict', {
      question,
      grade: currentGrade(),
      lesson: $('#demo-lesson').value || undefined,
      models: ['phobert', 'xlmr', 'vit5', 'bartpho'],
    });
    render(target, question, payload);
  } catch (err) {
    target.replaceChildren(spaceErrorBox(err.message));
  } finally {
    busy = false;
    $('#demo-ask').disabled = false;
  }
}

function render(target, question, payload) {
  const usable = payload.results.filter((r) => r.answer);
  const primary =
    PRIMARY_ORDER.map((key) => usable.find((r) => r.model === key)).find(Boolean) || payload.results[0];

  const card = el('div', { class: 'card card-pad' });
  card.append(
    el(
      'div',
      { class: 'answer-hero' },
      el('span', { class: 'label', text: 'Câu trả lời' }),
      el('span', {
        class: 'value',
        text: primary?.answer || 'Chưa tìm được câu trả lời trong bài học này.',
      })
    )
  );
  if (primary?.answer) {
    card.append(
      el(
        'div',
        { class: 'answer-meta' },
        el('span', { class: 'tag', text: `theo ${primary.label}` }),
        payload.gold && payload.gold !== primary.answer
          ? el('span', { class: 'tag', text: `đáp án chuẩn: ${payload.gold}` })
          : null
      )
    );
  }
  card.append(el('p', { class: 'note', text: `Câu hỏi: ${question}` }));

  const ctxCard = el('div', { class: 'card card-pad' });
  ctxCard.append(el('h2', { class: 'h2', text: 'Đoạn sách chứa câu trả lời' }));
  ctxCard.append(contextBlock(payload.context, primary?.char_start, primary?.char_end, payload.source));

  if (payload.retrieved?.length > 1) {
    const others = el('details', {}, el('summary', { text: `${payload.retrieved.length - 1} đoạn khác cũng gần nghĩa` }));
    const list = el('div', { class: 'stack' });
    for (const hit of payload.retrieved.slice(1)) {
      list.append(contextBlock(hit.context, null, null, hit));
    }
    others.append(list);
    ctxCard.append(others);
  }

  const detail = el('details', { class: 'card card-pad' });
  detail.append(el('summary', { text: `Các mô hình trả lời thế nào (${modeSummary(payload.results)})` }));
  detail.append(
    el('div', { class: 'result-grid', style: 'margin-top:11px' }, payload.results.map((r) => resultCard(r, { gold: payload.gold })))
  );

  target.replaceChildren(card, ctxCard, detail);
}

export { int, MODELS };
