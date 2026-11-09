import React from 'react';
import { act, render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppProvider, useApp } from '../src/context';
import * as api from '../src/api';
import { io } from 'socket.io-client';
import { alice, chores, family, goals, parent } from './support';

vi.mock('socket.io-client', () => ({ io: vi.fn() }));
vi.mock('../src/api', () => {
  const group = (...names) => Object.fromEntries(names.map(name => [name, vi.fn()]));
  return {
    SOCKET_URL: 'http://socket.test',
    authAPI: group('getMe', 'login', 'logout', 'registerParentCreate', 'registerParentJoin', 'registerChild'),
    familyAPI: group('getFamily', 'removeChild', 'deleteFamily'),
    choresAPI: group(
      'getChores',
      'createChore',
      'submitChore',
      'approveChore',
      'rejectChore',
      'updateChore',
      'deleteChore',
    ),
    goalsAPI: group('getGoals', 'fundGoal', 'withdrawGoal'),
    expensesAPI: group('getExpenses', 'request', 'approve', 'reject'),
    transactionsAPI: group('getTransactions'),
    rulesAPI: group('applyPenalty', 'createRule', 'updateRule', 'deleteRule'),
    childSettingsAPI: group('update', 'updateSplit'),
    allowanceAPI: group('update'),
    choreTemplatesAPI: group('getTemplates', 'create', 'update', 'delete'),
  };
});

let app;
let socketHandlers;
let socket;

const Probe = () => {
  app = useApp();
  return null;
};

const mount = async (user = parent) => {
  if (user) api.authAPI.getMe.mockResolvedValue({ user });
  else api.authAPI.getMe.mockRejectedValue(new Error('Access denied'));
  render(
    <AppProvider>
      <Probe />
    </AppProvider>,
  );
  await waitFor(() => expect(app.loading).toBe(false));
  if (user) await waitFor(() => expect(app.family).not.toBeNull());
};

const run = action =>
  act(async () => {
    await action();
  });

beforeEach(() => {
  vi.clearAllMocks();
  socketHandlers = {};
  socket = {
    on: vi.fn((event, handler) => {
      socketHandlers[event] = handler;
    }),
    disconnect: vi.fn(),
  };
  io.mockReturnValue(socket);
  api.familyAPI.getFamily.mockResolvedValue({ family });
  api.choresAPI.getChores.mockResolvedValue({ chores });
  api.goalsAPI.getGoals.mockResolvedValue({ goals });
  api.expensesAPI.getExpenses.mockResolvedValue({ expenses: [] });
  api.transactionsAPI.getTransactions.mockResolvedValue({ transactions: [{ id: 't1' }] });
  api.choreTemplatesAPI.getTemplates.mockResolvedValue({ templates: [] });
  api.authAPI.logout.mockResolvedValue({});
});

