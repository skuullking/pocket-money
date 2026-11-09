# TODO — Rendre PocketMoney publiable et utilisable

> Checklist de mise en production, établie à partir d'une revue du code
> (`backend/src/server.ts`, `socket.ts`, `frontend/src/api.js`, `App.jsx`,
> config de déploiement). Classée par priorité : **P0** = bloquant,
> **P1** = indispensable avant d'ouvrir au public, **P2** = qualité/robustesse,
> **P3** = conformité & exploitation.

---

## P0 — Bloquants (à régler avant tout déploiement)

- [ ] **Résoudre le conflit de provider base de données.**
  `backend/prisma/schema.prisma` est actuellement passé à `provider = "sqlite"`
  (modif locale faite pour lancer le site en dev). Or la prod attend **PostgreSQL**
  (`docker-compose.yml:28`, note `QA_BUG_REPORT.md` ENV-1). Décider la base canonique :
  - Garder **Postgres** pour la prod → **ne pas committer** le passage en sqlite.
  - Pour le dev local sans Docker, utiliser une vraie instance Postgres (ou assumer
    sqlite en dev mais via un schéma séparé / variable, pas en modifiant le fichier versionné).
- [ ] **`JWT_SECRET` : supprimer le fallback.** `server.ts:16` fait
  `process.env.JWT_SECRET || 'fallback-secret'` → en prod, un secret manquant
  signe des tokens avec une valeur publique **forgeable**. Faire échouer le
  démarrage (`throw`) si `JWT_SECRET` est absent hors dev.
- [ ] **Verrouiller CORS.** `server.ts:18` utilise `app.use(cors())` (tout ouvert).
  Restreindre à `CLIENT_URL`. Idem vérifier le CORS Socket.io (`socket.ts:19`).
- [ ] **`VITE_API_URL` pour le build frontend.** `frontend/src/api.js:1` retombe sur
  `http://localhost:3001/api`. Sans variable d'env de build, le front prod tape en
  localhost. Ajouter `frontend/.env.example` + définir la valeur prod.

---

## P1 — Sécurité (indispensable)

- [ ] **Validation des entrées sur toutes les routes.** `zod` est déjà une dépendance
  mais n'est pas utilisé — la plupart des handlers font confiance à `req.body`.
  Points concrets :
  - Inscription : pas de validation du format email ni de longueur de mot de passe
    (la longueur n'est vérifiée que sur `reset-password`, `server.ts:264`).
  - `register/child` : `parseInt(age)` → `NaN` si absent (`server.ts:214`).
  - `createChore` : `parseFloat(reward)` sans garde NaN (`server.ts:440`).
- [ ] **Scoping « famille » sur les corvées.** Plusieurs routes ne vérifient pas que
  la ressource appartient à la famille (ni le rôle) :
  - `POST /api/chores` ne vérifie pas que `assigneeId` est bien un enfant de la famille (`server.ts:436`).
  - `PATCH /chores/:id/submit` et `/reject` n'ont **ni** contrôle de rôle **ni** de
    scope famille (`server.ts:445`, `:479`) — tout utilisateur authentifié peut agir par id.
- [ ] **Rate limiting** sur `login`, `register/*`, `forgot-password` (anti brute-force
  et anti-abus). Ex. `express-rate-limit`.
- [ ] **Unicité du login enfant.** Les enfants se connectent par prénom+mdp
  (`login` fait `OR: [{email},{name}]`, `server.ts:225`). Rien ne garantit l'unicité
  du prénom → collision possible entre enfants, voire entre familles. Imposer une
  contrainte (prénom unique par famille) et affiner la requête de login.
- [ ] **Longueur/force du mot de passe à l'inscription** (aligner sur les 6 car. min
  déjà exigés au reset).
- [ ] **JWT en `localStorage`** : vol de token possible via XSS. Au minimum documenter
  le risque ; idéalement migrer vers un cookie `httpOnly`.

## P1 — Déploiement

