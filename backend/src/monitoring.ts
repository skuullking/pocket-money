import * as Sentry from '@sentry/node';

type Fields = Record<string, unknown>;

// Une ligne JSON par événement, lisible par n'importe quel collecteur de logs.
// Ne jamais y mettre de corps de requête, de cookie ni de donnée d'enfant.
const write = (level: 'info' | 'warn' | 'error', message: string, fields: Fields = {}) => {
  const line = JSON.stringify({ time: new Date().toISOString(), level, message, ...fields });
  if (level === 'info') console.log(line);
  else console.error(line);
};

export const logger = {
  info: (message: string, fields?: Fields) => write('info', message, fields),
  warn: (message: string, fields?: Fields) => write('warn', message, fields),
  error: (message: string, fields?: Fields) => write('error', message, fields),
};

// L'application traite des données de mineurs : rien sur la requête ni l'utilisateur ne part chez Sentry.
export const scrubEvent = <T extends { request?: unknown; user?: unknown }>(event: T): T => {
  delete event.request;
  delete event.user;
  return event;
};

const sentryEnabled = Boolean(process.env.SENTRY_DSN);
if (sentryEnabled) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0,
    beforeSend: scrubEvent,
  });
}

export const reportError = (error: unknown, context: string) => {
  const err = error instanceof Error ? error : new Error(String(error));
  logger.error(context, { error: err.message, name: err.name, stack: err.stack });
  if (sentryEnabled) Sentry.captureException(err, { tags: { context } });
};

// Les refus métier sont des Error simples, montrés dans un toast. Une panne de
// base de données est un incident : à signaler, et à ne pas détailler au client.
export const isIncident = (error: any) =>
  /^PrismaClient(Initialization|RustPanic|UnknownRequest)/.test(error?.name ?? '') ||
  (error?.name === 'PrismaClientKnownRequestError' && /^(P1|P2024)/.test(error.code ?? ''));

// Compatible Slack (text) et Discord (content). Une alerte perdue ne doit rien casser.
export const sendAlert = async (message: string) => {
  const url = process.env.ALERT_WEBHOOK_URL;
  if (!url) return;
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: message, content: message }),
      signal: AbortSignal.timeout(5000),
    });
  } catch (error) {
    logger.warn('alert not delivered', { error: (error as Error).message });
  }
};

const ERROR_WINDOW_MS = 5 * 60 * 1000;
const ALERT_COOLDOWN_MS = 30 * 60 * 1000;

export const createErrorRateAlarm = (threshold: number, alert: (message: string) => unknown) => {
  let recent: number[] = [];
  let lastAlertAt = -Infinity;
  return (now = Date.now()) => {
    recent = recent.filter(at => now - at < ERROR_WINDOW_MS);
    recent.push(now);
    if (recent.length < threshold || now - lastAlertAt < ALERT_COOLDOWN_MS) return;
    lastAlertAt = now;
    alert(`PocketMoney : ${recent.length} erreurs 5xx en 5 minutes.`);
  };
};

export const recordServerError = createErrorRateAlarm(Number(process.env.ALERT_5XX_THRESHOLD) || 10, sendAlert);

export const installProcessHandlers = () => {
  process.on('unhandledRejection', reason => reportError(reason, 'unhandledRejection'));
  process.on('uncaughtException', error => {
    reportError(error, 'uncaughtException');
    // Laisse Sentry envoyer l'erreur ; supervisord relance ensuite le processus.
    void Sentry.close(2000).finally(() => process.exit(1));
  });
};
