import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserDTO, JWTPayload } from '@devpilot/shared';

interface AuthContextType {
  token: string | null;
  user: UserDTO | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string, role?: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<string>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('devpilot_jwt'));
  const [user, setUser] = useState<UserDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  const API_URL = 'http://localhost:5000/api';

  useEffect(() => {
    const fetchProfile = async () => {
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const res = await fetch(`${API_URL}/auth/profile`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const json = await res.json();
        if (res.ok && json.success) {
          setUser(json.data);
        } else {
          // Token expired or invalid
          logout();
        }
      } catch (err) {
        console.error('Failed to load profile, using decrypted token fallback...');
        // Decode token payload simply for offline support
        try {
          const payload = JSON.parse(atob(token.split('.')[1])) as JWTPayload;
          setUser({
            id: payload.id,
            username: payload.username,
            email: `${payload.username}@devpilot.ai`,
            role: payload.role,
            createdAt: new Date().toISOString()
          });
        } catch (e) {
          logout();
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [token]);

  const login = async (email: string, password: string) => {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Authentication failed');
    }

    localStorage.setItem('devpilot_jwt', json.data.token);
    setToken(json.data.token);
    setUser(json.data.user);
    navigate('/');
  };

  const register = async (username: string, email: string, password: string, role = 'Developer') => {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, email, password, role }),
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Registration failed');
    }

    // After registration, login automatically using credentials
    await login(email, password);
  };

  const forgotPassword = async (email: string): Promise<string> => {
    const res = await fetch(`${API_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Password reset request failed');
    }

    return json.message || 'Reset token compiled successfully';
  };

  const resetPassword = async (resetToken: string, newPassword: string) => {
    const res = await fetch(`${API_URL}/auth/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token: resetToken, password: newPassword }),
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Password reset failed');
    }

    navigate('/login');
  };

  const logout = async () => {
    try {
      if (token) {
        await fetch(`${API_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      }
    } catch (e) {
      console.warn('Network log out session trace skipped.');
    } finally {
      localStorage.removeItem('devpilot_jwt');
      setToken(null);
      setUser(null);
      navigate('/login');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        isAuthenticated: !!token,
        isLoading,
        login,
        register,
        forgotPassword,
        resetPassword,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
