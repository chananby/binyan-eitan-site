"use client";

import { useState, useCallback } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Question {
  question: string;
  options: string[];
  answer: number;
  rationale: string;
}

type Step = "start" | "quiz" | "level_end";

// ── Sound Engine ─────────────────────────────────────────────────────────────
// AudioContext is created lazily inside a user-gesture handler — safe from SSR.
function playSfx(type: "correct" | "wrong") {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.05, ctx.currentTime);
    if (type === "correct") {
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);
    } else {
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(110, ctx.currentTime + 0.2);
    }
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch { /* ignore — browser may block autoplay */ }
}

// ── Brand Logo ────────────────────────────────────────────────────────────────
function BrandLogo({ light = false }: { light?: boolean }) {
  return (
    <div className="flex flex-col items-center mb-2">
      <svg
        width="72"
        height="72"
        viewBox="0 0 200 200"
        fill="none"
        className="purim-float"
        aria-hidden="true"
      >
        <path
          d="M50 160V90L100 50L150 90V160H50Z"
          fill={light ? "white" : "#4c1d95"}
          fillOpacity="0.1"
          stroke={light ? "white" : "#4c1d95"}
          strokeWidth="6"
        />
        <path
          d="M35 100C35 92 50 85 80 88C100 88 100 95 120 95C150 95 165 92 165 100C165 115 145 130 100 130C55 130 35 115 35 100Z"
          fill="#FACC15"
          stroke={light ? "#4c1d95" : "white"}
          strokeWidth="3"
        />
        <circle cx="70" cy="108" r="7" fill="#4C1D95" />
        <circle cx="130" cy="108" r="7" fill="#4C1D95" />
        <path d="M100 25L108 40H92L100 25Z" fill="#FACC15" />
        <path d="M100 45L92 30H108L100 45Z" fill="#FACC15" />
      </svg>
      <p className={`mt-1 font-black text-xl ${light ? "text-white" : "text-purple-900"}`}>
        בניין איתן
      </p>
    </div>
  );
}

