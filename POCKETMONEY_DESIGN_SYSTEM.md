# PocketMoney · Design system « Pièce d'or »

Ce document décrit le design tel qu'il est codé. La source de vérité reste le code :

- couleurs : `frontend/src/index.css` (variables CSS, clair et `.dark`) ;
- thème Tailwind : `frontend/tailwind.config.js` ;
- composants : `frontend/src/components/ui.jsx` et `frontend/src/components/layout.jsx`.

Si ce document et le code divergent, c'est le code qui a raison. Mettez ce fichier à jour dans la même PR.

---

## 1. Principes

| Principe | Ce que ça veut dire concrètement |
|---|---|
| **L'argent se voit comme des pièces** | Les soldes, récompenses et objectifs s'affichent avec des pièces dorées (`Coin`, `BigCoin`, `CoinRow`, `CoinStack`), pas avec des graphiques abstraits. |
| **Deux espaces, un même système** | L'enfant voit des cartes « sticker » (contour épais, ombre dure) et un vocabulaire de jeu (Quêtes, Rêves, Trésor). Le parent voit des cartes légères et un vocabulaire direct (Corvées, À valider). |
| **Une action principale par écran** | Un seul bouton plein (violet ou or) par écran. Les actions secondaires sont en `outline` ou `ghost`. |
| **Le geste se sent** | Les boutons principaux ont une ombre décalée qui disparaît à l'appui (`shadow-press` + `active:translate-y-1`). |
| **Accessible par défaut** | Contraste WCAG AA vérifié automatiquement par axe en clair **et** en sombre (`e2e/tests/accessibility.spec.js`). Cibles tactiles de 44 px minimum. |

---

## 2. Couleurs

Les couleurs sont des variables CSS en canaux RGB (`--primary: 58 40 217`) pour que Tailwind puisse appliquer l'opacité (`bg-primary/20`). On n'écrit **jamais** une couleur en dur dans un écran : on utilise le jeton Tailwind.

### Palette de base

| Rôle | Clair | Sombre | Jeton Tailwind |
|---|---|---|---|
| Violet (marque, action principale) | `#3A28D9` | `#A294FF` | `primary` |
| Fond de puce violette | `#E9E5FF` | `#332C78` | `primary-container` |
| Encre (texte principal) | `#1A1640` | `#F1EFFF` | `on-surface` |
| Encre pleine (bouton `secondary`) | `#1A1640` | `#E9E5FF` | `secondary` |
| Or (pièces, CTA enfant) | `#FFC42E` | `#FFC42E` | `gold` |
| Tranche de la pièce | `#E9A100` | `#E9A100` | `gold-edge` |
| Texte sur l'or | `#1A1640` | `#1A1640` | `on-gold` |
| Fond de page | `#F5F3FE` | `#0F0D28` | `background` |
| Surface (cartes) | `#FFFFFF` | `#1E1A44` | `surface` |
| Texte secondaire | `#5C5780` | `#C4BFE6` | `on-surface-variant` |
| Bordure légère | `#E3DFF5` | `#3D3770` | `outline-variant` |
| Gain (crédit) | `#0A6B4B` | `#7BE3BC` | `gain` / `gain-container` |
| Erreur, sanction, débit | `#B32F15` | `#FFB4A2` | `error` / `error-container` |

### Jetons de structure

| Jeton | Usage |
|---|---|
| `line` | Contour épais des cartes sticker et des pièces. Encre en clair, violet clair en sombre. |
| `press` | Couleur de l'ombre décalée (`shadow-press`, `shadow-coin`). |
| `hero` | Fond des bandeaux héros (accueil enfant, page Trésor). |
| `nav`, `nav-active`, `on-nav`, `on-nav-muted` | Barre de navigation (encre) et onglet actif (violet). |

### Règles

- L'or est réservé à l'argent et à l'action principale côté enfant. Pas de texte or sur fond blanc : il n'a pas le contraste.
- Un montant positif est en `gain`, un débit en `error`. Le signe est toujours écrit (`+5 €`, `−2 €` avec le vrai signe moins `−`), pour ne jamais reposer sur la couleur seule.
- Sur un fond violet ou encre, ajoutez la classe `on-dark-field` au conteneur : le contour de focus devient blanc.

---

## 3. Typographie

| Famille | Jeton | Usage |
|---|---|---|
| **Bricolage Grotesque** (700–800) | `font-headline` | Titres, gros montants, texte des boutons pleins. |
| **Figtree** (400–700) | `font-body` (par défaut) | Tout le reste. |

Les polices sont chargées depuis Google Fonts dans `frontend/index.html`.

- Un seul `h1` par écran, rendu par `Layout` à partir de la prop `title`.
- Les montants passent **toujours** par `euro` (`127,50 €`) ou `euroShort` (`5 €` pour un entier). Ces fonctions insèrent une espace insécable avant `€`.
- Les dates d'échéance passent par `formatDeadline` (« 12 mars »). Le texte libre comme « Demain » est affiché tel quel.
- En français, le `!`, le `?` et le `:` sont précédés d'une espace insécable.

---

## 4. Formes et ombres

| Élément | Rayon | Bordure | Ombre |
|---|---|---|---|
| Carte parent (`Card`) | 22 px | 1 px `outline-variant` | aucune |
| Carte enfant (`Card sticker`) | 22 px | 2 px `line` | `shadow-press-lg` (0 5px 0) |
| Bouton `sm` / `md` / `lg` | 13 / 15 / 18 px | selon variante | `shadow-press` (0 4px 0) pour les pleins |
| Pièce | cercle | 3 px `gold-edge` | `shadow-coin` (0 10px 0) pour `BigCoin` |

Les ombres sont **dures** (sans flou). Pas de `shadow-md` ou `shadow-lg` flous dans l'app.

