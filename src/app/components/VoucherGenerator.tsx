'use client';

import { useState, useRef, useEffect } from 'react';

type Company = 'smartSky' | 'binyanEitan';

interface Employee {
  name: string;
  amount: number;
  company: Company;
}

const SMART_SKY: Employee[] = [
  { name: 'שעיה שחר',      amount: 500, company: 'smartSky' },
  { name: 'עקיבא טואיטו',  amount: 500, company: 'smartSky' },
  { name: 'נחמיה גאל-דור', amount: 500, company: 'smartSky' },
  { name: 'אברהם טרגנו',   amount: 500, company: 'smartSky' },
  { name: 'אברהם ברונר',   amount: 500, company: 'smartSky' },
  { name: 'דוד חדד',       amount: 500, company: 'smartSky' },
  { name: 'אלי מילר',      amount: 500, company: 'smartSky' },
  { name: 'אלי וולף',      amount: 500, company: 'smartSky' },
];

const BINYAN_EITAN: Employee[] = [
  { name: 'אלכס גרודקה',     amount: 500, company: 'binyanEitan' },
  { name: 'עקיבא ברוידא',    amount: 600, company: 'binyanEitan' },
  { name: 'אלכס גילביץ',     amount: 500, company: 'binyanEitan' },
  { name: 'צבי הרשקוביץ',    amount: 500, company: 'binyanEitan' },
  { name: 'שמואל פיינשטיין', amount: 500, company: 'binyanEitan' },
  { name: 'סיימון נייס',     amount: 500, company: 'binyanEitan' },
  { name: 'נריה שמעוני',     amount: 500, company: 'binyanEitan' },
  { name: 'חנן בן ישי',      amount: 600, company: 'binyanEitan' },
  { name: 'מיכאל דרגן',      amount: 600, company: 'binyanEitan' },
];

// ─── Canvas helpers ───────────────────────────────────────────────────────────

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = word; }
    else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

function drawParagraphs(
  ctx: CanvasRenderingContext2D,
  paras: string[],
  startY: number,
  cx: number,
  maxW: number,
  lineH: number,
  paraGap: number,
): number {
  let y = startY;
  for (let p = 0; p < paras.length; p++) {
    for (const line of wrapText(ctx, paras[p], maxW)) { ctx.fillText(line, cx, y); y += lineH; }
    if (p < paras.length - 1) y += paraGap;
  }
  return y;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function drawCorners(ctx: CanvasRenderingContext2D, W: number, H: number, len: number) {
  const defs: [number, number, number, number][] = [
    [56, 56, 1, 1], [W - 56, 56, -1, 1], [56, H - 56, 1, -1], [W - 56, H - 56, -1, -1],
  ];
  defs.forEach(([x, y, dx, dy]) => {
    ctx.beginPath(); ctx.moveTo(x, y + dy * len); ctx.lineTo(x, y); ctx.lineTo(x + dx * len, y); ctx.stroke();
  });
}

function fadeLineH(ctx: CanvasRenderingContext2D, x1: number, x2: number, y: number, color: string) {
  const g = ctx.createLinearGradient(x1, y, x2, y);
  g.addColorStop(0, 'transparent'); g.addColorStop(0.15, color); g.addColorStop(0.85, color); g.addColorStop(1, 'transparent');
  ctx.strokeStyle = g; ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2, y); ctx.stroke();
}

function diamond(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string) {
  ctx.fillStyle = color; ctx.beginPath();
  ctx.moveTo(cx, cy - r); ctx.lineTo(cx + r, cy); ctx.lineTo(cx, cy + r); ctx.lineTo(cx - r, cy);
  ctx.closePath(); ctx.fill();
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = src;
  });
}

// ─── Passover decorations ─────────────────────────────────────────────────────

