export type Language = 'auto' | 'en' | 'ru' | 'ro' | 'uk';
export type ResolvedLanguage = 'en' | 'ru' | 'ro' | 'uk';

const BROWSER_LANGUAGE_PREFIXES: Record<string, ResolvedLanguage> = {
  ru: 'ru',
  ro: 'ro',
  uk: 'uk',
};

export function detectBrowserLanguage(): ResolvedLanguage {
  const lang = navigator.language?.toLowerCase() ?? '';
  const prefix = lang.slice(0, 2);
  return BROWSER_LANGUAGE_PREFIXES[prefix] ?? 'en';
}

const en = {
  // Data types
  dt_cacheStorage: 'Cache Storage',
  dt_cache: 'HTTP Cache',
  dt_indexedDB: 'IndexedDB',
  dt_localStorage: 'Local Storage',
  dt_sessionStorage: 'Session Storage',
  dt_cookies: 'Cookies',
  dt_serviceWorkers: 'Service Workers',
  dt_history: 'History',
  dt_downloads: 'Download History',
  dt_formData: 'Form Data',

  // Shared statuses
  clearing: 'Clearing…',
  reloading: 'Reloading…',
  cleared: 'Cleared ✓',
  failed: 'Failed',
  cancel: 'Cancel',
  globalOnly: '(global only)',

  // Popup
  popupTitle: 'Cache Cleaner',
  reloadTabAfterClearing: 'Reload tab after clearing',
  clearActiveTabOnly: 'Clear active tab only',
  failedOrDenied: 'Failed / denied',
  activeTabHint: 'Only the site open in this tab is affected. Asks for one-time site permission on first use.',
  clearAllSites: 'Clear all sites',
  yesClearEverything: 'Yes, clear everything',
  allSitesHint: 'Applies to every site, not just this tab. No extra permission needed.',
  settings: 'Settings',

  // Settings page
  settingsTitle: 'Cache Cleaner — Settings',
  resetToDefaults: 'Reset to defaults',
  theme: 'Theme',
  themeSystem: 'System',
  themeLight: 'Light',
  themeDark: 'Dark',
  language: 'Language',
  languageAuto: 'Auto (browser default)',
  languageEnglish: 'English',
  languageRussian: 'Russian',
  languageRomanian: 'Romanian',
  languageUkrainian: 'Ukrainian',
  behavior: 'Behavior',
  reloadTabAfterClearingPerSite: 'Reload tab after clearing (per-site only)',
  dataTypes: 'Data types',
  siteScopeNote:
    "History, Download History, and Form Data can't be scoped to one site — they only clear in Global mode.",
  storageKeyShareNote:
    'Local Storage and Session Storage share one browser API in Global mode — checking either one clears both.',
  scope: 'Scope',
  scopeGlobal: 'Global',
  scopeGlobalDescription:
    "Clears the checked types for every site you've visited, not just the one you're on. No extra permission needed.",
  scopePerSite: 'Per site / domain',
  scopePerSiteDescription:
    "Pick one open tab below; only that site's data is cleared, everything else is untouched. Asks for one-time site permission the first time you clear.",
  openTabsOnly: 'Only open tabs can be targeted.',
  geckoClearNote:
    ' This browser clears via the page itself, so unreachable (backgrounded/discarded) tabs may not fully clear.',
  filterTabsPlaceholder: 'Filter open tabs by domain…',
  someFailed: 'Some failed',
  clearAllCount: 'Clear all ({count})',
  clear: 'Clear',
  noMatchingTabs: 'No matching tabs.',
  recentHistory: 'Recent history',
  remove: 'Remove',
};

