import { describe, expect, it } from 'vitest';
import { DEFAULTS } from './settings-defaults';
import { exportSettingsJson, parseImportedSettings, sanitizeSettings } from './settings-transfer';

describe('exportSettingsJson', () => {
  it('serializes only the known settings fields', () => {
    const state = { ...DEFAULTS, linkedOrigins: 'a.com => b.com', someExtraField: 'ignored' };
    const json = JSON.parse(exportSettingsJson(state));
    expect(json).toEqual({ ...DEFAULTS, linkedOrigins: 'a.com => b.com' });
    expect(json.someExtraField).toBeUndefined();
  });
});

describe('parseImportedSettings', () => {
  it('round-trips a full valid export', () => {
    const json = exportSettingsJson({ ...DEFAULTS, linkedOrigins: 'a.com => b.com', theme: 'dark' });
    expect(parseImportedSettings(json)).toEqual({ ...DEFAULTS, linkedOrigins: 'a.com => b.com', theme: 'dark' });
  });

  it('drops unknown fields', () => {
    const result = parseImportedSettings(JSON.stringify({ ...DEFAULTS, notARealField: 'x' }));
    expect(result).not.toHaveProperty('notARealField');
  });

  it('drops a field with the wrong type instead of importing garbage', () => {
    const result = parseImportedSettings(JSON.stringify({ ...DEFAULTS, autoReloadAfterClear: 'yes' }));
    expect(result).not.toHaveProperty('autoReloadAfterClear');
  });

  it('rejects a theme value outside the known enum', () => {
    const result = parseImportedSettings(JSON.stringify({ ...DEFAULTS, theme: 'banana' }));
    expect(result).not.toHaveProperty('theme');
  });

  it('rejects a language value outside the known enum (would otherwise crash translate())', () => {
    const result = parseImportedSettings(JSON.stringify({ ...DEFAULTS, language: 'fr' }));
    expect(result).not.toHaveProperty('language');
  });

  it('rejects a non-array value for an array field', () => {
    const result = parseImportedSettings(JSON.stringify({ ...DEFAULTS, selectedTypesGlobal: 'cache' }));
    expect(result).not.toHaveProperty('selectedTypesGlobal');
  });

  it('rejects an array with non-string elements', () => {
    const result = parseImportedSettings(JSON.stringify({ ...DEFAULTS, selectedTypesGlobal: [1, 2] }));
    expect(result).not.toHaveProperty('selectedTypesGlobal');
  });

  it('throws on invalid JSON, same as JSON.parse', () => {
    expect(() => parseImportedSettings('not json')).toThrow();
  });
});

describe('sanitizeSettings', () => {
  it('passes through a valid object unchanged (field-wise)', () => {
    expect(sanitizeSettings({ ...DEFAULTS, theme: 'dark' })).toEqual({ ...DEFAULTS, theme: 'dark' });
  });

  it('treats null/undefined as an empty object instead of throwing — the shape a persist store sees on first load', () => {
    expect(sanitizeSettings(null)).toEqual({});
    expect(sanitizeSettings(undefined)).toEqual({});
  });

  it('drops a corrupted field instead of propagating it (e.g. a partial/garbled storage write)', () => {
    expect(sanitizeSettings({ ...DEFAULTS, theme: 42 })).not.toHaveProperty('theme');
  });
});
