import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { vi } from 'vitest';

export const parent = {
  id: 'p1',
  name: 'Sarah',
  role: 'PARENT',
  familyId: 'f1',
  avatar: 'S',
  color: '#123456',
  balance: 0,
};
export const alice = {
  id: 'c1',
  name: 'Alice',
  role: 'CHILD',
  familyId: 'f1',
  avatar: 'A',
  color: '#654321',
  age: 12,
  balance: 45.5,
  monthDelta: 12,
  saveBalance: 10,
  spendBalance: 30,
  giveBalance: 5.5,
  settings: { splitEnabled: true, frozen: false },
};
export const bob = {
  id: 'c2',
  name: 'Bob',
  role: 'CHILD',
  familyId: 'f1',
  avatar: 'B',
  color: '#abcdef',
  age: 9,
  balance: 23,
  monthDelta: 0,
  settings: null,
};

export const family = {
  id: 'f1',
  name: 'Famille Dupont',
  inviteCode: 'DUPONT',
  users: [parent, alice, bob],
  rules: [
    { id: 'r1', title: 'Téléphone à table', description: 'Pendant les repas', amount: 2, active: true },
    { id: 'r2', title: 'Règle inactive', amount: 3, active: false },
  ],
};

export const chores = [
  {
    id: 'ch1',
    title: 'Vaisselle',
    description: 'Le soir',
    reward: 3,
    assigneeId: 'c1',
    deadline: '2026-12-31',
    status: 'PENDING',
  },
  {
    id: 'ch2',
    title: 'Aspirateur',
    reward: 5,
    assigneeId: 'c1',
    deadline: '2026-12-31',
    status: 'SUBMITTED',
    note: 'Fini !',
    proofImageUrl: 'data:image/jpeg;base64,QUJD',
  },
  { id: 'ch3', title: 'Poubelles', reward: 2, assigneeId: 'c2', deadline: '2026-12-31', status: 'COMPLETED' },
  {
    id: 'ch4',
    title: 'Table',
    reward: 1,
    assigneeId: 'c2',
    deadline: '2026-12-31',
    status: 'REJECTED',
    rejectionReason: 'Couverts',
  },
];

export const goals = [
  {
    id: 'g1',
    title: 'Vacances',
    target: 200,
    current: 60,
    icon: '🏖️',
    isShared: true,
    status: 'IN_PROGRESS',
    participants: [{ childId: 'c1', contributedAmount: 60 }],
  },
  {
    id: 'g2',
    title: 'Vélo',
    target: 100,
    current: 0,
    icon: '🚲',
    isShared: false,
    status: 'IN_PROGRESS',
    participants: [{ childId: 'c1', contributedAmount: 0 }],
  },
];

export const transactions = [
  {
    id: 't1',
    childId: 'c1',
    amount: 5,
    type: 'CHORE',
    description: 'Corvée : Aspirateur',
    date: '2026-11-01T10:00:00Z',
  },
  { id: 't2', childId: 'c1', amount: -2, type: 'PENALTY', description: 'Sanction', date: '2026-11-02T10:00:00Z' },
];

export const expenses = [
  {
    id: 'e1',
    childId: 'c1',
    title: 'Livre',
    amount: 12.5,
    expenseType: 'ONLINE',
    status: 'PENDING',
    child: { id: 'c1', name: 'Alice', avatar: 'A' },
  },
  {
    id: 'e2',
    childId: 'c1',
    title: 'Stylo',
    amount: 2,
    approvedAmount: 2,
    expenseType: 'CASH',
    status: 'APPROVED',
    child: { id: 'c1', name: 'Alice', avatar: 'A' },
  },
];

export const choreTemplates = [
  {
    id: 'tpl1',
    familyId: 'f1',
    title: 'Lit',
    reward: 1,
    assigneeId: 'c1',
    frequency: 'DAILY',
    weekday: null,
    active: true,
  },
];

export const fullData = { family, chores, goals, transactions, expenses, choreTemplates };

const ACTIONS = [
  'login',
  'registerParentCreate',
  'registerParentJoin',
  'registerChild',
  'logout',
  'showToast',
  'triggerConfetti',
  'addChore',
  'approveChore',
  'rejectChore',
  'submitChore',
  'editChore',
  'deleteChore',
  'fundGoal',
  'withdrawFromGoal',
  'requestExpense',
  'approveExpense',
  'rejectExpense',
  'createRule',
  'editRule',
  'deleteRule',
  'applyPenalty',
  'updateChildSettings',
  'updateAllowance',
  'updateSplitSettings',
  'createChoreTemplate',
  'updateChoreTemplate',
  'deleteChoreTemplate',
  'removeChild',
  'deleteFamily',
  'toggleTheme',
];

export const appContext = (overrides = {}) => ({
  user: null,
  loading: false,
  theme: 'light',
  toast: null,
  showConfetti: false,
  family: null,
  chores: [],
  goals: [],
  transactions: [],
  expenses: [],
  choreTemplates: [],
  cachedFamilyMembers: [],
  ...Object.fromEntries(ACTIONS.map(name => [name, vi.fn().mockResolvedValue(undefined)])),
  ...overrides,
});

const LocationProbe = () => <div data-testid="location">{useLocation().pathname}</div>;

export const renderScreen = (Screen, { path = '/', route = path } = {}) =>
  render(
    <MemoryRouter initialEntries={[route]}>
      <LocationProbe />
      <Routes>
        <Route path={path} element={<Screen />} />
        <Route path="*" element={<div />} />
      </Routes>
    </MemoryRouter>,
  );
