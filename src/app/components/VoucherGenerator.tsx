'use client';

import { useState, useRef, useEffect } from 'react';

type Company = 'smartSky' | 'binyanEitan';

interface Employee {
  name: string;
  amount: number;
  company: Company;
}

const SMART_SKY: Employee[] = [
  { name: 'שעיה שחר', amount: 500, company: 'smartSky' },
  { name: 'עקיבא טואיטו', amount: 500, company: 'smartSky' },
  { name: 'נחמיה גאל-דור', amount: 500, company: 'smartSky' },
  { name: 'אברהם טרגנו', amount: 500, company: 'smartSky' },
  { name: 'אברהם ברונר', amount: 500, company: 'smartSky' },
  { name: 'דוד חדד', amount: 500, company: 'smartSky' },
  { name: 'אלי מילר', amount: 500, company: 'smartSky' },
  { name: 'אלי וולף', amount: 500, company: 'smartSky' },
];

const BINYAN_EITAN: Employee[] = [
  { name: 'אלכס גרודקה', amount: 500, company: 'binyanEitan' },
  { name: 'עקיבא ברוידא', amount: 600, company: 'binyanEitan' },
  { name: 'אלכס גילביץ', amount: 500, company: 'binyanEitan' },
  { name: 'צבי הרשקוביץ', amount: 500, company: 'binyanEitan' },
  { name: 'שמואל פיינשטיין', amount: 500, company: 'binyanEitan' },
  { name: 'סיימון נייס', amount: 500, company: 'binyanEitan' },
  { name: 'נריה שמעוני', amount: 500, company: 'binyanEitan' },
  { name: 'חנן בן ישי', amount: 600, company: 'binyanEitan' },
  { name: 'מיכאל דרגן', amount: 600, company: 'binyanEitan' },
];

// ─── Canvas helpers ───────────────────────────────────────────────────────────

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function drawCorners(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  len: number,
) {
  const defs: [number, number, number, number][] = [
    [56, 56, 1, 1],
    [W - 56, 56, -1, 1],
    [56, H - 56, 1, -1],
    [W - 56, H - 56, -1, -1],
  ];
  defs.forEach(([x, y, dx, dy]) => {
    ctx.beginPath();
    ctx.moveTo(x, y + dy * len);
    ctx.lineTo(x, y);
    ctx.lineTo(x + dx * len, y);
    ctx.stroke();
  });
}

function fadeLineH(
  ctx: CanvasRenderingContext2D,
  x1: number,
  x2: number,
  y: number,
  color: string,
) {
  const g = ctx.createLinearGradient(x1, y, x2, y);
  g.addColorStop(0, 'transparent');
  g.addColorStop(0.15, color);
  g.addColorStop(0.85, color);
  g.addColorStop(1, 'transparent');
  ctx.strokeStyle = g;
  ctx.beginPath();
  ctx.moveTo(x1, y);
  ctx.lineTo(x2, y);
  ctx.stroke();
}

function diamond(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  color: string,
) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(cx, cy - r);
  ctx.lineTo(cx + r, cy);
  ctx.lineTo(cx, cy + r);
  ctx.lineTo(cx - r, cy);
  ctx.closePath();
  ctx.fill();
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// ─── Template A: Smart Sky ────────────────────────────────────────────────────