// ── Level 1 Questions — Basic & Intermediate ──────────────────────────────────
const QUIZ_A: Question[] = [
  {
    question: 'מדוע נגזרה גזירת כליה על עם ישראל בימי אחשוורוש לפי חז"ל?',
    options: ["מפני שהשתחוו לפסל ונהנו מסעודת אחשוורוש", "מפני ששכחו את תורת משה", "מפני שלא עלו לארץ ישראל", "מפני שמרדכי לא השתחווה"],
    answer: 0,
    rationale: "הגמרא מציינת ששילוב העבודה זרה מהעבר וההנאה מסעודת אחשוורוש גרמו לקטרוג השמימי.",
  },
  {
    question: "מדוע סירב מרדכי להשתחוות להמן?",
    options: ["בגלל האיבה בין יהודה לעמלק", "מכיוון שהמן חקק צלם עבודה זרה על בגדו", "מכיוון שהמן היה עבד של מרדכי", "כי המלך לא באמת ציווה"],
    answer: 1,
    rationale: "המן הפך את עצמו לאלוהות או נשא עליו סמל עבודה זרה, ולכן מרדכי מסר את הנפש ולא כרע.",
  },
  {
    question: "מהו הסכום שהציע המן למלך תמורת השמדת היהודים?",
    options: ["5,000 כיכר זהב", "100,000 מנה כסף", "7,000 כיכר כסף", "10,000 כיכר כסף"],
    answer: 3,
    rationale: 'זהו הסכום הנקוב במגילה, וחז"ל אומרים שהשקלים הללו באו כנגד עשרת אלפי מחצית השקל של בני ישראל.',
  },
  {
    question: 'באיזה תאריך חלו שלושת ימי הצום שגזרה אסתר?',
    options: ['י"א-י"ג באדר', 'י"ג-ט"ו בניסן', "א'-ג' בסיוון", 'י\'-י"ב בתשרי'],
    answer: 1,
    rationale: "הצום היה בחודש ניסן, ואסתר עמדה על כך שיצומו למרות שזה גרם לביטול אכילת מצה בשמחת הפסח.",
  },
  {
    question: "מה היה הקשר המשפחתי המקורי בין מרדכי לאסתר?",
    options: ["דוד ואחיינית", "אחים", "בני דודים (בת דודו)", "סבא ונכדה"],
    answer: 2,
    rationale: "הפסוק אומר: 'בת אביחיל דוד מרדכי', כלומר מרדכי ואביה היו אחים.",
  },
  {
    question: "מי היו בגתן ותרש ומה היה תפקידם בארמון?",
    options: ["יועצי המלך", "שומרי הסף שניסו להתנקש במלך", "שרי הצבא", "טבחי הארמון"],
    answer: 1,
    rationale: "הם היו שני סריסים משומרי הסף שקצפו על המלך ורצו לשלוח בו יד.",
  },
  {
    question: "מדוע נקרא החג 'פורים'?",
    options: ["מלשון פורענות", "על שם הפאר של אסתר", "על שם ה'פור' (הגורל)", "מלשון הפרה"],
    answer: 2,
    rationale: "על שם הגורל (פור) שהפיל המן לקביעת יום ההשמדה — שהתהפך לטובה.",
  },
  {
    question: "אילו ערים חוגגות את פורים בט\"ו באדר (שושן פורים)?",
    options: ["ערים גדולות", "ערי בירה", "ערים שהיו מוקפות חומה מימי יהושע בן נון", "רק ירושלים ושושן"],
    answer: 2,
    rationale: "תיקנו לפי זמן יהושע כדי לחלוק כבוד לארץ ישראל שהייתה חרבה בזמן הנס.",
  },
  {
    question: "מי היה חרבונה ומה היה חלקו בסוף המגילה?",
    options: ["בנו של המן", "שליח המלך", "סריס שהזכיר את העץ של המן", "משרת אסתר"],
    answer: 2,
    rationale: "הוא הפנה את תשומת לב המלך לעץ שבנה המן עבור מרדכי, ובכך זירז את תלייתו.",
  },
  {
    question: "כיצד קוראים את שמות עשרת בני המן על פי ההלכה?",
    options: ["במנגינה עליזה", "בקול רם", "בלחישה", "בנשימה אחת"],
    answer: 3,
    rationale: "קוראים בנשימה אחת כדי להראות שכולם מתו יחד ונספו ברגע אחד.",
  },
  {
    question: "מדוע נהוג להתחפש בפורים על פי המחשבה היהודית?",
    options: ["קרנבל חיצוני", "שהעניים לא יתביישו", "לזכר הנס בהסתרה ('הסתר פנים')", "להידמות למרדכי"],
    answer: 2,
    rationale: "לבטא את השגחת השם הנסתרת בתוך מסווה הטבע (הסתר פנים).",
  },
  {
    question: 'כמה פעמים מופיע שם השם (י-ה-ו-ה) במגילת אסתר?',
    options: ["אף פעם לא בגלוי", "פעם אחת", "7 פעמים", "בכל פרק"],
    answer: 0,
    rationale: 'המגילה היא הספר היחיד בתנ"ך ללא שם השם המפורש בגלוי, לסמל את ההשגחה הנסתרת.',
  },
  {
    question: "מהו 'פורים משולש'?",
    options: ["אדר א', ב' ושושן", 'כשפורים (ט"ו) חל בשבת ומחלקים את המצוות', "חגיגה של 3 ימים", "פורים ביום שלישי"],
    answer: 1,
    rationale: "בירושלים מחלקים את המצוות לשישי, שבת וראשון כדי למנוע חילול שבת.",
  },
  {
    question: "האם נשים חייבות בקריאת המגילה?",
    options: ["פטורות (מצוות עשה שהזמן גרמה)", "חייבות, כי 'אף הן היו באותו הנס'", "רק רווקות", "רק שמיעה אך לא קריאה"],
    answer: 1,
    rationale: "החיוב חל על נשים כי הנס נעשה על ידי אסתר ועבורן באותה מידה של סכנה.",
  },
  {
    question: "איזו תפילה מוסיפים בעמידה ובברכת המזון בפורים?",
    options: ["יעלה ויבוא", "הלל", "מעין המאורע", "על הניסים"],
    answer: 3,
    rationale: "זוהי תוספת ההודיה המיוחדת לימי הנס של פורים וחנוכה.",
  },
  {
    question: "מה הכמות המינימלית לקיום 'משלוח מנות'?",
    options: ["מנה אחת גדולה", "שתי מנות מאכל שונות לאדם אחד", "לחם ומים", "פירות ושוקולד בלבד"],
    answer: 1,
    rationale: "המילה היא 'מנות' (רבים) ו'משלוח' (יחיד) — שתי מנות שונות המוכנות לאכילה לאדם אחד לפחות.",
  },
  {
    question: "מהי ההגדרה ההלכתית של 'מתנות לאביונים' (כמות מינימלית)?",
    options: ["מתנה אחת לעני אחד", "שתי מתנות לשני עניים שונים", "מחצית השקל לכל עני", "תרומה לבית הכנסת"],
    answer: 1,
    rationale: "שתי מתנות (אחת לכל אחד) לשני אביונים.",
  },
  {
    question: "מה היה שמה העברי המקורי של אסתר המלכה?",
    options: ["שרה", "רחל", "הדסה", "איילת"],
    answer: 2,
    rationale: "הפסוק מציין: 'ויהי אומן את הדסה היא אסתר'.",
  },
  {
    question: 'למה נמשלה אסתר במזמור כ"ב בתהילים שאנו קוראים בפורים?',
    options: ["שושנה", "גפן", "איילת השחר", "יונה"],
    answer: 2,
    rationale: "המדרש מזהה את איילת השחר כאסתר המאירה את הגלות, כפי שהשחר מאיר את סוף הלילה.",
  },
  {
    question: "מהי משמעות המילים 'קיבלו וקיימו' בסוף המגילה?",
    options: ["עלייה לירושלים", "צבא חזק", "ביטול צומות", "קבלת התורה מחדש מרצון"],
    answer: 3,
    rationale: 'חז"ל מלמדים שבפורים יהודים קיבלו את התורה מאהבה, בניגוד לכפייה שהייתה בסיני.',
  },
  {
    question: "מי הייתה זרש ומה הציעה להמן?",
    options: ["אשת המן — הציעה לבנות עץ ולתלות את מרדכי", "אחות המלך", "יועצת אסתר", "מלכת פרס"],
    answer: 0,
    rationale: "זרש הייתה אשתו של המן והיא זו שייעצה לו לבנות עץ בגובה 50 אמה.",
  },
  {
    question: "בפסוק 'ליהודים הייתה אורה ושמחה...', מהי ה'אורה' לפי חז\"ל?",
    options: ["אור השמש", "תורה", "שמחה", "עושר"],
    answer: 1,
    rationale: "הגמרא במסכת מגילה דורשת: אורה — זו תורה.",
  },
  {
    question: "מהו הדין של 'מחצית השקל' בזמן הזה?",
    options: ["חובה מהתורה לתת מטבע כסף", "מנהג לתת זכר למצווה שהייתה במקדש", "אסור לתת", "נותנים רק לעניים בפורים"],
    answer: 1,
    rationale: "זהו מנהג רווח בקהילות ישראל לזכר התרומה הקבועה שהייתה במקדש.",
  },
  {
    question: "מי כתב (ערך וחתם קנונית) את המגילה על פי הגמרא במסכת בבא בתרא?",
    options: ["מרדכי ואסתר", "אנשי כנסת הגדולה", "עזרא הסופר", "יהושע בן נון"],
    answer: 1,
    rationale: "הגמרא מציינת שאנשי כנסת הגדולה הם שכתבו וכללו את המגילה בתנ\"ך.",
  },
  {
    question: "מהו סדר הברכות לפני קריאת המגילה בלילה?",
    options: ["על מקרא מגילה, שעשה ניסים, שהחיינו", "שהחיינו, שעשה ניסים, מקרא מגילה", "רק שעשה ניסים", "ברכת השיר"],
    answer: 0,
    rationale: "זהו הסדר ההלכתי המקובל לקיום המצווה 'עובר לעשייתן'.",
  },
];

