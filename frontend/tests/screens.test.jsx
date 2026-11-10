import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useApp } from '../src/context';
import { SignIn, Welcome } from '../src/screens/auth.jsx';
import {
  AvailableChores,
  BalanceScreen,
  ChildDashboard,
  ExpensesScreen,
  GoalsScreen,
  SubmitChore,
} from '../src/screens/child.jsx';
import { ChildrenView, ChoreDetail, CreateChore, ExpensesReview, InboxScreen } from '../src/screens/parent.jsx';
import { compressProofImage } from '../src/proofImage';
import { alice, appContext, chores, expenses, family, goals, parent, renderScreen, transactions } from './support';

vi.mock('../src/context', () => ({ useApp: vi.fn(), AppProvider: ({ children }) => children }));
vi.mock('../src/proofImage', () => ({ compressProofImage: vi.fn() }));
vi.mock('react-confetti', () => ({ default: () => null }));

const provide = overrides => {
  const context = appContext(overrides);
  useApp.mockReturnValue(context);
  return context;
};

const location = () => screen.getByTestId('location').textContent;
const button = name => screen.getByRole('button', { name });

afterEach(() => {
  vi.restoreAllMocks();
});

describe('connexion', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/');
  });

  it('un parent se connecte sans code famille', async () => {
    const context = provide({ login: vi.fn().mockResolvedValue({ user: parent }) });
    renderScreen(SignIn, { path: '/login' });

    await userEvent.click(button('Parent'));
    await userEvent.type(screen.getByPlaceholderText('ex: sarah@gmail.com'), 'sarah@dupont.fr');
    expect(screen.queryByPlaceholderText('ABCD12')).not.toBeInTheDocument();
    await userEvent.type(screen.getByPlaceholderText('••••••••'), 'password123');
    await userEvent.click(button('Me connecter'));

    expect(context.login).toHaveBeenCalledWith({ email: 'sarah@dupont.fr', password: 'password123' });
    await waitFor(() => expect(location()).toBe('/parent'));
  });

  it('un enfant saisit son prénom et le code famille, mis en majuscules', async () => {
    const context = provide({ login: vi.fn().mockResolvedValue({ user: alice }) });
    renderScreen(SignIn, { path: '/login' });

    await userEvent.type(screen.getByPlaceholderText('Alice'), 'Alice');
    await userEvent.type(screen.getByPlaceholderText('ABCD12'), 'dupont');
    await userEvent.type(screen.getByPlaceholderText('••••••••'), 'password123');
    await userEvent.click(button('Me connecter'));

    expect(context.login).toHaveBeenCalledWith({ email: 'Alice', inviteCode: 'DUPONT', password: 'password123' });
    await waitFor(() => expect(location()).toBe('/child'));
  });

  it('reste sur la page si la connexion échoue', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    provide({ login: vi.fn().mockRejectedValue(new Error('Identifiants invalides')) });
    renderScreen(SignIn, { path: '/login' });

    await userEvent.click(button('Parent'));
    await userEvent.type(screen.getByPlaceholderText('ex: sarah@gmail.com'), 'sarah@dupont.fr');
    await userEvent.type(screen.getByPlaceholderText('••••••••'), 'mauvais');
    await userEvent.click(button('Me connecter'));

    await waitFor(() => expect(button('Me connecter')).toBeEnabled());
    expect(location()).toBe('/login');
  });

  it("l'accès rapide pré-remplit le formulaire sans connecter (UI-3)", async () => {
    const context = provide({
      cachedFamilyMembers: [{ id: 'c1', name: 'Alice', avatar: 'A', color: '#000', inviteCode: 'DUPONT' }],
    });
    renderScreen(Welcome, { path: '/welcome' });

    await userEvent.click(screen.getByText('Alice'));

    expect(location()).toBe('/login');
    expect(context.login).not.toHaveBeenCalled();
  });
});

