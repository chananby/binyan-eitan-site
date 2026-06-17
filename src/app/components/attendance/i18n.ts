// Worker-facing attendance UI translations.
//
// Supports 6 languages — Hebrew (default) plus English, Russian, Sinhala,
// Mandarin Chinese, Hindi — covering the foreign-worker population we see
// on site. The "he" + "ru" entries are the source-of-truth values; the
// other four are placeholders prefixed with "[TODO:<lang>]" until a
// native speaker fills them in. The placeholder format is intentional:
// it makes missing translations visible at runtime instead of silently
// rendering a key-name fallback that nobody would notice.
//
// AttendanceReportMistake used to keep its own private dictionary — it's
// now merged here under the `corr*` prefix so the type stays in one
// place and all 6 languages get those strings too.
//
// IMPORTANT: the action values "כניסה" / "יציאה" the worker triggers are
// the canonical labels sent to /api/attendance and stored in the DB. The
// UI strings below are display-only; the network payload stays Hebrew.

export type Lang = "he" | "en" | "ru" | "si" | "zh" | "hi";

export const SUPPORTED_LANGS: Lang[] = ["he", "en", "ru", "si", "zh", "hi"];

// Autonym = the language's own name in its own script. Shown in the
// picker so a worker who can't read Hebrew still recognises their own
// language without flag iconography (which would conflate Sinhala ↔ Sri
// Lanka or Mandarin ↔ a single country).
export const LANG_AUTONYMS: Record<Lang, string> = {
  he: "עברית",
  en: "English",
  ru: "Русский",
  si: "සිංහල",
  zh: "中文",
  hi: "हिन्दी",
};

export const RTL_LANGS = new Set<Lang>(["he"]);

export function langDir(lang: Lang): "rtl" | "ltr" {
  return RTL_LANGS.has(lang) ? "rtl" : "ltr";
}

export interface ScreenStrings {
  clockTitle: string; phonePrompt: string; confirmLocation: string; geoRequired: string;
  locating: string;
  pickSite: string; pickSiteSub: string; loadingSites: string; noSites: string; changeNumber: string;
  locationOk: string; clockIn: string; clockOut: string; changeSite: string;
  sending: string;
  recordedIn: string; recordedOut: string; hello: string;
  autoReg: string; autoRegBody: string; dayMsg: string;
  goodWorkIn: string; goodWorkOut: string; anotherReport: string;
  tryAgain: string; notFound: string; unknownError: string; accountInactive: string; alreadyClockedIn: string; noInternalAccess: string;
  home: string; footer: string;
  myHistory: string; historyTitle: string; noHistory: string; loadingHistory: string; backToForm: string;
  manualBtn: string; manualTitle: string; manualSentTitle: string; manualSentBody: string; pendingBadge: string;
  corrPending: string; corrApproved: string; corrRejected: string;
  manualDateLabel: string; manualTimeIn: string; manualTimeOut: string; manualProjectLabel: string;
  identify: string; identifying: string; tooManyAttempts: string; sessionExpired: string;
  menuPrompt: string; startClock: string; switchUser: string;
  missingExitOne: string; missingExitMany: string; missingExitCta: string;
  // ── Added in the 6-language migration ──────────────────────────────────
  backToPortal: string;                 // top-right "back to portal" link
  manualValidation: string;             // "must fill date & time"
  networkError: string;                 // generic network catch in AttendanceForm
  // History screen — table chrome
  historyColDate: string;
  historyColEntry: string;
  historyColExit: string;
  historyColHours: string;
  historyTotal: string;                 // "סה"כ" summary label
  historyHoursUnit: string;             // unit suffix on totals row ("שעות")
  reportMistakeTooltip: string;         // pencil tooltip
  // ManualScreen extras
  manualHint: string;                   // "report will be sent for admin approval"
  manualNoSite: string;                 // "— ללא אתר —" empty option label
  manualSubmit: string;                 // submit button
  manualBackToHistory: string;          // back link
  // Days of the week — index 0=Sunday … 6=Saturday (JS Date.getDay
  // convention). History prefixes each row with the weekday (e.g.
  // "יום שני"). dayPrefix is the word in front of the day name; "" if
  // the language doesn't use a prefix (Russian: just "Понедельник").
  dayPrefix: string;
  weekdays: [string, string, string, string, string, string, string];
  // AttendanceReportMistake — merged in from its old private dictionary
  corrTitle: string;
  corrProposedLabel: string;
  corrReasonLabel: string;
  corrReasonPlaceholder: string;
  corrSubmit: string;
  corrSending: string;
  corrCancel: string;
  corrReasonRequired: string;
  corrTooMany: string;
  corrAlreadyOpen: string;
  corrOutOfWindow: string;
  corrGeneric: string;
}

