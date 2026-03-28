import React, { createContext, useContext, useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import type { UserProfile, LoginRequest } from '@workspace/api-client-react';
import { login } from '@workspace/api-client-react';

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginUser: (data: LoginRequest) => Promise<void>;
  logoutUser: () => void;
  apiOptions: { request: { headers: { Authorization: string } } };
  request: (url: string, options?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
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

  const request = (url: string, options?: RequestInit): Promise<Response> => {
    return fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...options?.headers,
      },
    });
  };

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated: !!token, isLoading, loginUser, logoutUser, apiOptions, request }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