---

## 5. Composants (`ui.jsx`)

### Boutons : `Btn`

| Variante | Rendu | Quand l'utiliser |
|---|---|---|
| `primary` | Violet plein, ombre décalée | Action principale (parent, connexion). |
| `gold` | Or plein, ombre décalée | Action principale côté enfant (« Envoyer à mes parents »). |
| `secondary` | Encre plein | Action forte mais pas principale. |
| `danger` | Rouge plein | Confirmer une action destructrice. |
| `dangerOutline` / `dangerGhost` | Rouge en contour / texte | Proposer une action destructrice (« Refuser », « Supprimer »). |
| `outline` | Contour gris | Action secondaire. |
| `ghost` | Texte seul | Action tertiaire, « Annuler ». |

Tailles `sm` (44 px), `md` (52 px), `lg` (60 px). Props utiles : `full`, `loading`, `icon` (icône lucide).

### Formulaires

- `Input`, `Textarea`, `Select` : libellé obligatoire, prop `error` pour le message lié au champ. `Input` accepte `prefix` / `suffix` (ex. `€`).
- `Checkbox`, `Radio`, `Switch` : un vrai contrôle natif ou un `role="switch"`, jamais une `div` cliquable seule.
- `Segmented` : choix exclusif court (Enfant / Parent à la connexion).
- `Chip` : filtres et choix multiples (enfants, jours de la semaine).
- `CoinButton` : choix d'un montant rapide (1, 2, 5, 10 €), toujours accompagné d'un champ « Autre montant ».

### Argent

| Composant | Usage |
|---|---|
| `Coin` | Pièce avec un montant court (récompense d'une quête). |
| `BigCoin` | Le solde de l'enfant, en héros de l'accueil. |
| `CoinRow` | Progression d'un rêve : 10 pièces, remplies selon l'avancement. Lu comme « N pièces sur 10 remplies ». |
| `CoinStack` | Pile de pièces pour un résumé compact. |
| `Amount` | Montant signé coloré (gain / débit). |

### Affichage

- `Card` (`sticker`, `hover`, `as`), `Badge`, `StatusBadge` (statut d'une corvée), `Avatar` (initiale, couleur de texte choisie selon la luminance du fond), `ProgressBar`, `StatCard`, `EmptyState`, `Spinner`.

### Fenêtres et retours

- `Modal` : fenêtre centrée sur ordinateur, **bottom sheet** sur mobile (hauteur max 85 vh). Le focus y entre, y reste, puis revient sur le bouton d'origine. Échap ferme.
- `ConfirmModal` : toute suppression passe par elle.
- `Toast` : en haut de l'écran, violet pour un succès, rouge pour une erreur, encre pour une info. La zone `aria-live` reste montée pour que les lecteurs d'écran annoncent chaque message. Les événements temps réel (Socket.IO) déclenchent un toast et un rechargement des données.

---

## 6. Mise en page (`layout.jsx`)

- **Mobile** (< `lg`) : barre d'onglets en bas (`BottomNav`), contenu avec `pb-32` pour ne pas passer dessous.
- **Ordinateur** (`lg:` et plus) : barre latérale (`Sidebar`) à gauche.
- `Layout` prend `title`, `showBack`, `headerRight`, `width` (par défaut une colonne lisible) et `bare` pour les écrans sans en-tête.

### Navigation

| Parent | Enfant |
|---|---|
| Accueil | Accueil |
| À valider (pastille = corvées envoyées + dépenses en attente) | Quêtes |
| Corvées | Rêves |
| Enfants | Trésor |
| Règles, Statistiques (ordinateur seulement) | Moi |
| Paramètres (« Plus » sur mobile) | |

L'onglet reste actif sur les sous-pages (`/parent/chores/42` garde « Corvées » actif).

---

## 7. Animations

| Classe | Effet | Usage |
|---|---|---|
| `animate-pop-in` | Rebond d'apparition (0,35 s) | `BigCoin`, célébrations. |
| `animate-sheet` | Montée du bas (0,25 s) | Ouverture des `Modal`. |
| `animate-fade-in` | Fondu (0,3 s) | Fond des modales, écrans. |

`prefers-reduced-motion` coupe toutes les animations et transitions (`index.css`).

---

## 8. Mode sombre

Le mode sombre se déclenche avec la classe `.dark` sur `<html>` (bouton `ThemeToggle`). Il ne redéfinit que des variables : un écran qui n'utilise que des jetons fonctionne dans les deux thèmes sans code en plus. L'or et l'encre des pièces restent identiques pour que l'argent se reconnaisse partout.

---

## 9. Accessibilité

- Contraste AA vérifié par axe sur chaque écran, en clair et en sombre (`npm test` dans `e2e/`).
- Focus visible partout : contour violet de 3 px (`:focus-visible`), blanc sur fond foncé.
- Les icônes décoratives et les émojis sont dans un `aria-hidden`. Les boutons en icône seule ont un `aria-label`.
- Les graphiques de Statistiques ont une légende et un bouton « Voir en tableau ».
- Les photos de preuve ont un texte alternatif (« Ma réussite », « Preuve »).

---

## 10. Icônes de l'app

La source est `frontend/public/icons/icon.svg` : une pièce dorée avec le symbole €, contour encre et ombre décalée, sur fond violet. Elle sert aussi de favicon. Les PNG (`icon-192`, `icon-512`, `maskable-512`, `apple-touch-icon`) en sont des exports. Si vous modifiez le SVG, réexportez les PNG. Les versions `maskable` et `apple-touch` n'ont pas de coins arrondis (le système les découpe lui-même), et la pièce reste dans la zone de sécurité de 80 %.

Les icônes d'interface viennent de [lucide-react](https://lucide.dev).