// Placeholder helper — wraps the Hebrew source with a [TODO:<lang>]
// prefix so the screen renders something legible (and obviously
// untranslated) rather than crashing on `undefined`. A grep for "[TODO:"
// surfaces every outstanding string for the translator.
const todo = (lang: Exclude<Lang, "he" | "ru">, he: string): string => `[TODO:${lang}] ${he}`;

const HE: ScreenStrings = {
  clockTitle: "שעון נוכחות",
  phonePrompt: "הזן מספר טלפון לזיהוי",
  confirmLocation: "אשר מיקום והמשך",
  geoRequired: "חובה לאשר מיקום כדי לדווח נוכחות. אפשר גישה ל-GPS בהגדרות הדפדפן ונסה שוב, או השתמש ב\"דיווח חסר\" לאחר מכן.",
  locating: "מאתר מיקום…",
  pickSite: "בחר אתר בנייה",
  pickSiteSub: "בחר את האתר שבו אתה עובד היום",
  loadingSites: "טוען אתרים...",
  noSites: "אין אתרי בנייה פעילים — פנה למנהל",
  changeNumber: "שנה מספר",
  locationOk: "מיקום אושר ✓",
  clockIn: "כניסה",
  clockOut: "יציאה",
  changeSite: "שנה אתר",
  sending: "שולח דיווח…",
  recordedIn: "כניסה נרשמה ✅",
  recordedOut: "יציאה נרשמה 🔴",
  hello: "שלום",
  autoReg: "רישום אוטומטי",
  autoRegBody: "הטלפון נרשם כמשתמש ראשון במערכת. עדכן את שמך בדשבורד הניהולי.",
  dayMsg: "הודעת היום",
  goodWorkIn: "עבודה טובה! 💪",
  goodWorkOut: "שיהיה לך יום נעים 👋",
  anotherReport: "דיווח נוסף",
  tryAgain: "נסה שוב",
  notFound: "מספר הטלפון לא נמצא ברשימת הצוות. פנה למנהל.",
  unknownError: "שגיאה לא ידועה — נסה שוב.",
  accountInactive: "החשבון שלך אינו פעיל. פנה למנהל.",
  alreadyClockedIn: "כניסה כבר נרשמה היום. אם יש שגיאה — פנה למנהל.",
  noInternalAccess: "להצגת היסטוריה יש להיכנס דרך פורטל העובדים תחילה.",
  home: "דף הבית",
  footer: "בניין איתן — מערכת נוכחות פנימית",
  myHistory: "היסטוריית נוכחות שלי",
  historyTitle: "הנוכחות שלי",
  noHistory: "לא נמצאו רשומות נוכחות",
  loadingHistory: "טוען היסטוריה...",
  backToForm: "חזור לדיווח",
  manualBtn: "דיווח חסר",
  manualTitle: "הוספת דיווח ידני",
  manualSentTitle: "הדיווח נשלח ✓",
  manualSentBody: "המנהל יאשר את הדיווח בקרוב",
  pendingBadge: "ממתין לאישור",
  corrPending: "ממתין לאישור ⏳",
  corrApproved: "אושר ✓",
  corrRejected: "נדחה ✗",
  manualDateLabel: "תאריך",
  manualTimeIn: "שעת כניסה",
  manualTimeOut: "שעת יציאה",
  manualProjectLabel: "אתר (אופציונלי)",
  identify: "המשך",
  identifying: "מאמת...",
  tooManyAttempts: "יותר מדי ניסיונות. נסה שוב בעוד כמה דקות.",
  sessionExpired: "פג תוקף ההזדהות. אנא הזדהה מחדש.",
  menuPrompt: "מה תרצה לעשות?",
  startClock: "החתמת נוכחות",
  switchUser: "החלף משתמש",
  missingExitOne: "שכחת להחתים יציאה ביום אחד. ניתן להשלים במסך ההיסטוריה.",
  missingExitMany: "שכחת להחתים יציאה ב-{n} ימים. ניתן להשלים במסך ההיסטוריה.",
  missingExitCta: "מעבר להיסטוריה",
  backToPortal: "חזור לתפריט הראשי",
  manualValidation: "יש למלא תאריך ושעה",
  networkError: "שגיאת רשת — נסה שוב",
  historyColDate: "תאריך",
  historyColEntry: "כניסה",
  historyColExit: "יציאה",
  historyColHours: "שעות",
  historyTotal: "סה\"כ",
  historyHoursUnit: "שעות",
  reportMistakeTooltip: "דווח על טעות",
  manualHint: "הדיווח ישלח לאישור המנהל",
  manualNoSite: "— ללא אתר —",
  manualSubmit: "שלח לאישור",
  manualBackToHistory: "חזור להיסטוריה",
  dayPrefix: "יום",
  weekdays: ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"],
  corrTitle: "דווח על טעות ברשומה",
  corrProposedLabel: "שעה נכונה (אופציונלי)",
  corrReasonLabel: "מה הטעות?",
  corrReasonPlaceholder: "למשל: יצאתי ב-18:30 ולא ב-17:00 כפי שמופיע",
  corrSubmit: "שלח לאישור",
  corrSending: "שולח…",
  corrCancel: "ביטול",
  corrReasonRequired: "נא להסביר במה הטעות",
  corrTooMany: "יותר מדי בקשות. נסה שוב בעוד כמה דקות.",
  corrAlreadyOpen: "כבר נשלחה בקשת תיקון לרשומה זו, ממתינה לאישור.",
  corrOutOfWindow: "ניתן לדווח על טעות רק לרשומות מהחודש הנוכחי או הקודם.",
  corrGeneric: "שגיאה — נסה שוב.",
};