describe('objectifs (enfant)', () => {
  const typeAmount = amount => userEvent.type(screen.getByLabelText('Autre montant (€)'), amount);

  it('affiche la progression', () => {
    provide({ user: alice, goals });
    renderScreen(GoalsScreen);
    expect(screen.getByText('Vacances')).toBeInTheDocument();
    expect(screen.getByText('Rêve partagé')).toBeInTheDocument();
    expect(screen.getByText('Rêve perso')).toBeInTheDocument();
  });

  it('transmet le montant saisi', async () => {
    const context = provide({ user: alice, goals: [goals[0]] });
    renderScreen(GoalsScreen);
    await userEvent.click(button('Ajouter des pièces'));
    await typeAmount('5');
    await userEvent.click(button(/^Mettre de côté/));
    expect(context.fundGoal).toHaveBeenCalledWith('g1', '5');
  });

  it('ne fait rien si la saisie est annulée', async () => {
    const context = provide({ user: alice, goals: [goals[0]] });
    renderScreen(GoalsScreen);
    await userEvent.click(button('Ajouter des pièces'));
    await userEvent.click(button('Fermer'));
    expect(context.fundGoal).not.toHaveBeenCalled();
  });

  it('retire le montant saisi', async () => {
    const context = provide({ user: alice, goals: [goals[0]] });
    renderScreen(GoalsScreen);
    await userEvent.click(button('Retirer'));
    await typeAmount('3');
    await userEvent.click(button(/^Reprendre/));
    expect(context.withdrawFromGoal).toHaveBeenCalledWith('g1', '3');
  });

  it('bloque le retrait sur un objectif vide', () => {
    provide({ user: alice, goals: [goals[1]] });
    renderScreen(GoalsScreen);
    expect(button('Retirer')).toBeDisabled();
  });

  it('bloque les mouvements sur un objectif déjà acheté (MONEY-7)', () => {
    provide({ user: alice, goals: [{ ...goals[0], status: 'COMPLETED' }] });
    renderScreen(GoalsScreen);
    expect(button('Ajouter des pièces')).toBeDisabled();
    expect(button('Retirer')).toBeDisabled();
  });

  it('a un état vide', () => {
    provide({ user: alice, goals: [] });
    renderScreen(GoalsScreen);
    expect(screen.getByText("C'est le moment de rêver")).toBeInTheDocument();
  });
});

describe('solde (enfant)', () => {
  it("affiche le total et l'historique", () => {
    provide({ user: alice, transactions });
    renderScreen(BalanceScreen);
    expect(screen.getByText('45,50 €')).toBeInTheDocument();
    expect(screen.getByText('+5,00 €')).toBeInTheDocument();
    expect(screen.getByText('−2,00 €')).toBeInTheDocument();
  });

  it('affiche les compartiments si la répartition est active', () => {
    provide({ user: alice });
    renderScreen(BalanceScreen);
    expect(screen.getByText('Épargne')).toBeInTheDocument();
    expect(screen.getByText('10,00 €')).toBeInTheDocument();
  });

  it('cache les compartiments sinon', () => {
    provide({ user: { ...alice, settings: { splitEnabled: false } } });
    renderScreen(BalanceScreen);
    expect(screen.queryByText('Épargne')).not.toBeInTheDocument();
  });
});

