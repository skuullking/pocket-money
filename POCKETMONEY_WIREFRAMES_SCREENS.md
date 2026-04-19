# PocketMoney - Wireframes & Screens Checklist

**Version**: 1.0 | **For**: UX/UI Designers  
**Purpose**: Define all key screens, user flows, and interactions

---

## WIREFRAME CHECKLIST

### Phase 1 MVP (Sprint 1-4)

#### **MOBILE WIREFRAMES (React Native / Expo)**

- [ ] **1.1 Onboarding Screens**
  - [ ] Splash Screen (3s animation)
  - [ ] Welcome Screen ("Bienvenue à PocketMoney")
  - [ ] Role Selector (Parent vs Child toggle)
  - [ ] Sign Up - Email & Password
  - [ ] Sign In - Existing user
  - [ ] Family Code Entry (Join existing family)
  - [ ] Create Family (New family setup)
  - [ ] Add Children (Invite/create children accounts)
  - [ ] Permissions Request (Camera, Notifications)
  - [ ] Setup Complete Screen

- [ ] **1.2 Parent Dashboard**
  - [ ] Header with family name + settings icon
  - [ ] Quick stats: Total balance, pending actions count
  - [ ] Child cards (1 per child):
    - [ ] Child avatar + name + current balance
    - [ ] Quick actions (View chores, Add chore)
  - [ ] Pending Approvals section:
    - [ ] List of submitted chores (photo + title + child + reward)
    - [ ] Approve/Reject buttons
  - [ ] Bottom tab navigation (4 tabs)
  - [ ] Floating Action Button (+ Add new chore)

- [ ] **1.3 Chores - Parent View**
  - [ ] Tab: All Chores
  - [ ] Filter chips (All, Pending, Submitted, Completed, Rejected)
  - [ ] Chore list items with:
    - [ ] Title, assignee, reward, deadline
    - [ ] Status badge
  - [ ] Detail page per chore:
    - [ ] Full description
    - [ ] Assignee info
    - [ ] Photos (if submitted)
    - [ ] Timeline (created, submitted, validated)
    - [ ] Action buttons (Approve/Reject/Edit/Delete)
    - [ ] Comments section

- [ ] **1.4 Create/Edit Chore - Parent**
  - [ ] Form fields:
    - [ ] Title (text input)
    - [ ] Description (textarea)
    - [ ] Reward amount (currency input)
    - [ ] Assignee selector (single child or "Family")
    - [ ] Deadline date+time picker
    - [ ] Submit button
  - [ ] Form validation (error states)
  - [ ] Success confirmation

- [ ] **1.5 Child Dashboard**
  - [ ] Header with child avatar + name + current balance (large)
  - [ ] Quick action buttons:
    - [ ] "View Available Chores"
    - [ ] "Submit Chore"
    - [ ] "My Goals"
  - [ ] Available Chores section:
    - [ ] List of chores assigned to child
    - [ ] Card preview (title, reward, deadline)
  - [ ] Recent Transactions:
    - [ ] List of gains/penalties (last 5)
  - [ ] Goals Progress:
    - [ ] Primary goal card with progress bar
  - [ ] Bottom tab navigation

- [ ] **1.6 Available Chores - Child**
  - [ ] List of pending chores for this child
  - [ ] Grouped by deadline (Today, Tomorrow, This Week, Later)
  - [ ] Expandable cards showing details
  - [ ] Submit Chore button per card

- [ ] **1.7 Submit Chore - Child**
  - [ ] Chore details (read-only)
  - [ ] Camera preview area with:
    - [ ] "Take Photo" button
    - [ ] Photo thumbnail preview
  - [ ] Caption/note textarea (optional)
  - [ ] "Submit for Approval" button
  - [ ] Confirmation screen (success state)

- [ ] **1.8 My Chores - Child**
  - [ ] Tabs/filters: All, Pending, Submitted, Completed, Rejected
  - [ ] List of child's chores with status badges
  - [ ] Tap to view details + status updates

