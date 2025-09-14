# Swiss Platform Theme v2 - PC Solutions Platform

**Design System & Styling Guide**

A comprehensive design system for the PC Solutions Platform, featuring Swiss Modern Minimalism with signature accent stripes, corner notches, and refined micro-interactions.

---

## 🎨 Design Philosophy

### Core Principles
- **Swiss Modern Minimalism:** Clean typography, precise grid, generous white space
- **Signature Accent Stripe:** 2-4px left accent stripe on key surfaces using Swiss Teal
- **Corner Notch Detail:** Subtle 6-8px notch on hero cards/modals for premium touch
- **Soft Elevation:** Thin borders with soft shadows, never heavy at once
- **Micro-motion:** Fast but gentle hover/press with consistent easing
- **Subtle Background Texture:** Light noise/mesh pattern for depth

---

## 🎯 Color Palette

### Brand Colors
```css
/* Primary Brand Colors */
--brand-primary-50:  #eff6ff;  /* Light Blue */
--brand-primary-100: #dbeafe;
--brand-primary-200: #bfdbfe;
--brand-primary-300: #93c5fd;
--brand-primary-400: #60a5fa;
--brand-primary-500: #3b82f6;  /* Main Blue */
--brand-primary-600: #2563eb;
--brand-primary-700: #1d4ed8;
--brand-primary-800: #1e40af;
--brand-primary-900: #1e3a8a;

/* Swiss Accent Colors */
--swiss-mint:      #48CFAE;  /* Success/Positive */
--swiss-sand:      #F3D29E;  /* Warning */
--swiss-coral:     #FE6D73;  /* Danger/Error */
--swiss-teal:      #227C9D;  /* Primary Accent */
--swiss-light:     #F3F4F6;  /* Light Background */
--swiss-charcoal:  #2B2B2B;  /* Dark Text */

/* Neutral Grays */
--gray-50:  #f9fafb;  /* Page Background */
--gray-100: #f3f4f6; /* Swiss Light Gray */
--gray-200: #e5e7eb; /* Borders */
--gray-300: #d1d5db; /* Strong Borders */
--gray-400: #9ca3af; /* Subtle Text */
--gray-500: #6b7280; /* Muted Text */
--gray-600: #4b5563; /* Default Text */
--gray-700: #374151; /* Strong Text */
--gray-800: #1f2937; /* Very Strong Text */
--gray-900: #111827; /* Near Swiss Charcoal */
```

### Semantic Color Mapping
```css
/* Semantic Roles */
--accent:           var(--swiss-teal);      /* Primary accent */
--accent-contrast:  white;                 /* Text on accent */
--danger:           var(--swiss-coral);     /* Errors, destructive actions */
--warn:             var(--swiss-sand);      /* Warnings */
--success:          var(--swiss-mint);      /* Success states */
--info:             var(--brand-primary-500); /* Information */

/* Text Colors */
--text-strong:      var(--gray-900);        /* Headings, important text */
--text-default:     var(--gray-800);        /* Body text */
--text-muted:       var(--gray-600);        /* Secondary text */
--text-subtle:      var(--gray-500);        /* Placeholder, captions */
--text-on-dark:     white;                  /* Text on dark backgrounds */

/* Surface Colors */
--surface-0:        var(--gray-50);         /* Page background */
--surface-1:        white;                  /* Cards, modals */
--surface-2:        var(--gray-50);         /* Subtle backgrounds */
--surface-3:        var(--gray-100);        /* Hover states */

/* Border Colors */
--border:           var(--gray-200);        /* Default borders */
--border-strong:    var(--gray-300);       /* Strong borders */
```

---

## 🌙 Dark Mode Colors

```css
:root.dark {
  /* Text Colors */
  --text-strong:      var(--gray-50);
  --text-default:     var(--gray-100);
  --text-muted:       var(--gray-400);
  --text-subtle:      var(--gray-500);
  --text-on-dark:     var(--gray-900);

  /* Surface Colors */
  --surface-0:        #0c0f14;  /* Dark page background */
  --surface-1:        #11161c;  /* Dark cards */
  --surface-2:        #141a21;  /* Dark subtle backgrounds */
  --surface-3:        #172029;  /* Dark hover states */

  /* Border Colors */
  --border:           #1f2a35;  /* Dark borders */
  --border-strong:    #2a3847;  /* Dark strong borders */

  /* Focus Rings */
  --ring:             color-mix(in oklab, var(--accent) 65%, black 35%);
  --ring-muted:       color-mix(in oklab, var(--accent) 25%, white 75%);
}
```

