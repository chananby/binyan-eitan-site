/**
 * Word-problems engine — Hebrew story problems for grades 3–4.
 * All answers are positive integers (compatible with JuniorKeypad).
 */

import type { Difficulty, MathQuestion } from "../types";

const NAMES  = ["נועה", "יובל", "רון", "מיה", "תום", "דנה", "גל", "אור", "שיר", "עידו"];
const ITEMS  = ["עוגיות", "כדורים", "מדבקות", "ספרים", "צבעים", "תפוחים", "כרטיסים", "אבנים"];
const FRUITS = ["תפוחים", "תפוזים", "בננות", "ענבים", "אגסים"];

const pick  = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const rand  = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;

let _seq = 0;
const uid  = () => `wp-${Date.now()}-${++_seq}`;
const two  = () => { const a = pick(NAMES); return [a, pick(NAMES.filter(n => n !== a))]; };

// ── Level 1 — simple add / subtract ──────────────────────────────────────────

function level1(): MathQuestion {
  const [n1, n2] = two();
  const type = rand(0, 4);

  if (type === 0) {
    // addition
    const a = rand(6, 25), b = rand(4, 18);
    const item = pick(ITEMS);
    return {
      id: uid(), difficulty: 1,
      text: `ל${n1} יש ${a} ${item}. ${n2} נותן לו עוד ${b}. כמה ${item} יש ל${n1} עכשיו?`,
      answer: a + b, unit: item,
      hint: `${a} + ${b} = ?`,
      fullSolution: [`${a} + ${b} = ${a + b}`, `ל${n1} יש ${a + b} ${item}`],
    };
  }
  if (type === 1) {
    // subtraction — give away
    const total = rand(12, 35), give = rand(3, total - 4);
    const item  = pick(ITEMS);
    return {
      id: uid(), difficulty: 1,
      text: `ל${n1} היו ${total} ${item}. הוא נתן ${give} ל${n2}. כמה נשארו ל${n1}?`,
      answer: total - give, unit: item,
      hint: `${total} − ${give} = ?`,
      fullSolution: [`${total} − ${give} = ${total - give}`, `נשארו ${total - give} ${item}`],
    };
  }
  if (type === 2) {
    // money change
    const price  = rand(4, 18);
    const extra  = rand(1, 5) * 5; // change is multiple of 5
    const paid   = price + extra;
    return {
      id: uid(), difficulty: 1,
      text: `${n1} קנה ספר ב-${price} ₪ ושילם ${paid} ₪. כמה עודף קיבל?`,
      answer: extra, unit: "₪",
      hint: `${paid} − ${price} = ?`,
      fullSolution: [`${paid} − ${price} = ${extra}`, `העודף הוא ${extra} ₪`],
    };
  }
  if (type === 3) {
    // equal split / 2
    const each  = rand(3, 14);
    const total = each * 2;
    const item  = pick(ITEMS);
    return {
      id: uid(), difficulty: 1,
      text: `יש ${total} ${item}. ${n1} ו${n2} מחלקים אותם בשווה. כמה ${item} לכל אחד?`,
      answer: each, unit: item,
      hint: `${total} ÷ 2 = ?`,
      fullSolution: [`${total} ÷ 2 = ${each}`, `לכל אחד ${each} ${item}`],
    };
  }
  // type 4: how many more
  const a2 = rand(8, 30), b2 = rand(2, a2 - 2);
  const item2 = pick(FRUITS);
  return {
    id: uid(), difficulty: 1,
    text: `ל${n1} יש ${a2} ${item2} וְל${n2} יש ${b2}. כמה ${item2} יש ל${n1} יותר מ${n2}?`,
    answer: a2 - b2, unit: item2,
    hint: `${a2} − ${b2} = ?`,
    fullSolution: [`${a2} − ${b2} = ${a2 - b2}`, `ל${n1} יש ${a2 - b2} יותר`],
  };
}

// ── Level 2 — multiplication / division ──────────────────────────────────────