- [ ] **1.9 Balance & Transactions - Child**
  - [ ] Large balance display (prominent)
  - [ ] Trend indicator (↑ or ↓ this month)
  - [ ] Tabs: Income, Expenses, Penalties
  - [ ] Transaction list with:
    - [ ] Icon (chore, allowance, penalty)
    - [ ] Description
    - [ ] Amount (+/-)
    - [ ] Date

- [ ] **1.10 Profile / Settings - Both**
  - [ ] User info display:
    - [ ] Avatar
    - [ ] Name
    - [ ] Role (Parent/Child)
    - [ ] Family name
  - [ ] Settings options:
    - [ ] Edit profile
    - [ ] Change password
    - [ ] Notification preferences
    - [ ] Logout

#### **WEB WIREFRAMES (React / Desktop)**

- [ ] **2.1 Parent Dashboard (Full Width)**
  - [ ] Header: Logo + nav + user menu
  - [ ] Left sidebar: Navigation menu (Dashboard, Chores, Children, Rules, Stats, Settings)
  - [ ] Main content area:
    - [ ] "Good morning, Parent Name!" greeting
    - [ ] Key metrics cards (4-column grid):
      - [ ] Total family balance
      - [ ] Pending approvals
      - [ ] Completed this week
      - [ ] Active children
    - [ ] Children overview table/cards:
      - [ ] Name, avatar, current balance, actions
    - [ ] Recent activities feed
  - [ ] Right sidebar (optional):
    - [ ] Quick actions
    - [ ] Notifications

- [ ] **2.2 Chores Management - Web**
  - [ ] Table view with sorting/filtering:
    - [ ] Columns: Title, Assignee, Reward, Status, Deadline, Actions
    - [ ] Inline actions (Edit, Delete, View)
    - [ ] Bulk actions (Select multiple, delete, change status)
  - [ ] Modal detail view for each chore
  - [ ] Inline photo gallery (submitted photos)

- [ ] **2.3 Rules & Penalties - Web**
  - [ ] Penalties rules table:
    - [ ] Rule description, amount, active status
    - [ ] Edit/Delete actions
  - [ ] Add Rule button + form modal
  - [ ] Applied penalties history:
    - [ ] Child name, rule, date, amount

- [ ] **2.4 Family Statistics / Analytics - Web**
  - [ ] Charts section:
    - [ ] Spending trends (line chart, monthly)
    - [ ] Chores completion rate (bar chart)
    - [ ] Balance distribution (pie chart)
    - [ ] Top earners (leaderboard)
  - [ ] Export options (PDF, CSV)

---

## KEY SCREEN DETAILS

### Screen 1: Parent Dashboard (Mobile)

```
┌──────────────────────────────┐
│ [≡] PocketMoney      [⚙️]   │  ← Header
├──────────────────────────────┤
│                              │
│ 👨‍👩‍👧 Famille Dupont          │
│                              │
│ ┌────────────────────────┐  │
│ │ 💰 Total Famille       │  │  ← Quick Stats
│ │ €342.50                │  │
│ │ +€45 ce mois ↑         │  │
│ └────────────────────────┘  │
│                              │
│ ⚠️ 2 corvées en attente    │  ← Alert
│ de validation                │
│                              │
│ Enfants:                     │
│ ┌────────────────────────┐  │
│ │ 👧 Alice (8 ans)       │  │  ← Child Card
│ │ Solde: €127.50         │  │
│ │ [Voir corvées] [+ Ajouter] │
│ └────────────────────────┘  │
│                              │
│ ┌────────────────────────┐  │
│ │ 👦 Bob (11 ans)        │  │
│ │ Solde: €214.00         │  │
│ │ [Voir corvées] [+ Ajouter] │
│ └────────────────────────┘  │
│                              │
│ À valider:                   │
│ ┌────────────────────────┐  │
│ │ 📸 Laver la vaisselle  │  │
│ │ Alice • +15€           │  │
│ │ [✓ Valider] [✕ Rejeter]  │
│ └────────────────────────┘  │
│                              │
│ [🏠 Accueil] [📋 Corvées]  │  ← Tab Bar
│ [👥 Enfants] [⚙️ Param]    │
└──────────────────────────────┘
```

