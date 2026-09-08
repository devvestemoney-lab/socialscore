import React, { createContext, useContext, useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import type { UserProfile, LoginRequest } from '@workspace/api-client-react';
import { login } from '@workspace/api-client-react';

export interface ApiFailure {
  status: number;
  url: string;
  message: string;
  method: string;
}

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginUser: (data: LoginRequest) => Promise<void>;
  logoutUser: () => void;
  apiOptions: { request: { headers: { Authorization: string } } };
  request: (url: string, options?: RequestInit) => Promise<ApiResponse>;
  apiFailure: ApiFailure | null;
  clearApiFailure: () => void;
}

/**
 * What `request` resolves to. Pages only ever read `ok`, `status` and `json()`,
 * and `json()` here never throws — a gateway 404 or an HTML error page comes
 * back as a plain object rather than rejecting and leaving the page spinning.
 */
export interface ApiResponse {
  ok: boolean;
  status: number;
  json: () => Promise<any>;
  text: () => Promise<string>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [apiFailure, setApiFailure] = useState<ApiFailure | null>(null);
  const [, setLocation] = useLocation();

  useEffect(() => {
    const storedToken = localStorage.getItem('credit_platform_token');
    const storedUser = localStorage.getItem('credit_platform_user');
    
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const loginUser = async (data: LoginRequest) => {
    try {
      const response = await login(data);
      setToken(response.token);
      setUser(response.user);
      localStorage.setItem('credit_platform_token', response.token);
      localStorage.setItem('credit_platform_user', JSON.stringify(response.user));
      
      // Route based on role
      if (response.user.role === 'super_admin') {
        setLocation('/admin');
      } else if (response.user.role === 'customer') {
        setLocation('/consent');
      } else {
        setLocation('/dashboard');
      }
    } catch (err: any) {
      throw new Error(err.message || 'Login failed');
    }
  };

  const logoutUser = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('credit_platform_token');
    localStorage.removeItem('credit_platform_user');
    setLocation('/login');
  };

  const apiOptions = {
    request: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  };

  const clearApiFailure = () => setApiFailure(null);

  /**
   * Every page loads its data through here. A failed GET is a failed page load,
   * so it is recorded and the shell renders an error state instead of leaving a
   * spinner running forever. Failed writes stay silent — the calling form reads
   * the response and shows its own message next to the field.
   */
  const request = async (url: string, options?: RequestInit): Promise<ApiResponse> => {
    const method = (options?.method ?? 'GET').toUpperCase();

    let response: Response;
    try {
      response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          ...options?.headers,
        },
      });
    } catch {
      if (method === 'GET') {
        setApiFailure({
          status: 0, url, method,
          message: 'The platform could not reach the API server.',
        });
      }
      return { ok: false, status: 0, json: async () => ({}), text: async () => '' };
    }

    const body = await response.text();
    const parsed = () => {
      try { return JSON.parse(body); } catch { return {}; }
    };

    if (!response.ok) {
      if (response.status === 401 && token) {
        // The session is gone or the token no longer matches the running API.
        localStorage.removeItem('credit_platform_token');
        localStorage.removeItem('credit_platform_user');
        setToken(null);
        setUser(null);
      } else if (method === 'GET') {
        const detail = parsed();
        setApiFailure({
          status: response.status, url, method,
          message: detail.message ?? detail.error ?? 'The API server rejected the request.',
        });
      }
    }

    return {
      ok: response.ok,
      status: response.status,
      json: async () => parsed(),
      text: async () => body,
    };
  };

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated: !!token, isLoading, loginUser, logoutUser, apiOptions, request, apiFailure, clearApiFailure }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