function level2(): MathQuestion {
  const [n1, n2] = two();
  const type = rand(0, 3);

  if (type === 0) {
    // equal groups
    const groups = rand(2, 8), each = rand(3, 9);
    const item   = pick(ITEMS);
    return {
      id: uid(), difficulty: 2,
      text: `יש ${groups} קבוצות. בכל קבוצה ${each} ${item}. כמה ${item} יש בסך הכל?`,
      answer: groups * each, unit: item,
      hint: `${groups} × ${each} = ?`,
      fullSolution: [`${groups} × ${each} = ${groups * each}`, `יש ${groups * each} ${item}`],
    };
  }
  if (type === 1) {
    // price × quantity
    const price = rand(2, 9), qty = rand(3, 8);
    const item  = pick(["עט", "מחברת", "גלויה", "ממתק", "קלמר"]);
    return {
      id: uid(), difficulty: 2,
      text: `${n1} קנה ${qty} ${item}. כל ${item} עולה ${price} ₪. כמה שילם בסך הכל?`,
      answer: price * qty, unit: "₪",
      hint: `${qty} × ${price} = ?`,
      fullSolution: [`${qty} × ${price} = ${price * qty}`, `${n1} שילם ${price * qty} ₪`],
    };
  }
  if (type === 2) {
    // equal sharing (division)
    const divisor = rand(2, 6), each = rand(3, 9);
    const total   = divisor * each;
    const item    = pick(ITEMS);
    return {
      id: uid(), difficulty: 2,
      text: `יש ${total} ${item} שמחולקים בשווה בין ${divisor} ילדים. כמה ${item} לכל ילד?`,
      answer: each, unit: item,
      hint: `${total} ÷ ${divisor} = ?`,
      fullSolution: [`${total} ÷ ${divisor} = ${each}`, `לכל ילד ${each} ${item}`],
    };
  }
  // type 3: rows × cols (seating / arrangement)
  const rows = rand(3, 7), cols = rand(3, 7);
  return {
    id: uid(), difficulty: 2,
    text: `באולם יש ${rows} שורות. בכל שורה ${cols} כיסאות. כמה כיסאות יש בסך הכל?`,
    answer: rows * cols, unit: "כיסאות",
    hint: `${rows} × ${cols} = ?`,
    fullSolution: [`${rows} × ${cols} = ${rows * cols}`, `יש ${rows * cols} כיסאות`],
  };
}

// ── Level 3 — two-step problems ───────────────────────────────────────────────

function level3(): MathQuestion {
  const [n1, n2] = two();
  const type = rand(0, 3);

  if (type === 0) {
    // budget − (qty × price)
    const qty    = rand(2, 5), price = rand(3, 8);
    const spent  = qty * price;
    const budget = spent + rand(2, 6) * 5; // ensure positive remainder
    const left   = budget - spent;
    return {
      id: uid(), difficulty: 3,
      text: `ל${n1} יש ${budget} ₪. הוא קנה ${qty} ספרים ב-${price} ₪ כל אחד. כמה כסף נשאר לו?`,
      answer: left, unit: "₪",
      hint: `שלב 1: ${qty} × ${price}  |  שלב 2: ${budget} − ?`,
      fullSolution: [
        `שלב 1: ${qty} × ${price} = ${spent} ₪`,
        `שלב 2: ${budget} − ${spent} = ${left} ₪`,
        `נשארו ${left} ₪`,
      ],
    };
  }
  if (type === 1) {
    // A has X, B has X−d, together = ?
    const aHas = rand(8, 20), diff = rand(2, 6);
    const bHas = aHas - diff;
    const item  = pick(ITEMS);
    return {
      id: uid(), difficulty: 3,
      text: `ל${n1} יש ${aHas} ${item}. ל${n2} יש ${diff} פחות מ${n1}. כמה ${item} יש להם ביחד?`,
      answer: aHas + bHas, unit: item,
      hint: `כמה יש ל${n2}? ואז חבר`,
      fullSolution: [
        `ל${n2}: ${aHas} − ${diff} = ${bHas}`,
        `ביחד: ${aHas} + ${bHas} = ${aHas + bHas}`,
        `יש ${aHas + bHas} ${item} ביחד`,
      ],
    };
  }
  if (type === 2) {
    // total shared, minus what one gave away
    const groups = rand(3, 6), each2 = rand(4, 8);
    const total  = groups * each2;
    const gave   = rand(2, each2 - 1);
    const left2  = each2 - gave;
    const item   = pick(FRUITS);
    return {
      id: uid(), difficulty: 3,
      text: `חולקו ${total} ${item} בשווה ל-${groups} ילדים. ${n1} נתן ${gave} ${item} ל${n2}. כמה ${item} יש ל${n1} עכשיו?`,
      answer: left2, unit: item,
      hint: `שלב 1: ${total} ÷ ${groups}  |  שלב 2: ? − ${gave}`,
      fullSolution: [
        `שלב 1: ${total} ÷ ${groups} = ${each2}`,
        `שלב 2: ${each2} − ${gave} = ${left2}`,
        `ל${n1} יש ${left2} ${item}`,
      ],
    };
  }
  // type 3: earned + saved, minus purchase
  const wage = rand(5, 10), days = rand(3, 6);
  const saved = rand(10, 25);
  const total2 = wage * days + saved;
  const cost   = rand(2, total2 - 5);
  const left3  = total2 - cost;
  return {
    id: uid(), difficulty: 3,
    text: `${n1} הרוויח ${wage} ₪ ביום במשך ${days} ימים, ויש לו עוד ${saved} ₪ חיסכון. הוא קנה מתנה ב-${cost} ₪. כמה כסף נשאר לו?`,
    answer: left3, unit: "₪",
    hint: `שלב 1: ${wage} × ${days} + ${saved}  |  שלב 2: ? − ${cost}`,
    fullSolution: [
      `שלב 1: ${wage} × ${days} = ${wage * days}`,
      `סה"כ: ${wage * days} + ${saved} = ${total2}`,
      `שלב 2: ${total2} − ${cost} = ${left3} ₪`,
    ],
  };
}

