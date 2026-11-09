import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ErrorBoundary } from '../src/ErrorBoundary.jsx';

const Broken = () => {
  throw new Error('boom');
};

describe('ErrorBoundary', () => {
  it('affiche ses enfants quand tout va bien', () => {
    render(
      <ErrorBoundary>
        <p>contenu</p>
      </ErrorBoundary>,
    );
    expect(screen.getByText('contenu')).toBeInTheDocument();
  });

  it('remplace un écran planté par un message et un bouton', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    render(
      <ErrorBoundary>
        <Broken />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('heading', { name: 'Une erreur est survenue' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Recharger' })).toBeInTheDocument();
  });
});
