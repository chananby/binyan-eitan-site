// Worker-facing attendance UI translations.
//
// Supports 6 languages — Hebrew (default) plus English, Russian, Sinhala,
// Mandarin Chinese, Hindi — covering the foreign-worker population we see
// on site. All six dictionaries are real translations; if a [TODO:]
// marker ever appears here it's a stage-1 leftover and the test in
// i18n.test.ts will fail the build.
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
  clockTitle: string; phonePrompt: string; confirmLocation: string;
  // Geolocation error variants — one per GeolocationPositionError.code
  // (1=denied, 2=unavailable, 3=timeout) plus a compat leg for browsers
  // with no navigator.geolocation object at all. Split from the old
  // single `geoRequired` key so the message actually matches the cause:
  // "give permission" is useless advice when the phone just timed out.
  // All four are bilingual via bilingualForForeman() — the worker can
  // hand their phone to the foreman without a translation step.
  geoPermissionDenied: string;
  geoPositionUnavailable: string;
  geoTimeout: string;
  geoUnsupported: string;
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
  pendingBadge: string;
  corrPending: string; corrApproved: string; corrRejected: string;
  identify: string; identifying: string; tooManyAttempts: string; sessionExpired: string;
  // 401 from POST /api/worker/identify — the be_internal_token (PIN) cookie
  // expired/was wiped. Distinct from sessionExpired (worker auth cookie
  // expired) and from noInternalAccess (history endpoint context).
  pinExpired: string;
  menuPrompt: string; startClock: string; switchUser: string;
  missingExitOne: string; missingExitMany: string; missingExitCta: string;
  // ── Added in the 6-language migration ──────────────────────────────────
  backToPortal: string;                 // top-right "back to portal" link
  networkError: string;                 // generic network catch in AttendanceForm
  // History screen — table chrome
  historyColDate: string;
  historyColEntry: string;
  historyColExit: string;
  historyColHours: string;
  historyTotal: string;                 // "סה"כ" summary label
  historyHoursUnit: string;             // unit suffix on totals row ("שעות")
  reportMistakeTooltip: string;         // pencil tooltip
  // Days of the week — index 0=Sunday … 6=Saturday (JS Date.getDay
  // convention). History prefixes each row with the weekday (e.g.
  // "יום שני"). dayPrefix is the word in front of the day name; "" if
  // the language doesn't use a prefix (Russian: just "Понедельник").
  dayPrefix: string;
  weekdays: [string, string, string, string, string, string, string];
  // AttendanceReportMistake — merged in from its old private dictionary
  corrTitle: string;
  corrTypeTitle: string;
  corrTypeMissingExit: string;
  corrTypeMissingEntry: string;
  corrTypeFixTime: string;
  corrTimeExitLabel: string;
  corrTimeEntryLabel: string;
  corrTimeRequired: string;
  corrDayHasExit: string;
  corrDayHasEntry: string;
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
  // Join-request CTA shown beneath the "phone not found" identify error
  // — points unknown workers to the public /he/join form so they can ask
  // to be added to the staff list instead of getting stuck on this screen.
  joinCta: string;
  // Clock-out was rejected because the worker has no open clock-in
  // within the last 24h — the B3 guard. Backend returns error code
  // "no_open_entry_to_close"; the frontend must localize before showing.
  noOpenEntryToClose: string;
  // Clock-in was rejected because the worker is farther than the
  // enforcement radius from the site (attendance_gps_enforce_radius_m).
  // Backend returns error code "gps_out_of_range".
  gpsOutOfRange: string;
  // Clock-out was rejected because the worker has already used up their
  // monthly quota of remote clock-outs (attendance_remote_exit_monthly_cap).
  // Backend returns error code "monthly_remote_exit_cap_reached".
  monthlyRemoteExitCap: string;
  // Correction submission targeted a record that no longer exists (404)
  // — usually because the admin cleaned it up while the worker's history
  // screen was still open. Distinct from corrRecordDeleted, which is
  // the softer 410 (record is soft-deleted, was still known moments ago).
  corrRecordNotFound: string;
  // Correction submission targeted a record that was just soft-deleted
  // by an admin (410). Same UX intent as corrRecordNotFound — the row
  // is gone, contact the manager — but a friendlier phrasing since it
  // often reflects a legitimate admin action rather than a lost record.
  corrRecordDeleted: string;
  // Replaces the old "+ הוסף דיווח חסר" button on the history screen
  // now that worker-side manual entry is gone — informs the worker that
  // forgotten clocks are corrected via the foreman.
  askForemanForFix: string;
  // Fallback for a legacy client that still POSTs to /api/worker/manual-
  // entry (which now returns 410 gone). AttendanceForm no longer wires
  // to that endpoint, but the string exists so a resurrected caller has
  // a localized message ready.
  manualEntryDisabled: string;
  // Specific fallback messages for backend errors that used to collapse
  // to the generic `unknownError` bucket. Each one tells the worker
  // whether the situation is (a) something they can try to fix, or
  // (b) a real server issue where their only action is to retry / contact
  // the foreman. Server-side, each error code is still logged with its
  // technical reason via console.error so we retain the trace without
  // leaking backend detail to the worker.
  errClientBadRequest: string;   // missing_action / invalid_action / invalid_body
  errLocationRequired: string;   // location_required — the client sent no coords
  errAccessDenied: string;       // 403 forbidden (non-GPS)
  errServerBusy: string;         // 500 / env / DB / other server-side failure
}

