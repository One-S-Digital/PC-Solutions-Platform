/**
 * Classifier Configuration
 * Keywords and patterns for document classification
 */

export const CLASSIFIER_CONFIG = {
  /**
   * Minimum score to be considered daycare-related.
   * 
   * Tuning guidance:
   * - Lower (2): More documents flagged for review, higher false positive rate
   * - Current (3): Balanced - requires at least one strong keyword or multiple weak ones
   * - Higher (5): Fewer documents, may miss some relevant policies
   * 
   * Adjust based on pilot testing:
   * - If admins reject >30% of candidates → increase threshold
   * - If admins find missing policies → decrease threshold
   */
  threshold: 3,
  
  keywords: {
    fr: {
      topics: {
        ratios: ['taux d\'encadrement', 'ratio', 'nombre d\'enfants par adulte'],
        authorisation: ['autorisation d\'exploiter', 'autorisation', 'agrément', 'reconnaissance'],
        staff: ['personnel éducatif', 'qualification', 'formation', 'diplôme'],
        structure: ['crèche', 'garderie', 'accueil de jour', 'structures d\'accueil', 'accueil préscolaire', 'accueil parascolaire'],
        safety: ['sécurité', 'hygiène', 'locaux', 'normes'],
        parents: ['contrat', 'tarif', 'inscription', 'placement'],
        funding: ['subvention', 'financement', 'contribution', 'bon d\'accueil'],
      },
      weights: {
        ratios: 3,
        authorisation: 3,
        staff: 2,
        structure: 2,
        safety: 1,
        parents: 1,
        funding: 2,
      },
      sectionBoosts: ['directives', 'bases légales', 'loi', 'ordonnance', 'règlement', 'accueil de jour'],
    },
    de: {
      topics: {
        ratios: ['Betreuungsschlüssel', 'Betreuungsverhältnis', 'Kinder pro Betreuungsperson'],
        authorisation: ['Betriebsbewilligung', 'Bewilligung', 'Anerkennung', 'Genehmigung'],
        staff: ['Fachpersonal', 'Qualifikation', 'Ausbildung', 'Betreuungspersonen'],
        structure: ['Kindertagesstätte', 'Kita', 'Tagesstruktur', 'Kinderbetreuung', 'familienergänzende Betreuung'],
        safety: ['Sicherheit', 'Hygiene', 'Räumlichkeiten', 'Normen'],
        parents: ['Vertrag', 'Tarif', 'Anmeldung', 'Elternbeitrag'],
        funding: ['Subvention', 'Finanzierung', 'Beitrag', 'Betreuungsgutschein'],
      },
      weights: {
        ratios: 3,
        authorisation: 3,
        staff: 2,
        structure: 2,
        safety: 1,
        parents: 1,
        funding: 2,
      },
      sectionBoosts: ['Weisungen', 'Rechtsgrundlagen', 'Gesetz', 'Verordnung', 'Reglement', 'Kinderbetreuung'],
    },
    en: {
      topics: {
        ratios: ['staff-to-child ratio', 'child-to-staff ratio', 'supervision ratio', 'caregiver ratio'],
        authorisation: ['license', 'licensing', 'authorization', 'permit', 'approval', 'accreditation'],
        staff: ['staff qualifications', 'caregiver qualifications', 'training', 'certification', 'diploma'],
        structure: ['daycare', 'day care', 'childcare', 'child care', 'nursery', 'preschool', 'early childhood'],
        safety: ['safety', 'health', 'hygiene', 'premises', 'standards', 'regulations'],
        parents: ['contract', 'fee', 'enrollment', 'registration', 'placement'],
        funding: ['subsidy', 'funding', 'grant', 'voucher', 'childcare voucher'],
      },
      weights: {
        ratios: 3,
        authorisation: 3,
        staff: 2,
        structure: 2,
        safety: 1,
        parents: 1,
        funding: 2,
      },
      sectionBoosts: ['directive', 'legal basis', 'law', 'ordinance', 'regulation', 'childcare'],
    },
  },
  
  negativeKeywords: {
    fr: [
      'adoption', 'fiscalité', 'impôts', 'succession', 'mariage', 'divorce', 'naturalisation',
      'organigramme', 'autorités', 'autorites', 'organigram', // Organizational charts
      'mentions légales', 'plan du site', 'contact', 'accueil', 'retour', // Navigation
      'offres d\'emploi', 'emploi', 'recrutement', 'poste', // Job listings
      'se connecter', 'login', 'connexion', 'recherche', // Site navigation
    ],
    de: [
      'Adoption', 'Steuern', 'Erbschaft', 'Heirat', 'Scheidung', 'Einbürgerung',
      'Organigramm', 'Behörden', 'Autoritäten', // Organizational charts
      'Impressum', 'Sitemap', 'Kontakt', 'Startseite', 'Zurück', // Navigation
      'Stellenangebote', 'Jobs', 'Rekrutierung', 'Stelle', // Job listings
      'Anmelden', 'Login', 'Suche', // Site navigation
    ],
    en: [
      'adoption', 'tax', 'taxation', 'inheritance', 'marriage', 'divorce', 'naturalization',
      'organizational chart', 'org chart', 'organigram', 'authorities', 'authority', // Organizational charts
      'legal notice', 'privacy policy', 'sitemap', 'contact', 'home', 'back', // Navigation
      'job offers', 'jobs', 'careers', 'recruitment', 'position', 'vacancy', // Job listings
      'sign in', 'login', 'search', 'about', 'help', 'support', // Site navigation
    ],
  },
  
  docTypePatterns: {
    fr: {
      'Law': [/\bLoi\s+(?:fédérale\s+)?(?:sur|du|relative)/i, /\bLAJE\b/, /\bLAAc\b/],
      'Regulation': [/\bOrdonnance\s+(?:sur|du|relative)/i, /\bRèglement\s+(?:sur|du|relatif)/i],
      'Directive': [/\bDirectives?\s+(?:sur|concernant|relatives?)/i, /\bRecommandations?\b/i],
      'Guideline': [/\bGuide\b/i, /\bManuel\b/i, /\bAide-mémoire\b/i],
      'Standard': [/\bNormes?\b/i, /\bStandards?\b/i],
    },
    de: {
      'Law': [/\bGesetz\s+(?:über|betreffend)/i, /\bKiBe[G|V]\b/],
      'Regulation': [/\bVerordnung\s+(?:über|betreffend)/i, /\bReglement\s+(?:über|betreffend)/i],
      'Directive': [/\bWeisungen?\s+(?:über|betreffend)/i, /\bRichtlinien?\b/i],
      'Guideline': [/\bLeitfaden\b/i, /\bHandbuch\b/i, /\bMerkblatt\b/i],
      'Standard': [/\bNormen?\b/i, /\bStandards?\b/i],
    },
    en: {
      'Law': [/\b(?:Federal\s+)?Act\s+(?:on|concerning|regarding)/i, /\bLaw\s+(?:on|concerning|regarding)/i],
      'Regulation': [/\bRegulation\s+(?:on|concerning|regarding)/i, /\bOrdinance\s+(?:on|concerning|regarding)/i],
      'Directive': [/\bDirective\s+(?:on|concerning|regarding)/i, /\bGuidance\s+(?:on|concerning|regarding)/i],
      'Guideline': [/\bGuideline\b/i, /\bGuide\b/i, /\bManual\b/i, /\bHandbook\b/i],
      'Standard': [/\bStandard\b/i, /\bStandards\b/i, /\bNorm\b/i, /\bNorms\b/i],
    },
  },
};