// ── Level 2 Questions — Advanced & Midrash ────────────────────────────────────
const QUIZ_B: Question[] = [
  {
    question: "אחשוורוש טעה בחישוב הגאולה ולכן עשה משתה בביטחון מופרז. כמה שנים הוא ספר בטעות?",
    options: ["45 שנה", "52 שנה", "70 שנה", "80 שנה"],
    answer: 2,
    rationale: "הוא טעה בחישוב 70 השנה מגלות יכניה שניבא ירמיהו, וחשב שהן הסתיימו מבלי שישראל נגאלו.",
  },
  {
    question: "מדוע נקרא מרדכי במגילה 'איש יהודי' למרות שהיה בכלל משבט בנימין?",
    options: ["כי אמו הייתה מיהודה", "כי כל הכופר בעבודה זרה נקרא יהודי", "כי היה מנהיג גלות יהודה", "כי היה נשוי לבת יהודה"],
    answer: 1,
    rationale: "הגמרא מסבירה שכל הכופר בעבודה זרה נקרא יהודי, על שם שיהודה כפר בעבודה זרה במעשה תמר.",
  },
  {
    question: "מדוע קצפו בגתן ותרש על המלך אחשוורוש (מעבר לפשט)?",
    options: ["המלך העביר אותם מתפקידם", "המלך לא שילם להם שכר", "כי היו נאמנים לושתי", "בגלל מינוי מרדכי שהכביד על משמרתם"],
    answer: 3,
    rationale: "המינוי של מרדכי 'יושב בשער המלך' שינה את סדרי השמירה והכביד עליהם, לכן רצו להתנקש.",
  },
  {
    question: "המן שמח מאוד כשנפל הגורל על חודש אדר. מדוע?",
    options: ["כי זה חודש האביב", "כי בחודש זה נפטר משה רבנו", "כי זה החודש האחרון בשנה", "כי מזלו של החודש דגים"],
    answer: 1,
    rationale: "הוא חשב שפטירתו של מנהיג ישראל היא מזל רע לישראל, אך לא ידע שבז' באדר משה גם נולד.",
  },
  {
    question: "מהו המהפך המרכזי המתואר בביטוי 'ונהפוך הוא' בפרק ט'?",
    options: ["שאסתר הפכה למלכה מיתומה", "שהמן נתלה במקום מרדכי", "אשר ישלטו היהודים המה בשונאיהם", "שאחשוורוש הפך לאוהב ישראל"],
    answer: 2,
    rationale: "המהפך היה צבאי ולאומי: היהודים הפכו לנשלטים לשולטים באויביהם ביום המיועד להשמדתם.",
  },
  {
    question: "מאיזה פסוק לומדים חז\"ל שלאסתר הייתה רוח הקודש (והיא אחת מ-7 נביאות)?",
    options: ["ותלבש אסתר מלכות", "ותמצא חן וחסד לפניו", "מי יודע אם לעת כזאת", "וכל יום ויום מרדכי מתהלך"],
    answer: 0,
    rationale: 'ותלבש אסתר מלכות — חז"ל דורשים שלבשה רוח הקודש (מלכות שמיים).',
  },
  {
    question: 'על פי המדרש (פרקי דר"א), מה היה המקור של העץ שגובהו 50 אמה שבנה המן?',
    options: ["מארזי הלבנון", "קורה מתיבת נח", "מעמודי שלמה המלך", "מהחומה של ירושלים"],
    answer: 1,
    rationale: "המדרש מציין שהיה זה עץ עתיק מתיבת נח שגובהה היה בדיוק 50 אמה.",
  },
  {
    question: "כיצד נוהגים לגבי קריאת המגילה בערים שיש ספק אם היו מוקפות חומה (כגון לוד או יפו)?",
    options: ['קוראים רק בט"ו', 'קוראים רק בי"ד', 'קוראים בי"ד בברכה ובט"ו ללא ברכה', "קוראים בשניהם בברכה"],
    answer: 2,
    rationale: 'מספק, קוראים ביום הפרזים (י"ד) בברכה, ובט"ו קוראים שוב ללא ברכה כדי לצאת ידי כל הדעות.',
  },
  {
    question: "חז\"ל מדמים את המלך אחשוורוש והמן ל'בעל התל' ו'בעל החריץ'. מה המשל מלמד?",
    options: ["שהמן היה עשיר יותר", "ששניהם שנאו את ישראל ורצו להיפטר מהם", "שהמלך היה תמים והמן רשע", "שהיהודים היו תקועים ביניהם"],
    answer: 1,
    rationale: "המשל מלמד שאחשוורוש שמח מאוד על הצעת המן, כי הוא רצה להשמיד את היהודים לא פחות ממנו.",
  },
  {
    question: "מהי ההגדרה ההלכתית המדויקת של 'אביון' לעניין מתנות לאביונים?",
    options: ["אדם שאין לו 200 זוז (ממון בסיסי למחיה)", "אדם שאין לו כסף לסעודת פורים", "כל מי שמבקש צדקה בפורים", "רק יתומים ואלמנות"],
    answer: 0,
    rationale: "זוהי ההגדרה ההלכתית הכללית של עני המופיעה במשנה ובשולחן ערוך (מי שאין לו כדי מחייתו הבסיסית לשנה).",
  },
  {
    question: "על פי המדרש, מדוע סירבה ושתי להופיע בפני המלך (שלא מטעמי צניעות)?",
    options: ["מתוך גאווה פרסית", "כי צמחה לה צרעת או זנב", "כי רצתה למרוד בשלטון", "כי התאבלה על אביה בלשצר"],
    answer: 1,
    rationale: "משמיים ניתן לה פגם פיזי (מידה כנגד מידה) כדי שלא תוכל להופיע בציבור כפי שביקש המלך הרשע.",
  },
  {
    question: "מהו המקור ההלכתי לחיוב קריאת המגילה גם ביום וגם בלילה?",
    options: ["מהפסוק 'יומם יצווה ה' חסדו'", "מהפסוק 'אלוהי אקרא יומם ולא תענה ולילה ולא דומיה לי'", "הלכה למשה מסיני", "ממספר הפעמים שאסתר באה למלך"],
    answer: 1,
    rationale: 'הגמרא לומדת זאת ממזמור כ"ב בתהילים (איילת השחר) המיוחס לתפילת אסתר המלכה.',
  },
  {
    question: "בזכות מי זכתה אסתר למלוך על 127 מדינות?",
    options: ["בזכות שנות חייה של שרה אימנו (127)", "כנגד 127 ימי המשתה שצמה", "כרמז לשנת הגאולה העתידית", "כדי להראות את עושרה הרב"],
    answer: 0,
    rationale: "המדרש אומר: 'תבוא אסתר שהייתה בת בתה של שרה שחיה 127 שנה, ותמלוך על 127 מדינות'.",
  },
  {
    question: "כשפורים חל בערב שבת (יום שישי), מתי ההלכה ממליצה לקיים את סעודת פורים?",
    options: ["בבוקר המוקדם (לפני חצות היום)", "סמוך לשקיעה יחד עם קידוש", "בליל שבת עצמו", "דוחים ליום ראשון"],
    answer: 0,
    rationale: "כדי שאדם ייכנס לסעודת ליל שבת בתיאבון ומתוך כבוד השבת, נהוג להקדים את סעודת הפורים לבוקר.",
  },
  {
    question: "את מי מזהים חז\"ל כדמות המסתתרת מאחורי השם של הסריס 'התך'?",
    options: ["עזרא הסופר", "דניאל הנביא", "יהושע בן יהוצדק", "אחד מבניו של המן"],
    answer: 1,
    rationale: "התך הוא דניאל, שנקרא כך כי 'חתכוהו' (הורידוהו) מגדולתו שהייתה לו בימי בבל.",
  },
  {
    question: "מדוע אין אומרים 'הלל' בפורים למרות הנס הגדול? (בחר בתשובה המקיפה ביותר)",
    options: ["כי הנס נעשה בחוץ לארץ", "כי קריאת המגילה היא עצמה ההלל", "כי עדיין נשארנו עבדי אחשוורוש (לא נגאלנו לגמרי)", "כל התשובות נכונות"],
    answer: 3,
    rationale: 'הגמרא במסכת מגילה (יד.) מביאה את כל שלוש הסיבות הללו כטעמים הלכתיים לאי אמירת הלל בפורים.',
  },
  {
    question: "מי מהבאים נחשב ל'זכור לטוב' בסוף קריאת המגילה (בפיוט אשר הניא)?",
    options: ["התך", "חרבונה", "ממוכן", "בגתן"],
    answer: 1,
    rationale: "אנו אומרים 'וגם חרבונה זכור לטוב' על עזרתו בהפלת המן ברגע הקריטי מול המלך.",
  },
  {
    question: "מי מזוהה במדרש כ'ממוכן', ומה הייתה הצעתו למלך?",
    options: ["דניאל הנביא", "המן — הציע להרוג את ושתי", "אליהו הנביא", "התך"],
    answer: 1,
    rationale: "חז\"ל מזהים את ממוכן כהמן ('שמוכן לפורענות'), שקפץ בראש השרים להציע להרוג את המלכה.",
  },
  {
    question: "על פי המדרש, מה קרה לביתו של המן בזמן שתהלוכת מרדכי עברה ברחוב?",
    options: ["היא ברחה מהעיר בבושה", "השליכה פרש על אביה בטעות, וכשגילתה זאת הפילה עצמה ומתה", "החליטה להתגייר ולהצטרף לאסתר", "ביקשה סליחה ממרדכי היהודי"],
    answer: 1,
    rationale: "היא חשבה שמרדכי מוביל את הסוס ואביה רוכב עליו. כשראתה שזה הפוך, נפלה מהחלון מרוב בושה.",
  },
  {
    question: "מדוע אסתר הזמינה את המן לסעודה ולא ביקשה מיד את בקשתה? (בחר בתשובה המקיפה ביותר)",
    options: ["כדי לעורר קנאה וחשד אצל המלך", "כדי שהיהודים לא יסמכו עליה אלא יתפללו לה'", "כדי להרדים את ערנותו וגאוותו של המן", "כל התשובות נכונות לפי חז\"ל"],
    answer: 3,
    rationale: 'הגמרא (מגילה טו:) מונה רשימה ארוכה של טעמים אסטרטגיים ורוחניים למהלך החכם של אסתר.',
  },
  {
    question: "מה הדין ההלכתי לגבי משלוח מנות שנשלח באמצעות ילד קטן (שליח מתחת לגיל מצוות)?",
    options: ["לא יוצאים ידי חובה בכלל", "יוצאים ידי חובה", "יוצאים רק אם השליח הגיע בשעות הערב", "חייב לשלוח רק עם שליח גדול (בר דעת)"],
    answer: 1,
    rationale: "המצווה היא שהמנות יגיעו ליעדן וישמחו את המקבל, ואין צורך ב'שליחות' הלכתית פורמלית של דעת.",
  },
  {
    question: "מה הוחרג מ'חצי המלכות' שהבטיח המלך לאסתר (לפי חז\"ל)?",
    options: ["הכתר של המלך עצמו", "בניית בית המקדש השני בירושלים", "זכותה של ושתי לחזור", "השליטה המלאה על כל 127 המדינות"],
    answer: 1,
    rationale: "חז\"ל דורשים ש'חצי המלכות' הוא דבר שחוצץ ועומד באמצע המלכות — וזהו בית המקדש.",
  },
  {
    question: "מה אומרת ההלכה לגבי אדם באבלות (תוך י\"ב חודש על הורים) בפורים?",
    options: ["האבל חייב לשלוח מנות כרגיל, אך חבריו נמנעים ממשלוח מנות (או של שמחה) אליו", "אבל פטור לחלוטין מכל מצוות פורים", "מותר וחובה לשלוח לו כרגיל כי פורים דוחה אבלות", "האבל שולח רק מתנות לאביונים"],
    answer: 0,
    rationale: "האבל עצמו חייב במצוות כי אין אבלות בפרהסיה, אך אחרים לא שולחים לו משום דין 'שאלת שלום' לאבל.",
  },
  {
    question: "מה קיבלו עליהם היהודים מחדש בפורים, כפי שדרשו חז\"ל על 'קיימו וקיבלו'?",
    options: ["עלייה המונית לארץ ישראל", "להקים צבא יהודי עצמאי", "את קיום התורה מרצון ומאהבה", "לשמור את מנהגי שושן"],
    answer: 2,
    rationale: "חז\"ל אומרים שבמעמד הר סיני הייתה כפייה ('כפה עליהם הר כגיגית') ובפורים קיבלו את התורה מחדש מתוך אהבת הנס.",
  },
];

