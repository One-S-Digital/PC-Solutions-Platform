# Translation Developer Guide

## Quick Start

### 1. Using Translations in Components

```typescript
import { useTranslation } from '@workspace/translations';

function MyComponent() {
  const { t } = useTranslation('common');
  
  return (
    <div>
      <h1>{t('welcome.title')}</h1>
      <button>{t('buttons.save')}</button>
    </div>
  );
}
```

### 2. Adding New Translation Keys

```typescript
// 1. Add key to English translation file
// frontend/public/locales/en/common.json
{
  "welcome": {
    "title": "Welcome to ProCrèche"
  }
}

// 2. Use in component
const { t } = useTranslation('common');
return <h1>{t('welcome.title')}</h1>;

// 3. Run translation script
node scripts/translate-complete.mjs
```

### 3. Using Swiss Terminology

```typescript
import { useSwissTerminology } from '@workspace/translations';

function MyComponent() {
  const translateSwiss = useSwissTerminology();
  
  // Automatically translates using Swiss terminology
  const saveText = translateSwiss('Save'); // "Enregistrer" in French
  const cancelText = translateSwiss('Cancel'); // "Annuler" in French
  
  return (
    <div>
      <button>{saveText}</button>
      <button>{cancelText}</button>
    </div>
  );
}
```

## Translation Namespaces

### Common Namespace (`common`)

Use for shared UI elements and common terms:

```typescript
const { t } = useTranslation('common');

// Buttons
t('buttons.save')           // "Save" / "Enregistrer" / "Speichern"
t('buttons.cancel')         // "Cancel" / "Annuler" / "Abbrechen"
t('buttons.submit')         // "Submit" / "Soumettre" / "Absenden"

// Common UI
t('common.loading')         // "Loading..." / "Chargement..." / "Laden..."
t('common.error')           // "Error" / "Erreur" / "Fehler"
t('common.success')         // "Success" / "Succès" / "Erfolg"

// Navigation
t('navigation.home')        // "Home" / "Accueil" / "Startseite"
t('navigation.dashboard')   // "Dashboard" / "Tableau de bord" / "Dashboard"
t('navigation.settings')    // "Settings" / "Paramètres" / "Einstellungen"
```

### Auth Namespace (`auth`)

Use for authentication-related content:

```typescript
const { t } = useTranslation('auth');

// Login
t('login.title')            // "Sign In" / "Se connecter" / "Anmelden"
t('login.email')            // "Email" / "E-mail" / "E-Mail"
t('login.password')         // "Password" / "Mot de passe" / "Passwort"

// Signup
t('signup.title')           // "Create Account" / "Créer un compte" / "Konto erstellen"
t('signup.firstName')       // "First Name" / "Prénom" / "Vorname"
t('signup.lastName')        // "Last Name" / "Nom de famille" / "Nachname"
```

### Dashboard Namespace (`dashboard`)

Use for dashboard-specific content:

```typescript
const { t } = useTranslation('dashboard');

// Dashboard content
t('dashboard.welcome')      // "Welcome to your dashboard" / "Bienvenue sur votre tableau de bord" / "Willkommen in Ihrem Dashboard"
t('dashboard.overview')     // "Overview" / "Aperçu" / "Übersicht"
t('dashboard.analytics')    // "Analytics" / "Analytiques" / "Analytik"
```

## Advanced Usage

### Translation with Variables

```typescript
const { t } = useTranslation('common');

// In translation file
{
  "welcome": {
    "message": "Welcome, {{name}}!"
  }
}

// In component
const userName = "John";
return <h1>{t('welcome.message', { name: userName })}</h1>;
```

### Pluralization

```typescript
const { t } = useTranslation('common');

// In translation file
{
  "items": {
    "count": "{{count}} item",
    "count_plural": "{{count}} items"
  }
}

// In component
const itemCount = 5;
return <span>{t('items.count', { count: itemCount })}</span>;
```

### Nested Translations

```typescript
const { t } = useTranslation('common');

// In translation file
{
  "forms": {
    "validation": {
      "emailRequired": "Email is required",
      "passwordTooShort": "Password must be at least 8 characters"
    }
  }
}

// In component
return <span>{t('forms.validation.emailRequired')}</span>;
```

## Swiss Terminology

### Automatic Swiss Translation

The shared translation package includes Swiss terminology for common terms:

```typescript
import { translateWithSwissTerminology } from '@workspace/translations';

// Automatically translates using Swiss terminology
const saveText = translateWithSwissTerminology('Save', 'fr'); // "Enregistrer"
const cancelText = translateWithSwissTerminology('Cancel', 'de'); // "Abbrechen"
```