const RU: ScreenStrings = {
  clockTitle: "Отметка о явке",
  phonePrompt: "Введите номер телефона",
  confirmLocation: "Подтвердить местоположение",
  geoRequired: "Необходимо разрешить доступ к местоположению. Разрешите GPS в настройках браузера и попробуйте снова, или используйте «Пропущенная отметка» позже.",
  locating: "Определение местоположения…",
  pickSite: "Выберите объект",
  pickSiteSub: "Выберите объект, где вы работаете сегодня",
  loadingSites: "Загрузка объектов...",
  noSites: "Нет активных объектов — обратитесь к менеджеру",
  changeNumber: "Изменить номер",
  locationOk: "Местоположение подтверждено ✓",
  clockIn: "Приход",
  clockOut: "Уход",
  changeSite: "Изменить объект",
  sending: "Отправка данных…",
  recordedIn: "Приход зарегистрирован ✅",
  recordedOut: "Уход зарегистрирован 🔴",
  hello: "Привет,",
  autoReg: "Авторегистрация",
  autoRegBody: "Номер зарегистрирован как новый пользователь. Обновите имя в панели администратора.",
  dayMsg: "Сообщение дня",
  goodWorkIn: "Хорошей работы! 💪",
  goodWorkOut: "Хорошего дня! 👋",
  anotherReport: "Ещё одна отметка",
  tryAgain: "Повторить",
  notFound: "Номер телефона не найден в списке сотрудников. Обратитесь к менеджеру.",
  unknownError: "Неизвестная ошибка — попробуйте снова.",
  accountInactive: "Ваш аккаунт неактивен. Обратитесь к менеджеру.",
  alreadyClockedIn: "Приход уже отмечен сегодня. Если это ошибка — обратитесь к менеджеру.",
  noInternalAccess: "Для просмотра истории войдите сначала через портал сотрудников.",
  home: "Главная",
  footer: "Binyan Eitan — система учёта рабочего времени",
  myHistory: "Моя история посещаемости",
  historyTitle: "Моя посещаемость",
  noHistory: "Записи не найдены",
  loadingHistory: "Загрузка...",
  backToForm: "Вернуться к отметке",
  manualBtn: "Пропущенная отметка",
  manualTitle: "Добавить отметку вручную",
  manualSentTitle: "Отметка отправлена ✓",
  manualSentBody: "Менеджер скоро подтвердит её",
  pendingBadge: "Ожидает подтверждения",
  corrPending: "Ожидает ⏳",
  corrApproved: "Одобрено ✓",
  corrRejected: "Отклонено ✗",
  manualDateLabel: "Дата",
  manualTimeIn: "Время прихода",
  manualTimeOut: "Время ухода",
  manualProjectLabel: "Объект (необязательно)",
  identify: "Продолжить",
  identifying: "Проверка...",
  tooManyAttempts: "Слишком много попыток. Попробуйте через несколько минут.",
  sessionExpired: "Сессия истекла. Войдите снова.",
  menuPrompt: "Что вы хотите сделать?",
  startClock: "Отметить явку",
  switchUser: "Сменить пользователя",
  missingExitOne: "Вы забыли отметить уход за 1 день. Завершить можно в истории.",
  missingExitMany: "Вы забыли отметить уход за {n} дн. Завершить можно в истории.",
  missingExitCta: "Перейти к истории",
  backToPortal: "Назад к порталу",
  manualValidation: "Заполните дату и время",
  networkError: "Сетевая ошибка — попробуйте снова",
  historyColDate: "Дата",
  historyColEntry: "Приход",
  historyColExit: "Уход",
  historyColHours: "Часы",
  historyTotal: "Итого",
  historyHoursUnit: "ч",
  reportMistakeTooltip: "Сообщить об ошибке",
  manualHint: "Отметка будет отправлена на подтверждение менеджеру",
  manualNoSite: "— без объекта —",
  manualSubmit: "Отправить",
  manualBackToHistory: "Назад к истории",
  dayPrefix: "",
  weekdays: ["Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"],
  corrTitle: "Сообщить об ошибке",
  corrProposedLabel: "Правильное время (опционально)",
  corrReasonLabel: "В чём ошибка?",
  corrReasonPlaceholder: "Например: я ушёл в 18:30, а не в 17:00",
  corrSubmit: "Отправить",
  corrSending: "Отправка…",
  corrCancel: "Отмена",
  corrReasonRequired: "Опишите ошибку",
  corrTooMany: "Слишком много попыток. Попробуйте через несколько минут.",
  corrAlreadyOpen: "Запрос на исправление уже отправлен и ожидает решения.",
  corrOutOfWindow: "Можно отправить запрос только за текущий или предыдущий месяц.",
  corrGeneric: "Ошибка — попробуйте снова.",
};

