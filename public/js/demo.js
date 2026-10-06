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

  // Phan biet hai truong hop rat khac nhau: chua co checkpoint, va mo hinh khong tim ra
  const noCheckpoint = !usable.length && payload.results.every((r) => r.mode === 'unavailable');
  // Cau hoi co trong sach nhung thuc nghiem khong sinh du doan (tap train/dev)
  const book = noCheckpoint ? payload.textbook : null;

  const card = el('div', { class: 'card card-pad' });
  card.append(
    el(
      'div',
      { class: 'answer-hero' },
      el('span', { class: 'label', text: 'Câu trả lời' }),
      el('span', {
        class: 'value',
        text:
          primary?.answer ||
          book?.answer ||
          (noCheckpoint
            ? 'Câu này chưa trả lời được.'
            : 'Chưa tìm được câu trả lời trong bài học này.'),
      })
    )
  );

  if (book) {
    card.append(
      el(
        'div',
        { class: 'answer-meta' },
        el('span', { class: 'tag tag-recorded', text: 'đáp án trong sách giáo khoa' }),
        el('span', { class: 'tag', text: `${book.lesson} · trang ${book.page}` })
      )
    );
    card.append(
      el('p', {
        class: 'note',
        text:
          `Câu này nằm ở tập ${book.split} của bộ dữ liệu. Thực nghiệm chỉ sinh dự đoán cho 1.073 câu ` +
          'tập test, nên đây là đáp án chuẩn trong sách chứ không phải mô hình trả lời.',
      })
    );
  } else if (noCheckpoint) {
    card.append(
      el('p', {
        class: 'note',
        text:
          'Hệ thống chưa nạp checkpoint đã fine-tune, nên hiện chỉ trả lời được các câu có sẵn trong bộ dữ liệu. ' +
          'Câu em vừa hỏi không khớp câu nào.',
      })
    );
    if (payload.suggestions?.length) {
      const chips = el('div', { class: 'chips' }, el('span', { class: 'note', text: 'Thử câu gần giống:' }));
      const list = el('span', { class: 'chip-list' });
      for (const s of payload.suggestions) {
        list.append(
          el('button', {
            class: 'chip',
            type: 'button',
            title: `${s.lesson} — đáp án: ${s.gold}`,
            text: s.question,
            onclick: () => {
              $('#demo-question').value = s.question;
              $('#demo-ask').click();
            },
          })
        );
      }
      chips.append(list);
      card.append(chips);
    }
  }

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
  ctxCard.append(
    el('h2', {
      class: 'h2',
      text: noCheckpoint && !book ? 'Đoạn sách gần nghĩa nhất' : 'Đoạn sách chứa câu trả lời',
    })
  );
  ctxCard.append(
    book
      ? contextBlock(book.context, book.answerStart, book.answerEnd, {
          lesson: book.lesson,
          page: book.page,
          section: book.section,
        })
      : contextBlock(payload.context, primary?.char_start, primary?.char_end, payload.source)
  );

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
