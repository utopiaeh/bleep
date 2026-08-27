import { browser } from 'wxt/browser';
import type { Browser } from 'wxt/browser';
import type { StateStorage } from 'zustand/middleware';
import { useStorageErrorStore } from '../store/storageError';

const CHUNK_SIZE = 6000;

async function readChunked(area: Browser.storage.StorageArea, name: string): Promise<string | null> {
  const lenKey = `${name}__len`;
  const meta = await area.get(lenKey);
  const len = meta[lenKey] as number | undefined;
  if (len == null) return null;
  const keys = Array.from({ length: len }, (_, i) => `${name}__${i}`);
  const result = await area.get(keys);
  return keys.map((k) => (result[k] as string | undefined) ?? '').join('');
}

async function writeChunked(area: Browser.storage.StorageArea, name: string, value: string): Promise<void> {
  const lenKey = `${name}__len`;
  const meta = await area.get(lenKey);
  const oldLen = (meta[lenKey] as number | undefined) ?? 0;

  const chunks: string[] = [];
  for (let i = 0; i < value.length; i += CHUNK_SIZE) chunks.push(value.slice(i, i + CHUNK_SIZE));
  const payload: Record<string, string | number> = { [lenKey]: chunks.length };
  chunks.forEach((chunk, i) => {
    payload[`${name}__${i}`] = chunk;
  });
  await area.set(payload);

  if (oldLen > chunks.length) {
    const staleKeys = Array.from({ length: oldLen - chunks.length }, (_, i) => `${name}__${chunks.length + i}`);
    await area.remove(staleKeys);
  }
}

async function removeChunked(area: Browser.storage.StorageArea, name: string): Promise<void> {
  const lenKey = `${name}__len`;
  const meta = await area.get(lenKey);
  const len = (meta[lenKey] as number | undefined) ?? 0;
  await area.remove([lenKey, ...Array.from({ length: len }, (_, i) => `${name}__${i}`)]);
}

export const browserLocalStorage: StateStorage = {
  getItem: async (name) => {
    const result = await browser.storage.local.get(name);
    return (result[name] as string | undefined) ?? null;
  },
  setItem: async (name, value) => {
    await browser.storage.local.set({ [name]: value });
  },
  removeItem: async (name) => {
    await browser.storage.local.remove(name);
  },
};

export const browserSyncStorage: StateStorage = {
  getItem: async (name) => {
    const fromSync = await readChunked(browser.storage.sync, name);
    if (fromSync != null) return fromSync;

    const legacyLocal = await browser.storage.local.get(name);
    const legacyValue = legacyLocal[name] as string | undefined;
    if (legacyValue != null) {
      await writeChunked(browser.storage.sync, name, legacyValue);
    }
    return legacyValue ?? null;
  },
  setItem: async (name, value) => {
    try {
      await writeChunked(browser.storage.sync, name, value);
    } catch (e) {
      console.error('Bleep: failed to save settings', e);
      useStorageErrorStore
        .getState()
        .setError('Could not save — the change may be too large or sync storage is full.');
      throw e;
    }
  },
  removeItem: async (name) => {
    await removeChunked(browser.storage.sync, name);
  },
};

export async function readPersistedSettingsRaw(name: string): Promise<unknown> {
  const raw = await browserSyncStorage.getItem(name);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
