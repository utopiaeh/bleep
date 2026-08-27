import { create } from 'zustand';

interface StorageErrorState {
  message: string | null;
  setError: (message: string) => void;
  clear: () => void;
}

export const useStorageErrorStore = create<StorageErrorState>((set) => ({
  message: null,
  setError: (message) => set({ message }),
  clear: () => set({ message: null }),
}));
