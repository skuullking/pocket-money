const dsn = import.meta.env.VITE_SENTRY_DSN;
/** @type {(error: unknown) => unknown} */
let capture = () => undefined;

// Chargé à la demande : sans DSN, le code de Sentry n'est pas téléchargé.
export const initErrorTracking = async () => {
  if (!dsn) return;
  const Sentry = await import('@sentry/react');
  Sentry.init({ dsn, tracesSampleRate: 0, beforeBreadcrumb: () => null });
  capture = Sentry.captureException;
};

export const reportError = error => capture(error);