const HE: ScreenStrings = {
  clockTitle: "שעון נוכחות",
  phonePrompt: "הזן מספר טלפון לזיהוי",
  confirmLocation: "אשר מיקום והמשך",
  geoPermissionDenied: "המיקום חסום. כדי לתקן:\nלחץ על 🔒 (או ⓘ) ליד כתובת האתר למעלה ← מיקום ← אפשר.\nואז נסה שוב.\n\nאם עדיין לא עובד — פנה למנהל העבודה.",
  geoPositionUnavailable: "לא הצלחנו לאתר את המיקום.\nצא לאזור פתוח ונסה שוב.\n\nאם עדיין לא עובד — פנה למנהל העבודה.",
  geoTimeout: "איתור המיקום נמשך יותר מדי.\nבדוק את החיבור ונסה שוב.\n\nאם עדיין לא עובד — פנה למנהל העבודה.",
  geoUnsupported: "הדפדפן אינו תומך במיקום. פנה למנהל העבודה שיזין את ההחתמה שלך.",
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
  pendingBadge: "ממתין לאישור",
  corrPending: "ממתין לאישור ⏳",
  corrApproved: "אושר ✓",
  corrRejected: "נדחה ✗",
  identify: "המשך",
  identifying: "מאמת...",
  tooManyAttempts: "יותר מדי ניסיונות. נסה שוב בעוד כמה דקות.",
  sessionExpired: "פג תוקף ההזדהות. אנא הזדהה מחדש.",
  pinExpired: "פג תוקף קוד הכניסה — נא להזין שוב",
  menuPrompt: "מה תרצה לעשות?",
  startClock: "החתמת נוכחות",
  switchUser: "החלף משתמש",
  missingExitOne: "שכחת להחתים יציאה ביום אחד. ניתן להשלים במסך ההיסטוריה.",
  missingExitMany: "שכחת להחתים יציאה ב-{n} ימים. ניתן להשלים במסך ההיסטוריה.",
  missingExitCta: "מעבר להיסטוריה",
  backToPortal: "חזור לתפריט הראשי",
  networkError: "שגיאת רשת — נסה שוב",
  historyColDate: "תאריך",
  historyColEntry: "כניסה",
  historyColExit: "יציאה",
  historyColHours: "שעות",
  historyTotal: "סה\"כ",
  historyHoursUnit: "שעות",
  reportMistakeTooltip: "דווח על טעות",
  dayPrefix: "יום",
  weekdays: ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"],
  corrTitle: "דווח על טעות ברשומה",
  corrTypeTitle: "מה קרה?",
  corrTypeMissingExit: "שכחתי להחתים יציאה",
  corrTypeMissingEntry: "שכחתי להחתים כניסה",
  corrTypeFixTime: "השעה הרשומה שגויה",
  corrTimeExitLabel: "שעת היציאה",
  corrTimeEntryLabel: "שעת הכניסה",
  corrTimeRequired: "נא למלא שעה",
  corrDayHasExit: "כבר רשומה יציאה ליום זה.",
  corrDayHasEntry: "כבר רשומה כניסה ליום זה.",
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
  joinCta: "עובד חדש? בקש הצטרפות",
  noOpenEntryToClose: "אין כניסה פתוחה לסגירה. אם צריך תיקון, פנה למנהל.",
  gpsOutOfRange: "אתה מחוץ לטווח האתר. פנה למנהל העבודה שיזין את ההחתמה שלך מהפורטל שלו.",
  monthlyRemoteExitCap: "הגעת למכסת היציאות מרחוק החודש. פנה למנהל.",
  corrRecordNotFound: "הרשומה לא נמצאה. פנה למנהל.",
  corrRecordDeleted: "הרשומה נמחקה. פנה למנהל.",
  askForemanForFix: "שכחת החתמה? פנה למנהל העבודה.",
  manualEntryDisabled: "הזנה ידנית עצמאית הופסקה. פנה למנהל העבודה לתיקון.",
  errClientBadRequest: "בקשה לא תקינה. נסה שוב, ואם התקלה נמשכת פנה למנהל העבודה.",
  errLocationRequired: "לא נשלח מיקום. נסה שוב, ואם התקלה נמשכת פנה למנהל העבודה.",
  errAccessDenied: "אין הרשאה. פנה למנהל העבודה.",
  errServerBusy: "תקלה זמנית בשרת. נסה שוב עוד רגע, ואם התקלה נמשכת פנה למנהל העבודה.",
};

