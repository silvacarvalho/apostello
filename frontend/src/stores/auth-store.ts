import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface User {
  id: number;
  nome_completo: string;
  email: string;
  tipo: string;
  distrito_id: number | null;
  igreja_id: number | null;
  foto_url: string | null;
  score_atual: number | null;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  tokenExpiry: number | null;
  
  // Actions
  setAuth: (user: User, accessToken: string, refreshToken: string, expiresIn?: number) => void;
  setUser: (user: User) => void;
  setTokens: (accessToken: string, refreshToken: string, expiresIn?: number) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
  isTokenExpired: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: true,
      tokenExpiry: null,

      setAuth: (user, accessToken, refreshToken, expiresIn = 3600) =>
        set({
          user,
          accessToken,
          refreshToken,
          isAuthenticated: true,
          isLoading: false,
          tokenExpiry: Date.now() + expiresIn * 1000,
        }),

      setUser: (user) => set({ user }),

      setTokens: (accessToken, refreshToken, expiresIn = 3600) =>
        set({ 
          accessToken, 
          refreshToken,
          tokenExpiry: Date.now() + expiresIn * 1000,
        }),

      logout: () =>
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          isLoading: false,
          tokenExpiry: null,
        }),

      setLoading: (isLoading) => set({ isLoading }),
      
      isTokenExpired: () => {
        const { tokenExpiry } = get();
        if (!tokenExpiry) return true;
        // Considera expirado 60 segundos antes para margem de segurança
        return Date.now() > tokenExpiry - 60000;
      },
    }),
    {
      name: "apostello-auth",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
        tokenExpiry: state.tokenExpiry,
      }),
    }
  )
);

// Helpers
export const isAdmin = (user: User | null) => user?.tipo === "ADMIN";
export const isPastor = (user: User | null) =>
  user?.tipo === "PASTOR_DISTRITAL" || user?.tipo === "LIDER_DISTRITAL";
export const isPregador = (user: User | null) => user?.tipo === "PREGADOR";
export const isCantor = (user: User | null) => user?.tipo === "CANTOR";
export const isMembro = (user: User | null) => user?.tipo === "MEMBRO";

export const getUserRole = (tipo: string): string => {
  const roles: Record<string, string> = {
    ADMIN: "Administrador",
    PASTOR_DISTRITAL: "Pastor Distrital",
    LIDER_DISTRITAL: "Líder Distrital",
    PREGADOR: "Pregador",
    CANTOR: "Cantor",
    MEMBRO: "Membro",
  };
  return roles[tipo] || tipo;
};
