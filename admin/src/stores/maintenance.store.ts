import { create } from 'zustand';

interface MaintenanceState {
  enabled: boolean;
  message?: string;
  lastUpdate?: string;
}

interface MaintenanceStore extends MaintenanceState {
  setMaintenanceMode: (payload: { enabled: boolean; message?: string; timestamp?: string }) => void;
  clearMaintenanceMode: () => void;
}

export const useMaintenanceStore = create<MaintenanceStore>((set) => ({
  enabled: false,
  message: undefined,
  lastUpdate: undefined,

  setMaintenanceMode: (payload) => {
    set({
      enabled: payload.enabled,
      message: payload.message,
      lastUpdate: payload.timestamp || new Date().toISOString(),
    });
  },

  clearMaintenanceMode: () => {
    set({
      enabled: false,
      message: undefined,
      lastUpdate: undefined,
    });
  },
}));