// ── Score label helper ────────────────────────────────────────────────────────
function scoreLabel(score: number, total: number): string {
  const pct = score / total;
  if (pct === 1) return "בקיאות מדהימה! תשובות מושלמות.";
  if (pct >= 0.72) return "יישר כוח! ידע תורני מרשים ביותר.";
  return "סיום יפה! תמיד טוב לחזור למקורות וללמוד.";
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function PurimPage() {
  const [level, setLevel] = useState<1 | 2>(1);
  const [step, setStep] = useState<Step>("start");
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);

  const questions = level === 1 ? QUIZ_A : QUIZ_B;
  const current = questions[index];

  const startQuiz = useCallback(() => {
    setScore(0);
    setIndex(0);
    setStep("quiz");
    setAnswered(false);
    setSelected(null);
  }, []);

  const onSelect = useCallback(
    (i: number) => {
      if (answered) return;
      setSelected(i);
      setAnswered(true);
      const isCorrect = i === questions[index].answer;
      playSfx(isCorrect ? "correct" : "wrong");
      if (isCorrect) setScore((s) => s + 1);
    },
    [answered, index, questions]
  );

  const next = useCallback(() => {
    if (index + 1 < questions.length) {
      setIndex((i) => i + 1);
      setAnswered(false);
      setSelected(null);
    } else {
      setStep("level_end");
    }
  }, [index, questions.length]);

  const share = useCallback(() => {
    const lvlLabel = level === 1 ? "א'" : "ב'";
    const text = `הוצאתי ${score}/${questions.length} בשלב ${lvlLabel} של חידון פורים התורני מאת בניין איתן! בואו נראה אתכם עוקפים אותי 👑`;
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator.share({ title: "חידון פורים", text, url });
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(text + " " + url)}`, "_blank");
    }
  }, [score, questions.length, level]);

  return (
    <>
      {/* ── Custom keyframes (scoped to this page) ── */}
      <style>{`
        @keyframes purim-float {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(-10px); }
        }
        @keyframes purim-shake {
          10%, 90%         { transform: translate3d(-1px, 0, 0); }
          30%, 50%, 70%    { transform: translate3d(-2px, 0, 0); }
          40%, 60%         { transform: translate3d(2px, 0, 0); }
        }
        @keyframes purim-pulse-correct {
          0%   { box-shadow: 0 0 0 0   rgba(34, 197, 94, 0.45); }
          70%  { box-shadow: 0 0 0 10px rgba(34, 197, 94, 0);   }
          100% { box-shadow: 0 0 0 0   rgba(34, 197, 94, 0);    }
        }
        .purim-float   { animation: purim-float 6s ease-in-out infinite; }
        .purim-shake   { animation: purim-shake 0.5s both; }
        .purim-correct { animation: purim-pulse-correct 1.5s infinite; }
      `}</style>

      <main
        dir="rtl"
        className="min-h-screen bg-indigo-50 flex flex-col items-center overflow-x-hidden"
        style={{ touchAction: "pan-y" }}
      >
        {/* ── Morale Banner ── */}
        <div className="w-full bg-yellow-400 text-yellow-900 py-1.5 px-4 text-center font-bold text-xs sm:text-sm shadow-sm z-20 shrink-0">
          🇮🇱 פורים חזק ובטוח לכל עם ישראל במקלטים ובחזית! 🇮🇱
        </div>

        {/* ── Card area ── */}
        <div className="flex-1 w-full max-w-xl flex items-center justify-center p-2 sm:p-4">

          {/* ════════════════════ START SCREEN ════════════════════ */}
          {step === "start" && (
            <div className="w-full bg-white rounded-2xl shadow-xl overflow-hidden border-4 border-purple-200 text-center">
              {/* Gradient header */}
              <div
                className="p-6 text-white"
                style={{ background: "linear-gradient(135deg, #4c1d95 0%, #7c3aed 100%)" }}
              >
                <BrandLogo light />
                <h1 className="text-2xl sm:text-3xl font-black mt-2">חידון פורים הגדול</h1>
                <p className="text-sm sm:text-base opacity-90 mt-1">יחד ננצח בשמחה!</p>
              </div>

              <div className="p-6">
                {level === 1 ? (
                  <p className="text-gray-700 mb-6 text-base sm:text-lg font-medium leading-snug">
                    החידון התורני המלא לפורים!<br />
                    בואו נפיג את המתח וניכנס לאווירת החג עם{" "}
                    <strong className="text-purple-600">שלב א': שאלות בסיס במגילה והלכה.</strong>
                  </p>
                ) : (
                  <p className="text-gray-700 mb-6 text-base sm:text-lg font-medium leading-snug">
                    כל הכבוד שצלחתם את השלב הראשון!<br />
                    עכשיו עוברים ל
                    <strong className="text-purple-600">שלב ב': מדרשי חז&quot;ל למתקדמים.</strong>
                  </p>
                )}
                <button
                  onClick={startQuiz}
                  className="bg-purple-600 hover:bg-purple-700 active:scale-95 text-white font-black py-4 px-10 rounded-full text-xl transition-all shadow-lg w-full sm:w-auto"
                >
                  {level === 1 ? "מתחילים משחק!" : "לשלב המתקדם 🚀"}
                </button>
              </div>
            </div>
          )}

          {/* ════════════════════ QUIZ SCREEN ════════════════════ */}
          {step === "quiz" && (
            <div className="w-full bg-white rounded-2xl shadow-xl overflow-hidden border-2 border-purple-100 flex flex-col max-h-[90vh]">

              {/* Progress header */}
              <div className="bg-purple-50 p-3 sm:p-4 border-b border-purple-100 flex flex-col gap-2 shrink-0">
                <div className="flex justify-between items-center text-xs sm:text-sm font-black text-purple-800">
                  <span className="bg-white px-2 py-1 rounded shadow-sm">
                    שלב {level === 1 ? "א'" : "ב'"} | שאלה {index + 1} / {questions.length}
                  </span>
                  <div className="flex gap-0.5 flex-wrap justify-end max-w-[160px]">
                    {Array.from({ length: Math.min(score, 8) }).map((_, i) => (
                      <span key={i} className="text-sm">🍬</span>
                    ))}
                    {score > 0 && <span className="text-sm">🧺</span>}
                  </div>
                </div>
                <div className="w-full h-2 bg-purple-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-600 transition-all duration-500 rounded-full"
                    style={{ width: `${((index + 1) / questions.length) * 100}%` }}
                  />
                </div>
              </div>

              {/* Question + options */}
              <div className="flex-1 p-3 sm:p-5 overflow-y-auto">
                <h2 className="text-lg sm:text-xl font-black mb-4 text-gray-800 leading-tight text-center">
                  {current.question}
                </h2>

                <div className="grid grid-cols-1 gap-2 sm:gap-3">
                  {current.options.map((opt, i) => {
                    let cls =
                      "w-full p-3 sm:p-4 text-right border-2 rounded-xl transition-all font-bold text-sm sm:text-base shadow-sm flex justify-between items-center";
                    if (!answered) {
                      cls += " border-gray-200 bg-white hover:bg-purple-50 cursor-pointer";
                    } else if (i === current.answer) {
                      cls += " bg-green-100 border-green-500 text-green-900 ring-2 ring-green-200 purim-correct";
                    } else if (selected === i) {
                      cls += " bg-red-50 border-red-500 text-red-900 purim-shake";
                    } else {
                      cls += " opacity-40 border-gray-100 grayscale bg-gray-50";
                    }
                    return (
                      <button
                        key={i}
                        onClick={() => onSelect(i)}
                        disabled={answered}
                        className={cls}
                      >
                        <span>{opt}</span>
                        {answered && i === current.answer && <span>✨</span>}
                      </button>
                    );
                  })}
                </div>

                {answered && (
                  <div className="mt-4">
                    {/* Rationale box */}
                    <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 mb-4 text-xs sm:text-sm leading-snug shadow-inner">
                      <strong className="text-blue-900 block mb-1">💡 פנינה מהמקורות:</strong>
                      <span className="text-blue-800">{current.rationale}</span>
                    </div>
                    <button
                      onClick={next}
                      className="w-full bg-purple-800 hover:bg-purple-900 active:scale-95 text-white py-3 rounded-xl font-black text-base shadow-lg flex items-center justify-center gap-2 transition-all"
                    >
                      {index + 1 === questions.length ? "לסיום השלב!" : "לשאלה הבאה"}
                      <span className="rotate-180 inline-block">⬅️</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ════════════════════ LEVEL END SCREEN ════════════════════ */}
          {step === "level_end" && (
            <div className="w-full bg-white rounded-2xl shadow-2xl overflow-hidden text-center p-6 sm:p-8 border-8 border-yellow-400 max-h-[90vh] overflow-y-auto">
              <BrandLogo />
              <h2 className="text-2xl sm:text-3xl font-black mb-2 text-purple-900">
                {level === 1 ? "סיימת את שלב א'!" : "אלוף המגילה!"}
              </h2>

              {/* Score display */}
              <div className="bg-indigo-50 rounded-2xl p-5 sm:p-6 mb-6 shadow-inner border border-indigo-100">
                <div className="text-5xl sm:text-6xl font-black text-indigo-600 mb-1">
                  {Math.round((score / questions.length) * 100)}%
                </div>
                <p className="text-gray-700 font-bold">
                  ענית נכון על {score} מתוך {questions.length}
                </p>
                <div className="flex justify-center gap-1 mt-3 flex-wrap">
                  {Array.from({ length: Math.min(score, 12) }).map((_, i) => (
                    <span
                      key={i}
                      className="text-xl purim-float"
                      style={{ animationDelay: `${i * 0.1}s` }}
                    >
                      🍪
                    </span>
                  ))}
                </div>
              </div>

              <p className="text-base sm:text-lg text-gray-800 mb-6 font-bold leading-tight px-2">
                {scoreLabel(score, questions.length)}
              </p>

              <div className="flex flex-col gap-3">
                {level === 1 ? (
                  <button
                    onClick={() => { setLevel(2); setStep("start"); }}
                    className="w-full bg-purple-600 hover:bg-purple-700 active:scale-95 text-white py-4 rounded-full font-black text-lg shadow-lg transition-all animate-bounce"
                  >
                    מעבר לחידון ההמשך (שלב ב&apos;) 🚀
                  </button>
                ) : (
                  <button
                    onClick={share}
                    className="w-full bg-green-600 hover:bg-green-700 active:scale-95 text-white py-4 rounded-full font-black text-lg shadow-lg transition-all flex items-center justify-center gap-2"
                  >
                    שתפו לחברים בוואטסאפ 📱
                  </button>
                )}
                <button
                  onClick={() => { setLevel(1); startQuiz(); }}
                  className="text-purple-600 hover:underline font-bold py-2 text-sm"
                >
                  סיבוב נוסף מההתחלה? 🔄
                </button>
              </div>
            </div>
          )}

        </div>
      </main>
    </>
  );
}