---

## 📐 Typography Scale

### Font Stack
```css
--font-sans: "Nunito", "Inter", system-ui, -apple-system, Segoe UI, Roboto, Arial, "Apple Color Emoji", "Segoe UI Emoji";
--font-mono: "JetBrains Mono", "Fira Code", "Monaco", "Consolas", monospace;
```

### Line Heights
```css
--leading-tight: 1.15;   /* Headings */
--leading-normal: 1.45;  /* Body text */
--leading-relaxed: 1.6;  /* Long-form content */
```

### Type Scale (Tailwind Classes)
- `text-xs` (12px) - Captions, labels
- `text-sm` (14px) - Small text, metadata
- `text-base` (16px) - Body text
- `text-lg` (18px) - Large body text
- `text-xl` (20px) - Small headings
- `text-2xl` (24px) - Section headings
- `text-3xl` (30px) - Page headings
- `text-4xl` (36px) - Hero headings

---

## 🎭 Border Radius & Spacing

### Border Radius
```css
--radius-xs: 0.375rem;  /* 6px - Small elements */
--radius-sm: 0.5rem;    /* 8px - Default */
--radius-md: 0.75rem;   /* 12px - Cards */
--radius-lg: 1rem;      /* 16px - Large cards */
--radius-full: 999px;   /* Pills, buttons */
```

### Spacing Scale (8pt grid)
- `space-1` (4px) - Micro spacing
- `space-2` (8px) - Small spacing
- `space-3` (12px) - Default spacing
- `space-4` (16px) - Medium spacing
- `space-6` (24px) - Large spacing
- `space-8` (32px) - Section spacing
- `space-12` (48px) - Page spacing

---

## 🌟 Shadows & Elevation

### Shadow Tokens
```css
--shadow-soft:      0 1px 2px rgba(0,0,0,0.04), 0 2px 6px rgba(0,0,0,0.06);
--shadow-float:     0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.06);
--shadow-pop:       0 8px 20px rgba(0,0,0,0.12);
--shadow-inset:     inset 0 1px 0 rgba(255,255,255,0.6), inset 0 -1px 0 rgba(0,0,0,0.04);
```

### Elevation Levels
- **Level 0:** No shadow (page background)
- **Level 1:** `shadow-soft` (cards, inputs)
- **Level 2:** `shadow-float` (hovered cards, dropdowns)
- **Level 3:** `shadow-pop` (modals, tooltips)

---

## ⚡ Motion & Animation

### Easing Functions
```css
--ease-standard: cubic-bezier(.2,.7,.2,1);  /* UI interactions */
--ease-emph:     cubic-bezier(.05,.9,.1,1); /* Hero elements */
```

### Duration Tokens
```css
--dur-100: 120ms;  /* Micro interactions */
--dur-150: 180ms;  /* Hover states */
--dur-200: 220ms;  /* Default transitions */
--dur-300: 300ms;  /* Page transitions */
--dur-500: 480ms;  /* Complex animations */
```

### Animation Classes
```css
.lift {
  transition: transform var(--dur-150) var(--ease-standard), 
              box-shadow var(--dur-150) var(--ease-standard);
}
.lift:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-float);
}

.press:active {
  transform: translateY(0);
  box-shadow: var(--shadow-inset);
}

.fade-in {
  animation: fade-in var(--dur-200) var(--ease-standard) both;
}

.slide-up {
  animation: slide-up var(--dur-200) var(--ease-standard) both;
}
```

---

## 🎨 Signature Components

### Accent Stripe Card
```html
<div class="card-accent">
  <!-- Content with left accent stripe -->
</div>
```

### Corner Notch
```html
<div class="notch-tr">
  <!-- Card with top-right corner notch -->
</div>
```

### Background Textures
```css
.page-bg {
  background-image: var(--bg-noise), var(--bg-accent-mesh);
  background-color: var(--surface-0);
}
```

