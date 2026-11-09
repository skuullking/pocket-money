export const AUTH_COOKIE = 'pm_session';

// Lit le JWT dans un en-tête Cookie : partagé par l'API et le handshake Socket.io.
export const readAuthCookie = (cookieHeader?: string): string | undefined => {
  for (const part of (cookieHeader ?? '').split(';')) {
    const separator = part.indexOf('=');
    if (part.slice(0, separator).trim() === AUTH_COOKIE) return part.slice(separator + 1).trim();
  }
  return undefined;
};