**Key Elements**:
- Large family name/greeting
- Balance card with trend
- Alert for pending actions
- Child cards (quick overview)
- Pending submissions with photo preview
- Bottom navigation

**Interactions**:
- Tap child card → View child's chores
- Tap "+" button → Create new chore
- Tap submission → Expand to full screen
- Swipe to approve/reject

---

### Screen 2: Child Dashboard (Mobile)

```
┌──────────────────────────────┐
│ [< Retour]     Alice    [👤]│  ← Header
├──────────────────────────────┤
│                              │
│   ┌──────────────────┐      │
│   │ 👧 Alice         │      │
│   │ Solde: €127.50   │      │  ← Balance Card
│   │ +€15 ce mois ↑   │      │
│   └──────────────────┘      │
│                              │
│ Corvées disponibles:         │
│ ┌────────────────────────┐  │
│ │ 🧺 Laver la vaisselle  │  │
│ │ Demain • +15€          │  │  ← Chore Card
│ │ [Voir détails]         │  │
│ └────────────────────────┘  │
│                              │
│ ┌────────────────────────┐  │
│ │ 🛏️ Faire le lit        │  │
│ │ Aujourd'hui • +5€      │  │
│ │ [Soumettre]            │  │
│ └────────────────────────┘  │
│                              │
│ Mes objectifs:               │
│ ┌────────────────────────┐  │
│ │ 🎮 Nintendo Switch     │  │
│ │ Objectif: €300         │  │  ← Goal Card
│ │ Épargne: €127          │  │
│ │ ████░░░░░░ 42%         │  │
│ └────────────────────────┘  │
│                              │
│ [🏠 Accueil] [📋 Corvées]  │
│ [🎯 Objectifs] [👤 Profil] │
└──────────────────────────────┘
```

**Key Elements**:
- Balance prominently displayed
- Available chores for child
- One-tap submission
- Goal progress with visual feedback
- Bottom tab bar

**Interactions**:
- Tap chore → Expand details
- "Soumettre" → Camera flow
- Tap goal → View full details
- Swipe left/right → Switch between tabs

---

### Screen 3: Submit Chore (Camera Flow - Mobile)

```
┌──────────────────────────────┐
│ [< Retour] Soumettre  [ℹ]   │
├──────────────────────────────┤
│                              │
│ 🧺 Laver la vaisselle       │  ← Context
│ Récompense: +15€             │
│ Deadline: Demain             │
│                              │
│ ┌────────────────────────┐  │
│ │                        │  │
│ │   📷 Prendre une photo │  │  ← Camera
│ │                        │  │  Preview
│ │      (Camera Preview)  │  │
│ │                        │  │
│ └────────────────────────┘  │
│                              │
│ [🔄 Reprendre] [✓ Accepter] │  ← Controls
│                              │
│ Note (optionnel):            │
│ ┌────────────────────────┐  │
│ │ Vaisselle lavée!       │  │
│ │ Assiettes bien         │  │  ← Optional
│ │ brillantes             │  │  Caption
│ └────────────────────────┘  │
│                              │
│      [Soumettre pour         │
│       validation]            │
│                              │
└──────────────────────────────┘
```

**Key Elements**:
- Context reminder (chore + reward)
- Live camera preview
- Retake/accept controls
- Optional caption
- Large submit button

**Interactions**:
- Camera auto-focuses on activity
- Photo capture → preview
- "Reprendre" → Re-take photo
- "Soumettre" → Send for validation + toast confirmation

---

### Screen 4: Parent Chore Approval (Mobile)

