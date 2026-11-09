// Valeurs d'exemple présentes dans le dépôt : publiques, donc inutilisables en production.
const PUBLIC_PLACEHOLDER = /change-?me|your-super-secret|dev-only|e2e-only/i;
const MIN_SECRET_LENGTH = 32;

export const assertStrongSecret = (name: string, value: string) => {
  if (PUBLIC_PLACEHOLDER.test(value)) {
    throw new Error(`${name} still holds a public placeholder. Refusing to start: generate a real secret.`);
  }
  if (value.length < MIN_SECRET_LENGTH) {
    throw new Error(`${name} must be at least ${MIN_SECRET_LENGTH} characters long in production.`);
  }
};
