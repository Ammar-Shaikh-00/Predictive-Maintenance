import { create } from 'zustand';
import safeApi from '../api/safeApi';

export const useBackendStore = create((set, get) => ({
  status: 'checking',
  lastCheck: null,
  healthCheckInterval: null,

  setStatus: (status) => set({ status }),
  setLastCheck: (date) => set({ lastCheck: date }),

  startHealthCheck: () => {
    const checkHealth = async () => {
      const res = await safeApi.get('/health/live');

      if (!res.fallback && res.data) {
        set({ status: 'online', lastCheck: new Date() });
      } else {
        set({ status: 'offline', lastCheck: new Date() });
      }
    };

    // Run immediately
    checkHealth();

    // Run every 5 sec
    const interval = setInterval(checkHealth, 5000);
    set({ healthCheckInterval: interval });
  },

  stopHealthCheck: () => {
    const interval = get().healthCheckInterval;
    if (interval) {
      clearInterval(interval);
      set({ healthCheckInterval: null });
    }
  },
}));