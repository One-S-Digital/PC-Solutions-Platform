# Internationalization (i18n) Implementation Guide

## Overview

This document outlines the complete internationalization implementation for the Pro Crèche Solutions platform, following the detailed specification in `docs/i18n-specification.md`.

## Architecture

### Static UI Translation (i18next)
- **Frontend & Admin**: Uses i18next for static UI text (buttons, menus, labels)
- **Languages**: English (en), French (fr), German (de)
- **Extraction**: i18next-parser extracts keys from source code
- **Fallback**: English as default language

### Dynamic Content Translation (Database)
- **Backend**: Database-driven translations for user-generated content
- **Models**: `EntitySource` and `EntityTranslation` tables
- **Languages**: Same as static UI (en, fr, de)
- **Auto-translation**: Machine translation for missing content

## Implementation Details

### 1. Static UI Translation

#### Frontend (`apps/frontend/src/i18n/`)
```
locales/
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

#### Admin (`apps/admin/src/i18n/`)
Same structure as frontend with admin-specific translations.

#### Usage in Components
```tsx
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation();
  
  return (
    <div>
      <h1>{t('dashboard.welcome')}</h1>
      <p>{t('common.loading')}</p>
    </div>
  );
}
```

### 2. Dynamic Content Translation

#### Database Schema
```sql
-- Source language tracking
CREATE TABLE entity_sources (
  entity_type VARCHAR(32),
  entity_id VARCHAR(36),
  source_lang VARCHAR(8),
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  PRIMARY KEY (entity_type, entity_id)
);

-- Translation storage
CREATE TABLE entity_translations (
  entity_type VARCHAR(32),
  entity_id VARCHAR(36),
  lang VARCHAR(8),
  field VARCHAR(64),
  text TEXT,
  origin VARCHAR(16) DEFAULT 'machine',
  verified BOOLEAN DEFAULT false,
  source_hash VARCHAR(64),
  updated_at TIMESTAMP DEFAULT now(),
  PRIMARY KEY (entity_type, entity_id, lang, field)
);
```

#### Field Registry
```typescript
export const FIELDS_BY_ENTITY: Record<string, string[]> = {
  user: ['display_name', 'bio'],
  organization: ['name', 'description', 'about'],
  service_provider: ['name', 'about', 'services'],
  product: ['title', 'subtitle', 'short_desc', 'long_desc', 'features'],
  // ... more entities
};
```

### 3. Backend Translation Service

#### TranslationService (`apps/api/src/translation/translation.service.ts`)
- **Language Detection**: Simple heuristic-based detection
- **Translation**: Placeholder implementation (ready for DeepL/Google integration)
- **Resolution**: Priority chain (target → source → default)
- **Caching**: Ready for Redis integration

#### API Endpoints
```
GET /api/translation/entity/:entityType/:entityId?lang=fr&fields=name,description
GET /api/translation/field/:entityType/:entityId/:field?lang=fr
GET /api/translation/admin/entity/:entityType/:entityId?lang=fr&includeMeta=true
```

### 4. Frontend Integration

#### Language Switcher Component
```tsx
import { LanguageSwitcher } from '@repo/ui';

// Available in both frontend and admin
<LanguageSwitcher />
```

#### Translation API Service
```typescript
import { useTranslationApi } from './services/translationApi';

function MyComponent() {
  const { getTranslatedEntity, currentLanguage } = useTranslationApi();
  
  const loadTranslatedContent = async () => {
    const data = await getTranslatedEntity('organization', '123', ['name', 'description']);
    // data.fields contains translated content
  };
}
```

## Development Workflow

### 1. Adding New Static Text
1. Use `t('key')` in your component
2. Run `pnpm extract-i18n` to extract keys
3. Keys are added to `en/*.json` files
4. Manually translate to `fr/*.json` and `de/*.json`

### 2. Adding New Dynamic Content
1. Define translatable fields in `FIELDS_BY_ENTITY`
2. Use `TranslationService.saveEntityWithTranslations()`
3. Content is automatically translated to all supported languages
4. Use API endpoints to retrieve translated content

### 3. Language Detection
The system automatically detects the source language of user input using simple heuristics:
- French: Common French words (le, la, les, un, une, etc.)
- German: Common German words (der, die, das, und, mit, etc.)
- English: Common English words (the, and, with, for, etc.)

## Configuration

### Environment Variables
```bash
# Translation service (future)
DEEPL_API_KEY=your_deepl_key
GOOGLE_TRANSLATE_API_KEY=your_google_key

# Supported languages
SUPPORTED_LANGUAGES=en,fr,de
DEFAULT_LANGUAGE=en
```

### i18next Configuration
```typescript
i18n.init({
  fallbackLng: 'en',
  ns: ['common', 'auth', 'dashboard'],
  defaultNS: 'common',
  interpolation: { escapeValue: false },
  saveMissing: false,
  returnEmptyString: false,
});
```

## Testing

### Static UI Testing
```bash
# Extract translation keys
pnpm extract-i18n

# Verify all keys have translations
pnpm test:i18n
```

### Dynamic Content Testing
```bash
# Test translation API
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/translation/entity/organization/123?lang=fr"
```

## Future Enhancements

### 1. Machine Translation Integration
- Replace placeholder translation with DeepL API
- Add Google Translate as fallback
- Implement translation quality scoring

### 2. Human Translation Support
- Add `origin: 'human'` and `verified: true` fields
- Create admin interface for manual translations
- Implement translation workflow

### 3. Advanced Features
- Translation memory for consistency
- Context-aware translations
- A/B testing for translation quality
- Real-time translation updates

### 4. Performance Optimizations
- Redis caching for resolved translations
- Batch translation requests
- Lazy loading of translation data

## Monitoring & Analytics

### Metrics to Track
- Translation coverage per language
- Machine translation usage
- Translation quality scores
- User language preferences
- Translation API performance

### Logging
- Translation requests and responses
- Language detection confidence
- Translation service errors
- Cache hit/miss rates

## Security Considerations

### Data Privacy
- Sanitize user input before translation
- Don't log sensitive content
- Encrypt translation API keys
- Implement rate limiting

### Content Security
- Validate translation responses
- Prevent XSS in translated content
- Audit translation changes
- Implement content moderation

## Deployment

### Production Setup
1. Configure translation service API keys
2. Set up Redis for caching
3. Enable translation monitoring
4. Configure CDN for static assets

### Rollback Plan
- Keep original content in source language
- Implement fallback to English
- Monitor translation quality
- Have manual override capabilities

## Troubleshooting

### Common Issues
1. **Missing translations**: Check if keys exist in all language files
2. **Translation API errors**: Verify API keys and rate limits
3. **Language detection issues**: Review detection heuristics
4. **Performance problems**: Check caching configuration

### Debug Tools
- Translation API response logging
- Language detection confidence scores
- Cache hit/miss monitoring
- Translation quality metrics

This implementation provides a solid foundation for multilingual support while maintaining the flexibility to add more advanced features as needed.