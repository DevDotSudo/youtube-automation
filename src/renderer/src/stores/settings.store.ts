import { create } from 'zustand';
import { AppSettings } from '../../../shared/types';

interface SettingsState {
  settings: AppSettings | null;
  isLoading: boolean;
  fetchSettings: () => Promise<void>;
  saveSettings: (patch: Partial<AppSettings>) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: null,
  isLoading: false,
  fetchSettings: async () => {
    set({ isLoading: true });
    try {
      const res = await window.docuforge.settings.get();
      set({ settings: res, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },
  saveSettings: async (patch) => {
    const updated = await window.docuforge.settings.save(patch);
    set({ settings: updated });
  }
}));
