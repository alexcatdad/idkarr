# Internationalization (i18n) Specification

> **idkarr** - Multi-language and localization support specification

## Table of Contents

1. [Overview](#overview)
2. [Translation System](#translation-system)
3. [Locale Configuration](#locale-configuration)
4. [Date and Time Formatting](#date-and-time-formatting)
5. [Number Formatting](#number-formatting)
6. [Pluralization](#pluralization)
7. [RTL Support](#rtl-support)
8. [Translation Workflow](#translation-workflow)

---

## Overview

### Supported Languages

| Code | Language | Status | Coverage |
|------|----------|--------|----------|
| en | English (US) | Default | 100% |
| en-GB | English (UK) | Supported | 100% |
| de | German | Supported | 95% |
| fr | French | Supported | 95% |
| es | Spanish | Supported | 90% |
| pt-BR | Portuguese (Brazil) | Supported | 85% |
| ja | Japanese | Supported | 80% |
| zh-CN | Chinese (Simplified) | Supported | 75% |
| ko | Korean | Community | 70% |
| ru | Russian | Community | 65% |
| ar | Arabic (RTL) | Community | 60% |

### i18n Stack

```typescript
const i18nStack = {
  framework: 'next-intl',
  messageFormat: 'ICU Message Format',
  storage: 'JSON files',
  fallback: 'en',
  detection: ['cookie', 'header', 'navigator'],
};
```

---

## Translation System

### Message Structure

```typescript
// translations/en.json
{
  "common": {
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "edit": "Edit",
    "loading": "Loading...",
    "error": "An error occurred",
    "success": "Success",
    "confirm": "Are you sure?"
  },
  "navigation": {
    "series": "TV Series",
    "movies": "Movies",
    "calendar": "Calendar",
    "activity": "Activity",
    "settings": "Settings",
    "system": "System"
  },
  "series": {
    "title": "TV Series",
    "addNew": "Add New Series",
    "search": "Search for series...",
    "monitored": "Monitored",
    "unmonitored": "Unmonitored",
    "ended": "Ended",
    "continuing": "Continuing",
    "episodeCount": "{count, plural, =0 {No episodes} one {# episode} other {# episodes}}",
    "seasonCount": "{count, plural, =0 {No seasons} one {# season} other {# seasons}}"
  },
  "quality": {
    "unknown": "Unknown",
    "sdtv": "SDTV",
    "webdl480p": "WEBDL-480p",
    "dvd": "DVD",
    "hdtv720p": "HDTV-720p",
    "hdtv1080p": "HDTV-1080p",
    "webdl720p": "WEBDL-720p",
    "webdl1080p": "WEBDL-1080p",
    "bluray720p": "Bluray-720p",
    "bluray1080p": "Bluray-1080p",
    "webdl2160p": "WEBDL-2160p",
    "bluray2160p": "Bluray-2160p"
  },
  "errors": {
    "notFound": "Not found",
    "unauthorized": "You are not authorized to perform this action",
    "serverError": "Server error. Please try again later.",
    "networkError": "Unable to connect to server",
    "validationError": "Please check your input"
  },
  "time": {
    "now": "Just now",
    "minutesAgo": "{count, plural, one {# minute ago} other {# minutes ago}}",
    "hoursAgo": "{count, plural, one {# hour ago} other {# hours ago}}",
    "daysAgo": "{count, plural, one {# day ago} other {# days ago}}",
    "inMinutes": "in {count, plural, one {# minute} other {# minutes}}",
    "inHours": "in {count, plural, one {# hour} other {# hours}}",
    "inDays": "in {count, plural, one {# day} other {# days}}"
  }
}
```

### Translation Hook

```tsx
import { useTranslations } from 'next-intl';

function SeriesHeader({ series }: { series: Series }) {
  const t = useTranslations('series');
  const tCommon = useTranslations('common');

  return (
    <div>
      <h1>{series.title}</h1>
      <p>
        {t('episodeCount', { count: series.episodeCount })}
        {' • '}
        {t('seasonCount', { count: series.seasonCount })}
      </p>
      <div>
        <Button>{tCommon('edit')}</Button>
        <Button variant="danger">{tCommon('delete')}</Button>
      </div>
    </div>
  );
}
```

### Server-Side Translation

```typescript
import { getTranslations } from 'next-intl/server';

export async function generateMetadata({ params }: Props) {
  const t = await getTranslations({
    locale: params.locale,
    namespace: 'series',
  });

  return {
    title: t('title'),
  };
}

export default async function SeriesPage({ params }: Props) {
  const t = await getTranslations({
    locale: params.locale,
    namespace: 'series',
  });

  const series = await getSeriesList();

  return (
    <div>
      <h1>{t('title')}</h1>
      <SeriesList series={series} />
    </div>
  );
}
```

---

## Locale Configuration

### Locale Detection

```typescript
import { getRequestConfig } from 'next-intl/server';
import { cookies, headers } from 'next/headers';

export default getRequestConfig(async () => {
  // 1. Check cookie
  const cookieLocale = cookies().get('locale')?.value;
  if (cookieLocale && isValidLocale(cookieLocale)) {
    return { locale: cookieLocale };
  }

  // 2. Check Accept-Language header
  const acceptLanguage = headers().get('Accept-Language');
  const browserLocale = parseAcceptLanguage(acceptLanguage);
  if (browserLocale && isValidLocale(browserLocale)) {
    return { locale: browserLocale };
  }

  // 3. Fall back to default
  return { locale: 'en' };
});

function parseAcceptLanguage(header: string | null): string | null {
  if (!header) return null;

  const locales = header
    .split(',')
    .map(part => {
      const [locale, q = '1'] = part.trim().split(';q=');
      return { locale: locale.trim(), q: parseFloat(q) };
    })
    .sort((a, b) => b.q - a.q);

  return locales[0]?.locale ?? null;
}

const supportedLocales = ['en', 'en-GB', 'de', 'fr', 'es', 'pt-BR', 'ja', 'zh-CN', 'ko', 'ru', 'ar'];

function isValidLocale(locale: string): boolean {
  return supportedLocales.includes(locale);
}
```

### User Locale Preference

```typescript
interface UserPreferences {
  locale: string;
  timezone: string;
  dateFormat: DateFormat;
  timeFormat: TimeFormat;
  firstDayOfWeek: 0 | 1 | 6; // Sun, Mon, Sat
}

const defaultPreferences: UserPreferences = {
  locale: 'en',
  timezone: 'UTC',
  dateFormat: 'yyyy-MM-dd',
  timeFormat: '24h',
  firstDayOfWeek: 1,
};

class LocaleService {
  async getUserLocale(userId: string): Promise<string> {
    const prefs = await this.preferencesService.get(userId);
    return prefs?.locale ?? 'en';
  }

  async setUserLocale(userId: string, locale: string): Promise<void> {
    if (!isValidLocale(locale)) {
      throw new Error(`Invalid locale: ${locale}`);
    }

    await this.preferencesService.update(userId, { locale });
  }
}
```

---

## Date and Time Formatting

### Date Formatter

```typescript
import { format, formatDistance, formatRelative } from 'date-fns';
import { enUS, de, fr, es, ptBR, ja, zhCN, ko, ru, ar } from 'date-fns/locale';

const localeMap: Record<string, Locale> = {
  'en': enUS,
  'en-GB': enGB,
  'de': de,
  'fr': fr,
  'es': es,
  'pt-BR': ptBR,
  'ja': ja,
  'zh-CN': zhCN,
  'ko': ko,
  'ru': ru,
  'ar': ar,
};

class DateFormatter {
  constructor(private locale: string) {}

  format(date: Date, formatStr: string): string {
    return format(date, formatStr, {
      locale: localeMap[this.locale] ?? enUS,
    });
  }

  formatRelative(date: Date, baseDate: Date = new Date()): string {
    return formatRelative(date, baseDate, {
      locale: localeMap[this.locale] ?? enUS,
    });
  }

  formatDistance(date: Date, baseDate: Date = new Date()): string {
    return formatDistance(date, baseDate, {
      locale: localeMap[this.locale] ?? enUS,
      addSuffix: true,
    });
  }

  // Common formats
  formatShortDate(date: Date): string {
    return this.format(date, 'P'); // Localized short date
  }

  formatLongDate(date: Date): string {
    return this.format(date, 'PPP'); // Localized long date
  }

  formatTime(date: Date): string {
    return this.format(date, 'p'); // Localized time
  }

  formatDateTime(date: Date): string {
    return this.format(date, 'PPp'); // Localized date and time
  }
}
```

### Timezone Handling

```typescript
import { zonedTimeToUtc, utcToZonedTime, format } from 'date-fns-tz';

class TimezoneService {
  constructor(
    private userTimezone: string,
    private locale: string
  ) {}

  toUserTime(utcDate: Date): Date {
    return utcToZonedTime(utcDate, this.userTimezone);
  }

  toUtc(localDate: Date): Date {
    return zonedTimeToUtc(localDate, this.userTimezone);
  }

  formatInUserTimezone(utcDate: Date, formatStr: string): string {
    const zonedDate = this.toUserTime(utcDate);
    return format(zonedDate, formatStr, {
      locale: localeMap[this.locale],
      timeZone: this.userTimezone,
    });
  }

  // Format air date/time for episode
  formatAirTime(episode: Episode): string {
    if (!episode.airDateUtc) return 'TBA';

    const airTime = this.toUserTime(new Date(episode.airDateUtc));
    return this.formatInUserTimezone(
      airTime,
      "EEEE, MMMM d 'at' h:mm a zzz"
    );
  }
}
```

### React Date Hook

```tsx
import { useFormatter } from 'next-intl';

function EpisodeAirDate({ episode }: { episode: Episode }) {
  const format = useFormatter();

  if (!episode.airDateUtc) {
    return <span>TBA</span>;
  }

  const airDate = new Date(episode.airDateUtc);
  const now = new Date();

  // Relative time for recent/upcoming
  if (Math.abs(airDate.getTime() - now.getTime()) < 7 * 24 * 60 * 60 * 1000) {
    return (
      <span title={format.dateTime(airDate, { dateStyle: 'full', timeStyle: 'short' })}>
        {format.relativeTime(airDate)}
      </span>
    );
  }

  // Absolute date for older/future
  return (
    <span>
      {format.dateTime(airDate, { dateStyle: 'medium' })}
    </span>
  );
}
```

---

## Number Formatting

### Number Formatter

```typescript
import { useFormatter } from 'next-intl';

function useNumberFormat() {
  const format = useFormatter();

  return {
    // Format file size
    formatFileSize(bytes: number): string {
      const units = ['B', 'KB', 'MB', 'GB', 'TB'];
      let size = bytes;
      let unitIndex = 0;

      while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
      }

      return `${format.number(size, { maximumFractionDigits: 2 })} ${units[unitIndex]}`;
    },

    // Format percentage
    formatPercent(value: number): string {
      return format.number(value / 100, { style: 'percent' });
    },

    // Format count
    formatCount(count: number): string {
      return format.number(count);
    },

    // Format speed (bytes per second)
    formatSpeed(bytesPerSecond: number): string {
      return `${this.formatFileSize(bytesPerSecond)}/s`;
    },
  };
}

// Usage
function DownloadProgress({ download }: { download: Download }) {
  const { formatFileSize, formatPercent, formatSpeed } = useNumberFormat();

  return (
    <div>
      <span>{formatPercent(download.progress)}</span>
      <span>{formatFileSize(download.downloadedBytes)} / {formatFileSize(download.totalBytes)}</span>
      <span>{formatSpeed(download.speed)}</span>
    </div>
  );
}
```

### Currency Formatting

```typescript
// For any future monetization features
function formatCurrency(amount: number, currency: string, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(amount);
}
```

---

## Pluralization

### ICU Message Format

```json
{
  "episodes": {
    "count": "{count, plural, =0 {No episodes} one {# episode} other {# episodes}}",
    "missing": "{count, plural, =0 {No missing episodes} one {# missing episode} other {# missing episodes}}",
    "downloaded": "{count, plural, =0 {Nothing downloaded} one {# episode downloaded} other {# episodes downloaded}}"
  },
  "queue": {
    "items": "{count, plural, =0 {Queue is empty} one {# item in queue} other {# items in queue}}",
    "eta": "{minutes, plural, =0 {Completing now} one {# minute remaining} other {# minutes remaining}}"
  },
  "search": {
    "results": "{count, plural, =0 {No results found} one {# result found} other {# results found}}",
    "indexers": "{count, plural, one {Searched # indexer} other {Searched # indexers}}"
  }
}
```

### Complex Pluralization

```typescript
// German example with different plural rules
// translations/de.json
{
  "episodes": {
    "count": "{count, plural, =0 {Keine Episoden} one {# Episode} other {# Episoden}}"
  }
}

// Russian example with complex plural rules
// translations/ru.json
{
  "episodes": {
    "count": "{count, plural, =0 {Нет эпизодов} one {# эпизод} few {# эпизода} many {# эпизодов} other {# эпизода}}"
  }
}

// Arabic example
// translations/ar.json
{
  "episodes": {
    "count": "{count, plural, =0 {لا حلقات} one {حلقة واحدة} two {حلقتان} few {# حلقات} many {# حلقة} other {# حلقة}}"
  }
}
```

### Select Format

```json
{
  "status": {
    "seriesStatus": "{status, select, continuing {Continuing} ended {Ended} upcoming {Upcoming} other {Unknown}}",
    "downloadStatus": "{status, select, queued {Queued} downloading {Downloading} completed {Completed} failed {Failed} other {Unknown}}"
  }
}
```

---

## RTL Support

### RTL Configuration

```typescript
const rtlLocales = ['ar', 'he', 'fa', 'ur'];

function isRtlLocale(locale: string): boolean {
  return rtlLocales.includes(locale);
}

// Layout component
function RootLayout({ children, params }: { children: React.ReactNode; params: { locale: string } }) {
  const dir = isRtlLocale(params.locale) ? 'rtl' : 'ltr';

  return (
    <html lang={params.locale} dir={dir}>
      <body className={dir === 'rtl' ? 'font-arabic' : 'font-sans'}>
        {children}
      </body>
    </html>
  );
}
```

### RTL-Aware CSS

```css
/* Base styles */
.sidebar {
  /* LTR: left side */
  inset-inline-start: 0;
  border-inline-end: 1px solid var(--border-color);
}

.main-content {
  /* LTR: left margin */
  margin-inline-start: 240px;
}

/* Icon flipping for RTL */
[dir="rtl"] .icon-arrow-right {
  transform: scaleX(-1);
}

/* Text alignment */
.text-start {
  text-align: start; /* left in LTR, right in RTL */
}

.text-end {
  text-align: end; /* right in LTR, left in RTL */
}

/* Padding/Margin using logical properties */
.card {
  padding-inline: 1rem;
  padding-block: 0.5rem;
  margin-inline-start: auto;
}
```

### RTL-Aware Components

```tsx
function NavigationItem({ icon: Icon, label, href }: NavItemProps) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-4 py-2"
    >
      {/* Icon position adapts to RTL */}
      <Icon className="h-5 w-5 shrink-0" />
      <span className="flex-1">{label}</span>
      <ChevronRight className="h-4 w-4 rtl:rotate-180" />
    </Link>
  );
}

function ProgressBar({ progress }: { progress: number }) {
  return (
    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
      <div
        className="h-full bg-primary-500 transition-all"
        style={{
          width: `${progress}%`,
          // Progress fills from start (left in LTR, right in RTL)
          marginInlineStart: 0,
        }}
      />
    </div>
  );
}
```

---

## Translation Workflow

### Translation File Structure

```
translations/
├── en.json           # English (source)
├── en-GB.json        # British English
├── de.json           # German
├── fr.json           # French
├── es.json           # Spanish
├── pt-BR.json        # Portuguese (Brazil)
├── ja.json           # Japanese
├── zh-CN.json        # Chinese (Simplified)
├── ko.json           # Korean
├── ru.json           # Russian
└── ar.json           # Arabic
```

### Translation Key Guidelines

```typescript
// Key naming conventions
const keyGuidelines = {
  // Use dot notation for namespacing
  correct: 'series.episodeCount',
  wrong: 'seriesEpisodeCount',

  // Use camelCase for keys
  correct: 'downloadClient',
  wrong: 'download-client',

  // Be descriptive but concise
  correct: 'series.addNew',
  wrong: 'series.clickHereToAddANewSeries',

  // Use context for ambiguous terms
  correct: 'button.save', // Save button
  also: 'action.save',    // Save action
};
```

### Missing Translation Detection

```typescript
class TranslationValidator {
  async validateTranslations(): Promise<ValidationResult> {
    const sourceKeys = await this.getKeys('en');
    const results: ValidationResult = {
      locales: {},
      totalKeys: sourceKeys.size,
    };

    for (const locale of supportedLocales) {
      if (locale === 'en') continue;

      const localeKeys = await this.getKeys(locale);
      const missing: string[] = [];
      const extra: string[] = [];

      // Find missing keys
      for (const key of sourceKeys) {
        if (!localeKeys.has(key)) {
          missing.push(key);
        }
      }

      // Find extra keys (might be outdated)
      for (const key of localeKeys) {
        if (!sourceKeys.has(key)) {
          extra.push(key);
        }
      }

      results.locales[locale] = {
        totalKeys: localeKeys.size,
        missing,
        extra,
        coverage: ((sourceKeys.size - missing.length) / sourceKeys.size) * 100,
      };
    }

    return results;
  }

  private async getKeys(locale: string): Promise<Set<string>> {
    const messages = await import(`../translations/${locale}.json`);
    return new Set(this.flattenKeys(messages));
  }

  private flattenKeys(obj: object, prefix = ''): string[] {
    const keys: string[] = [];

    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;

      if (typeof value === 'object' && value !== null) {
        keys.push(...this.flattenKeys(value, fullKey));
      } else {
        keys.push(fullKey);
      }
    }

    return keys;
  }
}
```

### Crowdin Integration

```yaml
# crowdin.yml
project_id: "idkarr"
api_token_env: "CROWDIN_API_TOKEN"
base_path: "."
preserve_hierarchy: true

files:
  - source: "/translations/en.json"
    translation: "/translations/%locale%.json"
    languages_mapping:
      locale:
        "pt-BR": "pt-BR"
        "zh-CN": "zh-CN"
```

```typescript
// Script to sync translations
class CrowdinSync {
  async uploadSource(): Promise<void> {
    const sourceFile = await Bun.file('translations/en.json').text();

    await this.crowdin.sourceFilesApi.updateOrRestoreFile(
      this.projectId,
      this.sourceFileId,
      { content: sourceFile }
    );
  }

  async downloadTranslations(): Promise<void> {
    const build = await this.crowdin.translationsApi.buildProject(this.projectId);

    // Wait for build
    let status = build.data.status;
    while (status !== 'finished') {
      await new Promise(resolve => setTimeout(resolve, 5000));
      const buildStatus = await this.crowdin.translationsApi.checkBuildStatus(
        this.projectId,
        build.data.id
      );
      status = buildStatus.data.status;
    }

    // Download
    const download = await this.crowdin.translationsApi.downloadTranslations(
      this.projectId,
      build.data.id
    );

    // Extract to translations folder
    await this.extractZip(download.data.url, 'translations');
  }
}
```

---

## API Response Localization

### Error Messages

```typescript
class LocalizedErrorHandler {
  constructor(private locale: string) {}

  async getLocalizedError(error: AppError): Promise<LocalizedError> {
    const t = await getTranslations({
      locale: this.locale,
      namespace: 'errors',
    });

    return {
      code: error.code,
      message: t(error.code, error.interpolations ?? {}),
      details: error.details?.map(d => t(d.key, d.interpolations)),
    };
  }
}

// API middleware
async function localizeErrorMiddleware(
  error: AppError,
  c: Context
): Promise<Response> {
  const locale = c.req.header('Accept-Language')?.split(',')[0] ?? 'en';
  const handler = new LocalizedErrorHandler(locale);
  const localizedError = await handler.getLocalizedError(error);

  return c.json({
    error: localizedError,
  }, error.statusCode);
}
```

### Localized API Responses

```typescript
// Include locale in API responses where appropriate
interface LocalizedApiResponse<T> {
  data: T;
  meta: {
    locale: string;
    timezone: string;
  };
}

// Quality profile names can be localized
async function getQualityProfiles(locale: string): Promise<QualityProfile[]> {
  const profiles = await db.select().from(qualityProfiles);
  const t = await getTranslations({ locale, namespace: 'quality' });

  return profiles.map(profile => ({
    ...profile,
    // Translate quality names if they match standard keys
    items: profile.items.map(item => ({
      ...item,
      quality: item.quality ? {
        ...item.quality,
        name: t(item.quality.name.toLowerCase().replace(/[^a-z0-9]/g, '')) ?? item.quality.name,
      } : null,
    })),
  }));
}
```

---

## Related Documents

- [UI_UX_SPECIFICATION.md](./UI_UX_SPECIFICATION.md) - UI design patterns
- [REST_API.md](./REST_API.md) - API localization
- [ERROR_HANDLING.md](./ERROR_HANDLING.md) - Localized error messages
