import { DEFAULTS, type Theme } from './settings-defaults';
import type { Language } from './i18n';

export type ExportableSettings = typeof DEFAULTS;

const THEMES: Theme[] = ['system', 'light', 'dark'];
const LANGUAGES: Language[] = ['auto', 'en', 'ru', 'ro', 'uk'];

export function exportSettingsJson(state: ExportableSettings): string {
  const data: Partial<ExportableSettings> = {};
  for (const key of Object.keys(DEFAULTS) as (keyof ExportableSettings)[]) {
    (data as Record<string, unknown>)[key] = state[key];
  }
  return JSON.stringify(data, null, 2);
}

function isValidField(key: keyof ExportableSettings, value: unknown): boolean {
  if (key === 'theme') return typeof value === 'string' && THEMES.includes(value as Theme);
  if (key === 'language') return typeof value === 'string' && LANGUAGES.includes(value as Language);
  const defaultValue = DEFAULTS[key];
  if (Array.isArray(defaultValue)) {
    return Array.isArray(value) && value.every((v) => typeof v === 'string');
  }
  return typeof value === typeof defaultValue;
}

export function sanitizeSettings(value: unknown): Partial<ExportableSettings> {
  const parsed = (value ?? {}) as Record<string, unknown>;
  const result: Partial<ExportableSettings> = {};
  for (const key of Object.keys(DEFAULTS) as (keyof ExportableSettings)[]) {
    const v = parsed[key];
    if (v !== undefined && isValidField(key, v)) {
      (result as Record<string, unknown>)[key] = v;
    }
  }
  return result;
}

export function parseImportedSettings(json: string): Partial<ExportableSettings> {
  return sanitizeSettings(JSON.parse(json));
}
