# Plan de test — PocketMoney

Périmètre : application complète (frontend React/Vite + backend Express/Prisma),
en configuration **PC** (viewport desktop, souris) et **mobile** (émulation
iPhone 13 — viewport tactile 390×844, puis test en orientation paysage).

## 1. Environnement de test

- Backend : `backend/` (Express + Prisma + PostgreSQL)
- Frontend : `frontend/` (Vite dev server)
- Base de données : PostgreSQL local (une base jetable dédiée aux tests,
  seedée avec `npm run db:seed` — famille "Dupont", 1 parent + 3 enfants,
  corvées/objectifs/règles/transactions déjà peuplés)
- Outil de pilotage : Playwright (Chromium headless), deux contextes de
  navigateur distincts : un desktop (1440×900 / 1280×820), un mobile
  (device preset "iPhone 13", tactile, puis testé aussi en paysage)

## 2. Fonctionnalités couvertes

### Authentification & Inscription
- [ ] Écran d'accueil (Welcome) — CTA connexion, accès rapide enfant, lien inscription
- [ ] Connexion (email/prénom + mot de passe)
- [ ] Inscription parent — créer une famille (+ étape règles/amendes)
- [ ] Inscription parent — rejoindre une famille via code d'invitation
- [ ] Inscription enfant — créer un compte via code d'invitation
- [ ] Déconnexion (parent et enfant)

### Espace Parent
- [ ] Tableau de bord (trésor familial, corvées en attente, enfants, actions requises)
- [ ] Liste des corvées (à vérifier / en cours), recherche
- [ ] Création d'une corvée (assignation à un enfant, récompense, échéance)
- [ ] Détail d'une corvée — approbation (+ transaction + confetti)
- [ ] Détail d'une corvée — refus (avec motif)
- [ ] Détail d'une corvée — actions "Modifier" / "Supprimer"
- [ ] Gestion des enfants (liste, solde, sanction)
- [ ] Application d'une sanction (règle) à un enfant
- [ ] Écran Règles & Amendes (ajout/suppression/édition, sauvegarde)
- [ ] Écran Statistiques
- [ ] Paramètres (nom de famille, code d'invitation, règles, déconnexion)
- [ ] Bouton "Ajouter un enfant"

### Espace Enfant
- [ ] Tableau de bord (solde animé, quêtes disponibles, objectif principal, activité récente)
- [ ] Quêtes disponibles (liste des corvées assignées en attente)
- [ ] Soumission d'une corvée (photo obligatoire + note)
- [ ] Historique des corvées ("Mes Exploits")
- [ ] Écran Solde ("Mon Trésor") — historique des transactions
- [ ] Objectifs d'épargne ("Mes Grands Rêves") — alimentation d'un objectif
- [ ] Profil — déconnexion

### Robustesse / cas limites testés
- [ ] Création de corvée sans enfant dans la famille
- [ ] Sanction / dépense supérieure au solde disponible (passage en négatif ?)
- [ ] Saisie d'un montant négatif dans le prompt "Ajouter des pièces"
- [ ] Un enfant peut-il voir/financer l'objectif personnel d'un autre enfant ?
- [ ] Connexion enfant via le champ "prénom" (pas d'email pour les enfants)
- [ ] Erreurs console navigateur (warnings React, erreurs réseau) sur chaque écran
- [ ] Débordement horizontal / troncature sur petit viewport (390px), portrait et paysage

## 3. Méthode

1. Revue statique du code (routes API, contexte React, écrans) pour repérer
   les incohérences avant de piloter le navigateur.
2. Script Playwright automatisé exécutant un parcours complet en desktop
   (inscription, connexion, corvées, sanctions, objectifs), captures d'écran
   à chaque étape + vérifications programmatiques (soldes via l'API,
   présence d'éléments, débordement horizontal, erreurs console).
3. Même parcours condensé rejoué en émulation mobile (portrait + paysage).
4. Consolidation des anomalies observées dans `QA_BUG_REPORT.md`, avec
   preuve (capture d'écran) et étapes de reproduction pour chacune.

## 4. Résultat

16 anomalies relevées (4 critiques liées à l'argent, 3 fonctionnalités mortes,
1 bug de mise en page mobile, plusieurs incohérences mineures/cosmétiques).
Détail complet dans `QA_BUG_REPORT.md`.