- [ ] **Choisir UNE cible de déploiement et la finaliser** (les deux coexistent aujourd'hui) :
  - **Docker / docker-compose** (Postgres + nginx + supervisord) → chemin complet,
    temps réel OK. Vérifier `prisma migrate deploy` au boot (`Dockerfile:21`), secrets
    réels, TLS/HTTPS (reverse proxy + certificats), nom de domaine.
  - **Vercel** (`backend/vercel.json`, `frontend/vercel.json`) → **le temps réel
    Socket.io ne fonctionne pas** en serverless (bloc exclu via `if (!process.env.VERCEL)`,
    `server.ts:965`). Il faut soit héberger le backend sur un hôte persistant, soit
    assumer l'absence de temps réel. Prévoir aussi le pooling Prisma/Postgres et
    l'exécution des migrations (le `vercel-build` ne fait que `prisma generate`).
- [ ] **Secrets de production** : `JWT_SECRET`, `POSTGRES_PASSWORD`, `RESEND_API_KEY`,
  `EMAIL_FROM` (domaine vérifié). Remplacer tous les `change-me-in-production`.
- [ ] **Build + hébergement du frontend** (statique via nginx ou Vercel) avec
  `VITE_API_URL` pointant sur l'API prod.
- [ ] **Health check** (`/api/health`, `server.ts:27`) branché sur la plateforme (readiness).

## P1 — Email (reset de mot de passe réel)

- [ ] **Configurer Resend** (`RESEND_API_KEY` + domaine d'envoi vérifié). Sans clé,
  le lien de réinitialisation est seulement loggé en console (`server.ts:43`) —
  inutilisable en prod.

---

## P2 — Intégrité des données & correction

- [ ] **Suppressions en cascade / nettoyage référentiel.** Aucun `onDelete` défini :
  supprimer un utilisateur/famille laisserait des corvées, transactions, objectifs
  orphelins. Ajouter la gestion des membres (retirer un enfant, supprimer une famille)
  côté API + UI, avec cascade cohérente.
- [ ] **Cohérence des fuseaux horaires** dans la génération paresseuse :
  `generateDueChores` compare un `todayStr` en **UTC** (`toISOString`) à un `weekday`
  en heure **locale serveur** (`getDay()`, `server.ts:100-104`) → risque de doublon
  ou d'oubli selon le fuseau. Idem `processDueAllowances`. Ajouter aussi un garde
  anti-doublon sous concurrence.
- [ ] **Stockage des preuves photo.** `proofImageUrl` semble stocké en data-URL
  (JSON limité à 10mb, `server.ts:19`). En base, ça gonfle vite. Déporter vers un
  stockage objet (S3/Cloudinary) ou plafonner strictement la taille.
- [ ] **Garder les routes frontend.** `/parent/*` et `/child/*` sont rendues
  directement (`App.jsx:37-58`) sans garde d'auth/rôle visible. Le backend protège
  les endpoints sensibles, mais ajouter un `ProtectedRoute` évite fuites d'UI et
  accès inter-rôles.

## P2 — Tests & qualité

- [ ] **Tests automatisés**, en priorité les flux d'argent : approbation de corvée,
  plancher du solde à 0 (`clampedDeduct`), financement/retrait d'objectif, limites de
  dépense hebdo, répartition épargne/dépense/don. (Vitest/Jest + supertest.)
- [ ] **Versionner les scripts QA Playwright** (`verify.js`/`verify2.js` mentionnés
  dans `QA_TEST_PLAN.md` mais non commités).
- [ ] **Lint + format** (ESLint + Prettier) et **typecheck** — rien n'est configuré
  aujourd'hui (cf. `CLAUDE.md`).
- [ ] **CI** (GitHub Actions) : install → typecheck → test → build.

## P2 — Produit / UX

- [ ] **Rejouer la checklist `QA_TEST_PLAN.md` de bout en bout sur le build réel**
  (pas seulement en dev), parent + enfant.
- [ ] **Vérifs mobile** : pas de débordement horizontal (bug historique), portrait + paysage.
- [ ] **Passe accessibilité WCAG AA** (le design system l'exige) : contrastes, focus,
  labels, navigation clavier.
- [ ] **Récupération de compte enfant** : les enfants n'ont pas d'email → prévoir un
  reset assisté par le parent.
- [ ] **(Option) PWA** : manifeste + icônes + installable — pertinent pour une app
  famille utilisée au téléphone.

---

## P3 — Conformité (données de mineurs) & exploitation

- [ ] **Politique de confidentialité + CGU.** L'app traite des données de mineurs →
  enjeu RGPD/COPPA sérieux pour une ouverture publique.
- [ ] **RGPD** : consentement parental, export des données, suppression de compte.
- [ ] **Suivi d'erreurs & logs** (ex. Sentry) + logs structurés.
- [ ] **Sauvegardes** de la base de données.
- [ ] **Monitoring / alerting** basique (uptime, erreurs 5xx).

---

## Docs — incohérences à corriger

- [ ] **README vs réalité.** `README.md` annonce « Database: SQLite (dev) » et montre
  `DATABASE_URL="file:./dev.db"`, alors que `backend/.env.example` contient une URL
  **PostgreSQL** et que la prod est Postgres. Harmoniser et documenter clairement
  setup local **et** prod.
- [ ] Mettre à jour `README.md` « Project Structure » : il décrit des dossiers
  `controllers/ routes/ middleware/ lib/` qui n'existent pas (tout est dans `server.ts`).
