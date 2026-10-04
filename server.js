// Chay cuc bo. Tren Vercel thi api/[...path].js nap thang app.js, khong qua file nay.

import app from './app.js';
import * as hf from './lib/hf.js';

const PORT = Number(process.env.PORT || 3000);

app.listen(PORT, () => {
  console.log(`\n  ITSchool-V1.0 — http://localhost:${PORT}`);
  console.log(
    hf.isConfigured()
      ? `  HF Space: ${hf.spaceUrl()}`
      : '  HF Space: CHUA CAU HINH — dat HF_SPACE_URL trong web/.env\n'
  );
});