```
┌──────────────────────────────┐
│ [< Retour]  À valider  [...]  │
├──────────────────────────────┤
│                              │
│ ┌────────────────────────┐  │
│ │ 🧺 Laver la vaisselle  │  │
│ │ 👧 Alice               │  │
│ │ Récompense: +15€       │  │  ← Chore Header
│ │ Soumise: il y a 2h     │  │
│ │ Deadline: Demain       │  │
│ └────────────────────────┘  │
│                              │
│ Photo soumise:               │
│ ┌────────────────────────┐  │
│ │                        │  │
│ │    [Alice washing      │  │  ← Full Photo
│ │     dishes photo]      │  │  Preview
│ │                        │  │
│ └────────────────────────┘  │
│                              │
│ Note d'Alice:               │
│ "Vaisselle lavée!"          │
│                              │
│ Commentaires:               │
│ ┌────────────────────────┐  │
│ │ Pas de commentaires    │  │  ← Comment
│ │ [Ajouter un commentaire]  │  Section
│ └────────────────────────┘  │
│                              │
│ ┌──────────┐ ┌────────────┐ │
│ │✕ Rejeter │ │✓ Valider  │ │  ← Actions
│ └──────────┘ └────────────┘ │
│                              │
└──────────────────────────────┘
```

**Key Elements**:
- Large photo preview
- Child's optional note
- Comment section (for feedback)
- Clear action buttons

**Interactions**:
- Tap photo → Full screen zoom
- Tap "Valider" → Confirm dialog → Success toast
- Tap "Rejeter" → Modal with rejection reason → Notification to child

---

### Screen 5: Parent Web Dashboard (Desktop)

```
┌─────────────────────────────────────────────────────────────────────┐
│ [Logo] PocketMoney  │ Dashboard  Corvées  Enfants  Règles  Stats   │
│                                                            [👤 ▼]  │
├─────────────────┬───────────────────────────────────────────────────┤
│                 │                                                   │
│ Navigation:     │ Good morning, Sarah! 👋                           │
│ ────────────    │                                                   │
│ Dashboard ✓     │ ┌─────────────────────────────────────────────┐ │
│                 │ │ Total Famille    Pending      Week Score    │ │
│ Corvées         │ │ €742.50          3 actions    87 corvées    │ │
│ Enfants         │ │ ↑ +€67 this mo   ✓ Complete                │ │
│ Règles          │ └─────────────────────────────────────────────┘ │
│ Statistiques    │                                                   │
│ Paramètres      │ Enfants - Vue d'ensemble:                        │
│                 │ ┌────────────────────────────────────────────┐   │
│                 │ │ Avatar │ Nom    │ Balance │ Status │ Action│   │
│                 │ ├────────────────────────────────────────────┤   │
│                 │ │  👧   │ Alice  │ €127.50 │  ✓    │ View   │   │
│                 │ │  👦   │ Bob    │ €214.00 │  ⚠️   │ Edit   │   │
│                 │ │  👧   │ Claire │ €400.00 │  ✓    │ Delete │   │
│                 │ └────────────────────────────────────────────┘   │
│                 │                                                   │
│                 │ À approuver:                                     │
│                 │ ┌────────────────────────────────────────────┐   │
│                 │ │ 📸 Laver vaisselle   Alice   +15€  il y a 2h│  │
│                 │ │ 📸 Faire le lit      Bob     +5€   il y a 1h│  │
│                 │ │ 📸 Tondre la pelouse Claire  +30€  il y a 30m│ │
│                 │ └────────────────────────────────────────────┘   │
│                 │                                                   │
└─────────────────┴───────────────────────────────────────────────────┘
```

**Key Sections**:
- Left sidebar: Persistent navigation
- Top header: Logo + nav + user menu
- Main content:
  - Key metrics (4-column cards)
  - Children table (sortable, searchable)
  - Pending actions list (with inline actions)

**Interactions**:
- Click nav items → Swap main content
- Click child row → Expand details / open modal
- Click pending action → Open full approval modal with photo zoom
- Click "View" → Open child dashboard

---