async function drawSmartSkyVoucher(canvas: HTMLCanvasElement, emp: Employee) {
  const ctx = canvas.getContext('2d')!;
  const W = 1080, H = 1920, CX = W / 2;

  // Background
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#080D1A');
  bg.addColorStop(0.38, '#0F1C35');
  bg.addColorStop(0.62, '#132140');
  bg.addColorStop(1, '#080D1A');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Radial glow centre
  const glow = ctx.createRadialGradient(CX, H * 0.42, 0, CX, H * 0.42, 520);
  glow.addColorStop(0, 'rgba(200,160,74,0.07)');
  glow.addColorStop(1, 'rgba(200,160,74,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Outer border
  ctx.strokeStyle = 'rgba(200,160,74,0.45)';
  ctx.lineWidth = 2;
  ctx.strokeRect(44, 44, W - 88, H - 88);
  ctx.strokeStyle = 'rgba(200,160,74,0.13)';
  ctx.lineWidth = 1;
  ctx.strokeRect(55, 55, W - 110, H - 110);

  // Corner marks
  ctx.strokeStyle = '#C8A04A';
  ctx.lineWidth = 2.5;
  drawCorners(ctx, W, H, 52);

  // ── Logo ──
  try {
    const logo = await loadImage('/smart-sky-logo.png');
    const maxW = 360, maxH = 185;
    const scale = Math.min(maxW / logo.naturalWidth, maxH / logo.naturalHeight);
    const lW = logo.naturalWidth * scale, lH = logo.naturalHeight * scale;
    ctx.save();
    // Invert black→white, then screen blends white onto dark bg while hiding the bg
    ctx.filter = 'invert(1)';
    ctx.globalCompositeOperation = 'screen';
    ctx.drawImage(logo, CX - lW / 2, 88, lW, lH);
    ctx.restore();
  } catch {
    // Fallback text if logo not found
    ctx.save();
    ctx.direction = 'ltr';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(200,160,74,0.35)';
    ctx.shadowBlur = 20;
    ctx.letterSpacing = '10px';
    ctx.font = 'bold 58px "Assistant","Heebo",Arial,sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('SMART SKY', CX, 180);
    ctx.letterSpacing = '3px';
    ctx.shadowBlur = 0;
    ctx.font = '27px "Assistant","Heebo",Arial,sans-serif';
    ctx.fillStyle = '#C8A04A';
    ctx.fillText('מערכות הצללה מתקדמות', CX, 246);
    ctx.letterSpacing = '0px';
    ctx.restore();
  }

  // Gold rule
  ctx.lineWidth = 1;
  fadeLineH(ctx, 100, W - 100, 306, '#C8A04A');

  // Gift voucher label
  ctx.direction = 'rtl';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '40px "Assistant","Heebo",Arial,sans-serif';
  ctx.fillStyle = 'rgba(200,160,74,0.88)';
  ctx.fillText('\u2736   \u05E9\u05D5\u05D1\u05E8 \u05DE\u05EA\u05E0\u05D4   \u2736', CX, 372);

  // "Presented with pride to"
  ctx.font = '29px "Assistant","Heebo",Arial,sans-serif';
  ctx.fillStyle = 'rgba(180,188,210,0.65)';
  ctx.fillText('\u05DE\u05D5\u05E2\u05E0\u05E7 \u05D1\u05D2\u05D0\u05D5\u05D5\u05D4 \u05DC\u05DB\u05D1\u05D5\u05D3', CX, 465);

  // Employee name
  ctx.shadowColor = 'rgba(255,255,255,0.12)';
  ctx.shadowBlur = 22;
  ctx.font = 'bold 90px "Assistant","Heebo",Arial,sans-serif';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(emp.name, CX, 618);
  ctx.shadowBlur = 0;

  // Amount pill
  const pY = 736, pH = 132, pW = 380;
  roundRect(ctx, CX - pW / 2, pY, pW, pH, 66);
  const pillBg = ctx.createLinearGradient(CX - pW / 2, pY, CX + pW / 2, pY + pH);
  pillBg.addColorStop(0, 'rgba(200,160,74,0.20)');
  pillBg.addColorStop(1, 'rgba(200,160,74,0.09)');
  ctx.fillStyle = pillBg;
  ctx.fill();
  ctx.strokeStyle = 'rgba(200,160,74,0.58)';
  ctx.lineWidth = 1.5;
  roundRect(ctx, CX - pW / 2, pY, pW, pH, 66);
  ctx.stroke();

  ctx.save();
  ctx.direction = 'ltr';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(200,160,74,0.45)';
  ctx.shadowBlur = 18;
  ctx.font = 'bold 82px "Assistant","Heebo",Arial,sans-serif';
  ctx.fillStyle = '#C8A04A';
  ctx.fillText(`\u20AA${emp.amount}`, CX, pY + pH / 2);
  ctx.shadowBlur = 0;
  ctx.restore();

  // Diamond divider
  const divY = 930;
  diamond(ctx, CX, divY, 14, '#C8A04A');
  ctx.lineWidth = 1;
  const dg1 = ctx.createLinearGradient(100, 0, CX - 22, 0);
  dg1.addColorStop(0, 'transparent');
  dg1.addColorStop(1, 'rgba(200,160,74,0.6)');
  ctx.strokeStyle = dg1;
  ctx.beginPath(); ctx.moveTo(100, divY); ctx.lineTo(CX - 22, divY); ctx.stroke();
  const dg2 = ctx.createLinearGradient(CX + 22, 0, W - 100, 0);
  dg2.addColorStop(0, 'rgba(200,160,74,0.6)');
  dg2.addColorStop(1, 'transparent');
  ctx.strokeStyle = dg2;
  ctx.beginPath(); ctx.moveTo(CX + 22, divY); ctx.lineTo(W - 100, divY); ctx.stroke();

  // Personal message
  const msg =
    '\u05E2\u05DD \u05EA\u05D7\u05D9\u05DC\u05EA \u05E9\u05E0\u05EA 2026, \u05D0\u05E0\u05D5 \u05E9\u05DE\u05D7\u05D9\u05DD \u05DC\u05E9\u05DC\u05D5\u05D7 \u05DC\u05DA \u05E9\u05D5\u05D1\u05E8 \u05DE\u05EA\u05E0\u05D4 \u05D6\u05D4 \u05DB\u05D1\u05D9\u05D8\u05D5\u05D9 \u05D0\u05DE\u05D9\u05EA\u05D9 \u05DC\u05D4\u05D5\u05E7\u05E8\u05EA\u05E0\u05D5 \u05E2\u05DC \u05E2\u05D1\u05D5\u05D3\u05EA\u05DA \u05D4\u05DE\u05E1\u05D5\u05E8\u05D4 \u05D5\u05D4\u05E0\u05D0\u05DE\u05E0\u05D4. \u05D0\u05E0\u05D7\u05E0\u05D5 \u05DE\u05E2\u05E8\u05D9\u05DB\u05D9\u05DD \u05D0\u05D5\u05EA\u05DA \u05D5\u05E9\u05DE\u05D7\u05D9\u05DD \u05E9\u05D0\u05EA\u05D4 \u05D7\u05DC\u05E7 \u05DE\u05DE\u05E9\u05E4\u05D7\u05EA \u05E1\u05DE\u05D0\u05E8\u05D8 \u05E1\u05E7\u05D9\u05D9. \u05D9\u05D4\u05D9 \u05E8\u05E6\u05D5\u05DF \u05E9\u05D4\u05E9\u05E0\u05D4 \u05D4\u05D7\u05D3\u05E9\u05D4 \u05EA\u05D1\u05D9\u05D0 \u05DC\u05DA \u05D5\u05DC\u05DE\u05E9\u05E4\u05D7\u05EA\u05DA \u05D4\u05D8\u05D5\u05D1\u05D4 \u05D1\u05E8\u05D9\u05D0\u05D5\u05EA \u05E9\u05DC\u05DE\u05D4, \u05E9\u05DE\u05D7\u05D4 \u05E8\u05D1\u05D4, \u05D4\u05E6\u05DC\u05D7\u05D4 \u05D5\u05E9\u05E4\u05E2 \u05D1\u05DB\u05DC \u05DE\u05E2\u05E9\u05D9 \u05D9\u05D3\u05D9\u05DA.';
  ctx.font = '35px "Assistant","Heebo",Arial,sans-serif';
  ctx.fillStyle = 'rgba(210,220,238,0.87)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const msgLines = wrapText(ctx, msg, 860);
  let msgY = 998;
  for (const line of msgLines) {
    ctx.fillText(line, CX, msgY);
    msgY += 55;
  }

  // Vendor box
  const vbY = 1578, vbH = 172;
  roundRect(ctx, 80, vbY, W - 160, vbH, 14);
  ctx.fillStyle = 'rgba(255,255,255,0.04)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(200,160,74,0.25)';
  ctx.lineWidth = 1;
  roundRect(ctx, 80, vbY, W - 160, vbH, 14);
  ctx.stroke();

  ctx.textBaseline = 'top';
  ctx.font = 'bold 33px "Assistant","Heebo",Arial,sans-serif';
  ctx.fillStyle = '#C8A04A';
  ctx.fillText('אלקטרו סליל המגרש — סניף תלפיות', CX, vbY + 28);

  ctx.font = '27px "Assistant","Heebo",Arial,sans-serif';
  ctx.fillStyle = 'rgba(180,188,210,0.72)';
  ctx.fillText('רחוב חרשי הברזל 8, תלפיות, ירושלים', CX, vbY + 82);

  ctx.font = '25px "Assistant","Heebo",Arial,sans-serif';
  ctx.fillStyle = 'rgba(200,160,74,0.68)';
  ctx.fillText('בתוקף עד: ד׳ סיוון תשפ״ו  |  31 במאי 2026', CX, vbY + 134);

  // Signature
  ctx.font = '32px "Assistant","Heebo",Arial,sans-serif';
  ctx.fillStyle = 'rgba(200,210,228,0.58)';
  ctx.fillText('\u05D1\u05D4\u05E2\u05E8\u05DB\u05D4 \u05D5\u05D1\u05D7\u05D9\u05D1\u05D4,', CX, 1796);

  ctx.shadowColor = 'rgba(200,160,74,0.3)';
  ctx.shadowBlur = 12;
  ctx.font = 'bold 52px "Assistant","Heebo",Arial,sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.fillText('\u05D7\u05D9\u05D9\u05DD \u05D5\u05DE\u05D5\u05D8\u05D9', CX, 1854);
  ctx.shadowBlur = 0;
}

// ─── Template B: Binyan Eitan ─────────────────────────────────────────────────

async function drawBinyanEitanVoucher(canvas: HTMLCanvasElement, emp: Employee) {
  const ctx = canvas.getContext('2d')!;
  const W = 1080, H = 1920, CX = W / 2;

  // Background
  ctx.fillStyle = '#F3F2EE';
  ctx.fillRect(0, 0, W, H);

  // Warm overlay
  const overlay = ctx.createLinearGradient(0, 0, 0, H);
  overlay.addColorStop(0, 'rgba(141,119,95,0.05)');
  overlay.addColorStop(0.5, 'rgba(141,119,95,0)');
  overlay.addColorStop(1, 'rgba(141,119,95,0.07)');
  ctx.fillStyle = overlay;
  ctx.fillRect(0, 0, W, H);

  // Borders
  ctx.strokeStyle = '#8D775F';
  ctx.lineWidth = 2;
  ctx.strokeRect(44, 44, W - 88, H - 88);
  ctx.strokeStyle = 'rgba(141,119,95,0.26)';
  ctx.lineWidth = 1;
  ctx.strokeRect(56, 56, W - 112, H - 112);

  // Corners
  ctx.strokeStyle = '#8D775F';
  ctx.lineWidth = 2.5;
  drawCorners(ctx, W, H, 56);

  // Top decorative bars
  for (let i = 0; i < 3; i++) {
    const barY = 95 + i * 15;
    ctx.strokeStyle = `rgba(141,119,95,${[0.45, 0.22, 0.10][i]})`;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(110, barY); ctx.lineTo(W - 110, barY); ctx.stroke();
  }

  // ── Logo ──
  try {
    const logo = await loadImage('/logo.png');
    const maxW = 310, maxH = 195;
    const scale = Math.min(maxW / logo.naturalWidth, maxH / logo.naturalHeight);
    const lW = logo.naturalWidth * scale, lH = logo.naturalHeight * scale;
    ctx.save();
    // multiply: white bg × bone bg = bone (disappears), colored marks × bone = stays visible
    ctx.globalCompositeOperation = 'multiply';
    ctx.drawImage(logo, CX - lW / 2, 100, lW, lH);
    ctx.restore();
  } catch {
    // Fallback text
    ctx.direction = 'rtl';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 70px "Assistant","Heebo",Arial,sans-serif';
    ctx.fillStyle = '#2D2926';
    ctx.fillText('בנין איתן', CX, 196);
    ctx.font = '28px "Assistant","Heebo",Arial,sans-serif';
    ctx.fillStyle = '#8D775F';
    ctx.fillText('הנדסה ובנייה', CX, 260);
  }

  // Bronze rule
  ctx.lineWidth = 1.5;
  fadeLineH(ctx, 100, W - 100, 314, '#8D775F');

  // Gift voucher label
  ctx.font = '42px "Assistant","Heebo",Arial,sans-serif';
  ctx.fillStyle = '#2D2926';
  ctx.fillText('\u05E9\u05D5\u05D1\u05E8 \u05DE\u05EA\u05E0\u05D4', CX, 386);

  // Flanking diamonds on the label
  diamond(ctx, CX - 218, 386, 11, '#8D775F');
  diamond(ctx, CX + 218, 386, 11, '#8D775F');

  // "For the honour of"
  ctx.font = '30px "Assistant","Heebo",Arial,sans-serif';
  ctx.fillStyle = 'rgba(45,41,38,0.52)';
  ctx.fillText('\u05DC\u05DB\u05D1\u05D5\u05D3', CX, 472);

  // Employee name
  ctx.font = 'bold 92px "Assistant","Heebo",Arial,sans-serif';
  ctx.fillStyle = '#2D2926';
  ctx.fillText(emp.name, CX, 618);

  // Amount
  ctx.save();
  ctx.direction = 'ltr';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 90px "Assistant","Heebo",Arial,sans-serif';
  ctx.fillStyle = '#8D775F';
  ctx.fillText(`\u20AA${emp.amount}`, CX, 768);
  ctx.restore();

  // Underline below amount
  ctx.strokeStyle = 'rgba(141,119,95,0.48)';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(CX - 150, 824); ctx.lineTo(CX + 150, 824); ctx.stroke();

  // Diamond divider
  const divY = 890;
  diamond(ctx, CX, divY, 13, '#8D775F');
  ctx.lineWidth = 1;
  const dg1 = ctx.createLinearGradient(120, 0, CX - 20, 0);
  dg1.addColorStop(0, 'transparent');
  dg1.addColorStop(1, 'rgba(141,119,95,0.5)');
  ctx.strokeStyle = dg1;
  ctx.beginPath(); ctx.moveTo(120, divY); ctx.lineTo(CX - 20, divY); ctx.stroke();
  const dg2 = ctx.createLinearGradient(CX + 20, 0, W - 120, 0);
  dg2.addColorStop(0, 'rgba(141,119,95,0.5)');
  dg2.addColorStop(1, 'transparent');
  ctx.strokeStyle = dg2;
  ctx.beginPath(); ctx.moveTo(CX + 20, divY); ctx.lineTo(W - 120, divY); ctx.stroke();

  // Personal message
  const msg =
    '\u05D1\u05D4\u05DB\u05E8\u05EA \u05EA\u05D5\u05D3\u05D4 \u05E2\u05DE\u05D5\u05E7\u05D4 \u05E2\u05DC \u05DE\u05E1\u05D9\u05E8\u05D5\u05EA\u05DA, \u05D4\u05E0\u05D0\u05DE\u05E0\u05D5\u05EA \u05D5\u05D4\u05E8\u05D5\u05D7 \u05D4\u05D8\u05D5\u05D1\u05D4 \u05E9\u05D0\u05EA\u05D4 \u05DE\u05D1\u05D9\u05D0 \u05DC\u05D1\u05E0\u05D9\u05DF \u05D0\u05D9\u05EA\u05DF \u05D1\u05DB\u05DC \u05D9\u05D5\u05DD. \u05D1\u05E8\u05E6\u05D5\u05E0\u05D9 \u05DC\u05D4\u05D1\u05D9\u05E2 \u05D0\u05EA \u05D4\u05E2\u05E8\u05DB\u05EA\u05D9 \u05D4\u05DB\u05E0\u05D4 \u05DC\u05E2\u05D1\u05D5\u05D3\u05EA\u05DA \u05D5\u05DC\u05EA\u05E8\u05D5\u05DE\u05EA\u05DA \u05DC\u05E6\u05D5\u05D5\u05EA \u05D4\u05DE\u05E6\u05D5\u05D9\u05DF \u05E9\u05DC\u05E0\u05D5. \u05D9\u05D4\u05D9 \u05E8\u05E6\u05D5\u05DF \u05E9\u05D4\u05E9\u05E0\u05D4 \u05D4\u05D1\u05D0\u05D4 \u05EA\u05D1\u05D9\u05D0 \u05DC\u05DA \u05D5\u05DC\u05DE\u05E9\u05E4\u05D7\u05EA\u05DA \u05D4\u05D8\u05D5\u05D1\u05D4 \u05D1\u05E8\u05D9\u05D0\u05D5\u05EA, \u05E0\u05D7\u05EA, \u05E9\u05DE\u05D7\u05D4 \u05D5\u05E9\u05E4\u05E2 \u05D1\u05DB\u05DC \u05DE\u05E2\u05E9\u05D9 \u05D9\u05D3\u05D9\u05DA.';

  ctx.font = '36px "Assistant","Heebo",Arial,sans-serif';
  ctx.fillStyle = 'rgba(45,41,38,0.80)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const msgLines = wrapText(ctx, msg, 860);
  let msgY = 960;
  for (const line of msgLines) {
    ctx.fillText(line, CX, msgY);
    msgY += 57;
  }

  // Vendor box
  const vbY = 1578, vbH = 172;
  roundRect(ctx, 80, vbY, W - 160, vbH, 14);
  ctx.fillStyle = 'rgba(141,119,95,0.07)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(141,119,95,0.32)';
  ctx.lineWidth = 1.5;
  roundRect(ctx, 80, vbY, W - 160, vbH, 14);
  ctx.stroke();

  ctx.textBaseline = 'top';
  ctx.font = 'bold 33px "Assistant","Heebo",Arial,sans-serif';
  ctx.fillStyle = '#2D2926';
  ctx.fillText('אלקטרו סליל המגרש — סניף תלפיות', CX, vbY + 28);

  ctx.font = '27px "Assistant","Heebo",Arial,sans-serif';
  ctx.fillStyle = 'rgba(45,41,38,0.58)';
  ctx.fillText('רחוב חרשי הברזל 8, תלפיות, ירושלים', CX, vbY + 82);

  ctx.font = '25px "Assistant","Heebo",Arial,sans-serif';
  ctx.fillStyle = '#8D775F';
  ctx.fillText('בתוקף עד: ד׳ סיוון תשפ״ו  |  31 במאי 2026', CX, vbY + 134);

  // Signature
  ctx.font = '32px "Assistant","Heebo",Arial,sans-serif';
  ctx.fillStyle = 'rgba(45,41,38,0.50)';
  ctx.fillText('\u05D1\u05D9\u05D3\u05D9\u05D3\u05D5\u05EA \u05D5\u05D1\u05D4\u05D5\u05E7\u05E8\u05D4,', CX, 1796);

  ctx.font = 'bold 52px "Assistant","Heebo",Arial,sans-serif';
  ctx.fillStyle = '#2D2926';
  ctx.fillText('\u05DE\u05D5\u05D8\u05D9', CX, 1854);

  // Bottom decorative bars (mirror)
  for (let i = 0; i < 3; i++) {
    const barY = H - 95 - i * 15;
    ctx.strokeStyle = `rgba(141,119,95,${[0.45, 0.22, 0.10][i]})`;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(110, barY); ctx.lineTo(W - 110, barY); ctx.stroke();
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
              style={{
                width: '360px',
                height: '640px',
                borderRadius: '14px',
                boxShadow: '0 24px 64px rgba(0,0,0,0.65)',
              }}
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