const RU: ScreenStrings = {
  clockTitle: "Отметка о явке",
  phonePrompt: "Введите номер телефона",
  confirmLocation: "Подтвердить местоположение",
  geoPermissionDenied: "Доступ к местоположению заблокирован. Как исправить:\nНажмите 🔒 (или ⓘ) рядом с адресной строкой вверху → Местоположение → Разрешить.\nЗатем попробуйте снова.\n\nВсё ещё не работает? Обратитесь к бригадиру.",
  geoPositionUnavailable: "Не удалось определить местоположение.\nВыйдите на открытую местность и попробуйте снова.\n\nВсё ещё не работает? Обратитесь к бригадиру.",
  geoTimeout: "Определение местоположения заняло слишком много времени.\nПроверьте соединение и попробуйте снова.\n\nВсё ещё не работает? Обратитесь к бригадиру.",
  geoUnsupported: "Браузер не поддерживает определение местоположения. Попросите бригадира отметить приход за вас.",
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
  pendingBadge: "Ожидает подтверждения",
  corrPending: "Ожидает ⏳",
  corrApproved: "Одобрено ✓",
  corrRejected: "Отклонено ✗",
  identify: "Продолжить",
  identifying: "Проверка...",
  tooManyAttempts: "Слишком много попыток. Попробуйте через несколько минут.",
  sessionExpired: "Сессия истекла. Войдите снова.",
  pinExpired: "Срок действия кода входа истёк — введите его снова",
  menuPrompt: "Что вы хотите сделать?",
  startClock: "Отметить явку",
  switchUser: "Сменить пользователя",
  missingExitOne: "Вы забыли отметить уход за 1 день. Завершить можно в истории.",
  missingExitMany: "Вы забыли отметить уход за {n} дн. Завершить можно в истории.",
  missingExitCta: "Перейти к истории",
  backToPortal: "Назад к порталу",
  networkError: "Сетевая ошибка — попробуйте снова",
  historyColDate: "Дата",
  historyColEntry: "Приход",
  historyColExit: "Уход",
  historyColHours: "Часы",
  historyTotal: "Итого",
  historyHoursUnit: "ч",
  reportMistakeTooltip: "Сообщить об ошибке",
  dayPrefix: "",
  weekdays: ["Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"],
  corrTitle: "Сообщить об ошибке",
  corrTypeTitle: "Что случилось?",
  corrTypeMissingExit: "Забыл отметить уход",
  corrTypeMissingEntry: "Забыл отметить приход",
  corrTypeFixTime: "Записано неверное время",
  corrTimeExitLabel: "Время ухода",
  corrTimeEntryLabel: "Время прихода",
  corrTimeRequired: "Укажите время",
  corrDayHasExit: "За этот день уже отмечен уход.",
  corrDayHasEntry: "За этот день уже отмечен приход.",
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
  joinCta: "Новый сотрудник? Подать заявку",
  noOpenEntryToClose: "Нет открытого прихода для закрытия. Если нужна коррекция — обратитесь к менеджеру.",
  gpsOutOfRange: "Вы находитесь вне зоны объекта. Попросите бригадира отметить приход за вас со своего портала.",
  monthlyRemoteExitCap: "Вы исчерпали месячный лимит удалённых отметок ухода. Обратитесь к менеджеру.",
  corrRecordNotFound: "Запись не найдена. Обратитесь к менеджеру.",
  corrRecordDeleted: "Эта запись была удалена. Обратитесь к менеджеру.",
  askForemanForFix: "Забыли отметиться? Обратитесь к бригадиру.",
  manualEntryDisabled: "Самостоятельная отметка задним числом отключена. Обратитесь к бригадиру.",
  errClientBadRequest: "Некорректный запрос. Попробуйте снова, а если ошибка сохраняется — обратитесь к бригадиру.",
  errLocationRequired: "Местоположение не отправлено. Попробуйте снова, а если ошибка сохраняется — обратитесь к бригадиру.",
  errAccessDenied: "Нет доступа. Обратитесь к бригадиру.",
  errServerBusy: "Временный сбой сервера. Попробуйте через минуту, а если ошибка сохраняется — обратитесь к бригадиру.",
};

const EN: ScreenStrings = {
  clockTitle: "Time Clock",
  phonePrompt: "Enter phone number to identify",
  confirmLocation: "Confirm location and continue",
  geoPermissionDenied: "Location is blocked. To fix:\nTap 🔒 (or ⓘ) next to the address bar at the top → Location → Allow.\nThen try again.\n\nStill not working? Ask your foreman.",
  geoPositionUnavailable: "Couldn't determine your location.\nStep into open sky and try again.\n\nStill not working? Ask your foreman.",
  geoTimeout: "Locating took too long.\nCheck your connection and try again.\n\nStill not working? Ask your foreman.",
  geoUnsupported: "This browser doesn't support location. Ask your foreman to enter the clock-in for you.",
  locating: "Locating…",
  pickSite: "Select a construction site",
  pickSiteSub: "Select the site where you are working today",
  loadingSites: "Loading sites…",
  noSites: "No active construction sites — contact the manager",
  changeNumber: "Change number",
  locationOk: "Location confirmed ✓",
  clockIn: "Clock In",
  clockOut: "Clock Out",
  changeSite: "Change site",
  sending: "Submitting…",
  recordedIn: "Clock-in recorded ✅",
  recordedOut: "Clock-out recorded 🔴",
  hello: "Hello",
  autoReg: "Auto-registration",
  autoRegBody: "This phone was registered as a new user. Update your name in the admin dashboard.",
  dayMsg: "Message of the day",
  goodWorkIn: "Have a good day! 💪",
  goodWorkOut: "Have a pleasant day 👋",
  anotherReport: "Another report",
  tryAgain: "Try again",
  notFound: "Phone number not found in the staff list. Contact the manager.",
  unknownError: "Unknown error — try again.",
  accountInactive: "Your account is inactive. Contact the manager.",
  alreadyClockedIn: "Clock-in already recorded today. If this is an error — contact the manager.",
  noInternalAccess: "To view history, please sign in through the worker portal first.",
  home: "Home",
  footer: "Binyan Eitan — internal attendance system",
  myHistory: "My attendance history",
  historyTitle: "My attendance",
  noHistory: "No attendance records found",
  loadingHistory: "Loading history…",
  backToForm: "Back to clock",
  pendingBadge: "Pending approval",
  corrPending: "Pending ⏳",
  corrApproved: "Approved ✓",
  corrRejected: "Rejected ✗",
  identify: "Continue",
  identifying: "Verifying…",
  tooManyAttempts: "Too many attempts. Try again in a few minutes.",
  sessionExpired: "Your session has expired. Please sign in again.",
  pinExpired: "Entry code expired — please enter it again",
  menuPrompt: "What would you like to do?",
  startClock: "Clock attendance",
  switchUser: "Switch user",
  missingExitOne: "You forgot to clock out on one day. You can complete it in the history screen.",
  missingExitMany: "You forgot to clock out on {n} days. You can complete them in the history screen.",
  missingExitCta: "Go to history",
  backToPortal: "Back to main menu",
  networkError: "Network error — try again",
  historyColDate: "Date",
  historyColEntry: "Entry",
  historyColExit: "Exit",
  historyColHours: "Hours",
  historyTotal: "Total",
  historyHoursUnit: "hrs",
  reportMistakeTooltip: "Report a mistake",
  dayPrefix: "",
  weekdays: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  corrTitle: "Report a mistake in the record",
  corrTypeTitle: "What happened?",
  corrTypeMissingExit: "I forgot to clock out",
  corrTypeMissingEntry: "I forgot to clock in",
  corrTypeFixTime: "The recorded time is wrong",
  corrTimeExitLabel: "Clock-out time",
  corrTimeEntryLabel: "Clock-in time",
  corrTimeRequired: "Please enter a time",
  corrDayHasExit: "A clock-out is already recorded for this day.",
  corrDayHasEntry: "A clock-in is already recorded for this day.",
  corrProposedLabel: "Correct time (optional)",
  corrReasonLabel: "What is the mistake?",
  corrReasonPlaceholder: "e.g., I left at 18:30, not 17:00 as shown",
  corrSubmit: "Submit for approval",
  corrSending: "Sending…",
  corrCancel: "Cancel",
  corrReasonRequired: "Please explain the mistake",
  corrTooMany: "Too many requests. Try again in a few minutes.",
  corrAlreadyOpen: "A correction request for this record is already pending.",
  corrOutOfWindow: "You can only report a mistake for records from the current or previous month.",
  corrGeneric: "Error — try again.",
  joinCta: "New worker? Request to join",
  noOpenEntryToClose: "No open clock-in to close. Contact the manager if a correction is needed.",
  gpsOutOfRange: "You're outside the site's range. Ask your foreman to enter the clock-in for you from their portal.",
  monthlyRemoteExitCap: "You've reached this month's remote clock-out limit. Contact the manager.",
  corrRecordNotFound: "Record not found. Contact the manager.",
  corrRecordDeleted: "This record has been deleted. Contact the manager.",
  askForemanForFix: "Forgot to clock? Ask your foreman.",
  manualEntryDisabled: "Self-service manual entry has been disabled. Ask your foreman to fix it.",
  errClientBadRequest: "The request was malformed. Try again — if it keeps failing, ask your foreman.",
  errLocationRequired: "No location was sent. Try again — if it keeps failing, ask your foreman.",
  errAccessDenied: "You don't have access. Ask your foreman.",
  errServerBusy: "Temporary server error. Try again in a moment — if it keeps failing, ask your foreman.",
};