---

## 🧩 Component Patterns

### Button Variants
```html
<!-- Primary Button -->
<button class="btn-primary">Primary Action</button>

<!-- Secondary Button -->
<button class="btn-secondary">Secondary Action</button>

<!-- Outline Button -->
<button class="btn-outline">Outline Action</button>

<!-- Ghost Button -->
<button class="btn-ghost">Ghost Action</button>

<!-- Danger Button -->
<button class="btn-danger">Delete</button>
```

### Form Elements
```html
<!-- Input Field -->
<div class="form-group">
  <label class="form-label">Email Address</label>
  <input type="email" class="form-input" placeholder="you@example.com" />
  <p class="form-help">We'll never share your email.</p>
</div>

<!-- Select Dropdown -->
<div class="form-group">
  <label class="form-label">Role</label>
  <select class="form-select">
    <option>Select a role</option>
    <option>Foundation</option>
    <option>Educator</option>
  </select>
</div>

<!-- Checkbox -->
<div class="form-checkbox">
  <input type="checkbox" id="terms" class="form-checkbox-input" />
  <label for="terms" class="form-checkbox-label">I agree to the terms</label>
</div>
```

### Card Components
```html
<!-- Basic Card -->
<div class="card">
  <h3 class="card-title">Card Title</h3>
  <p class="card-content">Card content goes here.</p>
</div>

<!-- Accent Card -->
<div class="card-accent">
  <h3 class="card-title">Featured Content</h3>
  <p class="card-content">This card has an accent stripe.</p>
</div>

<!-- Notch Card -->
<div class="card notch-tr">
  <h3 class="card-title">Premium Content</h3>
  <p class="card-content">This card has a corner notch.</p>
</div>
```

### Navigation Patterns
```html
<!-- Tab Navigation -->
<div class="tabs">
  <button class="tab active">Overview</button>
  <button class="tab">Details</button>
  <button class="tab">Activity</button>
</div>

<!-- Breadcrumb -->
<nav class="breadcrumb">
  <a href="/" class="breadcrumb-link">Home</a>
  <span class="breadcrumb-separator">/</span>
  <a href="/dashboard" class="breadcrumb-link">Dashboard</a>
  <span class="breadcrumb-separator">/</span>
  <span class="breadcrumb-current">Settings</span>
</nav>
```

---

## 📱 Layout Patterns

### App Shell
```html
<div class="app-shell">
  <header class="app-header">
    <div class="app-header-content">
      <div class="brand">
        <div class="brand-accent"></div>
        <h1 class="brand-title">PC Solutions</h1>
      </div>
      <nav class="app-nav">
        <!-- Navigation items -->
      </nav>
      <div class="app-actions">
        <!-- User menu, notifications, etc. -->
      </div>
    </div>
  </header>
  
  <main class="app-main">
    <div class="app-content">
      <!-- Page content -->
    </div>
  </main>
  
  <aside class="app-sidebar">
    <!-- Sidebar content -->
    <div class="theme-toggle">
      <button class="theme-toggle-btn">🌙</button>
    </div>
  </aside>
</div>
```

### Grid Layouts
```html
<!-- 3-Column Grid -->
<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
  <div class="col-span-1">Sidebar</div>
  <div class="col-span-2">Main Content</div>
</div>

<!-- Form Layout (3fr-7fr) -->
<form class="grid grid-cols-1 md:grid-cols-10 gap-6">
  <div class="md:col-span-3">
    <div class="card-accent p-4">
      <h4>Profile</h4>
      <p>Basic details</p>
    </div>
  </div>
  <div class="md:col-span-7">
    <div class="card p-5">
      <!-- Form fields -->
    </div>
  </div>
</form>
```

---

## 🎯 Status & Feedback

### Status Indicators
```html
<!-- Success -->
<div class="status-success">
  <div class="status-icon">✓</div>
  <span>Operation completed successfully</span>
</div>

<!-- Warning -->
<div class="status-warning">
  <div class="status-icon">⚠</div>
  <span>Please review your input</span>
</div>

<!-- Error -->
<div class="status-error">
  <div class="status-icon">✕</div>
  <span>Something went wrong</span>
</div>

<!-- Info -->
<div class="status-info">
  <div class="status-icon">ℹ</div>
  <span>Additional information</span>
</div>
```

