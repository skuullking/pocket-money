# Rapport de bugs — PocketMoney

Testé en local : backend Express+Prisma sur PostgreSQL, frontend Vite.
Desktop 1440×900 et mobile (émulation iPhone 13, portrait + paysage) via
Playwright/Chromium. Compte de démo utilisé : `sarah@dupont.fr` / `password123`
(parent) et `Alice` / `Bob` / `Claire` / `password123` (enfants).

Légende sévérité : 🔴 Critique · 🟠 Élevée · 🟡 Moyenne · ⚪ Mineure/cosmétique

---

## 🔴 [ENV-1] Le backend est cassé au premier appel réel — incohérence Postgres/SQLite (CORRIGÉ)

`backend/prisma/schema.prisma` déclare `provider = "postgresql"`, mais :
- `backend/.env` fournissait `DATABASE_URL="file:./dev.db"` (format SQLite)
- `docker-compose.yml` fournit `DATABASE_URL: file:/app/data/prod.db` (idem)
- l'historique de migrations (`backend/prisma/migrations/`) était généré en
  dialecte SQLite (`migration_lock.toml` → `provider = "sqlite"`)

Résultat : **tout** appel touchant la base (inscription, connexion, corvées,
objectifs, règles…) échouait avec :
```
error: Error validating datasource `db`: the URL must start with the
protocol `postgresql://` or `postgres://`.
```
Vérifié en clair via `curl` sur `/api/auth/register/parent/create` avant tout
correctif — l'app était 100 % inutilisable dès qu'on sortait du endpoint
`/api/health`.

**Corrigé dans cette branche** : régénération d'un historique de migrations
Postgres (`backend/prisma/migrations/20260805195807_init_postgres/`), ce qui
permet à `prisma migrate deploy` de fonctionner contre une vraie base
Postgres. **Reste à faire côté déploiement** : `backend/.env` (local) et
`docker-compose.yml` (prod) pointent toujours vers un fichier SQLite — il faut
soit provisionner un vrai service Postgres (ajouter un service `db` dans
`docker-compose.yml`, ou une base managée), soit revenir sciemment sur
`provider = "sqlite"` si Postgres n'est pas voulu en prod.

---

## 🔴 [MONEY-1] Le solde d'un enfant peut devenir profondément négatif via une sanction

`backend/PLAN.md` énonce sa propre "règle d'or" : *"La balance d'un enfant ne
peut jamais descendre en dessous de 0€"*. Cette règle n'est vérifiée que sur
`POST /api/goals/:id/fund` (`if (req.user.balance < val) return 400`) — **pas**
sur `POST /api/rules/:id/apply` (sanctions), ni sur `PUT /api/expenses/:id/approve`,
ni sur `POST /api/expenses/deduct`.

**Reproduit en direct** : création d'une règle "QA Big Fine" à 999 € (Réglages
→ Sanctions & Règles), puis application à Alice (Enfants → Sanction). Son
solde est passé de **50,50 €** à **-948,50 €**, et le "Trésor Familial" agrégé
du tableau de bord parent est lui-même passé négatif (**-906,75 €**).

![Solde négatif visible sur le tableau de bord et la fiche enfant](report-shots/03-children-view-alice-negative.jpg)

**Reproduction :**
1. Se connecter en parent → Paramètres → Sanctions & Règles → Ajouter → titre
   quelconque, montant très supérieur au solde d'un enfant → Enregistrer.
2. Enfants → carte de l'enfant → Sanction → sélectionner la règle → Appliquer.
3. Le solde de l'enfant (et le total familial) passe en négatif, sans
   blocage ni avertissement.

---

## 🔴 [MONEY-3] Un enfant peut se créditer de l'argent en entrant un montant négatif

L'action "Ajouter des pièces" sur un objectif (`GoalsScreen`) utilise
`window.prompt()` sans aucune validation, et `POST /api/goals/:id/fund`
fait `parseFloat(amount)` sans vérifier que la valeur est positive.

**Reproduit en direct** (connecté en Bob) : sur l'objectif partagé "Vacances
à la mer", saisie de `-5` dans la popup. Résultat : le solde de Bob est passé
de **21,00 €** à **26,00 €** (+5, alors qu'il "retire" de l'argent), et
l'objectif familial est passé de **67,50 €** à **62,50 €**. Répétable à
volonté : un enfant peut ainsi générer un solde arbitrairement élevé en
vidant un objectif familial partagé (jusqu'à le faire passer négatif lui
aussi, sans blocage).

**Reproduction :**
1. Se connecter en enfant → Objectifs ("Mes Grands Rêves") → "Ajouter des
   pièces" sur un objectif.
2. Dans la popup, saisir un nombre négatif (ex. `-5`) → OK.
3. Le solde du compte augmente au lieu de diminuer.

---

## 🔴 [MONEY-2] Un enfant voit et peut financer l'objectif personnel d'un autre enfant

`GoalsScreen` (`child.jsx`) affiche `goals || []` — **tous** les objectifs de
la famille renvoyés par `GET /api/goals`, sans filtrer sur la participation
ou le caractère `isShared`. Côté serveur, `POST /api/goals/:id/fund` n'a
aucun contrôle de propriété : n'importe quel utilisateur authentifié peut
financer n'importe quel `goalId`.

**Reproduit en direct** : connecté en tant que Bob, l'écran "Mes Grands
Rêves" liste `Vacances à la mer` (partagé, normal), mais aussi **`Nouveau
vélo`** — l'objectif *personnel* d'Alice (`isShared: false`, seedé avec Alice
comme seule participante) — et **`Console de jeux`** (partagé, terminé).
Bob peut cliquer "Ajouter des pièces" sur l'objectif privé d'Alice et le
financer avec son propre argent.

![Bob voit l'objectif personnel "Nouveau vélo" d'Alice](report-shots/07-goals-cross-child-visible.jpg)

**Reproduction :**
1. Se connecter avec un enfant A → noter la liste des objectifs affichés
   sur "Mes Grands Rêves".
2. Se connecter avec un enfant B (frère/sœur, objectif personnel non partagé) → même écran.
3. L'objectif personnel de B apparaît quand même chez A.

---

## 🟠 [CHORE-1] Créer une corvée sans enfant dans la famille échoue silencieusement

Sur `/parent/chores/new`, si la famille n'a aucun enfant, le select "Pour
qui ?" est vide (0 option). Remplir le formulaire et cliquer "Lancer la
mission !" ne fait **rien** — pas de toast, pas de message d'erreur.
`CreateChore.handleSubmit` fait `if (!form.assigneeId) return;` sans aucun
retour utilisateur : le parent reste bloqué sans comprendre pourquoi.

![Formulaire de corvée rempli, aucun enfant disponible, le clic ne fait rien](report-shots/06-create-chore-no-children-after-submit.jpg)

---

## 🟠 [UI-1] Le bouton "Ajouter un enfant" ne fait rien

`ChildrenView` (`parent.jsx`) : `<button onClick={() => {}} ...>Ajouter un
enfant</button>` — handler vide. Aucune navigation, aucune modale, aucun
rappel du code d'invitation. Pour un parent, c'est une impasse totale.

![Clic sur "Ajouter un enfant" sans aucun effet](report-shots/10-children-view-after-add-child-click.jpg)

---

## 🟠 [UI-2] "Modifier la tâche" et "Supprimer la corvée" ne font rien

Sur la fiche d'une corvée non soumise (`ChoreDetail`, `parent.jsx`), les
deux boutons d'action de la barre latérale n'ont **aucun** `onClick`. Un
parent ne peut jamais corriger une faute de frappe ni annuler une corvée
créée par erreur.

![Boutons "Modifier la tâche" / "Supprimer la corvée" sans handler](report-shots/04-chore-detail-dead-buttons.jpg)

---

## 🟠 [UI-3] La fonctionnalité "Accès Rapide" (connexion enfant en un clic) ne s'affiche jamais

L'écran d'accueil (`Welcome`) est censé afficher les avatars des enfants de
la famille pour une connexion en un clic (`family?.users?.filter(u =>
u.role === 'CHILD')`). Mais `family` n'est peuplé qu'*après* connexion
(`fetchAppData()` ne se déclenche que si `user` est défini) — et `Welcome`
ne s'affiche justement que quand personne n'est connecté. Le bloc "— Accès
Rapide —" s'affiche donc, mais **sans aucun avatar en dessous**, sur
n'importe quel poste, dès le premier chargement.

![Écran d'accueil : "Accès Rapide" sans aucune carte enfant](report-shots/01-welcome-desktop.jpg)

---

## 🟡 [LAYOUT-1] Titre d'écran tronqué sur mobile sur (quasiment) tous les écrans parent

Sur viewport mobile (390px), l'en-tête combine titre + bouton d'action +
interrupteur de thème sur une seule ligne sans repli responsive : "Tableau
de Bord" devient **"Tab…"**, "Mes Corvées" devient **"Mes Corvé…"**, etc.
dès qu'un `headerRight` est présent. Reproduit sur le tableau de bord parent
et sur la liste des corvées.

![Titre "Tab…" tronqué sur mobile](report-shots/08-mobile-title-truncated.jpg)

---

## 🟡 [FEATURE-1] La gestion des dépenses (ExpenseRequest) existe côté API mais n'a aucune interface

`backend/PLAN.md` liste la gestion des dépenses (`/api/expenses/*` :
demande, approbation, refus, déduction imposée, historique) comme
fonctionnalité du MVP, et le backend l'implémente intégralement
(`server.ts`). Côté frontend, `expensesAPI` existe dans `api.js` mais
**n'est importé nulle part** dans `context.jsx` ni dans aucun écran : un
enfant ne peut jamais demander une dépense, un parent ne peut jamais
l'approuver/refuser depuis l'interface.

---

## 🟡 [FEATURE-2] `withdrawGoal` / `buyGoal` appellent des routes backend inexistantes

`api.js` définit `goalsAPI.withdrawGoal()` (→ `POST /goals/:id/withdraw`) et
`goalsAPI.buyGoal()` (→ `PUT /goals/:id/buy`), toutes deux décrites dans
`backend/PLAN.md`. Aucune des deux routes n'existe dans `server.ts`. Ces
fonctions ne sont actuellement appelées par aucun écran (donc pas de crash
utilisateur aujourd'hui), mais tomberont en 404 dès qu'un écran les
utilisera.

---

## 🟡 [MONEY-4] Aucun garde-fou contre un montant de sanction négatif à la création

Le champ montant d'une règle (Paramètres → Sanctions & Règles, et
Règles/Amendes à l'inscription) a `min="0"` en HTML — un simple indice
visuel pour les flèches du `<input type=number>`, pas un blocage réel de
saisie. Rien n'empêche de taper `-5` et d'enregistrer. Si une telle règle
est ensuite appliquée, `balance: { decrement: rule.amount }` avec un montant
négatif **augmente** le solde de l'enfant au lieu de le sanctionner — même
mécanisme racine que [MONEY-3].

---

## ⚪ [COSMETIC-1] Statistique "Performance : 92 %" figée en dur

Le `StatCard` "Performance" du tableau de bord parent affiche toujours
`92%`, quel que soit l'état réel des corvées (`ParentDashboard`, valeur
littérale `"92%"`).

---

## ⚪ [COSMETIC-2] Badge "+€12.50 ce mois" figé en dur

Le tableau de bord enfant affiche toujours "+€12.50 ce mois" sous le solde,
indépendamment du champ `monthDelta` réellement suivi en base pour chaque
enfant (seedé différemment pour Alice/Bob/Claire mais jamais utilisé côté
UI).

---

## ⚪ [COSMETIC-3] Avertissement React (DOM invalide) sur l'écran de soumission de corvée

Warning console capturé sur `/child/submit-chore/:id` (desktop et mobile) :
`validateDOMNesting(...): <div> cannot appear as a descendant of <p>`. Pas
d'impact visuel constaté, mais un balisage HTML invalide à corriger.

---

## ⚪ [COSMETIC-4] Écran Statistiques 100 % statique

`/parent/analytics` n'affiche qu'un texte "Vos données arrivent ! Calcul des
statistiques en cours…" — aucun graphique réel, alors que l'écran est
répertorié comme fonctionnalité existante.

---

## Ce qui fonctionne correctement

- Inscription parent (création de famille + étape règles), inscription
  parent (rejoindre via code), inscription enfant (via code) — flux complets
  testés, redirection correcte.
- Connexion par email (parent) et par prénom (enfant, pas d'email) —
  fonctionne car le backend cherche sur `email` OU `name`.
- Cycle de vie complet d'une corvée : soumission (photo obligatoire, bouton
  désactivé tant qu'aucune photo n'est jointe) → apparition dans "À
  vérifier" → approbation → transaction créée → solde crédité → confetti.
- Sanction "normale" (montant raisonnable, ex. -2 € pour "Téléphone à
  table") : solde correctement débité.
- Code d'invitation bien affiché et copiable dans Paramètres.
- Mobile : pas de débordement horizontal détecté (`scrollWidth <=
  innerWidth`) sur les écrans testés, portrait et paysage ; la bottom nav
  s'affiche bien à la place de la sidebar en dessous du breakpoint `lg:`.
