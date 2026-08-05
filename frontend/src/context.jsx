import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI, familyAPI, choresAPI, goalsAPI, transactionsAPI, rulesAPI, expensesAPI } from './api';

const CACHED_FAMILY_KEY = 'pocketmoney_cached_family_members';

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
  const [expenses, setExpenses] = useState([]);

  // Last-known children of this family, cached across logout so the Welcome
  // screen's "Accès Rapide" quick-login can show avatars even before anyone
  // is signed in (the live `family` above is only populated after login).
  const [cachedFamilyMembers, setCachedFamilyMembers] = useState(() => {
    try {
      const saved = typeof window !== 'undefined' ? localStorage.getItem(CACHED_FAMILY_KEY) : null;
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  
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
      const [familyData, choresData, goalsData, expensesData] = await Promise.all([
        familyAPI.getFamily().catch(() => null),
        choresAPI.getChores().catch(() => ({ chores: [] })),
        goalsAPI.getGoals().catch(() => ({ goals: [] })),
        expensesAPI.getExpenses().catch(() => ({ expenses: [] })),
      ]);

      if (familyData) {
        setFamily(familyData.family);
        const children = (familyData.family?.users || []).filter(u => u.role === 'CHILD')
          .map(c => ({ id: c.id, name: c.name, avatar: c.avatar, color: c.color }));
        setCachedFamilyMembers(children);
        try { localStorage.setItem(CACHED_FAMILY_KEY, JSON.stringify(children)); } catch (e) {}
      }
      setChores(choresData.chores || []);
      setGoals(goalsData.goals || []);
      setExpenses(expensesData.expenses || []);

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

  const editChore = async (choreId, data) => {
    try {
      await choresAPI.updateChore(choreId, data);
      showToast('Corvée mise à jour !');
      fetchAppData();
    } catch (error) {
      showToast(error.message, 'error');
      throw error;
    }
  };

  const deleteChore = async (choreId) => {
    try {
      await choresAPI.deleteChore(choreId);
      showToast('Corvée supprimée.', 'info');
      fetchAppData();
    } catch (error) {
      showToast(error.message, 'error');
      throw error;
    }
  };

  const fundGoal = async (goalId, amount) => {
    const val = parseFloat(amount);
    if (!(val > 0)) {
      showToast('Entre un montant positif.', 'error');
      return;
    }
    try {
      await goalsAPI.fundGoal(goalId, { amount: val });
      showToast('Argent ajouté à l\'objectif !');
      fetchAppData();
    } catch (error) {
      showToast(error.message, 'error');
    }
  };

  const withdrawFromGoal = async (goalId, amount) => {
    const val = parseFloat(amount);
    if (!(val > 0)) {
      showToast('Entre un montant positif.', 'error');
      return;
    }
    try {
      await goalsAPI.withdrawGoal(goalId, { amount: val });
      showToast('Argent retiré de l\'objectif.');
      fetchAppData();
    } catch (error) {
      showToast(error.message, 'error');
    }
  };

  const requestExpense = async (data) => {
    try {
      await expensesAPI.request(data);
      showToast('Demande envoyée à tes parents !');
      fetchAppData();
    } catch (error) {
      showToast(error.message, 'error');
      throw error;
    }
  };

  const approveExpense = async (expenseId, data = {}) => {
    try {
      await expensesAPI.approve(expenseId, data);
      showToast('Dépense approuvée.');
      fetchAppData();
    } catch (error) {
      showToast(error.message, 'error');
    }
  };

  const rejectExpense = async (expenseId, data = {}) => {
    try {
      await expensesAPI.reject(expenseId, data);
      showToast('Dépense refusée.', 'info');
      fetchAppData();
    } catch (error) {
      showToast(error.message, 'error');
    }
  };

  const updateRules = async (rules) => {
    try {
      const safeRules = (rules || []).map(r => ({ ...r, amount: Math.max(0, parseFloat(r.amount) || 0) }));
      await familyAPI.updateRules(safeRules);
      showToast('Règles mises à jour !');
      fetchAppData();
    } catch (error) {
      showToast(error.message, 'error');
    }
  };

  const applyPenalty = async (childId, ruleId) => {
    try {
      const res = await rulesAPI.applyPenalty(ruleId, { childId });
      showToast(res?.capped ? 'Sanction appliquée (plafonnée à 0€, solde insuffisant).' : 'Sanction appliquée.', 'error');
      fetchAppData();
    } catch (error) {
      showToast(error.message, 'error');
    }
  };

  return (
    <AppContext.Provider value={{
      user, token, loading, theme, toast, showConfetti, family, chores, goals, transactions, expenses,
      cachedFamilyMembers,
      login, registerParentCreate, registerParentJoin, registerChild, logout, showToast,
      loginAsChild, triggerConfetti, addChore, approveChore, rejectChore, submitChore, editChore, deleteChore,
      fundGoal, withdrawFromGoal, requestExpense, approveExpense, rejectExpense,
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