describe('session', () => {
  it("charge l'utilisateur et ses données au démarrage", async () => {
    await mount();
    expect(app.user).toEqual(parent);
    expect(app.chores).toEqual(chores);
    expect(app.goals).toEqual(goals);
  });

  it('reste déconnecté si la session est invalide', async () => {
    await mount(null);
    expect(app.user).toBeNull();
    expect(api.familyAPI.getFamily).not.toHaveBeenCalled();
  });

  it("purge l'ancien JWT de localStorage", async () => {
    localStorage.setItem('token', 'ancien');
    await mount(null);
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('ne charge les transactions que pour un enfant', async () => {
    await mount(alice);
    await waitFor(() => expect(app.transactions).toEqual([{ id: 't1' }]));
    expect(api.choreTemplatesAPI.getTemplates).not.toHaveBeenCalled();
  });

  it('ne charge les modèles de corvée que pour un parent', async () => {
    await mount(parent);
    await waitFor(() => expect(api.choreTemplatesAPI.getTemplates).toHaveBeenCalled());
    expect(api.transactionsAPI.getTransactions).not.toHaveBeenCalled();
  });

  it("une connexion refusée affiche l'erreur et la propage", async () => {
    await mount(null);
    api.authAPI.login.mockRejectedValue(new Error('Identifiants invalides'));
    let caught;
    await run(() =>
      app.login({}).catch(e => {
        caught = e;
      }),
    );
    expect(caught.message).toBe('Identifiants invalides');
    expect(app.toast).toEqual({ message: 'Identifiants invalides', type: 'error' });
    expect(app.user).toBeNull();
  });

  it("la déconnexion vide l'état local et appelle le serveur", async () => {
    await mount();
    await run(() => app.logout());
    expect(api.authAPI.logout).toHaveBeenCalled();
    expect(app.user).toBeNull();
    expect(app.family).toBeNull();
    expect(app.chores).toEqual([]);
  });

  it("garde les enfants en cache pour l'accès rapide", async () => {
    await mount();
    await waitFor(() => expect(app.cachedFamilyMembers).toHaveLength(2));
    expect(app.cachedFamilyMembers[0]).toEqual({
      id: alice.id,
      name: 'Alice',
      avatar: 'A',
      color: alice.color,
      inviteCode: 'DUPONT',
    });
    expect(JSON.parse(localStorage.getItem('pocketmoney_cached_family_members'))).toHaveLength(2);
  });
});

describe('fraîcheur du solde affiché', () => {
  it('reprend le solde du serveur après un mouvement', async () => {
    await mount(alice);
    api.goalsAPI.fundGoal.mockResolvedValue({});
    api.authAPI.getMe.mockResolvedValue({ user: { ...alice, balance: alice.balance - 5, monthDelta: -5 } });
    await run(() => app.fundGoal('g1', 5));
    await waitFor(() => expect(app.user.balance).toBe(alice.balance - 5));
    expect(app.user.monthDelta).toBe(-5);
  });

  it('reprend le solde du serveur sur un événement temps réel', async () => {
    await mount(alice);
    api.authAPI.getMe.mockResolvedValue({ user: { ...alice, balance: alice.balance + 3 } });
    await run(() => socketHandlers['chore:approved']());
    await waitFor(() => expect(app.user.balance).toBe(alice.balance + 3));
  });

  it('ne recharge pas les données en boucle', async () => {
    await mount(alice);
    await waitFor(() => expect(app.transactions).toEqual([{ id: 't1' }]));
    expect(api.familyAPI.getFamily).toHaveBeenCalledTimes(1);
  });

  it('une réponse tardive ne reconnecte pas après une déconnexion', async () => {
    await mount(alice);
    let answer;
    api.authAPI.getMe.mockReturnValue(
      new Promise(resolve => {
        answer = resolve;
      }),
    );
    api.goalsAPI.fundGoal.mockResolvedValue({});
    await run(() => app.fundGoal('g1', 5));
    await run(() => app.logout());
    await run(async () => answer({ user: alice }));
    expect(app.user).toBeNull();
  });
});

describe('garde-fous sur les montants (MONEY-3)', () => {
  it.each([[0], [-5], ['-5'], ['abc'], [''], [null], [NaN]])("fundGoal refuse %j sans appeler l'API", async amount => {
    await mount(alice);
    await run(() => app.fundGoal('g1', amount));
    expect(api.goalsAPI.fundGoal).not.toHaveBeenCalled();
    expect(app.toast).toEqual({ message: 'Entre un montant positif.', type: 'error' });
  });

  it.each([[0], [-5], ['abc']])("withdrawFromGoal refuse %j sans appeler l'API", async amount => {
    await mount(alice);
    await run(() => app.withdrawFromGoal('g1', amount));
    expect(api.goalsAPI.withdrawGoal).not.toHaveBeenCalled();
  });

  it('fundGoal convertit la saisie en nombre', async () => {
    await mount(alice);
    api.goalsAPI.fundGoal.mockResolvedValue({});
    await run(() => app.fundGoal('g1', '7.50'));
    expect(api.goalsAPI.fundGoal).toHaveBeenCalledWith('g1', { amount: 7.5 });
  });

  it('withdrawFromGoal convertit la saisie en nombre', async () => {
    await mount(alice);
    api.goalsAPI.withdrawGoal.mockResolvedValue({});
    await run(() => app.withdrawFromGoal('g1', '3'));
    expect(api.goalsAPI.withdrawGoal).toHaveBeenCalledWith('g1', { amount: 3 });
  });

  it('affiche le refus du serveur', async () => {
    await mount(alice);
    api.goalsAPI.fundGoal.mockRejectedValue(new Error('Solde insuffisant'));
    await run(() => app.fundGoal('g1', 5));
    expect(app.toast).toEqual({ message: 'Solde insuffisant', type: 'error' });
  });
});

describe('actions', () => {
  it('approuver lance les confettis et recharge les données', async () => {
    await mount();
    api.choresAPI.approveChore.mockResolvedValue({});
    const before = api.choresAPI.getChores.mock.calls.length;
    await run(() => app.approveChore('ch2'));
    expect(app.showConfetti).toBe(true);
    expect(app.toast).toEqual({ message: 'Corvée validée !', type: 'success' });
    await waitFor(() => expect(api.choresAPI.getChores.mock.calls.length).toBeGreaterThan(before));
  });

  it('une approbation refusée ne lance pas les confettis', async () => {
    await mount();
    api.choresAPI.approveChore.mockRejectedValue(new Error('Déjà traitée'));
    await run(() => app.approveChore('ch2'));
    expect(app.showConfetti).toBe(false);
    expect(app.toast).toEqual({ message: 'Déjà traitée', type: 'error' });
  });

  it.each([
    [false, 'Sanction appliquée.'],
    [true, 'Sanction appliquée (plafonnée à 0€, solde insuffisant).'],
  ])('sanction capped=%s : message adapté', async (capped, message) => {
    await mount();
    api.rulesAPI.applyPenalty.mockResolvedValue({ capped });
    await run(() => app.applyPenalty('c1', 'r1'));
    expect(api.rulesAPI.applyPenalty).toHaveBeenCalledWith('r1', { childId: 'c1' });
    expect(app.toast.message).toBe(message);
  });

  it('approuver une dépense transmet le montant ajusté', async () => {
    await mount();
    api.expensesAPI.approve.mockResolvedValue({});
    await run(() => app.approveExpense('e1', { approvedAmount: '4' }));
    expect(api.expensesAPI.approve).toHaveBeenCalledWith('e1', { approvedAmount: '4' });
  });

  it.each([
    ['requestExpense', 'expensesAPI', 'request', [{}]],
    ['updateSplitSettings', 'childSettingsAPI', 'updateSplit', ['c1', {}]],
    ['updateChildSettings', 'childSettingsAPI', 'update', ['c1', {}]],
    ['updateAllowance', 'allowanceAPI', 'update', ['c1', {}]],
    ['removeChild', 'familyAPI', 'removeChild', ['c1']],
    ['deleteFamily', 'familyAPI', 'deleteFamily', ['pw']],
  ])("%s propage l'erreur aux formulaires", async (action, group, method, args) => {
    await mount();
    api[group][method].mockRejectedValue(new Error('Refusé'));
    let caught;
    await run(() =>
      app[action](...args).catch(e => {
        caught = e;
      }),
    );
    expect(caught.message).toBe('Refusé');
    expect(app.toast).toEqual({ message: 'Refusé', type: 'error' });
  });

  it('supprimer la famille efface la session et le cache', async () => {
    await mount();
    await waitFor(() => expect(app.cachedFamilyMembers).toHaveLength(2));
    api.familyAPI.deleteFamily.mockResolvedValue({});
    await run(() => app.deleteFamily('pw'));
    expect(app.user).toBeNull();
    expect(app.cachedFamilyMembers).toEqual([]);
    expect(localStorage.getItem('pocketmoney_cached_family_members')).toBeNull();
  });

  it("bascule le thème et l'applique au document", async () => {
    await mount(null);
    expect(app.theme).toBe('light');
    await run(() => app.toggleTheme());
    expect(app.theme).toBe('dark');
    expect(document.documentElement).toHaveClass('dark');
    expect(localStorage.getItem('theme')).toBe('dark');
    await run(() => app.toggleTheme());
    expect(document.documentElement).not.toHaveClass('dark');
  });
});

describe('temps réel', () => {
  it('se connecte avec le cookie une fois connecté', async () => {
    await mount();
    expect(io).toHaveBeenCalledWith('http://socket.test', expect.objectContaining({ withCredentials: true }));
  });

  it('ne se connecte pas sans utilisateur', async () => {
    await mount(null);
    expect(io).not.toHaveBeenCalled();
  });

  it("affiche un message et recharge les données à la réception d'un événement", async () => {
    await mount(alice);
    const before = api.choresAPI.getChores.mock.calls.length;
    await run(() => socketHandlers['chore:approved']());
    expect(app.toast).toEqual({ message: 'Une de tes corvées a été validée !', type: 'success' });
    await waitFor(() => expect(api.choresAPI.getChores.mock.calls.length).toBeGreaterThan(before));
  });

  it("déconnecte l'utilisateur quand son compte est supprimé", async () => {
    await mount(alice);
    await run(() => socketHandlers['account:deleted']());
    expect(app.user).toBeNull();
    expect(app.cachedFamilyMembers).toEqual([]);
  });

  it('ferme la connexion à la déconnexion', async () => {
    await mount();
    await run(() => app.logout());
    expect(socket.disconnect).toHaveBeenCalled();
  });
});