const ru: typeof en = {
  dt_cacheStorage: 'Кэш-хранилище',
  dt_cache: 'HTTP-кэш',
  dt_indexedDB: 'IndexedDB',
  dt_localStorage: 'Локальное хранилище',
  dt_sessionStorage: 'Хранилище сессии',
  dt_cookies: 'Файлы cookie',
  dt_serviceWorkers: 'Сервис-воркеры',
  dt_history: 'История',
  dt_downloads: 'История загрузок',
  dt_formData: 'Данные форм',

  clearing: 'Очистка…',
  reloading: 'Обновление…',
  cleared: 'Очищено ✓',
  failed: 'Ошибка',
  cancel: 'Отмена',
  globalOnly: '(только глобально)',

  popupTitle: 'Cache Cleaner',
  reloadTabAfterClearing: 'Обновить вкладку после очистки',
  clearActiveTabOnly: 'Очистить текущую вкладку',
  failedOrDenied: 'Ошибка / отказано',
  activeTabHint:
    'Затрагивает только сайт, открытый в этой вкладке. При первом использовании запросит разрешение.',
  clearAllSites: 'Очистить все сайты',
  yesClearEverything: 'Да, очистить всё',
  allSitesHint: 'Применяется ко всем сайтам, не только к этой вкладке. Доп. разрешения не нужны.',
  settings: 'Настройки',

  settingsTitle: 'Cache Cleaner — Настройки',
  resetToDefaults: 'Сбросить настройки',
  theme: 'Тема',
  themeSystem: 'Системная',
  themeLight: 'Светлая',
  themeDark: 'Тёмная',
  language: 'Язык',
  languageAuto: 'Авто (по умолчанию браузера)',
  languageEnglish: 'Английский',
  languageRussian: 'Русский',
  languageRomanian: 'Румынский',
  languageUkrainian: 'Украинский',
  behavior: 'Поведение',
  reloadTabAfterClearingPerSite: 'Обновить вкладку после очистки (только для сайта)',
  dataTypes: 'Типы данных',
  siteScopeNote:
    'История, история загрузок и данные форм нельзя очистить только для одного сайта — они очищаются только в глобальном режиме.',
  storageKeyShareNote:
    'Локальное хранилище и хранилище сессии используют один и тот же API браузера в глобальном режиме — отметка любого из них очищает оба.',
  scope: 'Область',
  scopeGlobal: 'Глобально',
  scopeGlobalDescription:
    'Очищает отмеченные типы для всех посещённых сайтов, а не только для текущего. Доп. разрешения не нужны.',
  scopePerSite: 'Для сайта / домена',
  scopePerSiteDescription:
    'Выберите одну открытую вкладку ниже; будут очищены данные только этого сайта, остальное не тронуто. При первой очистке запросит разрешение.',
  openTabsOnly: 'Доступны только открытые вкладки.',
  geckoClearNote:
    ' Этот браузер очищает данные через саму страницу, поэтому недоступные (фоновые/выгруженные) вкладки могут очиститься не полностью.',
  filterTabsPlaceholder: 'Фильтр открытых вкладок по домену…',
  someFailed: 'Часть не удалась',
  clearAllCount: 'Очистить все ({count})',
  clear: 'Очистить',
  noMatchingTabs: 'Нет подходящих вкладок.',
  recentHistory: 'Недавняя история',
  remove: 'Удалить',
};

const ro: typeof en = {
  dt_cacheStorage: 'Stocare cache',
  dt_cache: 'Cache HTTP',
  dt_indexedDB: 'IndexedDB',
  dt_localStorage: 'Stocare locală',
  dt_sessionStorage: 'Stocare sesiune',
  dt_cookies: 'Cookie-uri',
  dt_serviceWorkers: 'Service Worker-i',
  dt_history: 'Istoric',
  dt_downloads: 'Istoric descărcări',
  dt_formData: 'Date formulare',

  clearing: 'Se șterge…',
  reloading: 'Se reîncarcă…',
  cleared: 'Șters ✓',
  failed: 'Eroare',
  cancel: 'Anulează',
  globalOnly: '(doar global)',

  popupTitle: 'Cache Cleaner',
  reloadTabAfterClearing: 'Reîncarcă fila după ștergere',
  clearActiveTabOnly: 'Șterge doar fila activă',
  failedOrDenied: 'Eroare / refuzat',
  activeTabHint:
    'Afectează doar site-ul deschis în această filă. Va cere permisiune o singură dată la prima utilizare.',
  clearAllSites: 'Șterge toate site-urile',
  yesClearEverything: 'Da, șterge totul',
  allSitesHint: 'Se aplică pentru toate site-urile, nu doar pentru această filă. Nu necesită permisiuni extra.',
  settings: 'Setări',

  settingsTitle: 'Cache Cleaner — Setări',
  resetToDefaults: 'Resetează la valorile implicite',
  theme: 'Temă',
  themeSystem: 'Sistem',
  themeLight: 'Luminoasă',
  themeDark: 'Întunecată',
  language: 'Limbă',
  languageAuto: 'Automat (implicit browser)',
  languageEnglish: 'Engleză',
  languageRussian: 'Rusă',
  languageRomanian: 'Română',
  languageUkrainian: 'Ucraineană',
  behavior: 'Comportament',
  reloadTabAfterClearingPerSite: 'Reîncarcă fila după ștergere (doar per site)',
  dataTypes: 'Tipuri de date',
  siteScopeNote:
    'Istoricul, istoricul descărcărilor și datele formularelor nu pot fi limitate la un singur site — se șterg doar în modul Global.',
  storageKeyShareNote:
    'Stocarea locală și stocarea sesiunii folosesc același API al browserului în modul Global — bifarea uneia le șterge pe ambele.',
  scope: 'Domeniu de acțiune',
  scopeGlobal: 'Global',
  scopeGlobalDescription:
    'Șterge tipurile bifate pentru toate site-urile vizitate, nu doar pentru cel curent. Nu necesită permisiuni extra.',
  scopePerSite: 'Per site / domeniu',
  scopePerSiteDescription:
    'Alege o filă deschisă mai jos; se șterg doar datele acelui site, restul rămân neafectate. Va cere permisiune la prima ștergere.',
  openTabsOnly: 'Pot fi ținta doar filele deschise.',
  geckoClearNote:
    ' Acest browser șterge prin pagina însăși, așa că filele inaccesibile (fundal/descărcate) ar putea să nu se șteargă complet.',
  filterTabsPlaceholder: 'Filtrează filele deschise după domeniu…',
  someFailed: 'Unele au eșuat',
  clearAllCount: 'Șterge toate ({count})',
  clear: 'Șterge',
  noMatchingTabs: 'Nicio filă corespunzătoare.',
  recentHistory: 'Istoric recent',
  remove: 'Elimină',
};