// makePlaceholder — clones the Hebrew dictionary with every value wrapped
// in [TODO:<lang>]. Keeps the type-checker honest while a native speaker
// fills in en / si / zh / hi: every key exists, every value is a string,
// and the UI is obviously untranslated rather than silently broken.
function makePlaceholder(lang: Exclude<Lang, "he" | "ru">): ScreenStrings {
  return {
    clockTitle: todo(lang, HE.clockTitle),
    phonePrompt: todo(lang, HE.phonePrompt),
    confirmLocation: todo(lang, HE.confirmLocation),
    geoRequired: todo(lang, HE.geoRequired),
    locating: todo(lang, HE.locating),
    pickSite: todo(lang, HE.pickSite),
    pickSiteSub: todo(lang, HE.pickSiteSub),
    loadingSites: todo(lang, HE.loadingSites),
    noSites: todo(lang, HE.noSites),
    changeNumber: todo(lang, HE.changeNumber),
    locationOk: todo(lang, HE.locationOk),
    clockIn: todo(lang, HE.clockIn),
    clockOut: todo(lang, HE.clockOut),
    changeSite: todo(lang, HE.changeSite),
    sending: todo(lang, HE.sending),
    recordedIn: todo(lang, HE.recordedIn),
    recordedOut: todo(lang, HE.recordedOut),
    hello: todo(lang, HE.hello),
    autoReg: todo(lang, HE.autoReg),
    autoRegBody: todo(lang, HE.autoRegBody),
    dayMsg: todo(lang, HE.dayMsg),
    goodWorkIn: todo(lang, HE.goodWorkIn),
    goodWorkOut: todo(lang, HE.goodWorkOut),
    anotherReport: todo(lang, HE.anotherReport),
    tryAgain: todo(lang, HE.tryAgain),
    notFound: todo(lang, HE.notFound),
    unknownError: todo(lang, HE.unknownError),
    accountInactive: todo(lang, HE.accountInactive),
    alreadyClockedIn: todo(lang, HE.alreadyClockedIn),
    noInternalAccess: todo(lang, HE.noInternalAccess),
    home: todo(lang, HE.home),
    footer: todo(lang, HE.footer),
    myHistory: todo(lang, HE.myHistory),
    historyTitle: todo(lang, HE.historyTitle),
    noHistory: todo(lang, HE.noHistory),
    loadingHistory: todo(lang, HE.loadingHistory),
    backToForm: todo(lang, HE.backToForm),
    manualBtn: todo(lang, HE.manualBtn),
    manualTitle: todo(lang, HE.manualTitle),
    manualSentTitle: todo(lang, HE.manualSentTitle),
    manualSentBody: todo(lang, HE.manualSentBody),
    pendingBadge: todo(lang, HE.pendingBadge),
    corrPending: todo(lang, HE.corrPending),
    corrApproved: todo(lang, HE.corrApproved),
    corrRejected: todo(lang, HE.corrRejected),
    manualDateLabel: todo(lang, HE.manualDateLabel),
    manualTimeIn: todo(lang, HE.manualTimeIn),
    manualTimeOut: todo(lang, HE.manualTimeOut),
    manualProjectLabel: todo(lang, HE.manualProjectLabel),
    identify: todo(lang, HE.identify),
    identifying: todo(lang, HE.identifying),
    tooManyAttempts: todo(lang, HE.tooManyAttempts),
    sessionExpired: todo(lang, HE.sessionExpired),
    menuPrompt: todo(lang, HE.menuPrompt),
    startClock: todo(lang, HE.startClock),
    switchUser: todo(lang, HE.switchUser),
    missingExitOne: todo(lang, HE.missingExitOne),
    missingExitMany: todo(lang, HE.missingExitMany),
    missingExitCta: todo(lang, HE.missingExitCta),
    backToPortal: todo(lang, HE.backToPortal),
    manualValidation: todo(lang, HE.manualValidation),
    networkError: todo(lang, HE.networkError),
    historyColDate: todo(lang, HE.historyColDate),
    historyColEntry: todo(lang, HE.historyColEntry),
    historyColExit: todo(lang, HE.historyColExit),
    historyColHours: todo(lang, HE.historyColHours),
    historyTotal: todo(lang, HE.historyTotal),
    historyHoursUnit: todo(lang, HE.historyHoursUnit),
    reportMistakeTooltip: todo(lang, HE.reportMistakeTooltip),
    manualHint: todo(lang, HE.manualHint),
    manualNoSite: todo(lang, HE.manualNoSite),
    manualSubmit: todo(lang, HE.manualSubmit),
    manualBackToHistory: todo(lang, HE.manualBackToHistory),
    dayPrefix: "",
    weekdays: [
      todo(lang, HE.weekdays[0]),
      todo(lang, HE.weekdays[1]),
      todo(lang, HE.weekdays[2]),
      todo(lang, HE.weekdays[3]),
      todo(lang, HE.weekdays[4]),
      todo(lang, HE.weekdays[5]),
      todo(lang, HE.weekdays[6]),
    ],
    corrTitle: todo(lang, HE.corrTitle),
    corrProposedLabel: todo(lang, HE.corrProposedLabel),
    corrReasonLabel: todo(lang, HE.corrReasonLabel),
    corrReasonPlaceholder: todo(lang, HE.corrReasonPlaceholder),
    corrSubmit: todo(lang, HE.corrSubmit),
    corrSending: todo(lang, HE.corrSending),
    corrCancel: todo(lang, HE.corrCancel),
    corrReasonRequired: todo(lang, HE.corrReasonRequired),
    corrTooMany: todo(lang, HE.corrTooMany),
    corrAlreadyOpen: todo(lang, HE.corrAlreadyOpen),
    corrOutOfWindow: todo(lang, HE.corrOutOfWindow),
    corrGeneric: todo(lang, HE.corrGeneric),
  };
}

export const T: Record<Lang, ScreenStrings> = {
  he: HE,
  ru: RU,
  en: makePlaceholder("en"),
  si: makePlaceholder("si"),
  zh: makePlaceholder("zh"),
  hi: makePlaceholder("hi"),
};

// Pick a sensible default for a first-time visitor: navigator.language
// (e.g. "si-LK") is normalised to its 2-letter prefix and matched against
// SUPPORTED_LANGS, with Hebrew as the fallback. Workers with an existing
// localStorage("att_lang") short-circuit this in AttendanceForm and never
// call it.
export function detectInitialLang(navigatorLanguage?: string): Lang {
  const raw = (navigatorLanguage ?? "").toLowerCase().split(/[-_]/)[0];
  return (SUPPORTED_LANGS as string[]).includes(raw) ? (raw as Lang) : "he";
}
