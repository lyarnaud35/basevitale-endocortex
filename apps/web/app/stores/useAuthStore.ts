import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Store Zustand pour l'authentification
 * 
 * Gère l'état utilisateur et les préférences
 * Version BaseVitale V112
 */
interface AuthState {
  user: {
    id: string;
    email: string;
    role: string;
    name?: string;
  } | null;
  token: string | null;
  isAuthenticated: boolean;
  setUser: (user: AuthState['user']) => void;
  setToken: (token: string | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      setUser: (user) =>
        set({ user, isAuthenticated: !!user }),
      setToken: (token) => set({ token }),
      logout: () =>
        set({ user: null, token: null, isAuthenticated: false }),
    }),
    {
      name: 'basevitale-auth-storage',
    },
  ),
);
