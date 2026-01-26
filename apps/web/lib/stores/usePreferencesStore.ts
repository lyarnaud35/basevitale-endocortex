import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface PreferencesState {
  theme: 'light' | 'dark' | 'system';
  language: 'fr' | 'en';
  notifications: {
    enabled: boolean;
    sound: boolean;
    criticalAlerts: boolean;
  };
  setTheme: (theme: PreferencesState['theme']) => void;
  setLanguage: (language: PreferencesState['language']) => void;
  updateNotifications: (notifications: Partial<PreferencesState['notifications']>) => void;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      theme: 'system',
      language: 'fr',
      notifications: {
        enabled: true,
        sound: true,
        criticalAlerts: true,
      },
      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => set({ language }),
      updateNotifications: (notifications) =>
        set((state) => ({
          notifications: { ...state.notifications, ...notifications },
        })),
    }),
    {
      name: 'basevitale-preferences',
    },
  ),
);
