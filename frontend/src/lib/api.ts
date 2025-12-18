import { useAuthStore } from "@/stores/auth-store";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface FetchOptions extends RequestInit {
  token?: string;
  skipRefresh?: boolean;
}

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public errors?: any[]
  ) {
    super(message);
    this.name = "ApiError";
  }
}

let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const authStore = useAuthStore.getState();
  const refreshToken = authStore.refreshToken;
  
  if (!refreshToken) {
    authStore.logout();
    return null;
  }

  try {
    const response = await fetch(`${API_URL}/api/v1/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!response.ok) {
      authStore.logout();
      return null;
    }

    const data = await response.json();
    authStore.setTokens(data.access_token, data.refresh_token, data.expires_in);
    return data.access_token;
  } catch {
    authStore.logout();
    return null;
  }
}

async function getValidToken(): Promise<string | null> {
  const authStore = useAuthStore.getState();
  
  // Se não autenticado, retorna null
  if (!authStore.isAuthenticated || !authStore.accessToken) {
    return null;
  }
  
  // Se token não expirado, retorna o atual
  if (!authStore.isTokenExpired()) {
    return authStore.accessToken;
  }

  // Se já está fazendo refresh, aguarda
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  // Inicia refresh
  isRefreshing = true;
  refreshPromise = refreshAccessToken().finally(() => {
    isRefreshing = false;
    refreshPromise = null;
  });

  return refreshPromise;
}

async function fetchApi<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const { token, skipRefresh = false, ...fetchOptions } = options;

  // Obter token válido (com refresh automático se necessário)
  let authToken = token;
  if (!authToken && !skipRefresh) {
    const validToken = await getValidToken();
    if (validToken) {
      authToken = validToken;
    }
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...fetchOptions,
    headers,
  });

  // Se 401 e não tentamos refresh ainda, tenta uma vez
  if (response.status === 401 && !skipRefresh) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      return fetchApi<T>(endpoint, { ...options, token: newToken, skipRefresh: true });
    }
    // Se não conseguiu refresh, desloga
    useAuthStore.getState().logout();
    throw new ApiError(401, "Sessão expirada. Faça login novamente.");
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new ApiError(
      response.status,
      error.detail || "Erro na requisição",
      error.errors
    );
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

export const api = {
  get: <T>(endpoint: string, token?: string) =>
    fetchApi<T>(endpoint, { method: "GET", token }),

  post: <T>(endpoint: string, data: any, token?: string) =>
    fetchApi<T>(endpoint, {
      method: "POST",
      body: JSON.stringify(data),
      token,
    }),

  put: <T>(endpoint: string, data: any, token?: string) =>
    fetchApi<T>(endpoint, {
      method: "PUT",
      body: JSON.stringify(data),
      token,
    }),

  delete: <T>(endpoint: string, token?: string) =>
    fetchApi<T>(endpoint, { method: "DELETE", token }),

  // Form data (para login OAuth2)
  postForm: <T>(endpoint: string, data: URLSearchParams) =>
    fetch(`${API_URL}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: data,
    }).then((res) => {
      if (!res.ok) {
        return res.json().then((err) => {
          throw new ApiError(res.status, err.detail || "Erro na requisição");
        });
      }
      return res.json() as Promise<T>;
    }),
};

export { ApiError };
