// Client goi API dang chay tren Hugging Face Space.

const BASE = (process.env.HF_SPACE_URL || '').replace(/\/+$/, '');
const TOKEN = process.env.HF_TOKEN || '';
const TIMEOUT = Number(process.env.HF_TIMEOUT_MS || 120000);

export const isConfigured = () => Boolean(BASE);
export const spaceUrl = () => BASE || null;

export class SpaceError extends Error {
  constructor(message, status, detail) {
    super(message);
    this.name = 'SpaceError';
    this.status = status;
    this.detail = detail;
  }
}

export async function call(pathname, { method = 'GET', body } = {}) {
  if (!BASE) {
    throw new SpaceError(
      'Chưa cấu hình HF_SPACE_URL — đặt biến môi trường rồi khởi động lại.',
      503
    );
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT);
  const headers = { Accept: 'application/json' };
  if (body) headers['Content-Type'] = 'application/json';
  if (TOKEN) headers.Authorization = `Bearer ${TOKEN}`;

  try {
    const res = await fetch(`${BASE}${pathname}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    const text = await res.text();
    let payload;
    try {
      payload = text ? JSON.parse(text) : {};
    } catch {
      payload = { raw: text.slice(0, 500) };
    }
    if (!res.ok) {
      const reason =
        payload?.detail || payload?.error || payload?.raw || `Space trả về ${res.status} ${res.statusText}`;
      throw new SpaceError(typeof reason === 'string' ? reason : JSON.stringify(reason), res.status, payload);
    }
    return payload;
  } catch (err) {
    if (err instanceof SpaceError) throw err;
    if (err.name === 'AbortError') {
      throw new SpaceError(
        `Space không trả lời trong ${Math.round(TIMEOUT / 1000)}s — Space đang ngủ hoặc mô hình đang tải lần đầu. Thử lại sau ít phút.`,
        504
      );
    }
    throw new SpaceError(`Không kết nối được Space: ${err.message}`, 502);
  } finally {
    clearTimeout(timer);
  }
}

export const health = () => call('/health');
export const models = () => call('/models');
export const predict = (payload) => call('/predict', { method: 'POST', body: payload });
export const data = (pathname) => call(`/data${pathname}`);
