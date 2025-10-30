import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

const pages = [
  // 👇あなたのローカル開発URLに合わせて変更
  { name: 'home-desktop', url: 'http://localhost:5173/', width: 1440, height: 900 },
  { name: 'home-mobile',  url: 'http://localhost:5173/', width: 430,  height: 844 },
];

const OUT = 'reports';
const BASE = 'reports/baseline';
const CURR = 'reports/current';
const DIFF = 'reports/diff';
fs.mkdirSync(BASE, { recursive: true });
fs.mkdirSync(CURR, { recursive: true });
fs.mkdirSync(DIFF, { recursive: true });

const fmt = (n) => new Intl.DateTimeFormat('ja-JP', { dateStyle:'short', timeStyle:'medium' }).format(n);
const lines = [];
lines.push(`# Visual Report`);
lines.push(`生成: ${fmt(new Date())}\n`);

const browser = await chromium.launch();
const ctx = await browser.newContext();

for (const p of pages) {
  const page = await ctx.newPage();
  await page.setViewportSize({ width: p.width, height: p.height });
  await page.goto(p.url, { waitUntil: 'networkidle' });

  // 必要に応じて描画安定化（例：Webフォント待機）
  await page.waitForTimeout(300); 

  const currPng = path.join(CURR, `${p.name}.png`);
  await page.screenshot({ path: currPng, fullPage: true });
  await page.close();

  const basePng = path.join(BASE, `${p.name}.png`);
  if (!fs.existsSync(basePng)) {
    fs.copyFileSync(currPng, basePng);
    lines.push(`## ${p.name}\n- Baseline が無かったため作成。\n- 差分: 0.00%`);
    continue;
  }

  const img1 = PNG.sync.read(fs.readFileSync(basePng));
  const img2 = PNG.sync.read(fs.readFileSync(currPng));

  // 画像サイズ差異を吸収（オプション：ここでは小さい方に合わせる簡易処理）
  const width  = Math.min(img1.width, img2.width);
  const height = Math.min(img1.height, img2.height);
  const crop = (png) => {
    if (png.width === width && png.height === height) return png;
    const cropped = new PNG({ width, height });
    PNG.bitblt(png, cropped, 0, 0, width, height, 0, 0);
    return cropped;
  };
  const A = crop(img1);
  const B = crop(img2);

  const diff = new PNG({ width, height });
  const mismatches = pixelmatch(A.data, B.data, diff.data, width, height, { threshold: 0.1 });
  const ratio = (mismatches / (width * height)) * 100;
  const diffPng = path.join(DIFF, `${p.name}.png`);
  fs.writeFileSync(diffPng, PNG.sync.write(diff));

  lines.push(`## ${p.name}`);
  lines.push(`- 差分率: ${ratio.toFixed(2)}%`);
  lines.push(`- 画像:`);
  lines.push(`  - Baseline: ${path.relative(OUT, basePng)}`);
  lines.push(`  - Current : ${path.relative(OUT, currPng)}`);
  lines.push(`  - Diff    : ${path.relative(OUT, diffPng)}\n`);
}

await browser.close();
fs.writeFileSync(path.join(OUT, 'report.md'), lines.join('\n'));
console.log('✅ reports/report.md を生成しました');
