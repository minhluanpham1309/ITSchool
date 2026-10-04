// Bieu do SVG viet tay — khong thu vien ngoai.
// Mau theo entity (mo hinh), moi panel mot do do -> khong bao gio co hai truc y.

import { el, esc, fmt } from './util.js';

const NS = 'http://www.w3.org/2000/svg';
const svgEl = (tag, attrs = {}) => {
  const node = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v != null) node.setAttribute(k, String(v));
  return node;
};

function tooltip(container) {
  const tip = el('div', { class: 'chart-tip' });
  container.append(tip);
  return {
    show(x, y, html) {
      tip.innerHTML = html;
      tip.style.left = `${x}px`;
      tip.style.top = `${y}px`;
      tip.classList.add('on');
    },
    hide() {
      tip.classList.remove('on');
    },
  };
}

function bindHover(container, tip, node, html) {
  const move = (event) => {
    const box = container.getBoundingClientRect();
    tip.show(event.clientX - box.left, event.clientY - box.top, html);
  };
  node.addEventListener('pointermove', move);
  node.addEventListener('pointerenter', move);
  node.addEventListener('pointerleave', () => tip.hide());
}

export function legend(items) {
  return el(
    'div',
    { class: 'legend' },
    items.map((it) =>
      el(
        'span',
        { class: 'key' },
        el('span', { class: 'swatch', style: `background:${it.color}` }),
        it.label
      )
    )
  );
}

/**
 * Bieu do cot ngang, mot do do moi panel.
 * items: [{label, value, color, note}]
 */
export function barPanel({ title, items, max, unit = '%', labelWidth = 104 }) {
  const rowH = 30;
  const padTop = title ? 22 : 6;
  const padBottom = 20;
  const width = 420;
  const height = padTop + items.length * rowH + padBottom;
  const trackX = labelWidth;
  const trackW = width - labelWidth - 44;
  const top = Math.max(max ?? Math.max(...items.map((i) => i.value || 0)) * 1.15, 1);

  const container = el('div', { class: 'chart' });
  const tip = tooltip(container);
  const svg = svgEl('svg', { viewBox: `0 0 ${width} ${height}`, role: 'img', 'aria-label': title || 'bieu do cot' });

  if (title) {
    const label = svgEl('text', { x: 0, y: 11, class: 'axis-label' });
    label.setAttribute('style', 'font-weight:600;fill:var(--text-primary)');
    label.textContent = title;
    svg.append(label);
  }

  // luoi doc, lui ve sau
  for (let t = 0; t <= 4; t += 1) {
    const value = (top / 4) * t;
    const x = trackX + (trackW * t) / 4;
    svg.append(svgEl('line', { x1: x, y1: padTop, x2: x, y2: height - padBottom, class: t === 0 ? 'zero-line' : 'grid-line' }));
    const mark = svgEl('text', { x, y: height - padBottom + 13, class: 'axis-label', 'text-anchor': 'middle' });
    mark.textContent = Math.round(value);
    svg.append(mark);
  }

  items.forEach((item, idx) => {
    const y = padTop + idx * rowH;
    const barH = 14;
    const barY = y + (rowH - barH) / 2;
    const w = Math.max(((item.value || 0) / top) * trackW, item.value ? 3 : 0);

    const name = svgEl('text', { x: 0, y: barY + barH - 2, class: 'axis-label' });
    name.textContent = item.label;
    svg.append(name);

    const bar = svgEl('rect', {
      x: trackX,
      y: barY,
      width: w,
      height: barH,
      rx: 4,
      fill: item.color,
      class: 'bar',
    });
    svg.append(bar);

    const value = svgEl('text', {
      x: trackX + w + 7,
      y: barY + barH - 2,
      class: 'value-label',
    });
    value.textContent = `${fmt(item.value, 1)}${unit}`;
    svg.append(value);

    bindHover(
      container,
      tip,
      bar,
      `<div class="tip-title">${esc(item.label)}</div><div class="tip-row">${esc(title || '')} ${fmt(item.value, 2)}${unit}</div>${
        item.note ? `<div class="tip-row">${esc(item.note)}</div>` : ''
      }`
    );
  });

  container.prepend(svg);
  return container;
}