### Custom Swiss Terms

Add custom Swiss terms to the shared package:

```typescript
// In packages/translations/src/constants.ts
export const SWISS_TERMINOLOGY = {
  // ... existing terms
  'Custom Term': { fr: 'Terme personnalisé', de: 'Benutzerdefinierter Begriff' }
};
```

## Translation File Structure

### File Organization

```
frontend/public/locales/
├── en/
│   ├── common.json
│   ├── auth.json
│   └── dashboard.json
├── fr/
│   ├── common.json
│   ├── auth.json
│   └── dashboard.json
└── de/
    ├── common.json
    ├── auth.json
    └── dashboard.json
```

### JSON Structure

```json
{
  "buttons": {
    "save": "Save",
    "cancel": "Cancel",
    "submit": "Submit"
  },
  "forms": {
    "validation": {
      "emailRequired": "Email is required",
      "passwordTooShort": "Password must be at least 8 characters"
    }
  },
  "navigation": {
    "home": "Home",
    "dashboard": "Dashboard",
    "settings": "Settings"
  }
}
```

## Development Workflow

### 1. Adding New Translations

```bash
# 1. Add translation key to English file
# 2. Use in component
# 3. Run translation script
node scripts/translate-complete.mjs

# 4. Validate translations
node scripts/translation-validation.mjs
```

### 2. Fixing Hardcoded Text

```bash
# 1. Find hardcoded text
node scripts/translation-audit-simple.mjs

# 2. Fix hardcoded text
node scripts/fix-hardcoded-text.mjs

# 3. Replace in source code with translation keys
```

### 3. Testing Translations

```bash
# 1. Run validation
node scripts/translation-validation.mjs

# 2. Run CI checks
node scripts/ci-translation-check.mjs

# 3. Test in browser with different languages
```

## Common Patterns

### Error Handling

```typescript
const { t } = useTranslation('common');

function MyComponent() {
  const [error, setError] = useState(null);
  
  return (
    <div>
      {error && (
        <div className="error">
          {t('common.error')}: {error.message}
        </div>
      )}
    </div>
  );
}
```

### Loading States

```typescript
const { t } = useTranslation('common');

function MyComponent() {
  const [loading, setLoading] = useState(false);
  
  return (
    <div>
      {loading ? (
        <div>{t('common.loading')}</div>
      ) : (
        <div>Content loaded</div>
      )}
    </div>
  );
}
```

### Form Validation

```typescript
const { t } = useTranslation('auth');

function LoginForm() {
  const [errors, setErrors] = useState({});
  
  return (
    <form>
      <input type="email" />
      {errors.email && (
        <span className="error">
          {t('auth.validation.emailRequired')}
        </span>
      )}
    </form>
  );
}
```

## Best Practices

### Do's

✅ **Use descriptive key names**
```typescript
t('forms.validation.emailRequired')  // Good
t('error1')                          // Bad
```

✅ **Group related translations**
```typescript
// In translation file
{
  "forms": {
    "validation": {
      "emailRequired": "...",
      "passwordTooShort": "..."
    }
  }
}
```

✅ **Use Swiss terminology for common terms**
```typescript
const translateSwiss = useSwissTerminology();
const saveText = translateSwiss('Save');
```

✅ **Test with all languages**
```typescript
// Test in browser with different language settings
```

### Don'ts

❌ **Don't hardcode text**
```typescript
return <button>Save</button>;  // Bad
return <button>{t('buttons.save')}</button>;  // Good
```

❌ **Don't use generic key names**
```typescript
t('text1')     // Bad
t('title')     // Bad
t('welcome.title')  // Good
```

❌ **Don't forget to translate**
```typescript
// Always add translations for all languages
// English: "Save"
// French: "Enregistrer"  
// German: "Speichern"
```

## Troubleshooting

### Common Issues

1. **Translation not found**
   ```typescript
   // Check if key exists in translation file
   // Check if namespace is correct
   // Check if language is supported
   ```

2. **Translation not updating**
   ```typescript
   // Clear browser cache
   // Check if translation file is saved
   // Restart development server
   ```

3. **Swiss terminology not working**
   ```typescript
   // Check if term exists in SWISS_TERMINOLOGY
   // Check if language is supported (fr, de)
   // Check if useSwissTerminology hook is used correctly
   ```

### Debug Mode

Enable translation debugging:

```typescript
// In i18n configuration
i18n.init({
  debug: true,
  // ... other config
});
```

## Resources

- [Translation Workflow](./translation-workflow.md)
- [i18n Implementation Guide](./i18n-implementation-guide.md)
- [Shared Translation Package](../packages/translations/)
- [Translation Scripts](../scripts/)