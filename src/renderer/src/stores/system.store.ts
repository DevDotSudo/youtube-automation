import { create } from 'zustand';
import { SystemStatusInfo } from '../../../shared/types';

interface SystemState {
  status: SystemStatusInfo | null;
  isLoading: boolean;
  fetchStatus: () => Promise<void>;
}

export const useSystemStore = create<SystemState>((set) => ({
  status: null,
  isLoading: false,
  fetchStatus: async () => {
    set({ isLoading: true });
    try {
      const res = await window.docuforge.system.status();
      set({ status: res, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  }
}));