const uk: typeof en = {
  dt_cacheStorage: 'Кеш-сховище',
  dt_cache: 'HTTP-кеш',
  dt_indexedDB: 'IndexedDB',
  dt_localStorage: 'Локальне сховище',
  dt_sessionStorage: 'Сховище сесії',
  dt_cookies: 'Файли cookie',
  dt_serviceWorkers: 'Сервіс-воркери',
  dt_history: 'Історія',
  dt_downloads: 'Історія завантажень',
  dt_formData: 'Дані форм',

  clearing: 'Очищення…',
  reloading: 'Оновлення…',
  cleared: 'Очищено ✓',
  failed: 'Помилка',
  cancel: 'Скасувати',
  globalOnly: '(лише глобально)',

  popupTitle: 'Cache Cleaner',
  reloadTabAfterClearing: 'Оновити вкладку після очищення',
  clearActiveTabOnly: 'Очистити лише поточну вкладку',
  failedOrDenied: 'Помилка / відмовлено',
  activeTabHint:
    'Стосується лише сайту, відкритого в цій вкладці. При першому використанні запитає дозвіл.',
  clearAllSites: 'Очистити всі сайти',
  yesClearEverything: 'Так, очистити все',
  allSitesHint: 'Застосовується до всіх сайтів, не лише до цієї вкладки. Додаткові дозволи не потрібні.',
  settings: 'Налаштування',

  settingsTitle: 'Cache Cleaner — Налаштування',
  resetToDefaults: 'Скинути налаштування',
  theme: 'Тема',
  themeSystem: 'Системна',
  themeLight: 'Світла',
  themeDark: 'Темна',
  language: 'Мова',
  languageAuto: 'Авто (за замовчуванням браузера)',
  languageEnglish: 'Англійська',
  languageRussian: 'Російська',
  languageRomanian: 'Румунська',
  languageUkrainian: 'Українська',
  behavior: 'Поведінка',
  reloadTabAfterClearingPerSite: 'Оновити вкладку після очищення (лише для сайту)',
  dataTypes: 'Типи даних',
  siteScopeNote:
    'Історію, історію завантажень і дані форм неможливо очистити лише для одного сайту — вони очищаються лише в глобальному режимі.',
  storageKeyShareNote:
    'Локальне сховище та сховище сесії використовують один і той самий API браузера в глобальному режимі — позначення будь-якого з них очищає обидва.',
  scope: 'Область',
  scopeGlobal: 'Глобально',
  scopeGlobalDescription:
    'Очищає позначені типи для всіх відвіданих сайтів, а не лише для поточного. Додаткові дозволи не потрібні.',
  scopePerSite: 'Для сайту / домену',
  scopePerSiteDescription:
    'Виберіть одну відкриту вкладку нижче; будуть очищені дані лише цього сайту, решта не торкнеться. При першому очищенні запитає дозвіл.',
  openTabsOnly: 'Можна вибрати лише відкриті вкладки.',
  geckoClearNote:
    ' Цей браузер очищає дані через саму сторінку, тому недоступні (фонові/вивантажені) вкладки можуть очиститися не повністю.',
  filterTabsPlaceholder: 'Фільтр відкритих вкладок за доменом…',
  someFailed: 'Частина не вдалася',
  clearAllCount: 'Очистити всі ({count})',
  clear: 'Очистити',
  noMatchingTabs: 'Немає відповідних вкладок.',
  recentHistory: 'Недавня історія',
  remove: 'Видалити',
};

export type TranslationKey = keyof typeof en;

const DICTIONARIES: Record<ResolvedLanguage, Record<TranslationKey, string>> = { en, ru, ro, uk };

export function translate(
  lang: ResolvedLanguage,
  key: TranslationKey,
  vars?: Record<string, string | number>,
): string {
  let str = DICTIONARIES[lang][key] ?? DICTIONARIES.en[key] ?? key;
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      str = str.replace(`{${name}}`, String(value));
    }
  }
  return str;
}
