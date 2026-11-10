import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { accountAPI, authAPI, familyAPI, choresAPI, goalsAPI, transactionsAPI, rulesAPI, expensesAPI, childSettingsAPI, allowanceAPI, choreTemplatesAPI, SOCKET_URL } from './api';

// Un même événement doit provoquer un message différent selon qui le reçoit
// (le parent ou l'enfant concerné) — pas de doublon, pas de bruit inutile.
const SOCKET_TOAST_MESSAGES = {
  'chore:submitted': { message: 'Une corvée vient d\'être soumise !', type: 'info' },
  'chore:approved': { message: 'Une de tes corvées a été validée !', type: 'success' },
  'chore:rejected': { message: 'Une de tes corvées a été refusée.', type: 'info' },
  'expense:requested': { message: 'Nouvelle demande de dépense reçue.', type: 'info' },
  'expense:approved': { message: 'Ta demande de dépense a été approuvée !', type: 'success' },
  'expense:rejected': { message: 'Ta demande de dépense a été refusée.', type: 'info' },
  'expense:deducted': { message: 'Une dépense a été déduite de ton solde.', type: 'info' },
  'penalty:applied': { message: 'Une sanction a été appliquée.', type: 'error' },
  'goal:funded': { message: 'Un objectif a été alimenté !', type: 'success' },
};

