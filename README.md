# ITSchool-V1.0 — giao diện hỏi đáp môn Tin học lớp 3–5

Giao diện web cho bài FAIR 2026 *"Developing an Automatic Question Answering System
for Primary-Level Informatics Using Transformer Models"*.

Ứng dụng này **không giữ dữ liệu và không chạy mô hình**. Toàn bộ nằm ở một
Hugging Face Space; Node.js chỉ phục vụ giao diện và làm proxy, nên khoá API của
Space không bao giờ ra tới trình duyệt.

```
trình duyệt  ──►  Vercel (Express)  ──►  HF Space (FastAPI)
                  giao diện + proxy      6 mô hình + dữ liệu
```

## Giao diện

Một trang duy nhất: chọn lớp và bài, gõ câu hỏi, nhận đáp án kèm đoạn sách và
trích dẫn trang. Mở phần "Các mô hình trả lời thế nào" để xem từng mô hình.

Thứ tự ưu tiên khi trả lời:

1. Câu nằm trong tập test → dự đoán thật của 6 mô hình từ thực nghiệm
2. Câu nằm trong tập train/dev → đáp án chuẩn trong sách giáo khoa
3. Câu hoàn toàn mới → ba gợi ý câu gần nghĩa trong bộ dữ liệu

Mức 3 chỉ biến mất khi Space đã nạp checkpoint fine-tune.

## Chạy cục bộ

```bash
npm install
cp .env.example .env     # điền HF_SPACE_URL
npm start                # http://localhost:3000
npm run smoke            # kiểm tra mọi endpoint
```

## Deploy lên Vercel

1. Push repo này lên GitHub.
2. Vào vercel.com → **Add New → Project** → chọn repo. Vercel tự nhận ra đây là
   project không framework: `public/` thành file tĩnh, `api/[...path].js` thành
   Serverless Function.
3. Ở **Environment Variables** thêm:

   | Biến | Giá trị |
   |---|---|
   | `HF_SPACE_URL` | `https://<user>-<space>.hf.space` |
   | `HF_TOKEN` | chỉ cần nếu Space để private |

4. **Deploy**. Mỗi lần push lên nhánh chính là Vercel tự deploy lại.

Đổi biến môi trường sau khi đã deploy thì phải **Redeploy** mới có hiệu lực.

## Biến môi trường

| Biến | Mặc định | Việc |
|---|---|---|
| `HF_SPACE_URL` | — | bắt buộc, URL của Space |
| `HF_TOKEN` | — | chỉ cần cho Space private |
| `HF_TIMEOUT_MS` | `120000` | Space free ngủ sau 48h, lần gọi đầu mất 1–2 phút |
| `PORT` | `3000` | chỉ dùng khi chạy cục bộ |

## Cấu trúc

```
app.js              Express app — static + proxy (dùng chung cho cục bộ và Vercel)
server.js           chạy cục bộ: nạp app.js rồi listen
api/[...path].js    Vercel Serverless Function, bắt mọi /api/*
lib/hf.js           client gọi Space, có timeout và thông báo lỗi tiếng Việt
public/             giao diện — HTML/CSS/JS thuần, không build step
scripts/smoke.mjs   gọi lần lượt mọi endpoint
vercel.json         giới hạn 60s cho function, không cache /api/*
```

Không có bước build và không có dependency nào ngoài Express.

## API

Mọi endpoint đều trả JSON. `/api/predict` nhận POST; còn lại là GET.

| Đường dẫn | Việc |
|---|---|
| `GET /api/health` | trạng thái web + Space |
| `GET /api/models` | 6 mô hình, chỉ số trong bài báo, chế độ hiện tại |
| `POST /api/predict` | `{question, context?, models?, grade?, lesson?}` — bỏ trống `context` thì Space tự truy xuất đoạn sách khớp nhất |
| `GET /api/metrics` · `/api/stats` · `/api/facets` · `/api/lessons` · `/api/errors` | dữ liệu thực nghiệm |
| `GET /api/dataset` | lọc theo `q`, `grade`, `topic`, `lesson`, `difficulty`, `questionType`, `split`, `limit`, `offset` |
| `GET /api/dataset/:id` · `/api/testset/:id` · `/api/sample` · `/api/retrieve` | tra cứu từng câu |

## Space

Code của Space nằm ngoài repo này (thư mục `space/` của dự án gốc). Badge góc trên
bên phải luôn cho biết Space đang ở chế độ nào: `live` (checkpoint đã fine-tune),
`recorded` (dự đoán đã ghi trong thực nghiệm), hay chưa gọi được.
