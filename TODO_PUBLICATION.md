# TODO — Rendre PocketMoney publiable et utilisable

> Checklist de mise en production : seul ce qui reste à faire y figure (revue du
> 2026-11-10). Le code est prêt, ce qui reste demande un serveur, un compte ou une
> décision. Classée par priorité : **P1** = indispensable avant d'ouvrir au public,
> **P2** = qualité/robustesse, **P3** = conformité & exploitation.
> Marche à suivre : section « Production » de `README.md`.

---

## P1 — Déploiement

- [ ] **Préparer le serveur** : Docker installé, domaine dont le DNS pointe dessus,
  ports 80 et 443 ouverts.
- [ ] **Remplir `.env`** à partir de `.env.production.example` : `DOMAIN`, secrets
  générés (`POSTGRES_PASSWORD`, `JWT_SECRET`), identité de l'éditeur (`LEGAL_*`).
- [ ] **Lancer `docker compose up -d --build` et valider la pile complète.** Elle n'a
  jamais tourné en entier : nginx, certificat Caddy, `/api/health`, temps réel,
  sauvegardes et `monitor` sont à vérifier sur le serveur.
- [ ] **Décider du sort des projets Vercel**, qui déploient encore chaque branche alors
  que Docker est la seule cible de production.

## P1 — Email (reset de mot de passe réel)

- [ ] **Configurer Resend** (`RESEND_API_KEY` + domaine d'envoi vérifié, `EMAIL_FROM`)
  puis tester une vraie réinitialisation de mot de passe.

---

## P2 — Produit / UX

- [ ] **Rejouer `QA_TEST_PLAN.md` sur le serveur cible.** Fait sur le build de
  production (section 6 du plan), pas encore derrière la pile Docker complète.
- [ ] **Stabiliser le test `MONTHLY : verse après 30 jours`**
  (`backend/tests/split-allowance.test.ts`), qui échoue parfois selon l'heure.

---

## P3 — Conformité (données de mineurs) & exploitation

- [ ] **Faire relire la politique de confidentialité et les CGU par un juriste**
  (brouillons dans `frontend/src/screens/legal.jsx`), notamment le consentement
  parental déclaratif (RGPD art. 8).
- [ ] **COPPA** : le consentement vérifiable n'est pas géré, ne pas ouvrir aux enfants
  aux États-Unis sans travail supplémentaire.
- [ ] **Parents déjà inscrits** : ils doivent donner leur consentement dans Paramètres
  pour que de nouveaux enfants puissent s'inscrire.
- [ ] **Sauvegardes** : copier les dumps hors du serveur et tester une restauration.
- [ ] **Monitoring** : renseigner `ALERT_WEBHOOK_URL` et ajouter une sonde externe sur
  `https://<domaine>/api/health`.
- [ ] **(Option) Suivi d'erreurs** : renseigner `SENTRY_DSN` et `SENTRY_DSN_FRONTEND`.
