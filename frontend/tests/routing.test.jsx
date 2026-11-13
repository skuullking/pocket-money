import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../src/App';
import { useApp } from '../src/context';
import { alice, appContext, parent } from './support';

vi.mock('../src/context', () => ({
  AppProvider: ({ children }) => children,
  useApp: vi.fn(),
}));

// Chaque écran n'affiche que son nom : ce fichier teste uniquement les routes.
const { stubScreens } = vi.hoisted(() => ({
  stubScreens: names => Object.fromEntries(names.map(name => [name, () => name])),
}));
vi.mock('../src/screens/auth.jsx', () =>
  stubScreens(['Welcome', 'SignIn', 'SignUp', 'Splash', 'ForgotPassword', 'ResetPassword']),
);
vi.mock('../src/screens/parent.jsx', () =>
  stubScreens([
    'ParentDashboard',
    'InboxScreen',
    'ChoresList',
    'ChoreDetail',
    'CreateChore',
    'ChildrenView',
    'RulesScreen',
    'PenaltyHistoryScreen',
    'AnalyticsScreen',
    'SettingsScreen',
    'ExpensesReview',
    'ChildSettingsScreen',
  ]),
);
vi.mock('../src/screens/child.jsx', () =>
  stubScreens([
    'ChildDashboard',
    'AvailableChores',
    'SubmitChore',
    'MyChores',
    'BalanceScreen',
    'GoalsScreen',
    'ProfileScreen',
    'ExpensesScreen',
  ]),
);

const visit = (path, user, overrides = {}) => {
  useApp.mockReturnValue(appContext({ user, ...overrides }));
  window.history.pushState({}, '', path);
  render(<App />);
};

const parentRoutes = [
  ['/parent', 'ParentDashboard'],
  ['/parent/inbox', 'InboxScreen'],
  ['/parent/chores', 'ChoresList'],
  ['/parent/chores/new', 'CreateChore'],
  ['/parent/chores/abc', 'ChoreDetail'],
  ['/parent/chores/abc/edit', 'CreateChore'],
  ['/parent/children', 'ChildrenView'],
  ['/parent/children/abc/settings', 'ChildSettingsScreen'],
  ['/parent/rules', 'RulesScreen'],
  ['/parent/rules/history', 'PenaltyHistoryScreen'],
  ['/parent/analytics', 'AnalyticsScreen'],
  ['/parent/settings', 'SettingsScreen'],
  ['/parent/expenses', 'ExpensesReview'],
];

const childRoutes = [
  ['/child', 'ChildDashboard'],
  ['/child/available-chores', 'AvailableChores'],
  ['/child/submit-chore/abc', 'SubmitChore'],
  ['/child/my-chores', 'MyChores'],
  ['/child/balance', 'BalanceScreen'],
  ['/child/goals', 'GoalsScreen'],
  ['/child/profile', 'ProfileScreen'],
  ['/child/expenses', 'ExpensesScreen'],
];

beforeEach(() => {
  vi.clearAllMocks();
});

describe('routes protégées', () => {
  it.each(parentRoutes)('%s affiche %s au parent', (path, name) => {
    visit(path, parent);
    expect(screen.getByText(name)).toBeInTheDocument();
  });

  it.each(childRoutes)("%s affiche %s à l'enfant", (path, name) => {
    visit(path, alice);
    expect(screen.getByText(name)).toBeInTheDocument();
  });

  it.each([...parentRoutes, ...childRoutes])("%s redirige un visiteur vers l'accueil", path => {
    visit(path, null);
    expect(screen.getByText('Welcome')).toBeInTheDocument();
    expect(window.location.pathname).toBe('/welcome');
  });

  it.each(parentRoutes)('%s renvoie un enfant vers son espace', path => {
    visit(path, alice);
    expect(window.location.pathname).toBe('/child');
  });

  it.each(childRoutes)('%s renvoie un parent vers son espace', path => {
    visit(path, parent);
    expect(window.location.pathname).toBe('/parent');
  });
});

describe('routes publiques', () => {
  it.each([
    ['/welcome', 'Welcome'],
    ['/login', 'SignIn'],
    ['/signup', 'SignUp'],
    ['/forgot-password', 'ForgotPassword'],
    ['/reset-password', 'ResetPassword'],
  ])('%s', (path, name) => {
    visit(path, null);
    expect(screen.getByText(name)).toBeInTheDocument();
  });

  it.each([
    [null, '/welcome'],
    [parent, '/parent'],
    [alice, '/child'],
  ])('la racine et les URL inconnues redirigent selon le rôle', (user, expected) => {
    visit('/nimporte-quoi', user);
    expect(window.location.pathname).toBe(expected);
  });
});

it("n'affiche aucune route tant que la session charge", () => {
  visit('/parent', null, { loading: true });
  expect(screen.getByText('Chargement de PocketMoney...')).toBeInTheDocument();
  expect(window.location.pathname).toBe('/parent');
});
