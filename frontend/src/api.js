const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const fetchAPI = async (endpoint, options = {}) => {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Something went wrong');
  }

  return data;
};

export const authAPI = {
  login: (credentials) => fetchAPI('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  }),
  registerParentCreate: (data) => fetchAPI('/auth/register/parent/create', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  registerParentJoin: (data) => fetchAPI('/auth/register/parent/join', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  registerChild: (data) => fetchAPI('/auth/register/child', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  getMe: () => fetchAPI('/auth/me'),
};

export const familyAPI = {
  getFamily: () => fetchAPI('/family'),
  getChildren: () => fetchAPI('/family/children'),
  updateRules: (rules) => fetchAPI('/family/rules', {
    method: 'PUT',
    body: JSON.stringify({ rules }),
  }),
};

export const choresAPI = {
  getChores: () => fetchAPI('/chores'),
  createChore: (data) => fetchAPI('/chores', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  submitChore: (id, data) => fetchAPI(`/chores/${id}/submit`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
  approveChore: (id) => fetchAPI(`/chores/${id}/approve`, {
    method: 'PATCH',
  }),
  rejectChore: (id, data) => fetchAPI(`/chores/${id}/reject`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
};

export const expensesAPI = {
  request: (data) => fetchAPI('/expenses/request', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  approve: (id, data) => fetchAPI(`/expenses/${id}/approve`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  reject: (id, data) => fetchAPI(`/expenses/${id}/reject`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  deduct: (data) => fetchAPI('/expenses/deduct', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  getExpenses: () => fetchAPI('/expenses'),
};

export const goalsAPI = {
  getGoals: () => fetchAPI('/goals'),
  createGoal: (data) => fetchAPI('/goals', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  fundGoal: (id, data) => fetchAPI(`/goals/${id}/fund`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  withdrawGoal: (id, data) => fetchAPI(`/goals/${id}/withdraw`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  buyGoal: (id) => fetchAPI(`/goals/${id}/buy`, {
    method: 'PUT',
  }),
};

export const transactionsAPI = {
  getTransactions: () => fetchAPI('/transactions'),
};

export const rulesAPI = {
  applyPenalty: (ruleId, data) => fetchAPI(`/rules/${ruleId}/apply`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
};