function drawFlower(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string, alpha: number) {
  ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = color;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    ctx.beginPath();
    ctx.ellipse(cx + Math.cos(a) * r * 0.62, cy + Math.sin(a) * r * 0.62, r * 0.36, r * 0.52, a, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.beginPath(); ctx.arc(cx, cy, r * 0.3, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawLeaf(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, bow: number, color: string, alpha: number) {
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  const dx = x2 - x1, dy = y2 - y1, len = Math.sqrt(dx * dx + dy * dy);
  const nx = -dy / len, ny = dx / len;
  ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = color;
  ctx.beginPath(); ctx.moveTo(x1, y1);
  ctx.quadraticCurveTo(mx + nx * bow, my + ny * bow, x2, y2);
  ctx.quadraticCurveTo(mx - nx * bow * 0.2, my - ny * bow * 0.2, x1, y1);
  ctx.closePath(); ctx.fill(); ctx.restore();
}

function drawWheat(ctx: CanvasRenderingContext2D, bx: number, by: number, h: number, lean: number, color: string, alpha: number) {
  ctx.save(); ctx.globalAlpha = alpha; ctx.strokeStyle = color; ctx.fillStyle = color;
  const tipX = bx + lean * h * 0.14, tipY = by - h;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo(bx + lean * h * 0.06, by - h * 0.5, tipX, tipY); ctx.stroke();
  for (let i = 0; i < 6; i++) {
    const t = i / 5;
    const gx = bx + (lean * h * 0.14) * (1 - t * 0.6);
    const gy = tipY + t * h * 0.52;
    const side = i % 2 === 0 ? 1 : -1;
    ctx.beginPath(); ctx.ellipse(gx + side * 7, gy, 3.5, 8, side * 0.28, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx + side * 5, gy); ctx.stroke();
    ctx.lineWidth = 2;
  }
  ctx.restore();
}

function drawGoblet(ctx: CanvasRenderingContext2D, cx: number, topY: number, h: number, color: string, alpha: number) {
  ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = color;
  const w = h * 0.56;
  ctx.beginPath();
  ctx.moveTo(cx - w / 2, topY);
  ctx.bezierCurveTo(cx - w * 0.52, topY + h * 0.36, cx - w * 0.18, topY + h * 0.52, cx - w * 0.07, topY + h * 0.63);
  ctx.lineTo(cx - w * 0.07, topY + h * 0.77); ctx.lineTo(cx - w * 0.36, topY + h * 0.77);
  ctx.lineTo(cx - w * 0.36, topY + h * 0.86); ctx.lineTo(cx - w * 0.46, topY + h * 0.88);
  ctx.lineTo(cx - w * 0.46, topY + h);       ctx.lineTo(cx + w * 0.46, topY + h);
  ctx.lineTo(cx + w * 0.46, topY + h * 0.88); ctx.lineTo(cx + w * 0.36, topY + h * 0.86);
  ctx.lineTo(cx + w * 0.36, topY + h * 0.77); ctx.lineTo(cx + w * 0.07, topY + h * 0.77);
  ctx.lineTo(cx + w * 0.07, topY + h * 0.63);
  ctx.bezierCurveTo(cx + w * 0.18, topY + h * 0.52, cx + w * 0.52, topY + h * 0.36, cx + w / 2, topY);
  ctx.closePath(); ctx.fill(); ctx.restore();
}

function drawPassoverCorners(ctx: CanvasRenderingContext2D, W: number, H: number, color: string, alpha: number) {
  // ── Top-left ──
  drawFlower(ctx, 122, 122, 36, color, alpha * 0.78);
  drawLeaf(ctx, 122, 122, 188, 82, 26, color, alpha * 0.55);
  drawLeaf(ctx, 122, 122, 82, 188, -26, color, alpha * 0.55);
  drawWheat(ctx, 168, 168, 90, -0.5, color, alpha * 0.50);
  drawWheat(ctx, 96, 168, 80, -0.2, color, alpha * 0.38);
  drawFlower(ctx, 184, 88, 19, color, alpha * 0.50);
  drawFlower(ctx, 90, 185, 15, color, alpha * 0.40);
  // ── Top-right ──
  drawFlower(ctx, W - 122, 122, 36, color, alpha * 0.78);
  drawLeaf(ctx, W - 122, 122, W - 188, 82, -26, color, alpha * 0.55);
  drawLeaf(ctx, W - 122, 122, W - 82, 188, 26, color, alpha * 0.55);
  drawWheat(ctx, W - 168, 168, 90, 0.5, color, alpha * 0.50);
  drawWheat(ctx, W - 96, 168, 80, 0.2, color, alpha * 0.38);
  drawFlower(ctx, W - 184, 88, 19, color, alpha * 0.50);
  drawFlower(ctx, W - 90, 185, 15, color, alpha * 0.40);
  // ── Bottom-left ──
  drawFlower(ctx, 122, H - 122, 36, color, alpha * 0.78);
  drawLeaf(ctx, 122, H - 122, 188, H - 82, 26, color, alpha * 0.55);
  drawLeaf(ctx, 122, H - 122, 82, H - 188, -26, color, alpha * 0.55);
  drawWheat(ctx, 168, H - 68, 90, -0.5, color, alpha * 0.50);
  drawWheat(ctx, 96, H - 68, 80, -0.2, color, alpha * 0.38);
  drawFlower(ctx, 184, H - 88, 19, color, alpha * 0.50);
  drawFlower(ctx, 90, H - 185, 15, color, alpha * 0.40);
  // ── Bottom-right ──
  drawFlower(ctx, W - 122, H - 122, 36, color, alpha * 0.78);
  drawLeaf(ctx, W - 122, H - 122, W - 188, H - 82, -26, color, alpha * 0.55);
  drawLeaf(ctx, W - 122, H - 122, W - 82, H - 188, 26, color, alpha * 0.55);
  drawWheat(ctx, W - 168, H - 68, 90, 0.5, color, alpha * 0.50);
  drawWheat(ctx, W - 96, H - 68, 80, 0.2, color, alpha * 0.38);
  drawFlower(ctx, W - 184, H - 88, 19, color, alpha * 0.50);
  drawFlower(ctx, W - 90, H - 185, 15, color, alpha * 0.40);
}

function drawPassoverCenterpiece(ctx: CanvasRenderingContext2D, CX: number, topY: number, color: string, alpha: number) {
  // Fade lines framing the zone
  ctx.lineWidth = 1;
  fadeLineH(ctx, 160, CX - 80, topY + 2, color.replace(')', `,${alpha * 0.35})`).replace('rgb', 'rgba'));
  fadeLineH(ctx, CX + 80, 920, topY + 2, color.replace(')', `,${alpha * 0.35})`).replace('rgb', 'rgba'));
  // Goblet
  drawGoblet(ctx, CX, topY + 8, 115, color, alpha * 0.72);
  // Wheat stalks — inner pair
  drawWheat(ctx, CX - 90, topY + 122, 130, -0.55, color, alpha * 0.58);
  drawWheat(ctx, CX + 90, topY + 122, 130, 0.55, color, alpha * 0.58);
  // Wheat stalks — outer pair
  drawWheat(ctx, CX - 168, topY + 106, 108, -0.38, color, alpha * 0.44);
  drawWheat(ctx, CX + 168, topY + 106, 108, 0.38, color, alpha * 0.44);
  // Flowers
  drawFlower(ctx, CX - 230, topY + 70, 28, color, alpha * 0.58);
  drawFlower(ctx, CX + 230, topY + 70, 28, color, alpha * 0.58);
  drawFlower(ctx, CX - 282, topY + 112, 20, color, alpha * 0.44);
  drawFlower(ctx, CX + 282, topY + 112, 20, color, alpha * 0.44);
  // Leaves flanking goblet
  drawLeaf(ctx, CX - 36, topY + 118, CX - 85, topY + 62, 20, color, alpha * 0.48);
  drawLeaf(ctx, CX + 36, topY + 118, CX + 85, topY + 62, -20, color, alpha * 0.48);
}

// ─── Template A: Smart Sky ────────────────────────────────────────────────────

async function drawSmartSkyVoucher(canvas: HTMLCanvasElement, emp: Employee) {
  const ctx = canvas.getContext('2d')!;
  const W = 1080, H = 1920, CX = W / 2;
  const GOLD = '#C8A04A';

  // Background
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#060A14'); bg.addColorStop(0.35, '#0C1828');
  bg.addColorStop(0.65, '#0F1E32'); bg.addColorStop(1, '#060A14');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

  // Centre glow
  const glow = ctx.createRadialGradient(CX, H * 0.42, 0, CX, H * 0.42, 560);
  glow.addColorStop(0, 'rgba(200,160,74,0.09)'); glow.addColorStop(1, 'rgba(200,160,74,0)');
  ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);

  // Passover corners (drawn BEHIND borders)
  drawPassoverCorners(ctx, W, H, GOLD, 0.62);

  // Borders
  ctx.strokeStyle = 'rgba(200,160,74,0.46)'; ctx.lineWidth = 2;
  ctx.strokeRect(44, 44, W - 88, H - 88);
  ctx.strokeStyle = 'rgba(200,160,74,0.13)'; ctx.lineWidth = 1;
  ctx.strokeRect(57, 57, W - 114, H - 114);

  // Corner L-marks
  ctx.strokeStyle = GOLD; ctx.lineWidth = 2.5;
  drawCorners(ctx, W, H, 52);

  // ── Logo ──────────────────────────────────────────────────────────────────
  try {
    const logo = await loadImage('/smartsky.png');
    const maxW = 370, maxH = 185;
    const scale = Math.min(maxW / logo.naturalWidth, maxH / logo.naturalHeight);
    const lW = logo.naturalWidth * scale, lH = logo.naturalHeight * scale;
    ctx.save();
    ctx.filter = 'invert(1)';
    ctx.globalCompositeOperation = 'screen';
    ctx.drawImage(logo, CX - lW / 2, 92, lW, lH);
    ctx.restore();
  } catch {
    ctx.save(); ctx.direction = 'ltr'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.letterSpacing = '10px'; ctx.font = 'bold 56px "Assistant","Heebo",Arial,sans-serif';
    ctx.fillStyle = '#FFFFFF'; ctx.fillText('SMART SKY', CX, 185); ctx.letterSpacing = '0px';
    ctx.restore();
  }

  // Gold rule
  ctx.lineWidth = 1; fadeLineH(ctx, 110, W - 110, 300, GOLD);

  // Voucher label
  ctx.direction = 'rtl'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = '40px "Assistant","Heebo",Arial,sans-serif';
  ctx.fillStyle = 'rgba(200,160,74,0.90)';
  ctx.fillText('✦   שובר מתנה   ✦', CX, 352);

  // "To the honour of"
  ctx.font = '27px "Assistant","Heebo",Arial,sans-serif';
  ctx.fillStyle = 'rgba(180,190,215,0.58)';
  ctx.fillText('לכבוד', CX, 410);

  // Employee name
  ctx.shadowColor = 'rgba(255,255,255,0.14)'; ctx.shadowBlur = 22;
  ctx.font = 'bold 96px "Assistant","Heebo",Arial,sans-serif';
  ctx.fillStyle = '#FFFFFF'; ctx.textBaseline = 'middle';
  ctx.fillText(emp.name, CX, 506);
  ctx.shadowBlur = 0; ctx.textBaseline = 'top';

  // Amount pill
  const pY = 594, pH = 136, pW = 400;
  roundRect(ctx, CX - pW / 2, pY, pW, pH, 68);
  const pg = ctx.createLinearGradient(CX - pW / 2, pY, CX + pW / 2, pY + pH);
  pg.addColorStop(0, 'rgba(200,160,74,0.23)'); pg.addColorStop(1, 'rgba(200,160,74,0.10)');
  ctx.fillStyle = pg; ctx.fill();
  ctx.strokeStyle = 'rgba(200,160,74,0.60)'; ctx.lineWidth = 1.5;
  roundRect(ctx, CX - pW / 2, pY, pW, pH, 68); ctx.stroke();

  ctx.save(); ctx.direction = 'ltr'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(200,160,74,0.48)'; ctx.shadowBlur = 18;
  ctx.font = 'bold 84px "Assistant","Heebo",Arial,sans-serif'; ctx.fillStyle = GOLD;
  ctx.fillText(`₪${emp.amount}`, CX, pY + pH / 2);
  ctx.shadowBlur = 0; ctx.restore();

  // Diamond divider
  const divY = 792;
  diamond(ctx, CX, divY, 13, GOLD); ctx.lineWidth = 1;
  const d1 = ctx.createLinearGradient(110, 0, CX - 22, 0);
  d1.addColorStop(0, 'transparent'); d1.addColorStop(1, 'rgba(200,160,74,0.55)');
  ctx.strokeStyle = d1; ctx.beginPath(); ctx.moveTo(110, divY); ctx.lineTo(CX - 22, divY); ctx.stroke();
  const d2 = ctx.createLinearGradient(CX + 22, 0, W - 110, 0);
  d2.addColorStop(0, 'rgba(200,160,74,0.55)'); d2.addColorStop(1, 'transparent');
  ctx.strokeStyle = d2; ctx.beginPath(); ctx.moveTo(CX + 22, divY); ctx.lineTo(W - 110, divY); ctx.stroke();

  // ── Message — 3 paragraphs ──────────────────────────────────────────────────
  const paras = [
    'לרגל חג הפסח הבא עלינו לטובה, אנו שמחים לשלוח לך שובר מתנה זה כביטוי אמיתי להוקרתנו על עבודתך המסורה והנאמנה.',
    'אנחנו מעריכים אותך ושמחים שאתה חלק ממשפחת סמארט סקיי.',
    'יהי רצון שיהיה לך ולמשפחתך חג שמח, כשר ומואר — ושנה של בריאות, שמחה, הצלחה ושפע בכל.',
  ];
  ctx.direction = 'rtl'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.font = '33px "Assistant","Heebo",Arial,sans-serif';
  ctx.fillStyle = 'rgba(212,222,240,0.86)';
  const msgEnd = drawParagraphs(ctx, paras, 834, CX, 860, 52, 44);

  // ── Passover centerpiece ────────────────────────────────────────────────────
  const cpY = Math.max(msgEnd + 48, 1220);
  drawPassoverCenterpiece(ctx, CX, cpY, GOLD, 0.72);

  // ── Vendor box ──────────────────────────────────────────────────────────────
  const vbY = Math.max(cpY + 210, 1450), vbH = 175;
  roundRect(ctx, 82, vbY, W - 164, vbH, 14);
  ctx.fillStyle = 'rgba(255,255,255,0.04)'; ctx.fill();
  ctx.strokeStyle = 'rgba(200,160,74,0.22)'; ctx.lineWidth = 1;
  roundRect(ctx, 82, vbY, W - 164, vbH, 14); ctx.stroke();

  ctx.textBaseline = 'top';
  ctx.font = 'bold 31px "Assistant","Heebo",Arial,sans-serif'; ctx.fillStyle = GOLD;
  ctx.fillText('אלקטרו סליל המגרש — סניף תלפיות', CX, vbY + 26);
  ctx.font = '25px "Assistant","Heebo",Arial,sans-serif'; ctx.fillStyle = 'rgba(180,190,215,0.68)';
  ctx.fillText('רחוב חרשי הברזל 8, תלפיות, ירושלים', CX, vbY + 76);
  ctx.font = '23px "Assistant","Heebo",Arial,sans-serif'; ctx.fillStyle = 'rgba(200,160,74,0.64)';
  ctx.fillText('בתוקף עד: ד׳ סיוון תשפ״ו  |  31 במאי 2026', CX, vbY + 126);

  // ── Signature ───────────────────────────────────────────────────────────────
  const sigY = vbY + vbH + 68;
  ctx.font = '30px "Assistant","Heebo",Arial,sans-serif'; ctx.fillStyle = 'rgba(200,212,232,0.54)';
  ctx.fillText('בהערכה ובחיבה,', CX, sigY);
  ctx.shadowColor = 'rgba(200,160,74,0.32)'; ctx.shadowBlur = 14;
  ctx.font = 'bold 52px "Assistant","Heebo",Arial,sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.fillText('חיים ומוטי', CX, sigY + 52);
  ctx.shadowBlur = 0;
}

// ─── Template B: Binyan Eitan ─────────────────────────────────────────────────

async function drawBinyanEitanVoucher(canvas: HTMLCanvasElement, emp: Employee) {
  const ctx = canvas.getContext('2d')!;
  const W = 1080, H = 1920, CX = W / 2;
  const BRONZE = '#8D775F';

  // Background
  ctx.fillStyle = '#F3F2EE'; ctx.fillRect(0, 0, W, H);
  const ov = ctx.createLinearGradient(0, 0, 0, H);
  ov.addColorStop(0, 'rgba(141,119,95,0.06)'); ov.addColorStop(0.5, 'rgba(141,119,95,0)');
  ov.addColorStop(1, 'rgba(141,119,95,0.08)');
  ctx.fillStyle = ov; ctx.fillRect(0, 0, W, H);

  // Passover corners (BEHIND borders)
  drawPassoverCorners(ctx, W, H, BRONZE, 0.66);

  // Borders
  ctx.strokeStyle = BRONZE; ctx.lineWidth = 2; ctx.strokeRect(44, 44, W - 88, H - 88);
  ctx.strokeStyle = 'rgba(141,119,95,0.27)'; ctx.lineWidth = 1; ctx.strokeRect(57, 57, W - 114, H - 114);

  // Corner L-marks
  ctx.strokeStyle = BRONZE; ctx.lineWidth = 2.5; drawCorners(ctx, W, H, 56);

  // Top decorative bars
  for (let i = 0; i < 3; i++) {
    ctx.strokeStyle = `rgba(141,119,95,${[0.46, 0.22, 0.10][i]})`; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(120, 96 + i * 15); ctx.lineTo(W - 120, 96 + i * 15); ctx.stroke();
  }

  // ── Logo ──────────────────────────────────────────────────────────────────
  try {
    const logo = await loadImage('/logo.png');
    const maxW = 310, maxH = 198;
    const scale = Math.min(maxW / logo.naturalWidth, maxH / logo.naturalHeight);
    const lW = logo.naturalWidth * scale, lH = logo.naturalHeight * scale;
    ctx.save(); ctx.globalCompositeOperation = 'multiply';
    ctx.drawImage(logo, CX - lW / 2, 102, lW, lH);
    ctx.restore();
  } catch {
    ctx.direction = 'rtl'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 70px "Assistant","Heebo",Arial,sans-serif'; ctx.fillStyle = '#2D2926';
    ctx.fillText('בנין איתן', CX, 198);
  }

  // Bronze rule
  ctx.lineWidth = 1.5; fadeLineH(ctx, 110, W - 110, 322, BRONZE);

  // Voucher label + flanking diamonds
  ctx.direction = 'rtl'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = '42px "Assistant","Heebo",Arial,sans-serif'; ctx.fillStyle = '#2D2926';
  ctx.fillText('שובר מתנה', CX, 380);
  diamond(ctx, CX - 222, 380, 11, BRONZE); diamond(ctx, CX + 222, 380, 11, BRONZE);

  // "To the honour of"
  ctx.font = '29px "Assistant","Heebo",Arial,sans-serif'; ctx.fillStyle = 'rgba(45,41,38,0.50)';
  ctx.fillText('לכבוד', CX, 440);

  // Employee name
  ctx.font = 'bold 94px "Assistant","Heebo",Arial,sans-serif'; ctx.fillStyle = '#2D2926';
  ctx.textBaseline = 'middle'; ctx.fillText(emp.name, CX, 536); ctx.textBaseline = 'top';

  // Amount
  ctx.save(); ctx.direction = 'ltr'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = 'bold 90px "Assistant","Heebo",Arial,sans-serif'; ctx.fillStyle = BRONZE;
  ctx.fillText(`₪${emp.amount}`, CX, 660); ctx.restore();

  // Underline
  ctx.strokeStyle = 'rgba(141,119,95,0.45)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(CX - 145, 712); ctx.lineTo(CX + 145, 712); ctx.stroke();

  // Diamond divider
  const divY = 758;
  diamond(ctx, CX, divY, 13, BRONZE); ctx.lineWidth = 1;
  const d1 = ctx.createLinearGradient(120, 0, CX - 22, 0);
  d1.addColorStop(0, 'transparent'); d1.addColorStop(1, 'rgba(141,119,95,0.48)');
  ctx.strokeStyle = d1; ctx.beginPath(); ctx.moveTo(120, divY); ctx.lineTo(CX - 22, divY); ctx.stroke();
  const d2 = ctx.createLinearGradient(CX + 22, 0, W - 120, 0);
  d2.addColorStop(0, 'rgba(141,119,95,0.48)'); d2.addColorStop(1, 'transparent');
  ctx.strokeStyle = d2; ctx.beginPath(); ctx.moveTo(CX + 22, divY); ctx.lineTo(W - 120, divY); ctx.stroke();

  // ── Message — 3 paragraphs ──────────────────────────────────────────────────
  const paras = [
    'לרגל חג הפסח הבא עלינו לטובה, ברצוני להביע את הכרת התודה הכנה שלי על מסירותך, הנאמנות והרוח הטובה שאתה מביא לבנין איתן.',
    'אתה חלק בלתי נפרד מהצוות המצוין שלנו, ואני מעריך אותך מאוד.',
    'יהי רצון שיהיה לך ולמשפחתך חג פסח שמח וכשר — ושנה של בריאות, נחת ושפע בכל.',
  ];
  ctx.direction = 'rtl'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.font = '35px "Assistant","Heebo",Arial,sans-serif'; ctx.fillStyle = 'rgba(45,41,38,0.80)';
  const msgEnd = drawParagraphs(ctx, paras, 810, CX, 860, 55, 46);

  // ── Passover centerpiece ────────────────────────────────────────────────────
  const cpY = Math.max(msgEnd + 50, 1220);
  drawPassoverCenterpiece(ctx, CX, cpY, BRONZE, 0.76);

  // ── Vendor box ──────────────────────────────────────────────────────────────
  const vbY = Math.max(cpY + 210, 1450), vbH = 175;
  roundRect(ctx, 82, vbY, W - 164, vbH, 14);
  ctx.fillStyle = 'rgba(141,119,95,0.07)'; ctx.fill();
  ctx.strokeStyle = 'rgba(141,119,95,0.30)'; ctx.lineWidth = 1.5;
  roundRect(ctx, 82, vbY, W - 164, vbH, 14); ctx.stroke();

  ctx.textBaseline = 'top';
  ctx.font = 'bold 31px "Assistant","Heebo",Arial,sans-serif'; ctx.fillStyle = '#2D2926';
  ctx.fillText('אלקטרו סליל המגרש — סניף תלפיות', CX, vbY + 26);
  ctx.font = '25px "Assistant","Heebo",Arial,sans-serif'; ctx.fillStyle = 'rgba(45,41,38,0.56)';
  ctx.fillText('רחוב חרשי הברזל 8, תלפיות, ירושלים', CX, vbY + 76);
  ctx.font = '23px "Assistant","Heebo",Arial,sans-serif'; ctx.fillStyle = BRONZE;
  ctx.fillText('בתוקף עד: ד׳ סיוון תשפ״ו  |  31 במאי 2026', CX, vbY + 126);

  // ── Signature ───────────────────────────────────────────────────────────────
  const sigY = vbY + vbH + 68;
  ctx.font = '30px "Assistant","Heebo",Arial,sans-serif'; ctx.fillStyle = 'rgba(45,41,38,0.48)';
  ctx.fillText('בידידות ובהוקרה,', CX, sigY);
  ctx.font = 'bold 52px "Assistant","Heebo",Arial,sans-serif'; ctx.fillStyle = '#2D2926';
  ctx.fillText('מוטי', CX, sigY + 52);

  // Bottom decorative bars (mirror of top)
  for (let i = 0; i < 3; i++) {
    ctx.strokeStyle = `rgba(141,119,95,${[0.46, 0.22, 0.10][i]})`; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(120, H - 96 - i * 15); ctx.lineTo(W - 120, H - 96 - i * 15); ctx.stroke();
  }
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function VoucherGenerator() {
  const [selected, setSelected] = useState<Employee | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!selected || !canvasRef.current) return;
    const canvas = canvasRef.current;
    document.fonts.ready.then(async () => {
      if (selected.company === 'smartSky') {
        await drawSmartSkyVoucher(canvas, selected);
      } else {
        await drawBinyanEitanVoucher(canvas, selected);
      }
    });
  }, [selected]);

  const handleDownload = () => {
    if (!canvasRef.current || !selected) return;
    const a = document.createElement('a');
    a.download = `voucher-${selected.name}.png`;
    a.href = canvasRef.current.toDataURL('image/png');
    a.click();
  };

  const accentColor = selected?.company === 'smartSky' ? '#3B6EA5' : '#8D775F';

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-gray-950 text-white flex"
      style={{ fontFamily: '"Assistant","Heebo",Arial,sans-serif' }}
    >
      {/* ── Sidebar ── */}
      <aside className="w-72 bg-gray-900 border-l border-gray-800 flex flex-col overflow-y-auto shrink-0">
        <div className="p-5 border-b border-gray-800">
          <h1 className="text-base font-bold text-white">מחולל שוברי מתנה</h1>
          <p className="text-xs text-gray-400 mt-1">בחר עובד להצגת השובר</p>
        </div>

        {/* Smart Sky */}
        <div className="px-4 pt-4 pb-2">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
            <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">Smart Sky</span>
          </div>
          {SMART_SKY.map((emp) => (
            <button
              key={emp.name}
              onClick={() => setSelected(emp)}
              className={`w-full text-right px-3 py-2.5 rounded-lg mb-1 flex justify-between items-center transition-colors text-sm ${
                selected?.name === emp.name
                  ? 'bg-blue-900/50 text-blue-200 border border-blue-700/50'
                  : 'hover:bg-gray-800 text-gray-300 border border-transparent'
              }`}
            >
              <span className="font-medium">{emp.name}</span>
              <span className="text-gray-400">₪{emp.amount}</span>
            </button>
          ))}
        </div>

        <div className="mx-4 border-t border-gray-800 my-1" />

        {/* Binyan Eitan */}
        <div className="px-4 pt-2 pb-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: '#8D775F' }} />
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#8D775F' }}>
              Binyan Eitan
            </span>
          </div>
          {BINYAN_EITAN.map((emp) => (
            <button
              key={emp.name}
              onClick={() => setSelected(emp)}
              className={`w-full text-right px-3 py-2.5 rounded-lg mb-1 flex justify-between items-center transition-colors text-sm ${
                selected?.name === emp.name
                  ? 'bg-amber-900/30 text-amber-100 border border-amber-700/40'
                  : 'hover:bg-gray-800 text-gray-300 border border-transparent'
              }`}
            >
              <span className="font-medium">{emp.name}</span>
              <span className="text-gray-400">₪{emp.amount}</span>
            </button>
          ))}
        </div>

        {/* Download */}
        {selected && (
          <div className="mt-auto p-4 border-t border-gray-800">
            <button
              onClick={handleDownload}
              className="w-full py-3 rounded-lg font-semibold text-white text-sm transition-opacity hover:opacity-90"
              style={{ backgroundColor: accentColor }}
            >
              הורד PNG לוואטסאפ
            </button>
            <p className="text-xs text-gray-500 text-center mt-2">1080 × 1920 px</p>
          </div>
        )}
      </aside>

      {/* ── Preview ── */}
      <main className="flex-1 flex items-center justify-center p-8 overflow-auto">
        {selected ? (
          <div className="flex flex-col items-center gap-4">
            <p className="text-sm text-gray-400">{selected.name} — תצוגה מקדימה</p>
            <canvas
              ref={canvasRef}
              width={1080}
              height={1920}
              style={{ width: '360px', height: '640px', borderRadius: '14px', boxShadow: '0 24px 64px rgba(0,0,0,0.65)' }}
            />
          </div>
        ) : (
          <div className="text-center select-none">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl border border-gray-700 flex items-center justify-center">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="1.5">
                <rect x="3" y="8" width="18" height="13" rx="2" />
                <path d="M8 8V6a4 4 0 018 0v2" />
                <path d="M12 13v3M10 15h4" />
              </svg>
            </div>
            <p className="text-gray-400 text-lg">בחר עובד מהרשימה</p>
            <p className="text-gray-600 text-sm mt-1">השובר יוצג כאן בתצוגה מקדימה</p>
          </div>
        )}
      </main>
    </div>
  );
}
