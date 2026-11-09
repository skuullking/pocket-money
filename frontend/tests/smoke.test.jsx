import React from 'react';
import { act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useApp } from '../src/context';
import * as auth from '../src/screens/auth.jsx';
import * as parentScreens from '../src/screens/parent.jsx';
import * as childScreens from '../src/screens/child.jsx';
import { alice, appContext, fullData, parent, renderScreen } from './support';

vi.mock('../src/context', () => ({ useApp: vi.fn(), AppProvider: ({ children }) => children }));
vi.mock('react-confetti', () => ({ default: () => null }));
vi.mock('../src/api', async () => {
  const analytics = { choreCounts: [], weeklyCompletion: [], spendingByCategory: [], savingsTrend: [], perChild: [] };
  return {
    SOCKET_URL: undefined,
    authAPI: {},
    analyticsAPI: { getOverview: vi.fn().mockResolvedValue(analytics) },
    allowanceAPI: { get: vi.fn().mockResolvedValue({ allowance: null }) },
    rulesAPI: { getPenaltyHistory: vi.fn().mockResolvedValue({ history: [] }) },
    childSettingsAPI: { get: vi.fn().mockResolvedValue({ settings: {} }) },
  };
});

const route = (path, url = path) => ({ path, route: url });

const SCREENS = [
  ['Welcome', auth.Welcome, null, route('/welcome')],
  ['SignIn', auth.SignIn, null, route('/login')],
  ['SignUp', auth.SignUp, null, route('/signup')],
  ['ForgotPassword', auth.ForgotPassword, null, route('/forgot-password')],
  ['ResetPassword', auth.ResetPassword, null, route('/reset-password')],
  ['ParentDashboard', parentScreens.ParentDashboard, parent, route('/parent')],
  ['ChoresList', parentScreens.ChoresList, parent, route('/parent/chores')],
  ['ChoreDetail', parentScreens.ChoreDetail, parent, route('/parent/chores/:choreId', '/parent/chores/ch2')],
  ['CreateChore (création)', parentScreens.CreateChore, parent, route('/parent/chores/new')],
  [
    'CreateChore (édition)',
    parentScreens.CreateChore,
    parent,
    route('/parent/chores/:choreId/edit', '/parent/chores/ch1/edit'),
  ],
  ['ChildrenView', parentScreens.ChildrenView, parent, route('/parent/children')],
  [
    'ChildSettingsScreen',
    parentScreens.ChildSettingsScreen,
    parent,
    route('/parent/children/:childId/settings', '/parent/children/c1/settings'),
  ],
  ['RulesScreen', parentScreens.RulesScreen, parent, route('/parent/rules')],
  ['PenaltyHistoryScreen', parentScreens.PenaltyHistoryScreen, parent, route('/parent/rules/history')],
  ['AnalyticsScreen', parentScreens.AnalyticsScreen, parent, route('/parent/analytics')],
  ['SettingsScreen', parentScreens.SettingsScreen, parent, route('/parent/settings')],
  ['ExpensesReview', parentScreens.ExpensesReview, parent, route('/parent/expenses')],
  ['ChildDashboard', childScreens.ChildDashboard, alice, route('/child')],
  ['AvailableChores', childScreens.AvailableChores, alice, route('/child/available-chores')],
  ['SubmitChore', childScreens.SubmitChore, alice, route('/child/submit-chore/:choreId', '/child/submit-chore/ch1')],
  ['MyChores', childScreens.MyChores, alice, route('/child/my-chores')],
  ['BalanceScreen', childScreens.BalanceScreen, alice, route('/child/balance')],
  ['GoalsScreen', childScreens.GoalsScreen, alice, route('/child/goals')],
  ['ProfileScreen', childScreens.ProfileScreen, alice, route('/child/profile')],
  ['ExpensesScreen', childScreens.ExpensesScreen, alice, route('/child/expenses')],
];

let errors;

beforeEach(() => {
  errors = vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  errors.mockRestore();
});

// Les avertissements React (DOM invalide, clés manquantes…) passent par console.error.
const reactWarnings = () => errors.mock.calls.map(call => String(call[0])).filter(message => !message.includes('act('));

const renderAndSettle = async (Screen, options) => {
  const result = renderScreen(Screen, options);
  await act(async () => {
    await Promise.resolve();
  });
  return result;
};

describe.each([
  ['données complètes', fullData],
  ['famille sans données', { family: { ...fullData.family, users: [parent], rules: [] } }],
  ['données non chargées', {}],
])('rendu des écrans — %s', (_label, data) => {
  it.each(SCREENS)('%s', async (_name, Screen, user, options) => {
    useApp.mockReturnValue(appContext({ user, ...data }));

    const { container } = await renderAndSettle(Screen, options);

    expect(container.textContent.length).toBeGreaterThan(0);
    expect(reactWarnings()).toEqual([]);
  });
});

it.each(SCREENS)("%s s'affiche en mode sombre", async (_name, Screen, user, options) => {
  useApp.mockReturnValue(appContext({ user, theme: 'dark', ...fullData }));
  await renderAndSettle(Screen, options);
  expect(reactWarnings()).toEqual([]);
});