/**
 * Bieu do duong tren truc x roi rac (lop 3/4/5).
 * series: [{label, color, points: [{x, y}]}]
 */
export function linePanel({ title, series, xLabels, unit = '%', yMin, yMax }) {
  const width = 440;
  const height = 230;
  const pad = { top: title ? 26 : 10, right: 78, bottom: 26, left: 34 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const all = series.flatMap((s) => s.points.map((p) => p.y)).filter((v) => v != null);
  const lo = yMin ?? Math.floor((Math.min(...all) - 4) / 5) * 5;
  const hi = yMax ?? Math.ceil((Math.max(...all) + 4) / 5) * 5;
  const span = hi - lo || 1;

  const xAt = (i) => pad.left + (xLabels.length === 1 ? plotW / 2 : (plotW * i) / (xLabels.length - 1));
  const yAt = (v) => pad.top + plotH - ((v - lo) / span) * plotH;

  const container = el('div', { class: 'chart' });
  const tip = tooltip(container);
  const svg = svgEl('svg', { viewBox: `0 0 ${width} ${height}`, role: 'img', 'aria-label': title || 'bieu do duong' });

  if (title) {
    const label = svgEl('text', { x: 0, y: 12, class: 'axis-label' });
    label.setAttribute('style', 'font-weight:600;fill:var(--text-primary)');
    label.textContent = title;
    svg.append(label);
  }

  const ticks = 4;
  for (let t = 0; t <= ticks; t += 1) {
    const value = lo + (span / ticks) * t;
    const y = yAt(value);
    svg.append(svgEl('line', { x1: pad.left, y1: y, x2: pad.left + plotW, y2: y, class: 'grid-line' }));
    const mark = svgEl('text', { x: pad.left - 7, y: y + 3.5, class: 'axis-label', 'text-anchor': 'end' });
    mark.textContent = Math.round(value);
    svg.append(mark);
  }

  xLabels.forEach((label, i) => {
    const mark = svgEl('text', { x: xAt(i), y: height - pad.bottom + 16, class: 'axis-label', 'text-anchor': 'middle' });
    mark.textContent = label;
    svg.append(mark);
  });

  for (const s of series) {
    const points = s.points.filter((p) => p.y != null);
    if (points.length > 1) {
      svg.append(
        svgEl('path', {
          d: points.map((p, i) => `${i ? 'L' : 'M'}${xAt(p.x)} ${yAt(p.y)}`).join(' '),
          fill: 'none',
          stroke: s.color,
          'stroke-width': 2,
          'stroke-linecap': 'round',
          'stroke-linejoin': 'round',
        })
      );
    }
    for (const p of points) {
      svg.append(svgEl('circle', { cx: xAt(p.x), cy: yAt(p.y), r: 5.5, fill: s.color, stroke: 'var(--mark-ring)', 'stroke-width': 2 }));
      const hit = svgEl('circle', { cx: xAt(p.x), cy: yAt(p.y), r: 13, fill: 'transparent' });
      svg.append(hit);
      bindHover(
        container,
        tip,
        hit,
        `<div class="tip-title">${esc(s.label)}</div><div class="tip-row">Lớp ${esc(xLabels[p.x])} · ${fmt(p.y, 2)}${unit}</div>`
      );
    }
    // nhan truc tiep o diem cuoi
    const last = points.at(-1);
    if (last) {
      const text = svgEl('text', { x: xAt(last.x) + 10, y: yAt(last.y) + 3.5, class: 'axis-label' });
      text.setAttribute('style', 'fill:var(--text-primary);font-weight:600');
      text.textContent = s.label;
      svg.append(text);
    }
  }

  container.prepend(svg);
  return container;
}
