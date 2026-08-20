import { DEFAULTS, type Theme } from '../store/settings';
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

/** Only known keys with the right shape survive — an untrusted/edited-by-hand file
 * can't inject unexpected fields or crash the UI with e.g. an unrecognized theme or
 * language string (translate() would throw on a language not in its dictionary). */
export function parseImportedSettings(json: string): Partial<ExportableSettings> {
  const parsed = JSON.parse(json) as Record<string, unknown>;
  const result: Partial<ExportableSettings> = {};
  for (const key of Object.keys(DEFAULTS) as (keyof ExportableSettings)[]) {
    const value = parsed[key];
    if (value !== undefined && isValidField(key, value)) {
      (result as Record<string, unknown>)[key] = value;
    }
  }
  return result;
}