const CACHED_FAMILY_KEY = 'pocketmoney_cached_family_members';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);
  
  const [family, setFamily] = useState(null);
  const [chores, setChores] = useState([]);
  const [goals, setGoals] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [choreTemplates, setChoreTemplates] = useState([]);

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
    // La session est dans un cookie httpOnly : on purge l'ancien JWT de localStorage.
    try {
      localStorage.removeItem('token');
    } catch (e) {}
    fetchUser();
  }, []);

  useEffect(() => {
    if (user) fetchAppData();
    // Sur l'id seulement : fetchAppData rafraîchit `user`, un objet neuf relancerait ce chargement sans fin.
  }, [user?.id]);

  // Notifications temps réel : ne fonctionne que si le backend est déployé
  // en Docker/self-hosted (le serveur Socket.io est désactivé sur Vercel,
  // voir server.ts) — se connecte simplement pas si le serveur n'écoute pas.
  const socketRef = useRef(null);
  useEffect(() => {
    if (!user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }
    const socket = io(SOCKET_URL, { withCredentials: true, reconnectionAttempts: 5 });
    socketRef.current = socket;
    Object.keys(SOCKET_TOAST_MESSAGES).forEach(event => {
      socket.on(event, () => {
        const { message, type } = SOCKET_TOAST_MESSAGES[event];
        showToast(message, type);
        fetchAppData();
      });
    });
    socket.on('member:removed', () => fetchAppData());
    socket.on('account:deleted', () => {
      showToast('Ce compte a été supprimé.', 'info');
      logout();
      forgetFamilyMembers();
    });
    socket.on('connect_error', () => {}); // silencieux — pas de temps réel dispo, l'app reste utilisable

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user?.id]);

  const fetchUser = async () => {
    try {
      setLoading(true);
      const data = await authAPI.getMe();
      setUser(data.user);
    } catch (error) {
      clearSession();
    } finally {
      setLoading(false);
    }
  };

  const fetchAppData = async () => {
    if (!user) return;
    try {
      const [me, familyData, choresData, goalsData, expensesData] = await Promise.all([
        authAPI.getMe().catch(() => null),
        familyAPI.getFamily().catch(() => null),
        choresAPI.getChores().catch(() => ({ chores: [] })),
        goalsAPI.getGoals().catch(() => ({ goals: [] })),
        expensesAPI.getExpenses().catch(() => ({ expenses: [] })),
      ]);

      // Solde et variation du mois à jour ; une réponse arrivée après une déconnexion est ignorée.
      if (me) setUser(current => (current?.id === me.user.id ? me.user : current));

      if (familyData) {
        setFamily(familyData.family);
        const children = (familyData.family?.users || []).filter(u => u.role === 'CHILD')
          .map(c => ({ id: c.id, name: c.name, avatar: c.avatar, color: c.color, inviteCode: familyData.family.inviteCode }));
        setCachedFamilyMembers(children);
        try { localStorage.setItem(CACHED_FAMILY_KEY, JSON.stringify(children)); } catch (e) {}
      }
      setChores(choresData.chores || []);
      setGoals(goalsData.goals || []);
      setExpenses(expensesData.expenses || []);

      if (user.role === 'CHILD') {
        const transData = await transactionsAPI.getTransactions().catch(() => ({ transactions: [] }));
        setTransactions(transData.transactions || []);
      } else {
        const templatesData = await choreTemplatesAPI.getTemplates().catch(() => ({ templates: [] }));
        setChoreTemplates(templatesData.templates || []);
      }
    } catch (error) {
      console.error('Failed to fetch app data', error);
    }
  };

  const login = async (credentials) => {
    try {
      const data = await authAPI.login(credentials);
      setUser(data.user);
      fetchUser();
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
      fetchUser();
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
      fetchUser();
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
      fetchUser();
      return res;
    } catch (error) {
      showToast(error.message, 'error');
      throw error;
    }
  };

  const logout = () => {
    authAPI.logout().catch(() => {});
    clearSession();
  };

  const clearSession = () => {
    setUser(null);
    setFamily(null);
    setChores([]);
    setGoals([]);
    setTransactions([]);
    setExpenses([]);
  };

  // Les avatars d'« Accès Rapide » ne doivent pas survivre à la suppression du compte.
  const forgetFamilyMembers = () => {
    setCachedFamilyMembers([]);
    try { localStorage.removeItem(CACHED_FAMILY_KEY); } catch (e) {}
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const triggerConfetti = () => {
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 5000);
  };

  // --- ACTIONS ---

  const removeChild = async (childId) => {
    try {
      await familyAPI.removeChild(childId);
      showToast('Enfant retiré de la famille.', 'info');
      fetchAppData();
    } catch (error) {
      showToast(error.message, 'error');
      throw error;
    }
  };

  const resetChildPassword = async (childId, newPassword) => {
    try {
      await familyAPI.resetChildPassword(childId, newPassword);
      showToast('Mot de passe modifié.');
    } catch (error) {
      showToast(error.message, 'error');
      throw error;
    }
  };

  const deleteFamily = async (password) => {
    try {
      await familyAPI.deleteFamily(password);
      clearSession();
      forgetFamilyMembers();
      showToast('Famille supprimée.', 'info');
    } catch (error) {
      showToast(error.message, 'error');
      throw error;
    }
  };

  const giveConsent = async () => {
    try {
      await accountAPI.giveConsent();
      showToast('Consentement enregistré.');
      fetchAppData();
    } catch (error) {
      showToast(error.message, 'error');
    }
  };

  const exportData = async () => {
    try {
      const data = await accountAPI.exportData();
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'pocketmoney-export.json';
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      showToast(error.message, 'error');
    }
  };

  const deleteAccount = async (password) => {
    try {
      await accountAPI.deleteAccount(password);
      clearSession();
      forgetFamilyMembers();
      showToast('Compte supprimé.', 'info');
    } catch (error) {
      showToast(error.message, 'error');
      throw error;
    }
  };

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

  const createRule = async (data) => {
    try {
      await rulesAPI.createRule(data);
      showToast('Règle créée !');
      fetchAppData();
    } catch (error) {
      showToast(error.message, 'error');
      throw error;
    }
  };

  const editRule = async (ruleId, data) => {
    try {
      await rulesAPI.updateRule(ruleId, data);
      showToast('Règle mise à jour !');
      fetchAppData();
    } catch (error) {
      showToast(error.message, 'error');
      throw error;
    }
  };

  const deleteRule = async (ruleId) => {
    try {
      await rulesAPI.deleteRule(ruleId);
      showToast('Règle supprimée.', 'info');
      fetchAppData();
    } catch (error) {
      showToast(error.message, 'error');
      throw error;
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

  const updateChildSettings = async (childId, data) => {
    try {
      await childSettingsAPI.update(childId, data);
      showToast('Réglages enregistrés !');
      fetchAppData();
    } catch (error) {
      showToast(error.message, 'error');
      throw error;
    }
  };

  const updateSplitSettings = async (childId, data) => {
    try {
      await childSettingsAPI.updateSplit(childId, data);
      showToast('Répartition enregistrée !');
      fetchAppData();
    } catch (error) {
      showToast(error.message, 'error');
      throw error;
    }
  };

  const updateAllowance = async (childId, data) => {
    try {
      await allowanceAPI.update(childId, data);
      showToast('Argent de poche récurrent enregistré !');
      fetchAppData();
    } catch (error) {
      showToast(error.message, 'error');
      throw error;
    }
  };

  const createChoreTemplate = async (data) => {
    try {
      await choreTemplatesAPI.create(data);
      showToast('Corvée récurrente créée !');
      fetchAppData();
    } catch (error) {
      showToast(error.message, 'error');
      throw error;
    }
  };

  const updateChoreTemplate = async (templateId, data) => {
    try {
      await choreTemplatesAPI.update(templateId, data);
      showToast('Modèle mis à jour !');
      fetchAppData();
    } catch (error) {
      showToast(error.message, 'error');
      throw error;
    }
  };

  const deleteChoreTemplate = async (templateId) => {
    try {
      await choreTemplatesAPI.delete(templateId);
      showToast('Modèle supprimé.', 'info');
      fetchAppData();
    } catch (error) {
      showToast(error.message, 'error');
      throw error;
    }
  };

  return (
    <AppContext.Provider value={{
      user, loading, theme, toast, showConfetti, family, chores, goals, transactions, expenses, choreTemplates,
      cachedFamilyMembers,
      login, registerParentCreate, registerParentJoin, registerChild, logout, showToast,
      triggerConfetti, addChore, approveChore, rejectChore, submitChore, editChore, deleteChore,
      fundGoal, withdrawFromGoal, requestExpense, approveExpense, rejectExpense,
      createRule, editRule, deleteRule, applyPenalty, updateChildSettings, updateAllowance, updateSplitSettings,
      createChoreTemplate, updateChoreTemplate, deleteChoreTemplate, removeChild, resetChildPassword, deleteFamily, giveConsent, exportData, deleteAccount,
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