### Screen 6: Create Chore Form (Both Mobile & Web)

```
Mobile:                          Web (Desktop Modal):
┌──────────────────────┐         ┌────────────────────────────────┐
│ [< Retour] + Corvée  │         │ Nouvelle Corvée              [X]│
├──────────────────────┤         ├────────────────────────────────┤
│                      │         │                                │
│ Titre *              │         │ Titre *                        │
│ ┌──────────────────┐ │         │ ┌────────────────────────────┐│
│ │ Laver la vaisselе│ │         │ │ Laver la vaisselle         ││
│ └──────────────────┘ │         │ └────────────────────────────┘│
│                      │         │                                │
│ Description          │         │ Description                    │
│ ┌──────────────────┐ │         │ ┌────────────────────────────┐│
│ │ Laver et sécher  │ │         │ │ Laver et sécher tous les   ││
│ │ tous les plats...│ │         │ │ plats...                   ││
│ └──────────────────┘ │         │ └────────────────────────────┘│
│                      │         │                                │
│ Montant * €          │         │ Montant * €                    │
│ ┌──────────────────┐ │         │ ┌────────────────────────────┐│
│ │ 15.00            │ │         │ │ 15.00                      ││
│ └──────────────────┘ │         │ └────────────────────────────┘│
│                      │         │                                │
│ Assigné à *          │         │ Assigné à *                    │
│ ◉ Alice (8 ans)      │         │ ◉ Alice (8 ans)               │
│ ○ Bob (11 ans)       │         │ ○ Bob (11 ans)                │
│ ○ Famille entière    │         │ ○ Famille entière             │
│                      │         │                                │
│ Date limite *        │         │ Date limite *                  │
│ ┌──────────────────┐ │         │ ┌────────────────────────────┐│
│ │ Demain, 18h00 ▼ │ │         │ │ Demain, 18h00       [📅]  ││
│ └──────────────────┘ │         │ └────────────────────────────┘│
│                      │         │                                │
│  [Créer corvée]      │         │ [Annuler]  [Créer corvée]    │
│                      │         │                                │
└──────────────────────┘         └────────────────────────────────┘
```

**Form Validation**:
- Title: Required, min 3 chars, max 100
- Amount: Required, > 0, decimal allowed
- Assignee: Required
- Deadline: Required, must be in future

**Interaction**:
- Real-time validation (error appears on blur)
- "Créer" button disabled until valid
- Success screen with chore details

---

## MOBILE SCREEN FLOW DIAGRAM

```
┌─────────────────┐
│  Splash (3s)    │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│ Welcome Screen          │
│ [Parent / Child Toggle] │
└────────┬────────────────┘
         │
      ┌──┴──┐
      ▼     ▼
  Parent  Child
    │       │
    ▼       ▼
  SignUp  SignUp
    │       │
    ▼       ▼
  CreateFamily / JoinFamily
    │       │
    ▼       ▼
  AddChildren  Permissions
    │       │
    ▼       ▼
  Dashboard Dashboard
  (Parent) (Child)
    │       │
    ├───────┼──────────────┐
    │       │              │
    ▼       ▼              ▼
  Chores  Chores  →  Submit  →  Success
  (list) (available)  Chore     Toast
    │
    ▼
  Create
  Chore
```

---

## INTERACTION PATTERNS

### Camera Permission Flow

1. Child taps "Soumettre Corvée"
2. If camera not permitted:
   - Show dialog: "PocketMoney a besoin d'accès à la caméra"
   - [Autoriser] [Non merci]
3. If denied, show: "Camera permission required"
4. If allowed:
   - Open camera preview full-screen
   - Show capture button (circle at bottom)
   - Auto-focus on tap

### Photo Upload Success

1. Photo captured
2. Show small preview thumbnail
3. Toast at top: "✓ Photo capturée!"
4. Auto-focus on next step (caption textarea)
5. "Soumettre" button animates to green

### Chore Approval (Parent)

