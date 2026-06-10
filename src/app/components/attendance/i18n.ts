// Worker-facing attendance UI translations (he + ru).
// Lives separate from AttendanceForm.tsx so per-screen components can
// import only the strings without dragging the whole form module in.
// ScreenStrings is the prop type each per-screen component receives.

export type Lang = "he" | "ru";

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
}

export const T: Record<Lang, ScreenStrings> = {
  he: {
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
  },
  ru: {
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
  },
};
