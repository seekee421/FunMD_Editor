// @ts-nocheck
import * as fs from 'fs';
import * as path from 'path';

// 环境变量用于配置后端与身份信息
const BACKEND_BASE_URL = process.env.BACKEND_BASE_URL || 'http://localhost:8080';
const DOCUMENT_ID = Number(process.env.DOCUMENT_ID || 1);
const JWT_TOKEN = process.env.JWT_TOKEN || '<your-jwt-token>';

async function main() {
  const filePath = path.resolve(
    '/Users/fanyang/Desktop/FunMD/CMS/frontend/FunMD_Editor_V2/data/11.yjs'
  );
  if (!fs.existsSync(filePath)) {
    console.error('Yjs文件不存在:', filePath);
    process.exit(1);
  }
  const buffer = fs.readFileSync(filePath);
  const version = 'v' + Date.now();

  const url = `${BACKEND_BASE_URL}/api/documents/${DOCUMENT_ID}/yjs/snapshots?version=${encodeURIComponent(version)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/octet-stream',
      'Authorization': `Bearer ${JWT_TOKEN}`,
    },
    body: buffer,
  });

  if (!res.ok) {
    const text = await res.text();
    console.error('Upload failed:', res.status, text);
    process.exit(1);
  }

  const json = await res.json();
  console.log('Uploaded snapshot:', json);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});