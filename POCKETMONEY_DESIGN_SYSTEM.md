# PocketMoney - Design System & Frontend Specifications

**Version**: 1.0 | **Audience**: UX/UI Designers & Frontend Developers  
**Status**: Ready for Implementation | **Last Updated**: 2026

---

## TABLE OF CONTENTS

1. [Design Philosophy](#1-design-philosophy)
2. [Color System](#2-color-system)
3. [Typography](#3-typography)
4. [Component Library](#4-component-library)
5. [Layout & Spacing](#5-layout--spacing)
6. [Icons & Illustrations](#6-icons--illustrations)
7. [Animations & Micro-interactions](#7-animations--micro-interactions)
8. [Mobile Design Guidelines](#8-mobile-design-guidelines)
9. [Web Design Guidelines](#9-web-design-guidelines)
10. [Screens & User Flows](#10-screens--user-flows)
11. [Accessibility Guidelines](#11-accessibility-guidelines)
12. [Dev Implementation Guide](#12-dev-implementation-guide)

---

## 1. DESIGN PHILOSOPHY

### Core Principles

| Principle | Definition | Example |
|-----------|-----------|---------|
| **Playful yet Professional** | Gamification is fun, but parents need to trust us | Bright accents (acid green) + calm neutrals (grays) |
| **Family-Centric** | Every screen should feel inclusive & multi-user | Avatar display for all family members |
| **Clear Hierarchy** | Parents scan quickly; children explore playfully | Large CTA buttons, color-coded sections |
| **Accessible by Default** | WCAG AA minimum (AAA where possible) | High contrast, large touch targets (48px min) |
| **Fast & Responsive** | Snappy interactions, mobile-first | Instant feedback on chore submission |

### Target Audience Personas

#### **Parent (Age 30-50, Primary User)**
- Uses app 2-3x daily (5 min sessions)
- Wants quick dashboard overview
- Approves chores, applies penalties, monitors balance
- Needs: **Clear data, fast actions, trust signals**
- Design approach: *Dashboard-heavy, data-driven*

#### **Child (Age 8-17, Secondary User)**
- Uses app 1-2x daily (10-15 min sessions)
- Wants to see rewards, submit chores, customize avatar
- Gamification is key motivation
- Needs: **Progress visibility, rewards, fun**
- Design approach: *Avatar-centric, celebration moments*

---

## 2. COLOR SYSTEM

### Primary Colors

```
┌─────────────────────────────────────────────────────────┐
│ BRAND PALETTE                                             │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  Primary Blue        Secondary Green     Accent Violet   │
│  #2E75B6            #B9FF4B              #7B61FF         │
│  ████████████       ███████████          ████████████    │
│  Navy trust         Acid energy          Creative magic  │
│                                                           │
│  Light Blue         Light Green          Light Violet    │
│  #E7F0F7            #F0FF99              #EAE4FF         │
│  ████████████       ████████████         ████████████    │
│  Calm backgrounds   Highlight states     UI accents      │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

### Neutral Colors

```css
/* Neutral Palette (Light Mode) */
--neutral-0: #FFFFFF      /* Pure white */
--neutral-50: #FAFBFC     /* Almost white */
--neutral-100: #F3F5F7    /* Light gray (backgrounds) */
--neutral-200: #E8EAED    /* Dividers, borders */
--neutral-300: #D8DCDF    /* Secondary text */
--neutral-400: #9CA3AF    /* Tertiary text */
--neutral-500: #6B7280    /* Body text */
--neutral-600: #4B5563    /* Bold text */
--neutral-700: #2D3748    /* Headings */
--neutral-800: #1F2937    /* Dark headings */
--neutral-900: #111827    /* Near black */
```

### Semantic Colors

```css
/* Success, Warning, Error, Info */
--success: #10B981       /* Green (chore completed) */
--warning: #F59E0B       /* Amber (pending approval) */
--error: #EF4444         /* Red (rejected, overdue) */
--info: #3B82F6          /* Blue (notifications) */

/* Darker variants for text/hover */
--success-dark: #059669
--warning-dark: #D97706
--error-dark: #DC2626
--info-dark: #1D4ED8
```

### Usage Guidelines

| Color | Primary Use | Accessibility |
|-------|-----------|-----------------|
| **#2E75B6 (Primary Blue)** | Headers, buttons, navigation | Text on white: ✓ (8.5:1) |
| **#B9FF4B (Acid Green)** | CTAs, success states, achievements | Use only for backgrounds/icons (needs dark text) |
| **#7B61FF (Violet)** | Secondary actions, premium features | Text on white: ✓ (5.8:1) |
| **#10B981 (Success Green)** | Chore completed, balance increase | ✓ (4.5:1) |
| **#EF4444 (Red)** | Errors, penalties, declined | ✓ (5.3:1) |
| **Neutrals** | Body text, dividers, backgrounds | Use --neutral-500+ for body text |

### Dark Mode (Future V2)

```css
/* Dark mode inverts palette but maintains contrast */
--dark-bg-primary: #0F172A     /* Near black background */
--dark-bg-secondary: #1E293B   /* Slightly lighter */
--dark-text-primary: #F1F5F9   /* Almost white text */

/* Colors remain the same for consistency */
--primary-blue: #60A5FA  /* Lightened for contrast */
--accent-green: #BBF7D0  /* Lightened */
--accent-violet: #D8B4FE /* Lightened */
```

---

## 3. TYPOGRAPHY

### Font Stack

```css
/* Primary Font (Headings, Bold) */
--font-heading: 'Syne', system-ui, -apple-system, sans-serif;
font-weight: 600, 700;
letter-spacing: -0.5px;  /* Tight, modern feel */

/* Secondary Font (Body, UI Labels) */
--font-body: 'DM Sans', system-ui, -apple-system, sans-serif;
font-weight: 400, 500;
letter-spacing: 0;

/* Monospace (Code, Numbers) */
--font-mono: 'JetBrains Mono', 'SF Mono', monospace;
font-weight: 500;
```

### Type Scale

```
┌─────────────────────────────────────────────────────┐
│ HIERARCHY (Mobile First Sizing)                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│ H1 (Display)      48px / 56px    Bold, Syne        │
│ H2 (Page Title)   32px / 40px    Bold, Syne        │
│ H3 (Section)      24px / 32px    Semi-Bold, Syne   │
│ H4 (Subsection)   20px / 28px    Semi-Bold, Syne   │
│ H5 (Label)        16px / 24px    Medium, DM Sans   │
│ Body Large        16px / 24px    Regular, DM Sans  │
│ Body Regular      14px / 20px    Regular, DM Sans  │
│ Body Small        12px / 16px    Regular, DM Sans  │
│ Caption           11px / 14px    Regular, DM Sans  │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Web Scaling (Desktop)

```css
/* Increase 1.2x for desktop readability */
h1 { font-size: 48px; }  /* Mobile */
@media (min-width: 768px) {
  h1 { font-size: 56px; }  /* Tablet+ */
}

h2 { font-size: 32px; }  /* Mobile */
@media (min-width: 768px) {
  h2 { font-size: 40px; }
}
```

### Usage

| Level | Purpose | Weight | Family |
|-------|---------|--------|--------|
| **H1** | Page titles, hero sections | 700 | Syne |
| **H2** | Section titles, modals | 600 | Syne |
| **H3** | Card titles, subsections | 600 | Syne |
| **H4** | Form labels, list items | 500 | DM Sans |
| **Body** | Descriptive text, CTAs | 400 | DM Sans |
| **Small** | Helper text, timestamps | 400 | DM Sans |

---

## 4. COMPONENT LIBRARY

### 4.1 Buttons

```jsx
// PRIMARY BUTTON (CTAs)
<Button variant="primary" size="lg">
  Soumettre Corvée
</Button>

/* Specs */
background: #2E75B6 (--primary-blue);
color: white;
padding: 12px 24px;
border-radius: 8px;
font-size: 16px;
font-weight: 500;
min-width: 48px;  /* Touch target */
min-height: 48px;
cursor: pointer;
transition: background-color 0.2s ease;

&:hover { background: #1d5a94; }
&:active { transform: scale(0.98); }
&:disabled { opacity: 0.5; cursor: not-allowed; }
```

```jsx
// SECONDARY BUTTON
<Button variant="secondary" size="md">
  Annuler
</Button>

/* Specs */
background: #E7F0F7;  /* Light blue */
color: #2E75B6;
border: 1px solid #2E75B6;
padding: 10px 20px;
border-radius: 8px;

&:hover { background: #D5E5F1; }
```

```jsx
// SUCCESS BUTTON (Approve chore)
<Button variant="success" size="lg">
  ✓ Valider
</Button>

/* Specs */
background: #10B981;  /* Success green */
color: white;
```

```jsx
// DANGER BUTTON (Reject, delete)
<Button variant="danger" size="md">
  ✕ Rejeter
</Button>

/* Specs */
background: #EF4444;  /* Error red */
color: white;
```

```jsx
// TERTIARY BUTTON (Less prominent)
<Button variant="tertiary">
  En savoir plus
</Button>

/* Specs */
background: transparent;
color: #2E75B6;
border: none;
text-decoration: underline;
padding: 8px 12px;
```

**Button Sizing**

```css
/* All buttons have min-height: 48px (touch-friendly) */

--size-sm: { padding: 6px 12px; font-size: 12px; }
--size-md: { padding: 10px 20px; font-size: 14px; }
--size-lg: { padding: 12px 24px; font-size: 16px; }
--size-xl: { padding: 16px 32px; font-size: 18px; }
```

---

### 4.2 Form Elements

#### **Input Field**

```jsx
<Input 
  type="text" 
  label="Nom de la corvée"
  placeholder="ex: Laver la vaisselle"
  error={false}
  helper="Donne un titre clair"
/>

/* Specs */
width: 100%;
padding: 12px 16px;
border: 2px solid #E8EAED;
border-radius: 8px;
font-family: 'DM Sans';
font-size: 16px;
transition: border-color 0.2s;

&:focus {
  border-color: #2E75B6;
  box-shadow: 0 0 0 3px rgba(46, 117, 182, 0.1);
  outline: none;
}

&:disabled {
  background: #F3F5F7;
  color: #9CA3AF;
  cursor: not-allowed;
}

/* Error state */
&.error {
  border-color: #EF4444;
  color: #EF4444;
}

/* Helper text below input */
.helper-text {
  font-size: 12px;
  color: #9CA3AF;
  margin-top: 4px;
}
```

#### **Textarea**

```jsx
<Textarea
  label="Description"
  placeholder="Détails supplémentaires..."
  rows={4}
/>

/* Specs */
Same as input, but:
resize: vertical;
min-height: 100px;
```

#### **Select Dropdown**

```jsx
<Select
  label="Fréquence de l'argent de poche"
  options={[
    { value: 'weekly', label: 'Hebdomadaire' },
    { value: 'biweekly', label: 'Bi-hebdomadaire' },
    { value: 'monthly', label: 'Mensuelle' }
  ]}
/>

/* Specs */
Same as input;
appearance: none;  /* Remove default styling */
background-image: url('chevron-down.svg');
background-position: right 12px center;
background-repeat: no-repeat;
padding-right: 40px;
cursor: pointer;
```

#### **Checkbox**

```jsx
<Checkbox
  label="Appliquer à tous les enfants"
  checked={false}
  onChange={(val) => setApplyAll(val)}
/>

/* Specs */
width: 20px;
height: 20px;
border: 2px solid #E8EAED;
border-radius: 4px;
cursor: pointer;
accent-color: #2E75B6;

&:checked {
  background: #2E75B6;
  border-color: #2E75B6;
}

/* Custom checkbox (if using custom styling) */
&::after {
  content: '✓';
  color: white;
  font-weight: bold;
}
```

#### **Radio Button**

```jsx
<RadioGroup name="corvee-assignee">
  <Radio value="child1" label="Alice (8 ans)" />
  <Radio value="child2" label="Bob (11 ans)" />
  <Radio value="family" label="Famille entière" />
</RadioGroup>

/* Specs */
width: 20px;
height: 20px;
border: 2px solid #E8EAED;
border-radius: 50%;
cursor: pointer;
accent-color: #2E75B6;

&:checked {
  border-color: #2E75B6;
  background: radial-gradient(circle, #2E75B6 30%, transparent 70%);
}
```

#### **Toggle Switch**

```jsx
<Toggle
  label="Actif"
  checked={true}
  onChange={(val) => setActive(val)}
/>

/* Specs */
width: 44px;
height: 24px;
border-radius: 12px;
background: #E8EAED;
cursor: pointer;
transition: background 0.3s;

&.active {
  background: #10B981;
}

/* Thumb (circle) */
.thumb {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: white;
  position: absolute;
  top: 2px;
  left: 2px;
  transition: transform 0.3s;
}

&.active .thumb {
  transform: translateX(20px);
}
```

#### **File Upload (Photo)**

```jsx
<FileUpload
  label="Photo de la corvée"
  accept="image/*"
  onUpload={(file) => submitChore(file)}
  hint="Fichiers JPG, PNG jusqu'à 5MB"
/>

/* Specs */
border: 2px dashed #B9FF4B;
border-radius: 8px;
padding: 32px 24px;
text-align: center;
background: rgba(185, 255, 75, 0.05);
cursor: pointer;
transition: border-color 0.2s;

&:hover {
  border-color: #7B61FF;
  background: rgba(123, 97, 255, 0.05);
}

/* Drag-and-drop state */
&.drag-over {
  border-color: #2E75B6;
  background: rgba(46, 117, 182, 0.1);
}

/* Upload preview */
.preview {
  max-width: 100%;
  max-height: 200px;
  border-radius: 8px;
  margin-top: 16px;
}
```

#### **Amount Input (Currency)**

```jsx
<Input
  type="number"
  label="Montant de récompense"
  prefix="€"
  placeholder="15.00"
  step="0.5"
  min="0"
/>

/* Specs */
Same as input with:
.prefix {
  position: absolute;
  left: 12px;
  color: #6B7280;
  font-weight: 500;
}
input { padding-left: 32px; }
```

---

### 4.3 Cards & Containers

#### **Card (Generic Container)**

```jsx
<Card elevation="medium">
  <Card.Header>
    <h3>Titre de la carte</h3>
  </Card.Header>
  <Card.Body>
    Contenu...
  </Card.Body>
  <Card.Footer>
    <Button>Action</Button>
  </Card.Footer>
</Card>

/* Specs */
background: white;
border-radius: 12px;
padding: 16px;
box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
border: 1px solid #E8EAED;

/* Elevation levels */
--elevation-low: 0 1px 2px rgba(0, 0, 0, 0.05);
--elevation-medium: 0 4px 6px rgba(0, 0, 0, 0.1);
--elevation-high: 0 10px 15px rgba(0, 0, 0, 0.15);

&:hover {
  box-shadow: var(--elevation-medium);
  transition: box-shadow 0.2s ease;
}
```

#### **Chore Card (Custom)**

```jsx
<ChoreCard
  title="Laver la vaisselle"
  reward={15}
  assignee="Alice"
  deadline="Demain"
  status="pending"
/>

/* Specs */
background: linear-gradient(135deg, #E7F0F7 0%, #F0FF99 100%);
border-left: 4px solid #2E75B6;
padding: 16px;
border-radius: 8px;

/* Status indicators */
&[status="pending"] { border-left-color: #F59E0B; }
&[status="completed"] { border-left-color: #10B981; }
&[status="rejected"] { border-left-color: #EF4444; }
&[status="family"] { border-left-color: #B9FF4B; }
```

#### **Balance Display Card**

```jsx
<BalanceCard
  childName="Alice"
  balance={127.50}
  trend={+15}  /* Trend this month */
/>

/* Specs */
background: linear-gradient(135deg, #2E75B6 0%, #1d5a94 100%);
color: white;
padding: 24px;
border-radius: 12px;
box-shadow: var(--elevation-medium);

.balance-amount {
  font-size: 36px;
  font-weight: 700;
  font-family: 'JetBrains Mono';
  margin: 16px 0;
}

.trend {
  color: #10B981;  /* Green for positive */
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 4px;
}

&[trend="negative"] .trend { color: #EF4444; }
```

---

### 4.4 Navigation & Tabs

#### **Bottom Tab Bar (Mobile)**

```jsx
<TabBar>
  <Tab icon="home" label="Accueil" active />
  <Tab icon="tasks" label="Corvées" />
  <Tab icon="target" label="Objectifs" />
  <Tab icon="user" label="Profil" />
</TabBar>

/* Specs */
position: fixed;
bottom: 0;
width: 100%;
height: 64px;
background: white;
border-top: 1px solid #E8EAED;
display: flex;
justify-content: space-around;
box-shadow: 0 -2px 4px rgba(0, 0, 0, 0.05);

.tab {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  cursor: pointer;
  color: #6B7280;
  transition: color 0.2s;
}

.tab.active {
  color: #2E75B6;
  
  .icon {
    background: rgba(46, 117, 182, 0.1);
    border-radius: 8px;
    padding: 4px;
  }
}

.label {
  font-size: 11px;
  font-weight: 500;
}
```

#### **Top Navigation (Web Desktop)**

```jsx
<Header>
  <Logo>PocketMoney</Logo>
  <Nav>
    <NavLink href="/dashboard">Tableau de bord</NavLink>
    <NavLink href="/chores">Corvées</NavLink>
    <NavLink href="/stats">Statistiques</NavLink>
  </Nav>
  <UserMenu>
    <Avatar src={avatarUrl} />
  </UserMenu>
</Header>

/* Specs */
height: 64px;
background: white;
border-bottom: 1px solid #E8EAED;
display: flex;
align-items: center;
justify-content: space-between;
padding: 0 24px;
box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);

.logo {
  font-size: 20px;
  font-weight: 700;
  color: #2E75B6;
  display: flex;
  align-items: center;
  gap: 8px;
}

.nav-link {
  color: #6B7280;
  font-size: 14px;
  font-weight: 500;
  text-decoration: none;
  padding: 8px 12px;
  border-radius: 6px;
  transition: color 0.2s;

  &:hover { color: #2E75B6; }
  &.active { color: #2E75B6; background: #E7F0F7; }
}
```

---

### 4.5 Modals & Dialogs

#### **Modal (Generic)**

```jsx
<Modal open={isOpen} onClose={handleClose}>
  <Modal.Header>
    <h2>Titre du modal</h2>
    <button onClick={onClose}>✕</button>
  </Modal.Header>
  <Modal.Body>
    Contenu...
  </Modal.Body>
  <Modal.Footer>
    <Button variant="secondary">Annuler</Button>
    <Button variant="primary">Confirmer</Button>
  </Modal.Footer>
</Modal>

/* Specs */
.overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  max-width: 500px;
  width: 90vw;
  max-height: 90vh;
  overflow-y: auto;
  z-index: 1001;
}

/* Mobile adjustments */
@media (max-width: 600px) {
  .modal {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    width: 100%;
    border-radius: 16px 16px 0 0;
    max-height: 85vh;
  }
}
```

#### **Confirmation Dialog**

```jsx
<Dialog
  title="Confirmer la validation"
  message="La corvée 'Laver la vaisselle' est complétée?"
  confirmText="Oui, valider"
  cancelText="Non"
  onConfirm={handleConfirm}
/>

/* Specs */
Same as modal but smaller:
max-width: 360px;
text-align: center;

.message {
  font-size: 16px;
  color: #4B5563;
  margin: 16px 0 24px 0;
}
```

---

### 4.6 Alerts & Toasts

#### **Toast Notification**

```jsx
<Toast
  type="success"
  message="Corvée validée! +15€"
  duration={3000}
  position="top-right"
/>

/* Specs */
position: fixed;
top: 16px;
right: 16px;
background: #10B981;
color: white;
padding: 12px 16px;
border-radius: 8px;
box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
z-index: 2000;
animation: slideIn 0.3s ease-out;

/* Variants */
&[type="success"] { background: #10B981; }
&[type="error"] { background: #EF4444; }
&[type="warning"] { background: #F59E0B; }
&[type="info"] { background: #3B82F6; }

/* Auto-dismiss animation */
@keyframes slideIn {
  from { transform: translateX(400px); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}

@keyframes slideOut {
  from { transform: translateX(0); opacity: 1; }
  to { transform: translateX(400px); opacity: 0; }
}
```

#### **Alert Banner**

```jsx
<Alert
  type="warning"
  title="Corvée en retard"
  message="La corvée 'Faire le lit' est due aujourd'hui!"
  action={<Button size="sm">Voir</Button>}
/>

/* Specs */
background: #FEF3C7;
border-left: 4px solid #F59E0B;
padding: 16px;
border-radius: 8px;
display: flex;
align-items: flex-start;
gap: 12px;

.icon {
  font-size: 20px;
  flex-shrink: 0;
}

.content {
  flex: 1;
}

.title {
  font-weight: 600;
  color: #D97706;
  font-size: 14px;
}

.message {
  color: #6B7280;
  font-size: 13px;
  margin-top: 4px;
}

/* Variants */
&[type="error"] {
  background: #FEE2E2;
  border-left-color: #EF4444;

  .title { color: #DC2626; }
}

&[type="success"] {
  background: #ECFDF5;
  border-left-color: #10B981;

  .title { color: #059669; }
}
```

---

### 4.7 Badges & Labels

#### **Badge**

```jsx
<Badge variant="primary" size="md">Nouveau</Badge>
<Badge variant="success">Complétée</Badge>
<Badge variant="warning">En attente</Badge>

/* Specs */
display: inline-block;
padding: 4px 12px;
border-radius: 16px;
font-size: 12px;
font-weight: 600;
text-transform: uppercase;
letter-spacing: 0.5px;

/* Variants */
&[variant="primary"] {
  background: #E7F0F7;
  color: #2E75B6;
}

&[variant="success"] {
  background: #ECFDF5;
  color: #10B981;
}

&[variant="warning"] {
  background: #FEF3C7;
  color: #F59E0B;
}

&[variant="error"] {
  background: #FEE2E2;
  color: #EF4444;
}

/* Sizes */
&[size="sm"] { padding: 2px 8px; font-size: 10px; }
&[size="lg"] { padding: 6px 16px; font-size: 13px; }
```

---

### 4.8 Progress Bars

#### **Linear Progress**

```jsx
<ProgressBar
  value={65}  /* 65% */
  max={100}
  color="success"
  label="Objectif: 100€"
/>

/* Specs */
width: 100%;
height: 8px;
background: #E8EAED;
border-radius: 4px;
overflow: hidden;

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #2E75B6, #B9FF4B);
  width: 65%;
  transition: width 0.6s cubic-bezier(0.4, 0.0, 0.2, 1);
  border-radius: 4px;
}

/* Animated */
@keyframes progress-pulse {
  0% { opacity: 0.7; }
  50% { opacity: 1; }
  100% { opacity: 0.7; }
}

&.animated .progress-fill {
  animation: progress-pulse 1.5s ease-in-out infinite;
}

/* Label */
.label {
  font-size: 12px;
  color: #6B7280;
  margin-top: 4px;
  display: flex;
  justify-content: space-between;
}
```

#### **Circular Progress (Avatar Level)**

```jsx
<CircularProgress
  value={75}
  radius={40}
  strokeWidth={4}
  color="success"
/>

/* Specs */
SVG-based progress ring:
<circle
  cx="50%"
  cy="50%"
  r="40"
  fill="none"
  stroke="#E8EAED"
  stroke-width="4"
/>
<circle
  cx="50%"
  cy="50%"
  r="40"
  fill="none"
  stroke="#10B981"
  stroke-width="4"
  stroke-dasharray={circumference}
  stroke-dashoffset={circumference * (1 - 0.75)}
  stroke-linecap="round"
  style={{ transition: 'stroke-dashoffset 0.6s' }}
/>

/* Text in center */
<text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle">
  75%
</text>
```

---

## 5. LAYOUT & SPACING

### Spacing Scale

```css
/* 8px base unit system */
--spacing-0: 0;
--spacing-1: 4px;
--spacing-2: 8px;      /* Base */
--spacing-3: 12px;
--spacing-4: 16px;     /* Most common */
--spacing-5: 20px;
--spacing-6: 24px;
--spacing-8: 32px;
--spacing-10: 40px;
--spacing-12: 48px;
--spacing-16: 64px;
--spacing-20: 80px;
```

### Usage Guidelines

```scss
/* Typical spacing patterns */
margin-bottom: var(--spacing-4);      /* Between elements */
padding: var(--spacing-4) var(--spacing-6);  /* Card/section padding */
gap: var(--spacing-3);                /* Flex/grid gap */
border-radius: var(--spacing-1);      /* Small UI elements */
border-radius: var(--spacing-2);      /* Medium components */
border-radius: var(--spacing-3);      /* Large containers */
```

### Grid System

```css
/* Mobile-first responsive grid */

/* Mobile (320px - 640px) */
@media (max-width: 640px) {
  .grid-container {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--spacing-4);
    padding: var(--spacing-4);
  }
}

/* Tablet (641px - 1024px) */
@media (min-width: 641px) {
  .grid-container {
    grid-template-columns: repeat(2, 1fr);
    gap: var(--spacing-6);
    padding: var(--spacing-6);
  }
}

/* Desktop (1025px+) */
@media (min-width: 1025px) {
  .grid-container {
    grid-template-columns: repeat(3, 1fr);
    gap: var(--spacing-8);
    padding: var(--spacing-8);
  }
}
```

---

## 6. ICONS & ILLUSTRATIONS

### Icon Library

**Source**: Feather Icons (customized) or custom SVG

**Size Scale**:
```css
--icon-16: 16px;   /* Small UI, labels */
--icon-20: 20px;   /* Standard */
--icon-24: 24px;   /* Buttons, cards */
--icon-32: 32px;   /* Large buttons */
--icon-48: 48px;   /* Avatar preview */
--icon-64: 64px;   /* Hero section */
```

### Essential Icons

```
🏠 home              📋 tasks              🎯 target
💰 money             ⚙️ settings           👤 user
✓ check-circle       ✕ x-circle            📸 camera
⏰ clock             🔔 bell               📊 chart
💬 message           🎁 gift               🏆 trophy
⭐ star             🔒 lock               👥 people
🗑️ trash            📤 upload              ⬇️ download
⚠️ alert-triangle    ℹ️ info                🔗 link
```

### Custom Icons (PocketMoney-specific)

| Icon | Purpose | Color | Notes |
|------|---------|-------|-------|
| **Chore Pin** | Chore/task marker | Primary blue | Rounded corners |
| **Coin Stack** | Money/balance | Acid green | 3D perspective |
| **Confetti** | Achievement | Multi-color | Celebration animation |
| **Avatar Frame** | Child avatar | Violet | Premium indicator |
| **Penalty Tag** | Penalty/fine | Error red | Warning style |

### Illustrations (V2 Feature)

For empty states, onboarding, etc.:

```
Style: Hand-drawn, playful, inclusive
Colors: Brand colors + pastels
Format: SVG, responsive scaling
Examples:
  - Empty chores list: Child with empty inbox
  - First setup: Family together building
  - Achievement unlock: Confetti burst
  - Error: Friendly robot with question
```

---

## 7. ANIMATIONS & MICRO-INTERACTIONS

### Animation Principles

- **Duration**: 200-600ms (snappy feedback)
- **Easing**: `cubic-bezier(0.4, 0.0, 0.2, 1)` (standard)
- **Purpose**: Feedback, delight, not distraction

### Common Animations

```css
/* Fade In */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Slide Up */
@keyframes slideUp {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

/* Scale Up (Achievement popup) */
@keyframes scaleUp {
  from { transform: scale(0.8); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

/* Bounce (Notification) */
@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

/* Spin (Loading) */
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Pulse (Pending state) */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
```

### Micro-interactions

#### **Button Hover & Click**

```css
/* Hover: Subtle shadow increase */
button {
  transition: box-shadow 0.2s, transform 0.1s;
}

button:hover {
  box-shadow: 0 4px 12px rgba(46, 117, 182, 0.2);
}

/* Click: Slight press down */
button:active {
  transform: scale(0.98);
}
```

#### **Form Input Focus**

```css
input {
  transition: border-color 0.2s, box-shadow 0.2s;
}

input:focus {
  border-color: #2E75B6;
  box-shadow: 0 0 0 3px rgba(46, 117, 182, 0.1);
}
```

#### **Chore Submission Success**

```css
/* Confetti burst animation */
@keyframes confetti-fall {
  0% { transform: translateY(-100px) rotate(0deg); opacity: 1; }
  100% { transform: translateY(calc(100vh)) rotate(720deg); opacity: 0; }
}

.confetti {
  animation: confetti-fall 2s ease-out forwards;
}
```

#### **Balance Update**

```css
/* Number "pulse" when balance changes */
@keyframes balance-pulse {
  0% { color: #2E75B6; transform: scale(1); }
  50% { color: #10B981; transform: scale(1.1); }
  100% { color: #2E75B6; transform: scale(1); }
}

.balance.updating {
  animation: balance-pulse 0.6s ease-out;
}
```

#### **Skeleton Loading**

```css
@keyframes skeleton-loading {
  0% { background-position: -1000px 0; }
  100% { background-position: 1000px 0; }
}

.skeleton {
  background: linear-gradient(
    90deg,
    #f0f0f0 25%,
    #e0e0e0 50%,
    #f0f0f0 75%
  );
  background-size: 1000px 100%;
  animation: skeleton-loading 2s infinite;
}
```

---

## 8. MOBILE DESIGN GUIDELINES

### Screen Sizes & Breakpoints

```css
/* Breakpoints (min-width) */
--breakpoint-mobile: 320px;
--breakpoint-tablet: 768px;
--breakpoint-desktop: 1024px;
--breakpoint-large: 1280px;
```

### Safe Areas

```css
/* iPhone notch/Dynamic Island padding */
padding-top: max(20px, env(safe-area-inset-top));
padding-left: max(16px, env(safe-area-inset-left));
padding-right: max(16px, env(safe-area-inset-right));
padding-bottom: max(20px, env(safe-area-inset-bottom));

/* Bottom tab bar accounts for safe-area-inset-bottom */
```

### Touch Targets

```css
/* Minimum 48x48px for touch interactions */
button, a, input[type="checkbox"], input[type="radio"] {
  min-width: 48px;
  min-height: 48px;
}

/* Icons inside buttons should not reduce touch target */
button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;  /* Space between icon & text */
}
```

### Spacing on Mobile

```css
/* Comfortable margins */
body {
  padding: 12px;  /* 12px gutters */
}

/* Cards/sections */
.section {
  margin-bottom: 16px;
  padding: 16px;
}

/* Avoid content squishing */
max-width: 100%;
```

### Bottom Sheet / Modal

```css
/* On mobile, modals slide up from bottom */
@media (max-width: 768px) {
  .modal {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    width: 100%;
    max-height: 85vh;
    border-radius: 20px 20px 0 0;
    
    /* iOS rubber-band scroll effect */
    overflow-y: scroll;
    -webkit-overflow-scrolling: touch;
  }
}
```

### Status Bar & Header

```css
/* Always visible header on mobile */
header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

/* Content below header */
main {
  padding-top: 64px;  /* Header height */
  padding-bottom: 64px;  /* Tab bar height */
}
```

---

## 9. WEB DESIGN GUIDELINES

### Desktop Layout

```css
/* Multi-column layout */
.dashboard {
  display: grid;
  grid-template-columns: 250px 1fr 300px;  /* Sidebar, main, right panel */
  gap: 24px;
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

/* Sidebar navigation */
.sidebar {
  position: sticky;
  top: 64px;  /* Below header */
  height: fit-content;
}

/* Main content area */
.main-content {
  min-width: 0;  /* Flex overflow */
}

/* Right panel (stats, quick actions) */
.right-panel {
  position: sticky;
  top: 64px;
  height: fit-content;
}
```

### Hover States

```css
/* Desktop users have hover, mobile users don't */
/* Use media query to only apply on hover-capable devices */

@media (hover: hover) and (pointer: fine) {
  /* Desktop-specific interactions */
  a:hover { color: #2E75B6; }
  button:hover { box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15); }
  
  .card:hover { transform: translateY(-2px); }
}
```

### Responsive Typography

```css
/* Larger fonts on desktop */
h1 {
  font-size: 32px;  /* Mobile */
}

@media (min-width: 768px) {
  h1 { font-size: 40px; }
}

@media (min-width: 1024px) {
  h1 { font-size: 48px; }
}

body {
  font-size: 14px;  /* Mobile */
}

@media (min-width: 768px) {
  body { font-size: 15px; }
}

@media (min-width: 1024px) {
  body { font-size: 16px; }
}
```

### Data Tables

```css
/* Horizontal scroll on mobile, normal table on desktop */
.table-wrapper {
  overflow-x: auto;  /* Mobile scrolling */
}

@media (min-width: 768px) {
  .table-wrapper {
    overflow-x: visible;
  }
}

/* Striped rows for readability */
tbody tr:nth-child(even) {
  background: #F9FAFB;
}

tbody tr:hover {
  background: #F3F5F7;
}
```

---

## 10. SCREENS & USER FLOWS

### Screen List

#### **Onboarding & Auth**
1. **Splash Screen** (3s) → App logo, brand colors
2. **Welcome Screen** → "Bienvenue à PocketMoney"
3. **Role Selection** → Parent / Child toggle
4. **Sign Up / Sign In** → Email, password, family code
5. **Family Setup** → Create or join family, add children
6. **Permission Permissions** (Mobile) → Camera, notifications

#### **Parent Screens**
1. **Dashboard** → Overview of all children, pending actions
2. **Chores List** → Filter by status (pending, completed, rejected)
3. **Chore Details** → View photo, approve/reject, leave comments
4. **Create Chore** → Form with title, reward, deadline, assignee
5. **Children Balance** → List of children with current balance
6. **Rules & Penalties** → Create, edit rules and apply penalties
7. **Allowance Settings** → Configure distribution schedule
8. **Family Analytics** → Charts, spending trends, insights
9. **Settings** → Manage family members, notification preferences
10. **Chore History** → Archive of completed/rejected chores

#### **Child Screens**
1. **Dashboard** → My balance, pending chores, progress toward goals
2. **Available Chores** → Chores I can do (personalized)
3. **Submit Chore** → Camera capture, confirmation
4. **My Chores** → Filter by status (pending, submitted, completed, rejected)
5. **My Goals** → List of financial targets, progress bars
6. **Create Goal** → Form for new savings goal
7. **Expense Requests** → Submit request for spending, view history
8. **Avatar Customization** → Skins, accessories, cosmetics (V2)
9. **Leaderboard** → Sibling comparison (V2)
10. **Messages** → Requests & replies from parents

---

## 11. ACCESSIBILITY GUIDELINES

### WCAG AA Compliance (Minimum Target)

#### **Color Contrast**

```css
/* Minimum 4.5:1 for body text, 3:1 for large text */

/* Check contrast ratios */
body { color: #4B5563; /* 8.5:1 on white */ }
h2 { color: #2E75B6; /* 7.2:1 on white */ }
button { color: white; background: #2E75B6; /* 8.5:1 */ }

/* Avoid relying on color alone */
.status-pending { color: #F59E0B; } /* ✗ Color only */
.status-pending { color: #F59E0B; display: flex; align-items: center; gap: 4px; }
.status-pending::before { content: '⏳'; } /* ✓ Icon + color */
```

#### **Font Sizing**

```css
/* Minimum 14px for body text, never smaller than 12px */
body { font-size: 16px; }
small { font-size: 14px; }
caption { font-size: 13px; }

/* Allow text resizing */
body { font-size: 1rem; }  /* Use rem, not px for mobile zoom */
```

#### **Focus States**

```css
/* All interactive elements need visible focus indicators */
a, button, input, select, textarea {
  outline: none;  /* Remove default outline */
}

a:focus, button:focus, input:focus {
  box-shadow: 0 0 0 3px rgba(46, 117, 182, 0.5);  /* Custom focus ring */
  outline: 2px solid #2E75B6;
}

/* Focus visible (keyboard-only) */
:focus-visible {
  outline: 2px solid #2E75B6;
  outline-offset: 2px;
}
```

#### **Labels & Form**

```jsx
/* Every input needs a label */
<label htmlFor="chore-title">Nom de la corvée</label>
<input id="chore-title" type="text" />

/* Error messages linked to input */
<input
  id="reward"
  aria-invalid={error}
  aria-describedby="reward-error"
/>
<span id="reward-error" role="alert">Le montant doit être > 0</span>
```

#### **Semantic HTML**

```html
<!-- Use semantic elements for structure -->
<header>
  <nav>
    <ul>
      <li><a href="/">Accueil</a></li>
      <li><a href="/chores">Corvées</a></li>
    </ul>
  </nav>
</header>

<main>
  <article>
    <h1>Titre principal</h1>
    <section>
      <h2>Sous-section</h2>
    </section>
  </article>
</main>

<footer>
  <p>&copy; 2026 PocketMoney</p>
</footer>
```

#### **Keyboard Navigation**

```css
/* Tab order follows visual flow */
tabindex: auto;  /* Use semantic elements (button, a, input) */

/* Never use tabindex > 0 */
tabindex: -1;  /* Remove from tab order */
tabindex: 0;   /* Include in tab order */

/* Skip navigation link (hidden by default) */
.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  background: #2E75B6;
  color: white;
  padding: 8px 16px;
  text-decoration: none;
  z-index: 100;
}

.skip-link:focus {
  top: 0;
}
```

#### **Alternative Text**

```html
<!-- Images need alt text -->
<img src="chore.jpg" alt="Alice washing dishes in the kitchen" />

<!-- Icon-only buttons need labels -->
<button aria-label="Supprimer la corvée">
  <Trash2Icon size={24} />
</button>

<!-- SVG icons need title/desc -->
<svg aria-labelledby="trophy-title">
  <title id="trophy-title">Achievement Unlocked</title>
  <path d="..." />
</svg>
```

---

## 12. DEV IMPLEMENTATION GUIDE

### Project Setup

#### **Recommended Tech Stack**

```bash
# Frontend (React)
npx create-react-app pocketmoney-web --template typescript
# OR
npm create vite@latest pocketmoney-web -- --template react-ts

# Mobile (React Native / Expo)
npx create-expo-app pocketmoney-mobile
# OR
npm create expo-app pocketmoney

# Component Library Setup
npm install @storybook/react @storybook/addon-essentials
npm run storybook
```

#### **CSS Architecture (Choose One)**

```bash
# Option 1: Tailwind CSS (Utility-first)
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# Option 2: CSS Modules + Sass
npm install -D sass

# Option 3: Emotion / Styled Components (CSS-in-JS)
npm install @emotion/react @emotion/styled
```

### CSS Variables (All Approaches)

```css
/* globals.css or colors.css */
:root {
  /* Colors */
  --color-primary-blue: #2E75B6;
  --color-accent-green: #B9FF4B;
  --color-accent-violet: #7B61FF;
  --color-success: #10B981;
  --color-warning: #F59E0B;
  --color-error: #EF4444;

  /* Neutrals */
  --color-neutral-50: #FAFBFC;
  --color-neutral-100: #F3F5F7;
  --color-neutral-200: #E8EAED;
  /* ... */

  /* Typography */
  --font-heading: 'Syne', system-ui, sans-serif;
  --font-body: 'DM Sans', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;

  /* Spacing */
  --spacing-1: 4px;
  --spacing-2: 8px;
  --spacing-3: 12px;
  --spacing-4: 16px;
  /* ... */

  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.15);

  /* Border Radius */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-full: 9999px;

  /* Transitions */
  --transition-fast: 200ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-base: 300ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-slow: 600ms cubic-bezier(0.4, 0, 0.2, 1);
}
```

### Component Structure

```
src/
├── components/
│   ├── common/
│   │   ├── Button/
│   │   │   ├── Button.tsx
│   │   │   ├── Button.module.css
│   │   │   ├── Button.test.tsx
│   │   │   └── Button.stories.tsx
│   │   ├── Card/
│   │   ├── Modal/
│   │   └── ...
│   ├── features/
│   │   ├── Chores/
│   │   │   ├── ChoreCard.tsx
│   │   │   ├── ChoreList.tsx
│   │   │   └── CreateChoreForm.tsx
│   │   ├── Balance/
│   │   └── ...
│   └── layout/
│       ├── Header.tsx
│       ├── Sidebar.tsx
│       └── BottomNav.tsx
├── pages/
│   ├── Dashboard.tsx
│   ├── Chores.tsx
│   └── ...
├── styles/
│   ├── globals.css
│   ├── colors.css
│   ├── typography.css
│   └── spacing.css
├── utils/
│   ├── cn.ts         /* Class name utility */
│   ├── colors.ts
│   └── ...
└── App.tsx
```

### Component Example (React + TypeScript)

```typescript
// Button.tsx
import React from 'react';
import styles from './Button.module.css';
import { cn } from '@/utils/cn';

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'success' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  disabled?: boolean;
  loading?: boolean;
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  type?: 'button' | 'submit' | 'reset';
  icon?: React.ReactNode;
  className?: string;
  [key: string]: any;
}

export const Button = ({
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  children,
  onClick,
  type = 'button',
  icon,
  className,
  ...rest
}: ButtonProps) => {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={cn(
        styles.button,
        styles[variant],
        styles[size],
        disabled && styles.disabled,
        loading && styles.loading,
        className
      )}
      {...rest}
    >
      {loading && <span className={styles.spinner} />}
      {icon && <span className={styles.icon}>{icon}</span>}
      {children}
    </button>
  );
};
```

### Storybook Integration

```typescript
// Button.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';

const meta = {
  title: 'Components/Button',
  component: Button,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  argTypes: {
    variant: { control: 'select', options: ['primary', 'secondary', 'success', 'danger'] },
    size: { control: 'select', options: ['sm', 'md', 'lg', 'xl'] },
    disabled: { control: 'boolean' },
    loading: { control: 'boolean' },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    variant: 'primary',
    children: 'Primary Button',
  },
};

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: 'Secondary Button',
  },
};

export const Loading: Story = {
  args: {
    variant: 'primary',
    loading: true,
    children: 'Loading...',
  },
};
```

### Responsive Design Pattern

```typescript
// useResponsive.ts
import { useEffect, useState } from 'react';

type Breakpoint = 'mobile' | 'tablet' | 'desktop';

export const useResponsive = (): Breakpoint => {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>('mobile');

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 768) setBreakpoint('mobile');
      else if (width < 1024) setBreakpoint('tablet');
      else setBreakpoint('desktop');
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return breakpoint;
};

// Usage
const Dashboard = () => {
  const breakpoint = useResponsive();
  return breakpoint === 'mobile' ? <MobileLayout /> : <DesktopLayout />;
};
```

### Testing Pattern

```typescript
// Button.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './Button';

describe('Button', () => {
  it('renders correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('calls onClick handler', async () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    const button = screen.getByText('Click me');
    await userEvent.click(button);
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Click me</Button>);
    expect(screen.getByText('Click me')).toBeDisabled();
  });
});
```

---

## QUICK REFERENCE

### Colors (Copypaste)

```css
Primary: #2E75B6
Green: #B9FF4B
Violet: #7B61FF
Success: #10B981
Warning: #F59E0B
Error: #EF4444
Gray: #4B5563
Light Gray: #E8EAED
```

### Fonts (CDN)

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Syne:wght@400;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
```

### Tailwind Config (if using Tailwind)

```javascript
module.exports = {
  theme: {
    colors: {
      primary: '#2E75B6',
      green: '#B9FF4B',
      violet: '#7B61FF',
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
    },
    fontFamily: {
      heading: ['Syne', 'system-ui'],
      body: ['DM Sans', 'system-ui'],
      mono: ['JetBrains Mono', 'monospace'],
    },
    spacing: {
      1: '4px',
      2: '8px',
      3: '12px',
      4: '16px',
      // ... etc
    },
  },
};
```

---

## NEXT STEPS FOR DESIGN & DEV

1. **[ ] Export design system to Figma file** (all components, colors, typography)
2. **[ ] Set up Storybook** (for design system documentation)
3. **[ ] Create component library** (shared UI components)
4. **[ ] Implement responsive layouts** (mobile-first, tablet, desktop)
5. **[ ] Set up accessibility testing** (axe, WAVE, manual testing)
6. **[ ] Build authentication screens** (sign up, login, family setup)
7. **[ ] Implement chore submission flow** (camera integration, validation)
8. **[ ] Create parent dashboard** (overview, analytics)
9. **[ ] Build child dashboard** (balance, available chores, goals)
10. **[ ] Deploy to staging** (QA, testing before launch)

---

**Version**: 1.0 | **Last Updated**: 2026  
**Design Lead**: [Your Name] | **Dev Lead**: [Your Name]

---