const SI: ScreenStrings = {
  clockTitle: "පැමිණීම් ඔරලෝසුව",
  phonePrompt: "හඳුනා ගැනීමට දුරකථන අංකය ඇතුළු කරන්න",
  confirmLocation: "ස්ථානය තහවුරු කර ඉදිරියට යන්න",
  geoPermissionDenied: "ස්ථානයට අවසරය අවහිර වී ඇත. විසඳීමට:\nඉහළ ලිපින තීරුව අසල ඇති 🔒 (හෝ ⓘ) තට්ටු කරන්න → ස්ථානය → අවසර දෙන්න.\nඉන්පසු නැවත උත්සාහ කරන්න.\n\nතවමත් ක්‍රියා නොකරයිද? ඔබේ ස්ථාන කළමනාකරු අමතන්න.",
  geoPositionUnavailable: "ස්ථානය හඳුනා ගැනීමට නොහැකි විය.\nවිවෘත අහසක් යටට ගොස් නැවත උත්සාහ කරන්න.\n\nතවමත් ක්‍රියා නොකරයිද? ඔබේ ස්ථාන කළමනාකරු අමතන්න.",
  geoTimeout: "ස්ථානය සොයා ගැනීමට වැඩි කාලයක් ගත විය.\nඔබේ සම්බන්ධතාවය පරීක්ෂා කර නැවත උත්සාහ කරන්න.\n\nතවමත් ක්‍රියා නොකරයිද? ඔබේ ස්ථාන කළමනාකරු අමතන්න.",
  geoUnsupported: "මෙම බ්‍රවුසරය ස්ථාන සේවා සඳහා සහාය නොදක්වයි. ඔබ වෙනුවෙන් සටහන් කිරීමට ඔබේ ස්ථාන කළමනාකරු අමතන්න.",
  locating: "ස්ථානය සොයමින්…",
  pickSite: "ඉදිකිරීම් ස්ථානයක් තෝරන්න",
  pickSiteSub: "ඔබ අද වැඩ කරන ස්ථානය තෝරන්න",
  loadingSites: "ස්ථාන පූරණය වෙමින්…",
  noSites: "ක්‍රියාකාරී ඉදිකිරීම් ස්ථාන නැත — කළමනාකරු අමතන්න",
  changeNumber: "අංකය වෙනස් කරන්න",
  locationOk: "ස්ථානය තහවුරු විය ✓",
  clockIn: "ඇතුළු වීම",
  clockOut: "පිටවීම",
  changeSite: "ස්ථානය වෙනස් කරන්න",
  sending: "වාර්තාව යවමින්…",
  recordedIn: "ඇතුළු වීම සටහන් විය ✅",
  recordedOut: "පිටවීම සටහන් විය 🔴",
  hello: "ආයුබෝවන්",
  autoReg: "ස්වයංක්‍රීය ලියාපදිංචිය",
  autoRegBody: "මෙම දුරකථනය නව පරිශීලකයෙකු ලෙස ලියාපදිංචි විය. පරිපාලන උපකරණ පුවරුවේ ඔබේ නම යාවත්කාලීන කරන්න.",
  dayMsg: "දවසේ පණිවිඩය",
  goodWorkIn: "සුබ දවසක්! 💪",
  goodWorkOut: "සුබ දවසක් වේවා 👋",
  anotherReport: "තවත් වාර්තාවක්",
  tryAgain: "නැවත උත්සාහ කරන්න",
  notFound: "කාර්ය මණ්ඩල ලැයිස්තුවේ දුරකථන අංකය හමු නොවීය. කළමනාකරු අමතන්න.",
  unknownError: "නොදන්නා දෝෂයක් — නැවත උත්සාහ කරන්න.",
  accountInactive: "ඔබේ ගිණුම අක්‍රියයි. කළමනාකරු අමතන්න.",
  alreadyClockedIn: "අද දැනටමත් ඇතුළු වීම සටහන් වී ඇත. දෝෂයක් නම් — කළමනාකරු අමතන්න.",
  noInternalAccess: "ඉතිහාසය බැලීමට, පළමුව සේවක ද්වාරය හරහා පුරනය වන්න.",
  home: "මුල් පිටුව",
  footer: "Binyan Eitan — අභ්‍යන්තර පැමිණීම් පද්ධතිය",
  myHistory: "මගේ පැමිණීම් ඉතිහාසය",
  historyTitle: "මගේ පැමිණීම",
  noHistory: "පැමිණීම් වාර්තා හමු නොවීය",
  loadingHistory: "ඉතිහාසය පූරණය වෙමින්…",
  backToForm: "ඔරලෝසුවට ආපසු",
  pendingBadge: "අනුමැතිය බලාපොරොත්තුවෙන්",
  corrPending: "බලාපොරොත්තුවෙන් ⏳",
  corrApproved: "අනුමත විය ✓",
  corrRejected: "ප්‍රතික්ෂේප විය ✗",
  identify: "ඉදිරියට",
  identifying: "සත්‍යාපනය වෙමින්…",
  tooManyAttempts: "උත්සාහයන් ඉතා වැඩියි. මිනිත්තු කිහිපයකින් නැවත උත්සාහ කරන්න.",
  sessionExpired: "ඔබේ සැසිය කල් ඉකුත් විය. කරුණාකර නැවත පුරනය වන්න.",
  pinExpired: "ඇතුළුවීමේ කේතය කල් ඉකුත් විය — කරුණාකර නැවත ඇතුළු කරන්න",
  menuPrompt: "ඔබ කුමක් කිරීමට කැමතිද?",
  startClock: "පැමිණීම සටහන් කරන්න",
  switchUser: "පරිශීලක මාරු කරන්න",
  missingExitOne: "ඔබ එක් දිනක් පිටවීම සටහන් කිරීමට අමතක කර ඇත. ඉතිහාස තිරයේ එය සම්පූර්ණ කළ හැක.",
  missingExitMany: "ඔබ දින {n} ක් පිටවීම සටහන් කිරීමට අමතක කර ඇත. ඉතිහාස තිරයේ ඒවා සම්පූර්ණ කළ හැක.",
  missingExitCta: "ඉතිහාසයට යන්න",
  backToPortal: "ප්‍රධාන මෙනුවට ආපසු",
  networkError: "ජාල දෝෂයක් — නැවත උත්සාහ කරන්න",
  historyColDate: "දිනය",
  historyColEntry: "ඇතුළු වීම",
  historyColExit: "පිටවීම",
  historyColHours: "පැය",
  historyTotal: "එකතුව",
  historyHoursUnit: "පැය",
  reportMistakeTooltip: "වැරැද්දක් වාර්තා කරන්න",
  dayPrefix: "",
  weekdays: ["ඉරිදා", "සඳුදා", "අඟහරුවාදා", "බදාදා", "බ්‍රහස්පතින්දා", "සිකුරාදා", "සෙනසුරාදා"],
  corrTitle: "වාර්තාවේ වැරැද්දක් වාර්තා කරන්න",
  corrTypeTitle: "කුමක් සිදු වූයේද?",
  corrTypeMissingExit: "පිටවීම සටහන් කිරීමට අමතක විය",
  corrTypeMissingEntry: "පැමිණීම සටහන් කිරීමට අමතක විය",
  corrTypeFixTime: "සටහන් කළ වේලාව වැරදියි",
  corrTimeExitLabel: "පිටවීමේ වේලාව",
  corrTimeEntryLabel: "පැමිණීමේ වේලාව",
  corrTimeRequired: "කරුණාකර වේලාව ඇතුළත් කරන්න",
  corrDayHasExit: "මෙම දිනය සඳහා දැනටමත් පිටවීමක් සටහන් කර ඇත.",
  corrDayHasEntry: "මෙම දිනය සඳහා දැනටමත් පැමිණීමක් සටහන් කර ඇත.",
  corrProposedLabel: "නිවැරදි වේලාව (විකල්ප)",
  corrReasonLabel: "වැරැද්ද කුමක්ද?",
  corrReasonPlaceholder: "උදා: පෙන්වා ඇති පරිදි 17:00 ට නොව 18:30 ට මම පිටව ගියෙමි",
  corrSubmit: "අනුමැතිය සඳහා යවන්න",
  corrSending: "යවමින්…",
  corrCancel: "අවලංගු කරන්න",
  corrReasonRequired: "කරුණාකර වැරැද්ද පැහැදිලි කරන්න",
  corrTooMany: "ඉල්ලීම් ඉතා වැඩියි. මිනිත්තු කිහිපයකින් නැවත උත්සාහ කරන්න.",
  corrAlreadyOpen: "මෙම වාර්තාව සඳහා නිවැරදි කිරීමේ ඉල්ලීමක් දැනටමත් බලාපොරොත්තුවෙන් පවතී.",
  corrOutOfWindow: "වත්මන් හෝ පෙර මාසයේ වාර්තා සඳහා පමණක් වැරැද්දක් වාර්තා කළ හැක.",
  corrGeneric: "දෝෂයක් — නැවත උත්සාහ කරන්න.",
  joinCta: "නව සේවකයෙක්ද? එක්වීමට ඉල්ලීමක් කරන්න",
  noOpenEntryToClose: "වසා දැමීමට විවෘත ඇතුළු වීමක් නැත. නිවැරදි කිරීමක් අවශ්‍ය නම් — කළමනාකරු අමතන්න.",
  gpsOutOfRange: "ඔබ ස්ථානයේ පරාසයෙන් පිටත සිටී. ඔබේ ස්ථාන කළමනාකරු ඔවුන්ගේ ද්වාරයෙන් ඔබ වෙනුවෙන් සටහන් කිරීමට ඉල්ලන්න.",
  monthlyRemoteExitCap: "ඔබ මෙම මාසයේ දුරස්ථ පිටවීමේ සීමාව සම්පූර්ණ කර ඇත. කළමනාකරු අමතන්න.",
  corrRecordNotFound: "වාර්තාව හමු නොවීය. කළමනාකරු අමතන්න.",
  corrRecordDeleted: "මෙම වාර්තාව මකා දමා ඇත. කළමනාකරු අමතන්න.",
  askForemanForFix: "සටහන් කිරීමට අමතක වුනාද? ඔබේ ස්ථාන කළමනාකරු අමතන්න.",
  manualEntryDisabled: "ස්වයං-සේවා අතින් සටහන් කිරීම අක්‍රිය කර ඇත. සකස් කිරීමට ස්ථාන කළමනාකරු අමතන්න.",
  errClientBadRequest: "ඉල්ලීම වැරදිය. නැවත උත්සාහ කරන්න — දෝෂය දිගටම පවතී නම්, ඔබේ ස්ථාන කළමනාකරු අමතන්න.",
  errLocationRequired: "ස්ථානය යවා නොමැත. නැවත උත්සාහ කරන්න — දෝෂය දිගටම පවතී නම්, ඔබේ ස්ථාන කළමනාකරු අමතන්න.",
  errAccessDenied: "ඔබට අවසර නැත. ඔබේ ස්ථාන කළමනාකරු අමතන්න.",
  errServerBusy: "තාවකාලික සේවාදායක දෝෂයකි. මොහොතකට පසු නැවත උත්සාහ කරන්න — දෝෂය දිගටම පවතී නම්, ඔබේ ස්ථාන කළමනාකරු අමතන්න.",
};

