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
    it: {
      topics: {
        ratios: ['rapporto di custodia', 'rapporto numerico', 'bambini per educatore'],
        authorisation: ['autorizzazione', 'riconoscimento', 'permesso'],
        staff: ['personale educativo', 'qualifica', 'formazione'],
        structure: ['asilo nido', 'nido', 'servizi di accoglienza', 'custodia diurna'],
        safety: ['sicurezza', 'igiene', 'locali', 'norme'],
        parents: ['contratto', 'tariffa', 'iscrizione'],
        funding: ['sovvenzione', 'finanziamento', 'contributo'],
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
      sectionBoosts: ['direttive', 'basi legali', 'legge', 'ordinanza', 'regolamento'],
    },
  },
  
  negativeKeywords: {
    fr: ['adoption', 'fiscalité', 'impôts', 'succession', 'mariage', 'divorce', 'naturalisation'],
    de: ['Adoption', 'Steuern', 'Erbschaft', 'Heirat', 'Scheidung', 'Einbürgerung'],
    it: ['adozione', 'fiscale', 'imposte', 'successione', 'matrimonio', 'divorzio'],
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
    it: {
      'Law': [/\bLegge\s+(?:federale\s+)?su[l]?/i],
      'Regulation': [/\bOrdinanza\s+su[l]?/i, /\bRegolamento\s+su[l]?/i],
      'Directive': [/\bDirettive?\s+(?:su|concernente)/i],
      'Guideline': [/\bGuida\b/i, /\bManuale\b/i],
      'Standard': [/\bNorme?\b/i, /\bStandard\b/i],
    },
  },
};

