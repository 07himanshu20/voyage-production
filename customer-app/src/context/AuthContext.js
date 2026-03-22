import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadSession(); }, []);

  const loadSession = async () => {
    try {
      const t = await AsyncStorage.getItem('customer_token');
      const u = await AsyncStorage.getItem('customer_user');
      if (t && u) { setToken(t); setUser(JSON.parse(u)); }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const login = async (tokenVal, userVal) => {
    await AsyncStorage.setItem('customer_token', tokenVal);
    await AsyncStorage.setItem('customer_user', JSON.stringify(userVal));
    setToken(tokenVal); setUser(userVal);
  };

  const logout = async () => {
    await AsyncStorage.removeItem('customer_token');
    await AsyncStorage.removeItem('customer_user');
    setToken(null); setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