const ZH: ScreenStrings = {
  clockTitle: "考勤打卡",
  phonePrompt: "输入电话号码进行识别",
  confirmLocation: "确认位置并继续",
  geoPermissionDenied: "位置权限被阻止。解决方法：\n点击顶部地址栏旁的 🔒（或 ⓘ）→ 位置 → 允许。\n然后重试。\n\n仍然无效？请联系工地负责人。",
  geoPositionUnavailable: "无法确定位置。\n请到开阔地带后重试。\n\n仍然无效？请联系工地负责人。",
  geoTimeout: "定位耗时过长。\n请检查网络后重试。\n\n仍然无效？请联系工地负责人。",
  geoUnsupported: "此浏览器不支持定位。请让工地负责人为您登记打卡。",
  locating: "正在定位…",
  pickSite: "选择工地",
  pickSiteSub: "选择您今天工作的工地",
  loadingSites: "正在加载工地…",
  noSites: "没有活动的工地 — 请联系管理员",
  changeNumber: "更改号码",
  locationOk: "位置已确认 ✓",
  clockIn: "上班打卡",
  clockOut: "下班打卡",
  changeSite: "更改工地",
  sending: "正在提交…",
  recordedIn: "上班打卡已记录 ✅",
  recordedOut: "下班打卡已记录 🔴",
  hello: "您好",
  autoReg: "自动注册",
  autoRegBody: "此电话已注册为新用户。请在管理面板中更新您的姓名。",
  dayMsg: "今日消息",
  goodWorkIn: "工作顺利！💪",
  goodWorkOut: "祝您愉快 👋",
  anotherReport: "再次打卡",
  tryAgain: "重试",
  notFound: "在员工名单中找不到此电话号码。请联系管理员。",
  unknownError: "未知错误 — 请重试。",
  accountInactive: "您的账户未激活。请联系管理员。",
  alreadyClockedIn: "今天已记录上班打卡。如有错误 — 请联系管理员。",
  noInternalAccess: "查看历史记录请先通过员工门户登录。",
  home: "主页",
  footer: "Binyan Eitan — 内部考勤系统",
  myHistory: "我的考勤记录",
  historyTitle: "我的考勤",
  noHistory: "未找到考勤记录",
  loadingHistory: "正在加载历史记录…",
  backToForm: "返回打卡",
  pendingBadge: "待批准",
  corrPending: "待批准 ⏳",
  corrApproved: "已批准 ✓",
  corrRejected: "已拒绝 ✗",
  identify: "继续",
  identifying: "正在验证…",
  tooManyAttempts: "尝试次数过多。请几分钟后重试。",
  sessionExpired: "会话已过期。请重新登录。",
  pinExpired: "登录码已过期 — 请重新输入",
  menuPrompt: "您想做什么？",
  startClock: "打卡考勤",
  switchUser: "切换用户",
  missingExitOne: "您有一天忘记下班打卡。可在历史记录页面补录。",
  missingExitMany: "您有 {n} 天忘记下班打卡。可在历史记录页面补录。",
  missingExitCta: "前往历史记录",
  backToPortal: "返回主菜单",
  networkError: "网络错误 — 请重试",
  historyColDate: "日期",
  historyColEntry: "上班",
  historyColExit: "下班",
  historyColHours: "工时",
  historyTotal: "总计",
  historyHoursUnit: "小时",
  reportMistakeTooltip: "报告错误",
  dayPrefix: "星期",
  weekdays: ["日", "一", "二", "三", "四", "五", "六"],
  corrTitle: "报告记录中的错误",
  corrTypeTitle: "发生了什么？",
  corrTypeMissingExit: "我忘记打下班卡",
  corrTypeMissingEntry: "我忘记打上班卡",
  corrTypeFixTime: "记录的时间有误",
  corrTimeExitLabel: "下班时间",
  corrTimeEntryLabel: "上班时间",
  corrTimeRequired: "请输入时间",
  corrDayHasExit: "当天已记录下班打卡。",
  corrDayHasEntry: "当天已记录上班打卡。",
  corrProposedLabel: "正确时间（可选）",
  corrReasonLabel: "错误是什么？",
  corrReasonPlaceholder: "例如：我18:30离开，而不是显示的17:00",
  corrSubmit: "提交批准",
  corrSending: "正在发送…",
  corrCancel: "取消",
  corrReasonRequired: "请说明错误",
  corrTooMany: "请求过多。请几分钟后重试。",
  corrAlreadyOpen: "此记录的更正请求已在等待批准。",
  corrOutOfWindow: "只能报告本月或上月记录中的错误。",
  corrGeneric: "错误 — 请重试。",
  joinCta: "新员工？申请加入",
  noOpenEntryToClose: "没有可关闭的上班打卡记录。如需更正，请联系管理员。",
  gpsOutOfRange: "您在工地范围之外。请工地负责人从其门户为您登记打卡。",
  monthlyRemoteExitCap: "您已达到本月远程下班打卡的上限。请联系管理员。",
  corrRecordNotFound: "未找到记录。请联系管理员。",
  corrRecordDeleted: "此记录已被删除。请联系管理员。",
  askForemanForFix: "忘记打卡？请联系工地负责人。",
  manualEntryDisabled: "自助手动打卡已停用。请联系工地负责人处理。",
  errClientBadRequest: "请求无效。请重试 — 如问题持续，请联系工地负责人。",
  errLocationRequired: "未发送位置。请重试 — 如问题持续，请联系工地负责人。",
  errAccessDenied: "无权访问。请联系工地负责人。",
  errServerBusy: "服务器暂时故障。请稍后重试 — 如问题持续，请联系工地负责人。",
};