// ── Level 4 — percentage word problems ───────────────────────────────────────

function level4(): MathQuestion {
  const [n1] = two();
  const type = rand(0, 2);

  if (type === 0) {
    // "price increased by X%, how much now?"
    const pcts   = [10, 20, 25, 50];
    const pct    = pick(pcts as unknown as string[]) as unknown as number;
    const orig   = pct === 25 ? rand(2, 8) * 4 : rand(1, 9) * 10;
    const change = (orig * pct) / 100;
    const answer = orig + change;
    return {
      id: uid(), difficulty: 4,
      text: `המחיר המקורי של ${n1} היה ${orig} ₪.\nהמחיר עלה ב-${pct}%.\nמה המחיר החדש?`,
      answer, unit: "₪",
      hint: `מצא ${pct}% מ-${orig} ואז הוסף`,
      fullSolution: [
        `שלב 1: ${pct}% מ-${orig} — ${orig} × ${pct} ÷ 100 = ${change} ₪`,
        `שלב 2: ${orig} + ${change} = ${answer} ₪`,
        `✅ תשובה: ${answer} ₪`,
      ],
    };
  }
  if (type === 1) {
    // "after X% discount, how much do you pay?"
    const pcts = [10, 20, 25, 50];
    const pct  = pick(pcts as unknown as string[]) as unknown as number;
    const orig = pct === 25 ? rand(2, 8) * 4 : rand(1, 9) * 10;
    const discount = (orig * pct) / 100;
    const answer   = orig - discount;
    return {
      id: uid(), difficulty: 4,
      text: `מחיר מלא: ${orig} ₪.\nהנחה של ${pct}%.\nכמה משלמים?`,
      answer, unit: "₪",
      hint: `מצא ${pct}% מ-${orig} וחסר`,
      fullSolution: [
        `שלב 1: הנחה — ${orig} × ${pct} ÷ 100 = ${discount} ₪`,
        `שלב 2: ${orig} − ${discount} = ${answer} ₪`,
        `✅ תשובה: ${answer} ₪`,
      ],
    };
  }
  // "profit = sold − bought, what % profit?"
  const bought = rand(2, 8) * 10;
  const pcts   = [10, 20, 25, 50];
  const pct    = pick(pcts as unknown as string[]) as unknown as number;
  const profit = (bought * pct) / 100;
  const sold   = bought + profit;
  return {
    id: uid(), difficulty: 4,
    text: `${n1} קנה פריט ב-${bought} ₪ ומכר אותו ב-${sold} ₪.\nכמה אחוזי רווח עשה?`,
    answer: pct, unit: "%",
    hint: `(${sold} − ${bought}) ÷ ${bought} × 100`,
    fullSolution: [
      `שלב 1: רווח — ${sold} − ${bought} = ${profit} ₪`,
      `שלב 2: אחוז רווח — ${profit} ÷ ${bought} × 100 = ${pct}%`,
      `✅ תשובה: ${pct}%`,
    ],
  };
}

