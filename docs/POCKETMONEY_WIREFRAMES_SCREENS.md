# PocketMoney · Écrans et parcours

La carte des écrans tels qu'ils existent dans l'app. Le style est décrit dans `POCKETMONEY_DESIGN_SYSTEM.md`. Le code des écrans est dans `frontend/src/screens/` et les routes dans `frontend/src/App.jsx`.

Si vous ajoutez, renommez ou supprimez un écran, mettez à jour ce fichier dans la même PR.

---

## 1. Accès (`screens/auth.jsx`)

| Route | Écran | Contenu | Action principale |
|---|---|---|---|
| `/welcome` | Accueil | Bandeau violet avec la pièce, badge « Bêta », accroche, avatars des enfants déjà vus sur cet appareil (accès rapide), liens légaux. | « Essayer la démo » (si `DEMO_ENABLED`), « Se connecter », « Créer une famille » |
| `/login` | Connexion | Sélecteur **Enfant / Parent** (Enfant par défaut). Enfant : prénom + code famille + mot de passe. Parent : e-mail + mot de passe. | « Se connecter » |
| `/signup` | Inscription | Trois modes : « Parent, nouvelle famille », « Parent, famille existante », « Enfant ». La nouvelle famille passe par des étapes (compte, puis règles). | « Créer ma famille » |
| `/forgot-password` | Mot de passe oublié | E-mail du parent. | « Envoyer le lien » |
| `/reset-password` | Nouveau mot de passe | Ouvert depuis le lien reçu par e-mail : nouveau mot de passe et confirmation. | « Définir le mot de passe » |

Un enfant n'a pas d'e-mail : il se connecte avec son prénom et le code de sa famille, que le parent voit dans Enfants et Paramètres.

**Démo.** « Essayer la démo » crée une famille fictive propre au visiteur (Camille, Léa, Hugo), le connecte en parent et l'envoie sur `/parent`. Un bandeau doré en haut de chaque écran rappelle que les données sont effacées sous 24 h et permet de passer d'un membre à l'autre (« Voir en tant que ») sans mot de passe. Les enfants d'une démo n'apparaissent pas dans l'accès rapide.

---

## 2. Espace parent (`screens/parent.jsx`)

Cartes légères, vocabulaire direct. Navigation : Accueil, À valider, Corvées, Enfants, Règles, Statistiques, Paramètres.

| Route | Écran | Contenu | Actions |
|---|---|---|---|
| `/parent` | Accueil | « Bonjour {prénom} », ce qui attend une validation, le trésor familial, une ligne par enfant. | Ouvrir un élément à valider, créer une corvée. |
| `/parent/inbox` | À valider | Corvées envoyées et demandes de dépense, une à la fois (« 1 sur N »). Photo de preuve, note de l'enfant. Le montant d'une dépense est ajustable. | « Approuver et payer », « Refuser » (motif obligatoire, puis « Confirmer le refus »). |
| `/parent/chores` | Corvées | Recherche, filtre par enfant, sections par statut, modèles de corvées. | Ouvrir, créer, supprimer un modèle. |
| `/parent/chores/:id` | Détail d'une corvée | Statut, enfant, récompense, échéance, preuve. | Approuver, refuser, « Modifier la tâche », « Supprimer la corvée ». |
| `/parent/chores/new` et `/:id/edit` | Créer / modifier | Enfant, titre, récompense (pièces rapides + montant libre), répétition (rythme, jours), échéance, aperçu de la carte vue par l'enfant. | « Envoyer à {prénom} », « Créer la corvée récurrente » ou « Enregistrer les modifications » |
| `/parent/children` | Enfants | Une carte par enfant (solde, avancement), triées par prénom. Carte « Ajouter un enfant » avec le code famille. | « Sanction » (règle puis « Appliquer −X € »), réglages, « Copier le code ». |
| `/parent/children/:id/settings` | Réglages d'un enfant | Argent de poche automatique, plafond par dépense, répartition Épargne / Dépense / Don. Chaque section s'enregistre seule. | « Enregistrer » par section |
| `/parent/rules` | Règles | Règles de sanction et leur montant, dernières sanctions. | « Ajouter une règle », supprimer (confirmation). |
| `/parent/rules/history` | Historique des sanctions | Liste complète. | — |
| `/parent/analytics` | Statistiques | Graphiques gagné / dépensé, comparaison entre enfants, légende. | « Voir en tableau » |
| `/parent/expenses` | Demandes de dépense | « À traiter (N) », puis l'historique. | Approuver (montant), refuser (motif). |
| `/parent/settings` | Paramètres | Code d'invitation, consentement, compte, thème. | « Se déconnecter », « Supprimer la famille » (mot de passe demandé : « Confirme avec ton mot de passe »). |

