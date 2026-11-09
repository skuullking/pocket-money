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

// Sans fournisseur d'email, les parents ne peuvent pas récupérer leur compte.
export const assertEmailConfig = (env: NodeJS.ProcessEnv) => {
  if (!env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is required in production. Refusing to start: password reset emails cannot be sent.');
  }
  // L'adresse de test de Resend n'écrit qu'au propriétaire du compte Resend.
  if (!env.EMAIL_FROM || /@resend\.dev>?$/i.test(env.EMAIL_FROM.trim())) {
    throw new Error('EMAIL_FROM must use a domain verified with Resend in production.');
  }
};