// ── Level 5 — three-step complex problems ─────────────────────────────────────

function level5(): MathQuestion {
  const [n1, n2] = two();
  const type = rand(0, 2);

  if (type === 0) {
    // Earn × days − expense × days
    const wage    = rand(5, 12);
    const workDays = rand(4, 7);
    const expDay  = rand(2, wage - 1);
    const expDays = rand(2, 4);
    const earned  = wage * workDays;
    const spent   = expDay * expDays;
    const answer  = earned - spent;
    if (answer <= 0) return level5(); // retry if negative
    return {
      id: uid(), difficulty: 5,
      text: `${n1} מרוויח ${wage} ₪ ליום ועובד ${workDays} ימים.\nהוא מוציא ${expDay} ₪ ליום על אוכל למשך ${expDays} ימים.\nכמה כסף נשאר לו?`,
      answer, unit: "₪",
      hint: `שלב 1: כמה הרוויח? שלב 2: כמה הוציא? שלב 3: חסר`,
      fullSolution: [
        `שלב 1: ${wage} × ${workDays} = ${earned} ₪`,
        `שלב 2: ${expDay} × ${expDays} = ${spent} ₪`,
        `שלב 3: ${earned} − ${spent} = ${answer} ₪`,
        `✅ תשובה: ${answer} ₪`,
      ],
    };
  }
  if (type === 1) {
    // Split + give fraction
    const groups = rand(3, 5);
    const each   = rand(4, 9);
    const total  = groups * each;
    const den    = rand(2, 4);
    if (each % den !== 0) return level5(); // ensure clean division
    const gave   = each / den;
    const left   = each - gave;
    return {
      id: uid(), difficulty: 5,
      text: `חולקו ${total} ספרים ל-${groups} ילדים בשווה.\n${n1} נתן ${n2} רבע מהספרים שקיבל.\nכמה ספרים יש ל${n1} עכשיו?`,
      answer: left, unit: "ספרים",
      hint: `שלב 1: כמה קיבל? שלב 2: כמה הוא רבע מזה?`,
      fullSolution: [
        `שלב 1: ${total} ÷ ${groups} = ${each} ספרים`,
        `שלב 2: נתן 1/${den} — ${each} ÷ ${den} = ${gave}`,
        `שלב 3: ${each} − ${gave} = ${left}`,
        `✅ תשובה: ${left} ספרים`,
      ],
    };
  }
  // type 2: total items, fraction sold, fraction of rest kept
  const total   = rand(3, 6) * 10;
  const soldFrac = 2; // sold half
  const sold    = total / soldFrac;
  const rest    = total - sold;
  const keptFrac = rand(2, 4);
  if (rest % keptFrac !== 0) return level5();
  const kept = rest / keptFrac;
  return {
    id: uid(), difficulty: 5,
    text: `${n1} הכין ${total} עוגיות.\nהוא מכר מחצית מהן.\nמ-השאריות, הוא שמר 1/${keptFrac} לעצמו.\nכמה עוגיות שמר?`,
    answer: kept, unit: "עוגיות",
    hint: `שלב 1: כמה נמכרו? שלב 2: כמה נשאר? שלב 3: 1/${keptFrac} מהשאריות`,
    fullSolution: [
      `שלב 1: ${total} ÷ 2 = ${sold} נמכרו`,
      `שלב 2: ${total} − ${sold} = ${rest} נשאר`,
      `שלב 3: ${rest} ÷ ${keptFrac} = ${kept} שמר`,
      `✅ תשובה: ${kept} עוגיות`,
    ],
  };
}

// ── Public export ─────────────────────────────────────────────────────────────

export function generateQuestion(d: Difficulty): MathQuestion {
  if (d === 1) return level1();
  if (d === 2) return level2();
  if (d === 3) return level3();
  if (d === 4) return level4();
  return level5();
}