const HI: ScreenStrings = {
  clockTitle: "उपस्थिति घड़ी",
  phonePrompt: "पहचान के लिए फ़ोन नंबर दर्ज करें",
  confirmLocation: "स्थान की पुष्टि करें और जारी रखें",
  geoPermissionDenied: "स्थान अवरुद्ध है। ठीक करने के लिए:\nऊपर पता बार के पास 🔒 (या ⓘ) टैप करें → स्थान → अनुमति दें।\nफिर पुनः प्रयास करें।\n\nअब भी काम नहीं कर रहा? अपने साइट प्रबंधक से संपर्क करें।",
  geoPositionUnavailable: "स्थान का पता नहीं लगाया जा सका।\nखुले क्षेत्र में जाकर पुनः प्रयास करें।\n\nअब भी काम नहीं कर रहा? अपने साइट प्रबंधक से संपर्क करें।",
  geoTimeout: "स्थान का पता लगाने में बहुत समय लगा।\nअपना कनेक्शन जाँचकर पुनः प्रयास करें।\n\nअब भी काम नहीं कर रहा? अपने साइट प्रबंधक से संपर्क करें।",
  geoUnsupported: "यह ब्राउज़र स्थान सेवाओं का समर्थन नहीं करता। अपने साइट प्रबंधक से आपके लिए दर्ज करने के लिए कहें।",
  locating: "स्थान ढूँढ रहे हैं…",
  pickSite: "निर्माण स्थल चुनें",
  pickSiteSub: "वह स्थल चुनें जहाँ आप आज काम कर रहे हैं",
  loadingSites: "स्थल लोड हो रहे हैं…",
  noSites: "कोई सक्रिय निर्माण स्थल नहीं — प्रबंधक से संपर्क करें",
  changeNumber: "नंबर बदलें",
  locationOk: "स्थान की पुष्टि हुई ✓",
  clockIn: "प्रवेश",
  clockOut: "निकास",
  changeSite: "स्थल बदलें",
  sending: "भेजा जा रहा है…",
  recordedIn: "प्रवेश दर्ज हुआ ✅",
  recordedOut: "निकास दर्ज हुआ 🔴",
  hello: "नमस्ते",
  autoReg: "स्वतः पंजीकरण",
  autoRegBody: "यह फ़ोन नए उपयोगकर्ता के रूप में पंजीकृत हुआ। एडमिन डैशबोर्ड में अपना नाम अपडेट करें।",
  dayMsg: "आज का संदेश",
  goodWorkIn: "अच्छा काम करें! 💪",
  goodWorkOut: "आपका दिन शुभ हो 👋",
  anotherReport: "एक और प्रविष्टि",
  tryAgain: "पुनः प्रयास करें",
  notFound: "स्टाफ़ सूची में फ़ोन नंबर नहीं मिला। प्रबंधक से संपर्क करें।",
  unknownError: "अज्ञात त्रुटि — पुनः प्रयास करें।",
  accountInactive: "आपका खाता निष्क्रिय है। प्रबंधक से संपर्क करें।",
  alreadyClockedIn: "आज प्रवेश पहले ही दर्ज हो चुका है। यदि यह त्रुटि है — प्रबंधक से संपर्क करें।",
  noInternalAccess: "इतिहास देखने के लिए पहले कर्मचारी पोर्टल से साइन इन करें।",
  home: "होम",
  footer: "Binyan Eitan — आंतरिक उपस्थिति प्रणाली",
  myHistory: "मेरा उपस्थिति इतिहास",
  historyTitle: "मेरी उपस्थिति",
  noHistory: "कोई उपस्थिति रिकॉर्ड नहीं मिला",
  loadingHistory: "इतिहास लोड हो रहा है…",
  backToForm: "घड़ी पर वापस",
  pendingBadge: "अनुमोदन लंबित",
  corrPending: "लंबित ⏳",
  corrApproved: "स्वीकृत ✓",
  corrRejected: "अस्वीकृत ✗",
  identify: "जारी रखें",
  identifying: "सत्यापित हो रहा है…",
  tooManyAttempts: "बहुत अधिक प्रयास। कुछ मिनट बाद पुनः प्रयास करें।",
  sessionExpired: "आपका सत्र समाप्त हो गया। कृपया पुनः साइन इन करें।",
  pinExpired: "प्रवेश कोड समाप्त हो गया — कृपया फिर से दर्ज करें",
  menuPrompt: "आप क्या करना चाहेंगे?",
  startClock: "उपस्थिति दर्ज करें",
  switchUser: "उपयोगकर्ता बदलें",
  missingExitOne: "आप एक दिन निकास दर्ज करना भूल गए। आप इसे इतिहास स्क्रीन में पूरा कर सकते हैं।",
  missingExitMany: "आप {n} दिन निकास दर्ज करना भूल गए। आप उन्हें इतिहास स्क्रीन में पूरा कर सकते हैं।",
  missingExitCta: "इतिहास पर जाएँ",
  backToPortal: "मुख्य मेनू पर वापस",
  networkError: "नेटवर्क त्रुटि — पुनः प्रयास करें",
  historyColDate: "तारीख़",
  historyColEntry: "प्रवेश",
  historyColExit: "निकास",
  historyColHours: "घंटे",
  historyTotal: "कुल",
  historyHoursUnit: "घंटे",
  reportMistakeTooltip: "गलती की रिपोर्ट करें",
  dayPrefix: "",
  weekdays: ["रविवार", "सोमवार", "मंगलवार", "बुधवार", "गुरुवार", "शुक्रवार", "शनिवार"],
  corrTitle: "रिकॉर्ड में गलती की रिपोर्ट करें",
  corrTypeTitle: "क्या हुआ?",
  corrTypeMissingExit: "मैं बाहर का समय दर्ज करना भूल गया",
  corrTypeMissingEntry: "मैं प्रवेश का समय दर्ज करना भूल गया",
  corrTypeFixTime: "दर्ज किया गया समय गलत है",
  corrTimeExitLabel: "छुट्टी का समय",
  corrTimeEntryLabel: "प्रवेश का समय",
  corrTimeRequired: "कृपया समय दर्ज करें",
  corrDayHasExit: "इस दिन के लिए छुट्टी पहले से दर्ज है।",
  corrDayHasEntry: "इस दिन के लिए प्रवेश पहले से दर्ज है।",
  corrProposedLabel: "सही समय (वैकल्पिक)",
  corrReasonLabel: "गलती क्या है?",
  corrReasonPlaceholder: "उदा: मैं 18:30 पर निकला, न कि दिखाए गए 17:00 पर",
  corrSubmit: "स्वीकृति के लिए भेजें",
  corrSending: "भेजा जा रहा है…",
  corrCancel: "रद्द करें",
  corrReasonRequired: "कृपया गलती बताएँ",
  corrTooMany: "बहुत अधिक अनुरोध। कुछ मिनट बाद पुनः प्रयास करें।",
  corrAlreadyOpen: "इस रिकॉर्ड के लिए सुधार अनुरोध पहले से लंबित है।",
  corrOutOfWindow: "आप केवल वर्तमान या पिछले महीने के रिकॉर्ड की गलती रिपोर्ट कर सकते हैं।",
  corrGeneric: "त्रुटि — पुनः प्रयास करें।",
  joinCta: "नया कर्मचारी? शामिल होने का अनुरोध करें",
  noOpenEntryToClose: "बंद करने के लिए कोई खुला प्रवेश नहीं है। यदि सुधार चाहिए — प्रबंधक से संपर्क करें।",
  gpsOutOfRange: "आप स्थल की सीमा के बाहर हैं। अपने साइट प्रबंधक से उनके पोर्टल से आपके लिए दर्ज करने के लिए कहें।",
  monthlyRemoteExitCap: "आप इस महीने की दूरस्थ निकास सीमा तक पहुँच गए हैं। प्रबंधक से संपर्क करें।",
  corrRecordNotFound: "रिकॉर्ड नहीं मिला। प्रबंधक से संपर्क करें।",
  corrRecordDeleted: "यह रिकॉर्ड हटा दिया गया है। प्रबंधक से संपर्क करें।",
  askForemanForFix: "उपस्थिति दर्ज करना भूल गए? अपने साइट प्रबंधक से संपर्क करें।",
  manualEntryDisabled: "स्व-सेवा मैन्युअल प्रविष्टि बंद कर दी गई है। सुधार के लिए साइट प्रबंधक से संपर्क करें।",
  errClientBadRequest: "अनुरोध अमान्य है। पुनः प्रयास करें — यदि समस्या बनी रहे, अपने साइट प्रबंधक से संपर्क करें।",
  errLocationRequired: "स्थान नहीं भेजा गया। पुनः प्रयास करें — यदि समस्या बनी रहे, अपने साइट प्रबंधक से संपर्क करें।",
  errAccessDenied: "आपके पास पहुँच नहीं है। अपने साइट प्रबंधक से संपर्क करें।",
  errServerBusy: "अस्थायी सर्वर त्रुटि। एक क्षण बाद पुनः प्रयास करें — यदि समस्या बनी रहे, अपने साइट प्रबंधक से संपर्क करें।",
};

export const T: Record<Lang, ScreenStrings> = {
  he: HE,
  ru: RU,
  en: EN,
  si: SI,
  zh: ZH,
  hi: HI,
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

/**
 * For messages the worker will show to their (Hebrew-speaking) foreman.
 * Renders the worker's language plus a Hebrew line so the worker can hand
 * their phone to the foreman without a translation step. For Hebrew-
 * speaking workers, returns the string as-is (no duplicate line).
 *
 * All geolocation error variants get this treatment — the worker's next
 * step in every case is either "fix a settings thing themselves" or
 * "show the phone to the foreman"; the second option needs Hebrew.
 * `gpsOutOfRange` (from the backend) is also here for the same reason.
 */
export type BilingualKey =
  | "gpsOutOfRange"
  | "geoPermissionDenied"
  | "geoPositionUnavailable"
  | "geoTimeout"
  | "geoUnsupported";

export function bilingualForForeman(lang: Lang, key: BilingualKey): string {
  const own = T[lang][key];
  if (lang === "he") return own;
  return `${own}\n\n${T.he[key]}`;
}
