import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

export interface Permission {
  module_name: string;
  action: string;
}

export interface User {
  id: string;
  username: string;
  permissions?: Permission[];
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (user: User) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
  hasPermission: (moduleName: string, action: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/* eslint-disable react-refresh/only-export-components */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          setUser(data.user);
          return;
        }
      }

      setUser(null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchMe();
  }, [fetchMe]);

  const login = (newUser: User) => setUser(newUser);
  const logout = () => setUser(null);
  const refreshUser = fetchMe;

  const hasPermission = useCallback(
    (moduleName: string, action: string): boolean => {
      if (!user?.permissions) return false;
      return user.permissions.some((p) => p.module_name === moduleName && p.action === action);
    },
    [user],
  );

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