### Badges & Tags
```html
<!-- Status Badges -->
<span class="badge badge-success">Active</span>
<span class="badge badge-warning">Pending</span>
<span class="badge badge-error">Inactive</span>
<span class="badge badge-info">New</span>

<!-- Role Badges -->
<span class="badge badge-foundation">Foundation</span>
<span class="badge badge-educator">Educator</span>
<span class="badge badge-parent">Parent</span>
```

---

## 🌓 Theme Toggle Implementation

### Theme Toggle Component
```html
<div class="theme-toggle">
  <button 
    class="theme-toggle-btn"
    onclick="toggleTheme()"
    aria-label="Toggle dark mode"
  >
    <span class="theme-icon-light">☀️</span>
    <span class="theme-icon-dark">🌙</span>
  </button>
</div>
```

### JavaScript Implementation
```javascript
function toggleTheme() {
  const root = document.documentElement;
  const isDark = root.classList.contains('dark');
  
  if (isDark) {
    root.classList.remove('dark');
    localStorage.setItem('theme', 'light');
  } else {
    root.classList.add('dark');
    localStorage.setItem('theme', 'dark');
  }
}

// Initialize theme from localStorage
function initTheme() {
  const savedTheme = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
    document.documentElement.classList.add('dark');
  }
}

// Initialize on page load
initTheme();
```

---

## ♿ Accessibility Guidelines

### Contrast Requirements
- **Body text:** Minimum 4.5:1 contrast ratio
- **Large text (18px+):** Minimum 3:1 contrast ratio
- **Interactive elements:** Minimum 3:1 contrast ratio

### Focus Management
- Always provide visible focus indicators
- Use `focus-visible` for keyboard navigation
- Maintain focus order and logical tab sequence

### ARIA Support
- Use semantic HTML elements
- Provide ARIA labels and descriptions
- Support screen reader navigation

### Touch Targets
- Minimum 44×44px touch targets
- Adequate spacing between interactive elements
- Clear visual feedback for touch states

---

## 🚀 Implementation Checklist

### Phase 1: Foundation
- [ ] Add CSS variables to `globals.css`
- [ ] Update Tailwind config with custom tokens
- [ ] Implement theme toggle functionality
- [ ] Add utility classes for signature patterns

### Phase 2: Components
- [ ] Create button component variants
- [ ] Implement form element styles
- [ ] Build card component patterns
- [ ] Add navigation components

### Phase 3: Layout
- [ ] Implement app shell structure
- [ ] Create responsive grid layouts
- [ ] Add sidebar and header components
- [ ] Implement mobile navigation

### Phase 4: Polish
- [ ] Add micro-interactions and animations
- [ ] Implement status and feedback patterns
- [ ] Test accessibility compliance
- [ ] Optimize for performance

---

## 📚 Usage Examples

### Dashboard Card
```html
<div class="card-accent notch-tr lift">
  <div class="card-header">
    <h3 class="card-title">Recent Activity</h3>
    <span class="badge badge-info">3 new</span>
  </div>
  <div class="card-content">
    <p class="text-muted">Your recent platform activity</p>
  </div>
  <div class="card-actions">
    <button class="btn-primary">View All</button>
  </div>
</div>
```

### User Profile Form
```html
<form class="profile-form">
  <div class="form-section">
    <h4 class="form-section-title">Personal Information</h4>
    <div class="form-grid">
      <div class="form-group">
        <label class="form-label">First Name</label>
        <input type="text" class="form-input" />
      </div>
      <div class="form-group">
        <label class="form-label">Last Name</label>
        <input type="text" class="form-input" />
      </div>
    </div>
  </div>
  
  <div class="form-actions">
    <button type="button" class="btn-secondary">Cancel</button>
    <button type="submit" class="btn-primary">Save Changes</button>
  </div>
</form>
```

---

This styling guide provides a comprehensive foundation for implementing the Swiss Platform Theme v2 across the PC Solutions Platform. The design system emphasizes clean aesthetics, accessibility, and consistent user experience while maintaining the signature Swiss design elements.