---

## 3. Espace enfant (`screens/child.jsx`)

Cartes « sticker », vocabulaire de jeu. Navigation : Accueil, Quêtes, Rêves, Trésor, Moi.

| Route | Écran | Contenu | Actions |
|---|---|---|---|
| `/child` | Accueil | Le solde en grosse pièce (`BigCoin`), la prochaine quête, ce qui attend les parents, l'avancement du rêve principal. | « Je l'ai faite » sur la prochaine quête. |
| `/child/available-chores` | Quêtes (onglet À faire) | Onglets **À faire / Envoyées / Gagnées**. Une quête refusée apparaît en tête, avec le message du parent. | Toucher une quête pour l'envoyer, « Réessayer » sur une quête refusée. |
| `/child/my-chores` | Quêtes (onglet Gagnées) | Même écran, ouvert sur les quêtes gagnées. | — |
| `/child/submit-chore/:id` | Envoyer une quête | Photo de preuve (obligatoire), note facultative. | « Envoyer à mes parents » (désactivé sans photo). |
| `/child/goals` | Rêves | Rêves perso et rêves partagés, avancement en 10 pièces. | « Ajouter des pièces » puis « Mettre de côté », « Retirer » puis « Reprendre » (montants rapides ou « Autre montant »). |
| `/child/balance` | Trésor | Solde, répartition Épargne / Dépense / Don, demandes en cours, historique. | « Demander à dépenser » |
| `/child/expenses` | Mes demandes | Demandes de dépense et leur statut. | « Demander » (objet + montant, plafond fixé par le parent). |
| `/child/profile` | Moi | Avatar, nom de la famille, liens vers les quêtes gagnées et les demandes, mode sombre. | « Quitter PocketMoney » |

---

## 4. Pages légales (`screens/legal.jsx`)

`/privacy` et `/terms`, remplies à la compilation par les variables `VITE_LEGAL_*`. Accessibles sans compte.

---

## 5. Parcours clés

### Une corvée, de la création au paiement

```
Parent : Corvées → Créer → choisit l'enfant, la récompense, l'échéance
   ↓
Enfant : Quêtes / À faire → touche la quête → photo + note → « Envoyer à mes parents »
   ↓                                   (la quête passe dans « Envoyées »)
Parent : À valider (pastille sur l'onglet)
   ├─ « Approuver et payer » → le solde de l'enfant augmente, toast
   └─ « Refuser » + motif     → la quête revient dans « À faire » avec le motif
                                 → l'enfant peut « Réessayer » et la renvoyer
```

### Une dépense

```
Enfant : Trésor → « Demander à dépenser » → objet + montant
   ↓   (refusé tout de suite si le montant dépasse le plafond)
Parent : À valider → montant ajustable → approuver (débit) ou refuser (motif)
```

Le solde ne descend jamais sous 0 € : une sanction ou une dépense plus grande que le solde est plafonnée, et l'app le signale.

### Un rêve

```
Enfant : Rêves → « Ajouter des pièces » → 1, 2, 5, 10 € ou autre montant → « Mettre de côté »
   → l'argent passe du solde au rêve ; « Retirer » puis « Reprendre » fait l'inverse
   (un rêve déjà acheté ne bouge plus)
```

---

## 6. Comportement responsive

| Largeur | Navigation | Fenêtres |
|---|---|---|
| Mobile (< 1024 px) | Barre d'onglets en bas | Bottom sheet |
| Ordinateur (≥ 1024 px, `lg:`) | Barre latérale à gauche | Fenêtre centrée |

Tous les écrans sont testés sur un profil ordinateur et un profil mobile par Playwright (`e2e/`).

---

## 7. Avant de livrer un écran

- [ ] Un seul `h1` (via `Layout title`), une seule action pleine.
- [ ] Uniquement des jetons de couleur, aucune couleur en dur.
- [ ] Montants via `euro` / `euroShort`, signe toujours écrit.
- [ ] Vérifié en clair et en sombre, sur mobile et ordinateur.
- [ ] Route ajoutée à `e2e/tests/accessibility.spec.js` si l'écran est nouveau.
- [ ] Ce fichier mis à jour.
