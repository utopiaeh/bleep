import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULTS, mergeSettings, useSettingsStore } from './settings';

beforeEach(() => {
  useSettingsStore.setState(DEFAULTS);
});

describe('toggleTypeGlobal / toggleTypeSite', () => {
  it('adds an id not yet selected', () => {
    useSettingsStore.getState().toggleTypeGlobal('cookies');
    expect(useSettingsStore.getState().selectedTypesGlobal).toContain('cookies');
  });

  it('removes an id already selected', () => {
    useSettingsStore.getState().toggleTypeGlobal('cache');
    expect(useSettingsStore.getState().selectedTypesGlobal).not.toContain('cache');
  });

  it('keeps global and site selections independent', () => {
    useSettingsStore.getState().toggleTypeSite('cookies');
    expect(useSettingsStore.getState().selectedTypesSite).toContain('cookies');
    expect(useSettingsStore.getState().selectedTypesGlobal).not.toContain('cookies');
  });
});

describe('simple setters', () => {
  it('updates each field independently', () => {
    const s = useSettingsStore.getState();
    s.setAutoReloadAfterClear(false);
    s.setLinkedOrigins('a.com => b.com');
    s.setUseOriginMappings(false);
    s.setProtectedSites('protected.com');
    s.setTheme('dark');
    s.setLanguage('ru');

    const state = useSettingsStore.getState();
    expect(state.autoReloadAfterClear).toBe(false);
    expect(state.linkedOrigins).toBe('a.com => b.com');
    expect(state.useOriginMappings).toBe(false);
    expect(state.protectedSites).toBe('protected.com');
    expect(state.theme).toBe('dark');
    expect(state.language).toBe('ru');
  });
});

describe('importSettings', () => {
  it('merges only the provided fields, leaving the rest untouched', () => {
    const s = useSettingsStore.getState();
    s.setAutoReloadAfterClear(false);

    s.importSettings({ theme: 'dark', linkedOrigins: 'a.com => b.com' });

    const state = useSettingsStore.getState();
    expect(state.theme).toBe('dark');
    expect(state.linkedOrigins).toBe('a.com => b.com');
    expect(state.autoReloadAfterClear).toBe(false);
  });
});

describe('mergeSettings (persist rehydration guard)', () => {
  it('applies a valid persisted blob over the current state', () => {
    const current = useSettingsStore.getState();
    const merged = mergeSettings({ theme: 'dark', linkedOrigins: 'a.com => b.com' }, current);
    expect(merged.theme).toBe('dark');
    expect(merged.linkedOrigins).toBe('a.com => b.com');
  });

  it('falls back to defaults for a corrupted field instead of propagating it (e.g. a version update that changed a field type)', () => {
    const current = useSettingsStore.getState();
    const merged = mergeSettings({ theme: 42, selectedTypesGlobal: 'not-an-array' }, current);
    expect(merged.theme).toBe(DEFAULTS.theme);
    expect(merged.selectedTypesGlobal).toEqual(DEFAULTS.selectedTypesGlobal);
  });

  it('handles a completely empty/missing persisted value (first install) without throwing', () => {
    const current = useSettingsStore.getState();
    expect(() => mergeSettings(undefined, current)).not.toThrow();
    expect(mergeSettings(undefined, current)).toMatchObject(DEFAULTS);
  });

  it('never drops the action functions from current state', () => {
    const current = useSettingsStore.getState();
    const merged = mergeSettings({ theme: 'dark' }, current);
    expect(typeof merged.setTheme).toBe('function');
    expect(typeof merged.resetSettings).toBe('function');
  });
});

describe('resetSettings', () => {
  it('restores every field to DEFAULTS', () => {
    const s = useSettingsStore.getState();
    s.toggleTypeGlobal('cookies');
    s.setTheme('dark');
    s.setLinkedOrigins('a.com => b.com');

    s.resetSettings();

    expect(useSettingsStore.getState()).toMatchObject(DEFAULTS);
  });
});
