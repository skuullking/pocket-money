import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI, familyAPI, choresAPI, goalsAPI, transactionsAPI, rulesAPI } from './api';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => {
    try {
      return typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    } catch (e) {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);
  
  const [family, setFamily] = useState(null);
  const [chores, setChores] = useState([]);
  const [goals, setGoals] = useState([]);
  const [transactions, setTransactions] = useState([]);
  
  const [theme, setTheme] = useState(() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('theme');
        if (saved) return saved;
        if (window.matchMedia) {
          return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
      }
    } catch (e) {}
    return 'light';
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const root = window.document.documentElement;
      if (theme === 'dark') root.classList.add('dark');
      else root.classList.remove('dark');
      try {
        localStorage.setItem('theme', theme);
      } catch (e) {}
    }
  }, [theme]);

  useEffect(() => {
    if (token) {
      try {
        localStorage.setItem('token', token);
      } catch (e) {}
      fetchUser();
    } else {
      try {
        localStorage.removeItem('token');
      } catch (e) {}
      setUser(null);
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (user) fetchAppData();
  }, [user]);

  const fetchUser = async () => {
    try {
      setLoading(true);
      const data = await authAPI.getMe();
      setUser(data.user);
    } catch (error) {
      logout();
    } finally {
      setLoading(false);
    }
  };

  const fetchAppData = async () => {
    if (!user) return;
    try {
      const [familyData, choresData, goalsData] = await Promise.all([
        familyAPI.getFamily().catch(() => null),
        choresAPI.getChores().catch(() => ({ chores: [] })),
        goalsAPI.getGoals().catch(() => ({ goals: [] })),
      ]);
      
      if (familyData) setFamily(familyData.family);
      setChores(choresData.chores || []);
      setGoals(goalsData.goals || []);

      if (user.role === 'CHILD') {
        const transData = await transactionsAPI.getTransactions().catch(() => ({ transactions: [] }));
        setTransactions(transData.transactions || []);
      }
    } catch (error) {
      console.error('Failed to fetch app data', error);
    }
  };

  const login = async (credentials) => {
    try {
      const data = await authAPI.login(credentials);
      setUser(data.user);
      setToken(data.token);
      return data;
    } catch (error) {
      showToast(error.message, 'error');
      throw error;
    }
  };

  const registerParentCreate = async (data) => {
    try {
      const res = await authAPI.registerParentCreate(data);
      setUser(res.user);
      setToken(res.token);
      return res;
    } catch (error) {
      showToast(error.message, 'error');
      throw error;
    }
  };

  const registerParentJoin = async (data) => {
    try {
      const res = await authAPI.registerParentJoin(data);
      setUser(res.user);
      setToken(res.token);
      return res;
    } catch (error) {
      showToast(error.message, 'error');
      throw error;
    }
  };

  const registerChild = async (data) => {
    try {
      const res = await authAPI.registerChild(data);
      setUser(res.user);
      setToken(res.token);
      return res;
    } catch (error) {
      showToast(error.message, 'error');
      throw error;
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setFamily(null);
    setChores([]);
    setGoals([]);
    setTransactions([]);
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const triggerConfetti = () => {
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 5000);
  };

  const loginAsChild = (child) => {
     setUser(child);
  };

  // --- ACTIONS ---

  const addChore = async (data) => {
    try {
      await choresAPI.createChore(data);
      showToast('Corvée créée et assignée !');
      fetchAppData();
    } catch (error) {
      showToast(error.message, 'error');
    }
  };

  const approveChore = async (choreId) => {
    try {
      await choresAPI.approveChore(choreId);
      showToast('Corvée validée !');
      triggerConfetti();
      fetchAppData();
    } catch (error) {
      showToast(error.message, 'error');
    }
  };

  const rejectChore = async (choreId, reason = '') => {
    try {
      await choresAPI.rejectChore(choreId, { reason });
      showToast('Corvée refusée.', 'info');
      fetchAppData();
    } catch (error) {
      showToast(error.message, 'error');
    }
  };

  const submitChore = async (choreId, data) => {
    try {
      await choresAPI.submitChore(choreId, data);
      showToast('Corvée envoyée !');
      triggerConfetti();
      fetchAppData();
    } catch (error) {
      showToast(error.message, 'error');
    }
  };

  const fundGoal = async (goalId, amount) => {
    try {
      await goalsAPI.fundGoal(goalId, { amount });
      showToast('Argent ajouté à l\'objectif !');
      fetchAppData();
    } catch (error) {
      showToast(error.message, 'error');
    }
  };

  const updateRules = async (rules) => {
    try {
      await familyAPI.updateRules(rules);
      showToast('Règles mises à jour !');
      fetchAppData();
    } catch (error) {
      showToast(error.message, 'error');
    }
  };

  const applyPenalty = async (childId, ruleId) => {
    try {
      await rulesAPI.applyPenalty(ruleId, { childId });
      showToast('Sanction appliquée.', 'error');
      fetchAppData();
    } catch (error) {
      showToast(error.message, 'error');
    }
  };

  return (
    <AppContext.Provider value={{
      user, token, loading, theme, toast, showConfetti, family, chores, goals, transactions,
      login, registerParentCreate, registerParentJoin, registerChild, logout, showToast,
      loginAsChild, triggerConfetti, addChore, approveChore, rejectChore, submitChore, fundGoal,
      updateRules, applyPenalty,
      toggleTheme: () => setTheme(t => t === 'dark' ? 'light' : 'dark')
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) return {};
  return context;
}