1. Parent sees pending submission
2. Taps to expand full view
3. Views photo (can zoom by pinch)
4. Can add comment before deciding
5. Taps [✓ Valider]:
   - Confirmation dialog appears
   - On confirm: Dialog closes
   - Toast: "✓ Corvée validée! Alice a reçu €15"
   - Chore disappears from pending list
   - Child gets notification: "Maman a validé ta corvée!"
   - Child's balance updates with animation

### Balance Update Animation

1. When balance changes:
   - Old amount: white text
   - New amount: "pulse" animation (green 2x size, back to normal)
   - Duration: 0.6s
   - Trend arrow updates (↑ or ↓)

---

## RESPONSIVE BREAKPOINTS

### Mobile (< 768px)

- Vertical layout
- Full-width cards
- Bottom navigation tabs
- Touch-friendly 48x48px targets
- Single column grid

### Tablet (768px - 1024px)

- Two-column grid for some content
- Horizontal navigation option
- Still bottom nav primary
- Side-by-side cards

### Desktop (> 1024px)

- Left sidebar navigation (persistent)
- Three-column grid
- Top header
- Hover states active
- Modals for detail views

---

## TESTING CHECKLIST (For Designers)

- [ ] All buttons have hover states (desktop)
- [ ] All buttons have active/pressed states
- [ ] Form inputs have focus states (blue outline)
- [ ] Error messages are clearly visible and in red
- [ ] Success messages use green
- [ ] Loading states have spinner animation
- [ ] All text meets 4.5:1 contrast ratio (WCAG AA)
- [ ] Icons have labels or descriptive aria-labels
- [ ] Touch targets are minimum 48x48px
- [ ] No content hidden by mobile notch/safe areas
- [ ] Tablet layout tested (iPad dimensions)
- [ ] Desktop layout tested (1920px width)
- [ ] Camera flow works on both iOS & Android
- [ ] Photos display properly after upload
- [ ] Animations are smooth (60fps)
- [ ] No layout shifts when loading images

---

## HANDOFF CHECKLIST (For Developers)

Before developers start coding, designers should provide:

- [ ] **Figma file** with all screens, components, variants
- [ ] **Design System file** (colors, typography, spacing, animations)
- [ ] **Storybook preview** (if using React)
- [ ] **Font files** (local or CDN links for Syne, DM Sans, JetBrains Mono)
- [ ] **Icon pack** (SVG exports or icon font)
- [ ] **Image assets** (logos, illustrations, placeholders)
- [ ] **Interaction specs** (Framer/Loom videos of complex flows)
- [ ] **Responsive breakpoints** defined
- [ ] **Accessibility guidelines** (WCAG AA checklist)
- [ ] **Browser/device support** (Chrome 90+, Safari 14+, iOS 14+, Android 6+)
- [ ] **Performance targets** (LCP < 2.5s, CLS < 0.1)

---

## DEVELOPER HANDOFF TEMPLATE

```markdown
## Screen: [Screen Name]

**Status**: ◯ Design / ◉ Ready for Dev / ◯ In Progress / ◯ QA

### Overview
[Brief description of screen purpose and context]

### Components Used
- Button (primary, success)
- Card (standard)
- Input (text, textarea)
- Modal

### Key Interactions
1. User taps [element] → [animation] → [state change]
2. Form submission → Validation → Success/Error toast

### Responsive Behavior
- Mobile: [description]
- Tablet: [description]
- Desktop: [description]

### Figma Link
[Link to Figma component/frame]

### Notes for Dev
- Camera integration required
- Photo preview must be zoomable
- Form validation real-time (debounced 300ms)
```

---

## NEXT STEPS

1. **Create Figma file** with all screens
2. **Build component library** in Figma
3. **Export design system** to documentation
4. **Create Storybook** for React components
5. **Handoff to developers** with Figma + specs
6. **Iterate based on feedback**
7. **QA design implementation** in browser/app

---

**Version**: 1.0 | **Last Updated**: 2026
