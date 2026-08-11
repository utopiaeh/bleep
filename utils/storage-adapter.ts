import { browser } from 'wxt/browser';
import type { StateStorage } from 'zustand/middleware';

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
