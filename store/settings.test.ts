import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULTS, useSettingsStore } from './settings';

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
