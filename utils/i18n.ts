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

  clearing: 'Clearing…',
  reloading: 'Reloading…',
  cleared: 'Cleared ✓',
  failed: 'Failed',
  cancel: 'Cancel',

  popupTitle: 'Bleep - Cache Cleaner',
  reloadTabAfterClearing: 'Hard reload tab after clearing',
  clearActiveTabOnly: 'Clear active tab only',
  failedOrDenied: 'Failed / denied',
  activeTabHint: 'Only the site open in this tab is affected.',
  protectedSiteLabel: 'Protected site',
  protectedSiteHint: 'This site is on your protected list (Settings → Per Site) and can\'t be cleared from here.',
  clearAllSites: 'Clear all sites',
  yesClearEverything: 'Yes, clear everything',
  yesClearAllVisited: 'Yes, clear these',
  allSitesHint: 'Applies to every site, not just this tab.',
  settings: 'Settings',

  settingsTitle: 'Bleep - Fast Global & Tab Cache Cleaner — Settings',
  tabGeneral: 'General',
  tabHelp: 'Help',
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
  reloadTabAfterClearingPerSite: 'Hard reload tab after clearing (per-site only)',
  useOriginMappings: 'Use origin mappings',
  linkedOrigin: 'Origin mappings (also cleared when clearing the matching site)',
  linkedOriginSourcePlaceholder: 'https://your-app.com',
  linkedOriginTargetPlaceholder: 'https://auth.your-app.com',
  addMapping: '+ Add mapping',
  linkedOriginInvalidHint: "Doesn't look like a valid domain",
  linkedOriginHint:
    "Comma-separate multiple targets on the right. Scheme and path on either side don't matter, and a source also covers its subdomains (domain.com matches sso.domain.com too). Sites with no mapping are untouched.",
  storageKeyShareNote:
    'Local Storage and Session Storage share one browser API in Global mode — checking either one clears both.',
  scopeGlobal: 'Global',
  scopeGlobalDescription:
    "Clears the checked types for every site you've visited, not just the one you're on. No extra permission needed.",
  scopePerSite: 'Per site / domain',
  scopePerSiteDescription:
    "Pick one open tab below; only that site's data is cleared, everything else is untouched. Asks for one-time site permission the first time you clear.",
  openTabsOnly: 'Only open tabs can be targeted.',
  filterTabsPlaceholder: 'Filter open tabs by domain…',
  filterHistoryPlaceholder: 'Filter history by title or URL…',
  someFailed: 'Some failed',
  clearAllCount: 'Clear all ({count})',
  clear: 'Clear',
  noMatchingTabs: 'No matching tabs.',
  noMatchingHistory: 'No history yet.',
  visitedSites: 'Visited sites',
  visitedSitesDescription:
    'Any site from your history, not just open tabs — cleared the same way as the checklist above.',
  visitedSitesContainerCaveat:
    'On {browser}, this only clears the default container; a site open in a named container (e.g. Multi-Account Containers) needs clearing from its own open tab instead.',
  filterVisitedSitesPlaceholder: 'Filter visited sites by domain…',
  noMatchingSites: 'No matching sites.',
  recentHistory: 'Recent history',
  remove: 'Remove',

  protectedSites: 'Protected sites',
  protectedSitesPlaceholder: 'One hostname per line, e.g. app.your-company.com',
  protectedSitesHint:
    "Never cleared by any per-site action (tabs, visited sites, or as a mapped origin target) — a source also protects its subdomains. Doesn't apply to Global's \"Clear all sites\", which has no way to exclude specific sites.",
  protectedSitesGlobalNote: "Protected sites list doesn't apply here — Global clear always clears everything.",

  backupTitle: 'Backup',
  backupHint: 'Export your settings (including origin mappings) to a file, or import one on another machine.',
  exportSettings: 'Export settings',
  importSettings: 'Import settings',
  importInvalidFile: "That file couldn't be read as Bleep settings.",

  clearLogTitle: 'Recently cleared',
  clearLogEmpty: 'Nothing cleared yet.',
  clearLogClear: 'Clear log',
  clearLogLinkedCount: '{count} linked',
  clearLogBulkTabs: '{count} tabs (bulk)',
  clearLogBulkVisited: '{count} visited sites (bulk)',

  helpTitle: 'How Bleep works',
  helpPopupTitle: 'Popup',
  helpPopupText:
    'Click the toolbar icon. "Clear active tab" clears just the site you\'re on. "Clear all sites" clears everything, everywhere.',
  helpScopeTitle: 'Global vs Per Site',
  helpScopeText:
    "Global affects every site you've visited. Per Site affects only one tab you pick. Each has its own checklist below.",
  helpTypesTitle: 'Data types',
  helpTypesText:
    "Cache, Storage, and Service Workers are a site's own saved files. Cookies keep you logged in. History, Downloads, and Form Data are browser records — Global only.",
  helpReloadTitle: 'Hard reload',
  helpReloadText:
    'After clearing, reloads the tab ignoring old cached files, so you see the fresh version right away.',
  helpMappingsTitle: 'Origin mappings',
  helpMappingsText:
    "Some apps silently sign you back in through a separate auth/SSO domain your storage clear never touches. Map that domain in Per Site settings (site => also-clear-this) so it's cleared too — only when clearing the exact site on the left.",
  helpFeedbackTitle: 'Feedback',
  helpFeedbackText: 'Found a bug or have a feature request?',
  helpFeedbackLink: 'Open an issue on GitHub',
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

  popupTitle: 'Bleep - Cache Cleaner',
  reloadTabAfterClearing: 'Жёстко обновить вкладку после очистки',
  clearActiveTabOnly: 'Очистить текущую вкладку',
  failedOrDenied: 'Ошибка / отказано',
  activeTabHint:
    'Затрагивает только сайт, открытый в этой вкладке. При первом использовании запросит разрешение.',
  protectedSiteLabel: 'Защищённый сайт',
  protectedSiteHint: 'Этот сайт в списке защищённых (Настройки → Для сайта) и не может быть очищен отсюда.',
  clearAllSites: 'Очистить все сайты',
  yesClearEverything: 'Да, очистить всё',
  yesClearAllVisited: 'Да, очистить эти',
  allSitesHint: 'Применяется ко всем сайтам, не только к этой вкладке.',
  settings: 'Настройки',

  settingsTitle: 'Bleep - Fast Global & Tab Cache Cleaner — Настройки',
  tabGeneral: 'Общие',
  tabHelp: 'Справка',
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
  reloadTabAfterClearingPerSite: 'Жёстко обновить вкладку после очистки (только для сайта)',
  useOriginMappings: 'Использовать сопоставления источников',
  linkedOrigin: 'Сопоставления источников (тоже очищаются при очистке нужного сайта)',
  linkedOriginSourcePlaceholder: 'https://your-app.com',
  linkedOriginTargetPlaceholder: 'https://auth.your-app.com',
  addMapping: '+ Добавить сопоставление',
  linkedOriginInvalidHint: 'Похоже, это не действительный домен',
  linkedOriginHint:
    'Справа через запятую можно указать несколько целей. Протокол и путь неважны с любой стороны, а источник охватывает и свои поддомены (domain.com совпадёт и с sso.domain.com). Сайты без сопоставления не затрагиваются.',
  storageKeyShareNote:
    'Локальное хранилище и хранилище сессии используют один и тот же API браузера в глобальном режиме — отметка любого из них очищает оба.',
  scopeGlobal: 'Глобально',
  scopeGlobalDescription:
    'Очищает отмеченные типы для всех посещённых сайтов, а не только для текущего. Доп. разрешения не нужны.',
  scopePerSite: 'Для сайта / домена',
  scopePerSiteDescription:
    'Выберите одну открытую вкладку ниже; будут очищены данные только этого сайта, остальное не тронуто. При первой очистке запросит разрешение.',
  openTabsOnly: 'Доступны только открытые вкладки.',
  filterTabsPlaceholder: 'Фильтр открытых вкладок по домену…',
  filterHistoryPlaceholder: 'Фильтр истории по названию или URL…',
  someFailed: 'Часть не удалась',
  clearAllCount: 'Очистить все ({count})',
  clear: 'Очистить',
  noMatchingTabs: 'Нет подходящих вкладок.',
  noMatchingHistory: 'История пуста.',
  visitedSites: 'Посещённые сайты',
  visitedSitesDescription:
    'Любой сайт из истории, а не только открытые вкладки — очищается так же, как и по чек-листу выше.',
  visitedSitesContainerCaveat:
    'В {browser} это очищает только контейнер по умолчанию; сайт, открытый в именованном контейнере (например, Multi-Account Containers), нужно очищать из его собственной открытой вкладки.',
  filterVisitedSitesPlaceholder: 'Фильтр посещённых сайтов по домену…',
  noMatchingSites: 'Нет подходящих сайтов.',
  recentHistory: 'Недавняя история',
  remove: 'Удалить',

  protectedSites: 'Защищённые сайты',
  protectedSitesPlaceholder: 'По одному домену на строку, напр. app.your-company.com',
  protectedSitesHint:
    'Никогда не очищаются никакими действиями для сайта (вкладки, посещённые сайты или как связанный целевой домен) — источник также защищает свои поддомены. Не действует для «Очистить все сайты» в разделе «Глобально» — там нет способа исключить отдельные сайты.',
  protectedSitesGlobalNote:
    'Список защищённых сайтов здесь не действует — глобальная очистка всегда очищает всё.',

  backupTitle: 'Резервная копия',
  backupHint: 'Экспортируйте настройки (включая сопоставления источников) в файл или импортируйте их на другом устройстве.',
  exportSettings: 'Экспортировать настройки',
  importSettings: 'Импортировать настройки',
  importInvalidFile: 'Не удалось прочитать этот файл как настройки Bleep.',

  clearLogTitle: 'Недавно очищено',
  clearLogEmpty: 'Пока ничего не очищено.',
  clearLogClear: 'Очистить журнал',
  clearLogLinkedCount: 'связанных: {count}',
  clearLogBulkTabs: '{count} вкладок (массово)',
  clearLogBulkVisited: '{count} посещённых сайтов (массово)',

  helpTitle: 'Как работает Bleep',
  helpPopupTitle: 'Всплывающее окно',
  helpPopupText:
    'Нажмите на значок в панели инструментов. «Очистить текущую вкладку» очищает только открытый сайт. «Очистить все сайты» — очищает всё и везде.',
  helpScopeTitle: 'Глобально и для сайта',
  helpScopeText:
    'Глобально — затрагивает все посещённые сайты. Для сайта — только одну выбранную вкладку. У каждого свой список ниже.',
  helpTypesTitle: 'Типы данных',
  helpTypesText:
    'Кэш, хранилище и сервис-воркеры — это собственные файлы сайта. Cookie хранят вход в аккаунт. История, загрузки и данные форм — записи браузера, только глобально.',
  helpReloadTitle: 'Жёсткая перезагрузка',
  helpReloadText:
    'После очистки вкладка перезагружается без старых файлов кэша — сразу видна свежая версия сайта.',
  helpMappingsTitle: 'Сопоставления источников',
  helpMappingsText:
    'Некоторые приложения незаметно снова входят в аккаунт через отдельный домен авторизации/SSO, который очистка хранилища не затрагивает. Укажите этот домен в настройках «Для сайта» (сайт => тоже очистить это), чтобы он тоже очищался — только при очистке именно указанного слева сайта.',
  helpFeedbackTitle: 'Обратная связь',
  helpFeedbackText: 'Нашли баг или есть предложение?',
  helpFeedbackLink: 'Открыть issue на GitHub',
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

  popupTitle: 'Bleep - Cache Cleaner',
  reloadTabAfterClearing: 'Reîncarcă forțat fila după ștergere',
  clearActiveTabOnly: 'Șterge doar fila activă',
  failedOrDenied: 'Eroare / refuzat',
  activeTabHint:
    'Afectează doar site-ul deschis în această filă. Va cere permisiune o singură dată la prima utilizare.',
  protectedSiteLabel: 'Site protejat',
  protectedSiteHint: 'Acest site e în lista de site-uri protejate (Setări → Per site) și nu poate fi șters de aici.',
  clearAllSites: 'Șterge toate site-urile',
  yesClearEverything: 'Da, șterge totul',
  yesClearAllVisited: 'Da, șterge acestea',
  allSitesHint: 'Se aplică pentru toate site-urile, nu doar pentru această filă.',
  settings: 'Setări',

  settingsTitle: 'Bleep - Fast Global & Tab Cache Cleaner — Setări',
  tabGeneral: 'General',
  tabHelp: 'Ajutor',
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
  reloadTabAfterClearingPerSite: 'Reîncarcă forțat fila după ștergere (doar per site)',
  useOriginMappings: 'Folosește corespondențele de origini',
  linkedOrigin: 'Corespondențe de origini (șterse și ele la ștergerea site-ului potrivit)',
  linkedOriginSourcePlaceholder: 'https://your-app.com',
  linkedOriginTargetPlaceholder: 'https://auth.your-app.com',
  addMapping: '+ Adaugă corespondență',
  linkedOriginInvalidHint: 'Nu pare a fi un domeniu valid',
  linkedOriginHint:
    'Separă mai multe ținte prin virgulă în dreapta. Schema și calea nu contează pe nicio parte, iar o sursă acoperă și subdomeniile ei (domain.com se potrivește și cu sso.domain.com). Site-urile fără corespondență rămân neatinse.',
  storageKeyShareNote:
    'Stocarea locală și stocarea sesiunii folosesc același API al browserului în modul Global — bifarea uneia le șterge pe ambele.',
  scopeGlobal: 'Global',
  scopeGlobalDescription:
    'Șterge tipurile bifate pentru toate site-urile vizitate, nu doar pentru cel curent. Nu necesită permisiuni extra.',
  scopePerSite: 'Per site / domeniu',
  scopePerSiteDescription:
    'Alege o filă deschisă mai jos; se șterg doar datele acelui site, restul rămân neafectate. Va cere permisiune la prima ștergere.',
  openTabsOnly: 'Pot fi ținta doar filele deschise.',
  filterTabsPlaceholder: 'Filtrează filele deschise după domeniu…',
  filterHistoryPlaceholder: 'Filtrează istoricul după titlu sau URL…',
  someFailed: 'Unele au eșuat',
  clearAllCount: 'Șterge toate ({count})',
  clear: 'Șterge',
  noMatchingTabs: 'Nicio filă corespunzătoare.',
  noMatchingHistory: 'Niciun istoric încă.',
  visitedSites: 'Site-uri vizitate',
  visitedSitesDescription:
    'Orice site din istoric, nu doar filele deschise — șters la fel ca lista de mai sus.',
  visitedSitesContainerCaveat:
    'Pe {browser}, se șterge doar containerul implicit; un site deschis într-un container numit (ex. Multi-Account Containers) trebuie șters din propria filă deschisă.',
  filterVisitedSitesPlaceholder: 'Filtrează site-urile vizitate după domeniu…',
  noMatchingSites: 'Niciun site corespunzător.',
  recentHistory: 'Istoric recent',
  remove: 'Elimină',

  protectedSites: 'Site-uri protejate',
  protectedSitesPlaceholder: 'Câte un domeniu pe linie, ex. app.compania-ta.com',
  protectedSitesHint:
    'Nu sunt șterse niciodată de nicio acțiune per site (file, site-uri vizitate sau ca țintă de corespondență) — o sursă protejează și subdomeniile ei. Nu se aplică la „Șterge toate site-urile” din Global, care nu poate exclude anumite site-uri.',
  protectedSitesGlobalNote:
    'Lista de site-uri protejate nu se aplică aici — ștergerea globală șterge întotdeauna totul.',

  backupTitle: 'Backup',
  backupHint: 'Exportă setările (inclusiv corespondențele de origini) într-un fișier sau importă-le pe alt dispozitiv.',
  exportSettings: 'Exportă setările',
  importSettings: 'Importă setările',
  importInvalidFile: 'Acest fișier nu a putut fi citit ca setări Bleep.',

  clearLogTitle: 'Șters recent',
  clearLogEmpty: 'Nimic șters încă.',
  clearLogClear: 'Șterge jurnalul',
  clearLogLinkedCount: '{count} corespondențe',
  clearLogBulkTabs: '{count} file (în masă)',
  clearLogBulkVisited: '{count} site-uri vizitate (în masă)',

  helpTitle: 'Cum funcționează Bleep',
  helpPopupTitle: 'Fereastra popup',
  helpPopupText:
    'Apasă pe iconița din bara de instrumente. „Șterge doar fila activă” curăță doar site-ul deschis. „Șterge toate site-urile” curăță tot, peste tot.',
  helpScopeTitle: 'Global și Per site',
  helpScopeText:
    'Global afectează toate site-urile vizitate. Per site afectează doar fila aleasă. Fiecare are propria listă mai jos.',
  helpTypesTitle: 'Tipuri de date',
  helpTypesText:
    'Cache, stocare și service worker-i sunt fișierele proprii ale site-ului. Cookie-urile te țin autentificat. Istoricul, descărcările și datele formularelor sunt înregistrări ale browserului — doar Global.',
  helpReloadTitle: 'Reîncărcare forțată',
  helpReloadText:
    'După ștergere, fila se reîncarcă ignorând fișierele vechi din cache, ca să vezi imediat versiunea nouă.',
  helpMappingsTitle: 'Corespondențe de origini',
  helpMappingsText:
    'Unele aplicații te autentifică din nou, discret, printr-un domeniu separat de autentificare/SSO pe care ștergerea stocării nu îl atinge. Adaugă acel domeniu în setările „Per site” (site => șterge și acesta) ca să fie șters și el — doar la ștergerea exactă a site-ului din stânga.',
  helpFeedbackTitle: 'Feedback',
  helpFeedbackText: 'Ai găsit un bug sau ai o sugestie?',
  helpFeedbackLink: 'Deschide un issue pe GitHub',
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

  popupTitle: 'Bleep - Cache Cleaner',
  reloadTabAfterClearing: 'Жорстко оновити вкладку після очищення',
  clearActiveTabOnly: 'Очистити лише поточну вкладку',
  failedOrDenied: 'Помилка / відмовлено',
  activeTabHint:
    'Стосується лише сайту, відкритого в цій вкладці. При першому використанні запитає дозвіл.',
  protectedSiteLabel: 'Захищений сайт',
  protectedSiteHint: 'Цей сайт у списку захищених (Налаштування → Для сайту) і не може бути очищений звідси.',
  clearAllSites: 'Очистити всі сайти',
  yesClearEverything: 'Так, очистити все',
  yesClearAllVisited: 'Так, очистити ці',
  allSitesHint: 'Застосовується до всіх сайтів, не лише до цієї вкладки.',
  settings: 'Налаштування',

  settingsTitle: 'Bleep - Fast Global & Tab Cache Cleaner — Налаштування',
  tabGeneral: 'Загальні',
  tabHelp: 'Довідка',
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
  reloadTabAfterClearingPerSite: 'Жорстко оновити вкладку після очищення (лише для сайту)',
  useOriginMappings: "Використовувати зіставлення джерел",
  linkedOrigin: "Зіставлення джерел (теж очищаються при очищенні відповідного сайту)",
  linkedOriginSourcePlaceholder: 'https://your-app.com',
  linkedOriginTargetPlaceholder: 'https://auth.your-app.com',
  addMapping: '+ Додати зіставлення',
  linkedOriginInvalidHint: 'Це не схоже на дійсний домен',
  linkedOriginHint:
    "Декілька цілей справа можна вказати через кому. Протокол і шлях неважливі з обох боків, а джерело охоплює й свої піддомени (domain.com збігається і з sso.domain.com). Сайти без зіставлення не зачіпаються.",
  storageKeyShareNote:
    'Локальне сховище та сховище сесії використовують один і той самий API браузера в глобальному режимі — позначення будь-якого з них очищає обидва.',
  scopeGlobal: 'Глобально',
  scopeGlobalDescription:
    'Очищає позначені типи для всіх відвіданих сайтів, а не лише для поточного. Додаткові дозволи не потрібні.',
  scopePerSite: 'Для сайту / домену',
  scopePerSiteDescription:
    'Виберіть одну відкриту вкладку нижче; будуть очищені дані лише цього сайту, решта не торкнеться. При першому очищенні запитає дозвіл.',
  openTabsOnly: 'Можна вибрати лише відкриті вкладки.',
  filterTabsPlaceholder: 'Фільтр відкритих вкладок за доменом…',
  filterHistoryPlaceholder: 'Фільтр історії за назвою або URL…',
  someFailed: 'Частина не вдалася',
  clearAllCount: 'Очистити всі ({count})',
  clear: 'Очистити',
  noMatchingTabs: 'Немає відповідних вкладок.',
  noMatchingHistory: 'Історія порожня.',
  visitedSites: 'Відвідані сайти',
  visitedSitesDescription:
    'Будь-який сайт з історії, а не лише відкриті вкладки — очищається так само, як за чек-листом вище.',
  visitedSitesContainerCaveat:
    'У {browser} це очищає лише контейнер за замовчуванням; сайт, відкритий у іменованому контейнері (напр. Multi-Account Containers), потрібно очищати з його власної відкритої вкладки.',
  filterVisitedSitesPlaceholder: 'Фільтр відвіданих сайтів за доменом…',
  noMatchingSites: 'Немає відповідних сайтів.',
  recentHistory: 'Недавня історія',
  remove: 'Видалити',

  protectedSites: 'Захищені сайти',
  protectedSitesPlaceholder: 'По одному домену на рядок, напр. app.your-company.com',
  protectedSitesHint:
    'Ніколи не очищаються жодною дією для сайту (вкладки, відвідані сайти або як зіставлена ціль) — джерело також захищає свої піддомени. Не діє для «Очистити всі сайти» у Глобальному розділі — там немає способу виключити окремі сайти.',
  protectedSitesGlobalNote:
    'Список захищених сайтів тут не діє — глобальне очищення завжди очищає все.',

  backupTitle: 'Резервна копія',
  backupHint: 'Експортуйте налаштування (включно зі зіставленнями джерел) у файл або імпортуйте їх на іншому пристрої.',
  exportSettings: 'Експортувати налаштування',
  importSettings: 'Імпортувати налаштування',
  importInvalidFile: 'Не вдалося прочитати цей файл як налаштування Bleep.',

  clearLogTitle: 'Нещодавно очищено',
  clearLogEmpty: 'Поки нічого не очищено.',
  clearLogClear: 'Очистити журнал',
  clearLogLinkedCount: 'пов’язаних: {count}',
  clearLogBulkTabs: '{count} вкладок (масово)',
  clearLogBulkVisited: '{count} відвіданих сайтів (масово)',

  helpTitle: 'Як працює Bleep',
  helpPopupTitle: 'Спливаюче вікно',
  helpPopupText:
    'Натисніть на значок на панелі інструментів. «Очистити лише поточну вкладку» очищає лише відкритий сайт. «Очистити всі сайти» очищає все й усюди.',
  helpScopeTitle: 'Глобально і для сайту',
  helpScopeText:
    'Глобально стосується всіх відвіданих сайтів. Для сайту — лише однієї обраної вкладки. У кожного свій список нижче.',
  helpTypesTitle: 'Типи даних',
  helpTypesText:
    'Кеш, сховище та сервіс-воркери — власні файли сайту. Cookie зберігають вхід в акаунт. Історія, завантаження та дані форм — записи браузера, лише глобально.',
  helpReloadTitle: 'Жорстке оновлення',
  helpReloadText:
    'Після очищення вкладка оновлюється без старих файлів кешу — одразу видно свіжу версію сайту.',
  helpMappingsTitle: 'Зіставлення джерел',
  helpMappingsText:
    "Деякі застосунки непомітно повторно авторизують вас через окремий домен авторизації/SSO, якого очищення сховища не торкається. Додайте цей домен у налаштуваннях «Для сайту» (сайт => теж очистити це), щоб він теж очищався — лише при очищенні саме вказаного зліва сайту.",
  helpFeedbackTitle: 'Зворотний зв’язок',
  helpFeedbackText: 'Знайшли помилку чи маєте пропозицію?',
  helpFeedbackLink: 'Відкрити issue на GitHub',
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
