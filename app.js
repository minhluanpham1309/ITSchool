// Express app: phuc vu giao dien tinh va lam proxy sang HF Space.
// Khoa API cua Space khong bao gio ra toi trinh duyet.

import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import * as hf from './lib/hf.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MODEL_KEYS = ['phobert', 'mbert', 'xlmr', 'vit5', 'bartpho', 'gpt'];

const app = express();
app.use(express.json({ limit: '256kb' }));
app.use(express.static(path.join(HERE, 'public'), { maxAge: '1h' }));

const fail = (res, err) => {
  const status = err?.status >= 400 && err.status < 600 ? err.status : 500;
  res.status(status).json({ error: err?.message || 'Lỗi không xác định' });
};

/** Chuyen thang mot duong dan /data/* cua Space ra /api/*. */
const proxy = (apiPath, spacePath) =>
  app.get(apiPath, async (req, res) => {
    const qs = new URLSearchParams(req.query).toString();
    const target = typeof spacePath === 'function' ? spacePath(req) : spacePath;
    try {
      res.json(await hf.data(qs ? `${target}?${qs}` : target));
    } catch (err) {
      fail(res, err);
    }
  });

// ----------------------------------------------------------------- trang thai
app.get('/api/health', async (_req, res) => {
  const base = { web: 'ok', space: { configured: hf.isConfigured(), url: hf.spaceUrl() } };
  if (!hf.isConfigured()) return res.json(base);
  try {
    base.space.health = await hf.health();
    base.space.reachable = true;
  } catch (err) {
    base.space.reachable = false;
    base.space.error = err.message;
  }
  res.json(base);
});

// ------------------------------------------------------------------- mo hinh
app.get('/api/models', async (_req, res) => {
  try {
    const [remote, metrics] = await Promise.all([hf.models(), hf.data('/metrics')]);
    res.json({
      models: (metrics.models || []).map((m) => ({
        ...m,
        space: remote.models?.find((r) => r.model === m.key) || null,
      })),
      spaceConfigured: true,
    });
  } catch (err) {
    fail(res, err);
  }
});

// ------------------------------------------------------------------ suy dien
app.post('/api/predict', async (req, res) => {
  const question = String(req.body?.question || '').trim();
  const context = String(req.body?.context || '').trim();
  const models = Array.isArray(req.body?.models)
    ? req.body.models.filter((m) => MODEL_KEYS.includes(m))
    : MODEL_KEYS;

  if (!question) return res.status(400).json({ error: 'Thiếu câu hỏi.' });
  if (!models.length) return res.status(400).json({ error: 'Chưa chọn mô hình nào.' });

  try {
    res.json(
      await hf.predict({
        question,
        context: context || undefined,
        models,
        grade: req.body?.grade ?? undefined,
        lesson: req.body?.lesson || undefined,
        topic: req.body?.topic || undefined,
      })
    );
  } catch (err) {
    fail(res, err);
  }
});

// ---------------------------------------------------------------- du lieu web
proxy('/api/metrics', '/metrics');
proxy('/api/stats', '/stats');
proxy('/api/facets', '/facets');
proxy('/api/lessons', '/lessons');
proxy('/api/errors', '/errors');
proxy('/api/dataset', '/dataset');
proxy('/api/sample', '/sample');
proxy('/api/retrieve', '/retrieve');
proxy('/api/dataset/:id', (req) => `/dataset/${encodeURIComponent(req.params.id)}`);
proxy('/api/testset/:id', (req) => `/testset/${encodeURIComponent(req.params.id)}`);

app.use('/api', (_req, res) => res.status(404).json({ error: 'Không có endpoint này.' }));

export default app;
