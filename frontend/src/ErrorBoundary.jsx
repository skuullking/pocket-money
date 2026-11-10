import React from 'react';
import { reportError } from './errorTracking';

// Placée au-dessus de AppProvider : le repli ne dépend d'aucun contexte.
export class ErrorBoundary extends React.Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    reportError(error);
  }

  render() {
    // Le frontend n'a pas les types de React : TypeScript ne voit pas `props`, hérité de Component.
    if (!this.state.failed) return /** @type {any} */ (this).props.children;
    return (
      <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, textAlign: 'center' }}>
        <div>
          <h1>Une erreur est survenue</h1>
          <p>Recharge la page pour continuer.</p>
          <button type="button" onClick={() => window.location.reload()}>Recharger</button>
        </div>
      </main>
    );
  }
}