describe('soumission de corvée (enfant)', () => {
  const route = { path: '/child/submit-chore/:choreId', route: '/child/submit-chore/ch1' };
  const pickPhoto = () =>
    fireEvent.change(document.querySelector('input[type="file"]'), {
      target: { files: [new File(['x'], 'photo.jpg', { type: 'image/jpeg' })] },
    });

  it('exige une photo', () => {
    provide({ user: alice, chores });
    renderScreen(SubmitChore, route);
    expect(button('Envoyer à mes parents')).toBeDisabled();
  });

  it('envoie la photo compressée et la note', async () => {
    compressProofImage.mockResolvedValue('data:image/jpeg;base64,QUJD');
    const context = provide({ user: alice, chores });
    renderScreen(SubmitChore, route);

    pickPhoto();
    await screen.findByAltText('Ma réussite');
    await userEvent.type(screen.getByPlaceholderText(/J'ai tout rangé/), 'Fait');
    await userEvent.click(button('Envoyer à mes parents'));

    expect(context.submitChore).toHaveBeenCalledWith('ch1', {
      note: 'Fait',
      proofImageUrl: 'data:image/jpeg;base64,QUJD',
    });
    await waitFor(() => expect(location()).toBe('/child'));
  });

  it('signale une photo inutilisable', async () => {
    compressProofImage.mockRejectedValue(new Error('Image illisible'));
    const context = provide({ user: alice, chores });
    renderScreen(SubmitChore, route);

    pickPhoto();

    await waitFor(() => expect(context.showToast).toHaveBeenCalledWith(expect.stringContaining('photo'), 'error'));
    expect(button('Envoyer à mes parents')).toBeDisabled();
  });

  it('indique une corvée introuvable', () => {
    provide({ user: alice, chores: [] });
    renderScreen(SubmitChore, route);
    expect(screen.getByText('Corvée non trouvée')).toBeInTheDocument();
  });
});

describe('tableau de bord (enfant)', () => {
  it("survit au passage du chargement à l'affichage", () => {
    provide({ user: null, loading: true });
    const tree = () => (
      <MemoryRouter>
        <ChildDashboard />
      </MemoryRouter>
    );
    const { rerender } = render(tree());
    provide({ user: alice, loading: false });
    expect(() => rerender(tree())).not.toThrow();
    expect(screen.getAllByText('Salut Alice !').length).toBeGreaterThan(0);
  });
});

describe('quêtes (enfant)', () => {
  it('montre une quête refusée, avec le motif et un bouton pour réessayer', () => {
    provide({ user: alice, chores: [{ ...chores[3], assigneeId: 'c1' }] });
    renderScreen(AvailableChores);
    expect(screen.getByText(/Couverts/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Réessayer' })).toHaveAttribute('href', '/child/submit-chore/ch4');
  });
});

describe('demande de dépense (enfant)', () => {
  it('garde le formulaire ouvert quand la demande est refusée', async () => {
    provide({ user: alice, expenses: [], requestExpense: vi.fn().mockRejectedValue(new Error('Plafond')) });
    renderScreen(ExpensesScreen);

    await userEvent.click(screen.getAllByRole('button', { name: 'Demander' })[0]);
    await userEvent.type(screen.getByPlaceholderText('ex: Livre Harry Potter'), 'BD');
    await userEvent.type(document.querySelector('input[type="number"]'), '8');
    await userEvent.click(button('Envoyer la demande'));

    await waitFor(() => expect(button('Envoyer la demande')).toBeEnabled());
  });

  it('bloque la demande sur un compte gelé', () => {
    provide({ user: { ...alice, settings: { frozen: true } }, expenses: [] });
    renderScreen(ExpensesScreen);
    screen.getAllByRole('button', { name: 'Demander' }).forEach(item => expect(item).toBeDisabled());
  });

  it('envoie le formulaire', async () => {
    const context = provide({ user: alice, expenses: [] });
    renderScreen(ExpensesScreen);

    await userEvent.click(screen.getAllByRole('button', { name: 'Demander' })[0]);
    await userEvent.type(screen.getByPlaceholderText('ex: Livre Harry Potter'), 'BD');
    await userEvent.type(document.querySelector('input[type="number"]'), '8');
    await userEvent.click(button('Envoyer la demande'));

    await waitFor(() => expect(context.requestExpense).toHaveBeenCalled());
    expect(context.requestExpense.mock.calls[0][0]).toMatchObject({ title: 'BD' });
  });
});

describe("détail d'une corvée (parent)", () => {
  const route = id => ({ path: '/parent/chores/:choreId', route: `/parent/chores/${id}` });

  it('approuve une corvée soumise', async () => {
    const context = provide({ user: parent, family, chores });
    renderScreen(ChoreDetail, route('ch2'));

    expect(screen.getByAltText('Preuve')).toBeInTheDocument();
    await userEvent.click(button('Approuver'));

    expect(context.approveChore).toHaveBeenCalledWith('ch2');
    await waitFor(() => expect(location()).toBe('/parent/chores'));
  });

  it('refuse avec le motif saisi', async () => {
    const context = provide({ user: parent, family, chores });
    renderScreen(ChoreDetail, route('ch2'));
    await userEvent.click(button('Refuser'));
    await userEvent.type(screen.getByRole('textbox'), 'Pas fini');
    await userEvent.click(button('Confirmer le refus'));
    expect(context.rejectChore).toHaveBeenCalledWith('ch2', 'Pas fini');
  });

  it.each(['ch1', 'ch3', 'ch4'])('ne propose pas la décision sur %s, non soumise', id => {
    provide({ user: parent, family, chores });
    renderScreen(ChoreDetail, route(id));
    expect(screen.queryByRole('button', { name: 'Approuver' })).not.toBeInTheDocument();
  });

  it('demande confirmation avant de supprimer (UI-2)', async () => {
    const context = provide({ user: parent, family, chores });
    renderScreen(ChoreDetail, route('ch1'));

    await userEvent.click(button('Supprimer la corvée'));
    await userEvent.click(button('Annuler'));
    expect(context.deleteChore).not.toHaveBeenCalled();

    await userEvent.click(button('Supprimer la corvée'));
    await userEvent.click(button('Supprimer'));
    expect(context.deleteChore).toHaveBeenCalledWith('ch1');
  });

  it("ouvre l'édition (UI-2)", async () => {
    provide({ user: parent, family, chores });
    renderScreen(ChoreDetail, route('ch1'));
    await userEvent.click(button('Modifier la tâche'));
    expect(location()).toBe('/parent/chores/ch1/edit');
  });
});

describe('création de corvée (parent)', () => {
  it('explique quoi faire sans enfant dans la famille (CHORE-1)', () => {
    provide({ user: parent, family: { ...family, users: [parent] } });
    renderScreen(CreateChore, { path: '/parent/chores/new' });
    expect(screen.getByText("Ajoutez d'abord un enfant")).toBeInTheDocument();
  });
});

describe('sanctions (parent)', () => {
  it('applique la règle choisie, sans proposer les règles inactives', async () => {
    const context = provide({ user: parent, family });
    renderScreen(ChildrenView);

    await userEvent.click(screen.getAllByRole('button', { name: 'Sanction' })[0]);
    expect(screen.queryByText('Règle inactive')).not.toBeInTheDocument();
    expect(button('Appliquer')).toBeDisabled();

    await userEvent.click(screen.getByText('Téléphone à table'));
    await userEvent.click(button(/^Appliquer/));

    expect(context.applyPenalty).toHaveBeenCalledWith('c1', 'r1');
  });

  it("« Ajouter un enfant » montre le code d'invitation à copier (UI-1)", async () => {
    const context = provide({ user: parent, family });
    renderScreen(ChildrenView);
    expect(screen.getByRole('heading', { name: 'Ajouter un enfant' })).toBeInTheDocument();
    expect(screen.getByText('DUPONT')).toBeInTheDocument();
    await userEvent.click(button('Copier le code'));
    expect(context.showToast).toHaveBeenCalled();
  });
});

describe('file « À valider » (parent)', () => {
  it('réunit corvées soumises et dépenses en attente, et annonce la position', () => {
    provide({ user: parent, family, chores, expenses });
    renderScreen(InboxScreen, { path: '/parent/inbox' });
    expect(screen.getAllByText('Aspirateur').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Livre').length).toBeGreaterThan(0);
    expect(screen.getByText('1 sur 2')).toBeInTheDocument();
    expect(screen.getByAltText('Preuve')).toBeInTheDocument();
  });

  it('approuve la corvée affichée', async () => {
    const context = provide({ user: parent, family, chores, expenses: [] });
    renderScreen(InboxScreen, { path: '/parent/inbox' });
    await userEvent.click(button('Approuver et payer'));
    expect(context.approveChore).toHaveBeenCalledWith('ch2');
  });

  it('refuse avec un motif, sans fenêtre du navigateur', async () => {
    const context = provide({ user: parent, family, chores, expenses: [] });
    renderScreen(InboxScreen, { path: '/parent/inbox' });
    await userEvent.click(button('Refuser'));
    await userEvent.type(screen.getByRole('textbox'), 'Pas fini');
    await userEvent.click(button('Confirmer le refus'));
    expect(context.rejectChore).toHaveBeenCalledWith('ch2', 'Pas fini');
  });

  it('approuve une dépense avec le montant ajusté', async () => {
    const context = provide({ user: parent, family, chores: [], expenses });
    renderScreen(InboxScreen, { path: '/parent/inbox' });
    const amount = document.querySelector('input[type="number"]');
    await userEvent.clear(amount);
    await userEvent.type(amount, '10');
    await userEvent.click(button('Approuver'));
    expect(context.approveExpense).toHaveBeenCalledWith('e1', { approvedAmount: '10' });
  });

  it('indique quand tout est traité', () => {
    provide({ user: parent, family, chores: [], expenses: [] });
    renderScreen(InboxScreen, { path: '/parent/inbox' });
    expect(screen.getByText('Tout est validé')).toBeInTheDocument();
  });
});

describe('revue des dépenses (parent)', () => {
  it('approuve avec le montant ajusté', async () => {
    const context = provide({ user: parent, family, expenses });
    renderScreen(ExpensesReview);

    await userEvent.click(button('Approuver'));
    const amount = document.querySelector('input[type="number"]');
    expect(amount).toHaveValue(12.5);
    await userEvent.clear(amount);
    await userEvent.type(amount, '10');
    await userEvent.click(button(/^Approuver\s10/));

    expect(context.approveExpense).toHaveBeenCalledWith('e1', { approvedAmount: '10' });
  });

  it('refuse avec le motif saisi', async () => {
    const context = provide({ user: parent, family, expenses });
    renderScreen(ExpensesReview);
    await userEvent.click(button('Refuser'));
    await userEvent.type(screen.getByRole('textbox'), 'Trop cher');
    await userEvent.click(button('Confirmer le refus'));
    expect(context.rejectExpense).toHaveBeenCalledWith('e1', { parentNote: 'Trop cher' });
  });

  it('ne présente que les demandes en attente dans la file', () => {
    provide({ user: parent, family, expenses });
    renderScreen(ExpensesReview);
    expect(screen.getByText('À traiter (1)')).toBeInTheDocument();
  });
});
