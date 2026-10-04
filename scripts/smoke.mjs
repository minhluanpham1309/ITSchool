#!/usr/bin/env node
// Kiem tra nhanh moi endpoint cua backend dang chay.
//   node scripts/smoke.mjs [http://localhost:3000]

const base = (process.argv[2] || `http://localhost:${process.env.PORT || 3000}`).replace(/\/+$/, '');

const checks = [
  ['GET', '/api/health'],
  ['GET', '/api/stats'],
  ['GET', '/api/facets'],
  ['GET', '/api/metrics'],
  ['GET', '/api/models'],
  ['GET', '/api/lessons'],
  ['GET', '/api/errors'],
  ['GET', '/api/sample'],
  ['GET', '/api/dataset?grade=3&limit=2'],
  ['GET', '/api/retrieve?q=USB&grade=3'],
  ['GET', '/'],
];

let failed = 0;
for (const [method, pathname] of checks) {
  try {
    const res = await fetch(base + pathname, { method });
    if (!res.ok) failed += 1;
    console.log(`${res.ok ? 'ok ' : 'LOI'} ${String(res.status).padEnd(4)} ${method} ${pathname}`);
  } catch (err) {
    failed += 1;
    console.log(`LOI  ---  ${method} ${pathname} — ${err.message}`);
  }
}

try {
  const res = await fetch(`${base}/api/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question: 'USB là loại thiết bị gì?', grade: 3, models: ['phobert'] }),
  });
  const data = await res.json();
  console.log(
    res.ok
      ? `ok  200  POST /api/predict — ${data.results?.[0]?.mode}: "${data.results?.[0]?.answer}"`
      : `LOI ${res.status}  POST /api/predict — ${data.error}`
  );
  if (!res.ok) failed += 1;
} catch (err) {
  failed += 1;
  console.log(`LOI  ---  POST /api/predict — ${err.message}`);
}

console.log(failed ? `\n${failed} endpoint loi.` : '\nTat ca endpoint deu ok.');
process.exit(failed ? 1 : 0);
