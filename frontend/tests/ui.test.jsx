import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import {
  Amount,
  Avatar,
  Badge,
  Btn,
  Checkbox,
  EmptyState,
  Input,
  Modal,
  ProgressBar,
  Radio,
  Select,
  StatCard,
  StatusBadge,
  ThemeToggle,
  Toast,
} from '../src/components/ui';

describe('Btn', () => {
  it('déclenche onClick', async () => {
    const onClick = vi.fn();
    render(<Btn onClick={onClick}>OK</Btn>);
    await userEvent.click(screen.getByRole('button', { name: 'OK' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it.each([[{ disabled: true }], [{ loading: true }]])('est bloqué avec %j', async props => {
    const onClick = vi.fn();
    render(
      <Btn onClick={onClick} {...props}>
        OK
      </Btn>,
    );
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("n'envoie pas un formulaire par défaut", () => {
    render(<Btn>OK</Btn>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
  });
});

describe('Amount', () => {
  it.each([
    [5, '+5.00€'],
    [0, '+0.00€'],
    [-2.5, '-2.50€'],
    [1234.5, '+1234.50€'],
  ])("%f s'affiche %s", (value, expected) => {
    render(<Amount value={value} />);
    expect(screen.getByText(expected)).toBeInTheDocument();
  });

  it('colore les montants négatifs en erreur', () => {
    render(<Amount value={-1} />);
    expect(screen.getByText('-1.00€').className).toContain('error');
  });
});

describe('ProgressBar', () => {
  const widthOf = container => container.querySelector('[style]').style.width;

  it.each([
    [50, 200, '25%'],
    [0, 100, '0%'],
    [100, 100, '100%'],
    [150, 100, '100%'],
  ])('%i / %i donne %s', (value, max, expected) => {
    const { container } = render(<ProgressBar value={value} max={max} />);
    expect(widthOf(container)).toBe(expected);
  });
});

describe('StatusBadge', () => {
  it.each([
    ['PENDING', 'En attente'],
    ['SUBMITTED', 'À valider'],
    ['COMPLETED', 'Terminé'],
    ['APPROVED', 'Approuvée'],
    ['REJECTED', 'Refusé'],
    ['AUTRE', 'AUTRE'],
  ])("%s s'affiche %s", (status, label) => {
    render(<StatusBadge status={status} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });
});

describe('Modal', () => {
  it("n'affiche rien fermée", () => {
    render(
      <Modal open={false} title="Titre">
        Contenu
      </Modal>,
    );
    expect(screen.queryByText('Contenu')).not.toBeInTheDocument();
  });

  it("s'affiche sur body, avec son pied", () => {
    const { container } = render(
      <Modal open title="Titre" footer={<span>Pied</span>}>
        Contenu
      </Modal>,
    );
    expect(screen.getByText('Titre')).toBeInTheDocument();
    expect(screen.getByText('Pied')).toBeInTheDocument();
    expect(container).toBeEmptyDOMElement();
  });

  it('a une hauteur maximale, pour garder le bouton atteignable sur mobile (MODAL-1)', () => {
    render(
      <Modal open title="Titre">
        Contenu
      </Modal>,
    );
    expect(screen.getByText('Titre').closest('.relative').className).toContain('max-h-[85vh]');
  });

  it('se ferme par la croix et par le fond', async () => {
    const onClose = vi.fn();
    render(
      <Modal open title="Titre" onClose={onClose}>
        Contenu
      </Modal>,
    );
    await userEvent.click(screen.getByRole('button'));
    fireEvent.click(document.querySelector('.backdrop-blur-xl'));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});

describe('Toast', () => {
  it("n'affiche rien sans message", () => {
    const { container } = render(<Toast toast={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it.each([
    ['success', 'bg-primary'],
    ['error', 'bg-error'],
    ['info', 'bg-secondary'],
    ['inconnu', 'bg-secondary'],
  ])('type %s', (type, expectedClass) => {
    render(<Toast toast={{ message: 'Salut', type }} />);
    expect(screen.getByText('Salut').parentElement.className).toContain(expectedClass);
  });
});

describe('champs', () => {
  it("Input affiche le libellé, l'erreur et transmet la saisie", async () => {
    const onChange = vi.fn();
    render(<Input label="Nom" error="Requis" placeholder="ici" onChange={onChange} />);
    expect(screen.getByText('Nom')).toBeInTheDocument();
    expect(screen.getByText('Requis')).toBeInTheDocument();
    await userEvent.type(screen.getByPlaceholderText('ici'), 'a');
    expect(onChange).toHaveBeenCalled();
  });

  it('Select liste ses options', () => {
    render(
      <Select
        label="Type"
        options={[
          { value: 'a', label: 'A' },
          { value: 'b', label: 'B' },
        ]}
      />,
    );
    expect(screen.getAllByRole('option')).toHaveLength(2);
  });

  it('Checkbox renvoie le nouvel état', async () => {
    const onChange = vi.fn();
    render(<Checkbox label="Actif" checked={false} onChange={onChange} />);
    await userEvent.click(screen.getByText('Actif'));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('Radio renvoie sa valeur', async () => {
    const onChange = vi.fn();
    render(<Radio label="Choix" name="n" value="v" checked={false} onChange={onChange} />);
    await userEvent.click(screen.getByText('Choix'));
    expect(onChange).toHaveBeenCalledWith('v');
  });
});

describe('divers', () => {
  it('Avatar affiche la lettre', () => {
    render(<Avatar letter="A" />);
    expect(screen.getByText('A')).toBeInTheDocument();
  });

  it('Badge affiche son contenu', () => {
    render(<Badge>Nouveau</Badge>);
    expect(screen.getByText('Nouveau')).toBeInTheDocument();
  });

  it('StatCard est cliquable quand onClick est fourni', async () => {
    const onClick = vi.fn();
    render(<StatCard title="Total" value="5" sub="détail" onClick={onClick} />);
    await userEvent.click(screen.getByText('Total'));
    expect(onClick).toHaveBeenCalled();
    expect(screen.getByText('détail')).toBeInTheDocument();
  });

  it('EmptyState affiche titre, description et action', () => {
    const Icon = () => <svg />;
    render(<EmptyState icon={Icon} title="Vide" description="Rien" action={<button>Agir</button>} />);
    expect(screen.getByText('Vide')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Agir' })).toBeInTheDocument();
  });

  it.each([
    ['light', 'Passer en mode sombre'],
    ['dark', 'Passer en mode clair'],
  ])('ThemeToggle en %s', async (theme, label) => {
    const onToggle = vi.fn();
    render(<ThemeToggle theme={theme} onToggle={onToggle} />);
    await userEvent.click(screen.getByRole('button', { name: label }));
    expect(onToggle).toHaveBeenCalled();
  });
});
