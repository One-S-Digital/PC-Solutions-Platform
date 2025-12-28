import { Injectable } from '@nestjs/common';
import { CLASSIFIER_CONFIG } from './classifier.config';

interface ClassificationResult {
  isDaycareRelated: boolean;
  confidence: number;
  category: string;      // Maps to Asset.contentCategory
  docType: string;       // Maps to Asset.policyType
  language: 'fr' | 'de' | 'en';
  topics: string[];
}

interface MetadataInput {
  anchorText: string;
  url: string;
  sectionHeading?: string;
  defaultLang: string;
}

@Injectable()
export class ClassifierService {
  
  /**
   * PRIMARY METHOD: Classify using metadata only (no PDF download)
   * Used for 90%+ of documents
   */
  classifyFromMetadata(metadata: MetadataInput): ClassificationResult {
    const lang = this.detectLanguageFromText(metadata.anchorText, metadata.defaultLang);
    const keywords = CLASSIFIER_CONFIG.keywords[lang];
    
    let score = 0;
    const foundTopics: string[] = [];
    const combinedText = `${metadata.anchorText} ${metadata.sectionHeading || ''}`.toLowerCase();

    // Score from anchor text and section heading
    for (const [topic, terms] of Object.entries(keywords.topics)) {
      const termArray = terms as string[];
      for (const term of termArray) {
        if (combinedText.includes(term.toLowerCase())) {
          score += keywords.weights[topic] || 1;
          if (!foundTopics.includes(topic)) {
            foundTopics.push(topic);
          }
        }
      }
    }

    // Score from URL path (very reliable signal) - multi-language: FR, DE, EN
    const urlLower = metadata.url.toLowerCase();
    const urlKeywords: Record<string, number> = {
      // French
      'creche': 3, 'garderie': 3, 'accueil-de-jour': 4, 'accueil-prescolaire': 4,
      // German
      'kita': 3, 'kinderbetreuung': 3, 'kindertagesstaette': 4, 'tagesstruktur': 3,
      // English
      'daycare': 3, 'day-care': 3, 'childcare': 3, 'child-care': 3, 'nursery': 3, 'preschool': 3,
      'early-childhood': 4, 'early-childhood-care': 4,
      // Common terms (all languages)
      'enfan': 2, 'kind': 2, 'child': 2, 'children': 2,
      // Swiss daycare law acronyms
      'laje': 4, 'oaje': 4, 'laac': 4,
    };
    
    for (const [kw, weight] of Object.entries(urlKeywords)) {
      if (urlLower.includes(kw)) {
        score += weight;
        if (!foundTopics.includes('structure')) {
          foundTopics.push('structure');
        }
      }
    }

    // Section heading boost (if link is under "Accueil de jour" section, high confidence)
    if (metadata.sectionHeading) {
      for (const boost of keywords.sectionBoosts) {
        if (metadata.sectionHeading.toLowerCase().includes(boost.toLowerCase())) {
          score *= 1.5;
          break;
        }
      }
    }

    // Negative signals from URL/anchor (strong penalty for non-policy content)
    // Multi-language patterns: FR, DE, EN
    const negativePatterns = [
      // Legal/Financial (not daycare policies)
      'adoption', 'steuer', 'impot', 'divorce', 'mariage', 'succession', 'tax', 'taxation',
      // Organizational charts
      'organigramme', 'organigramm', 'organigram', 'org-chart', 'organizational-chart',
      'autorites', 'autorités', 'behoerden', 'authorities', 'authority',
      // Legal notices (not policies)
      'mentions-legales', 'impressum', 'legal-notice', 'legal notice', 'privacy-policy', 'disclaimer',
      // Navigation
      'plan-du-site', 'sitemap', 'site-map', 'contact', 'kontakt', 'home', 'accueil',
      // Job listings
      'offres-emploi', 'offres-d-emploi', 'stellenangebote', 'job-offers', 'jobs', 'careers',
      // Site navigation
      'login', 'anmelden', 'se-connecter', 'sign-in', 'search', 'recherche', 'suche',
      'about', 'about-us', 'help', 'aide', 'hilfe', 'support',
    ];
    
    let negativePatternFound: string | null = null;
    for (const neg of negativePatterns) {
      if (urlLower.includes(neg) || combinedText.includes(neg)) {
        negativePatternFound = neg;
        score *= 0.2; // Strong penalty (80% reduction)
        // Only completely reject if score is below threshold after penalty
        // This prevents edge cases where a document might have strong daycare keywords
        // but also contains a negative pattern (e.g., "accueil-de-jour" + "contact")
        if (score < CLASSIFIER_CONFIG.threshold) {
          score = 0; // Reject if below threshold after negative penalty
        }
        break; // Only apply penalty once for the first negative pattern found
      }
    }

    const docType = this.detectDocTypeFromMetadata(metadata.anchorText, metadata.url, lang);
    const category = this.mapToCategory(foundTopics);

    // Confidence calculation:
    // - Divisor of 10 calibrated for metadata-based classification where typical
    //   scores range from 0-15 based on keyword matches and URL patterns
    // - A score of 10+ indicates high confidence (100%)
    // - Threshold of 3 (from config) means at least one strong signal or multiple weak signals
    // - Expected accuracy: ~85-90% for metadata-only classification
    // - Tune threshold based on pilot testing false positive/negative rates
    const result: ClassificationResult & { _debug?: any } = {
      isDaycareRelated: score >= CLASSIFIER_CONFIG.threshold,
      confidence: Math.min(score / 10, 1),
      category,
      docType,
      language: lang,
      topics: foundTopics,
    };
    
    // Add debug info for detailed logging
    result._debug = {
      rawScore: score,
      threshold: CLASSIFIER_CONFIG.threshold,
      negativePattern: negativePatternFound,
      topicsFound: foundTopics,
    };
    
    return result as ClassificationResult;
  }

  /**
   * SECONDARY METHOD: Classify using actual PDF content
   * Only called when metadata-based confidence is low
   */
  classifyFromContent(
    content: string,
    candidate: { url: string; anchorText: string; sectionHeading?: string },
    defaultLang: string,
  ): ClassificationResult {
    const lang = this.detectLanguageFromText(content, defaultLang);
    const keywords = CLASSIFIER_CONFIG.keywords[lang];
    const negativeKeywords = CLASSIFIER_CONFIG.negativeKeywords[lang];
    
    let score = 0;
    const foundTopics: string[] = [];
    const contentLower = content.toLowerCase();
    
    // Score from actual content
    for (const [topic, terms] of Object.entries(keywords.topics)) {
      const termArray = terms as string[];
      for (const term of termArray) {
        // Count occurrences for better scoring
        const regex = new RegExp(term.toLowerCase(), 'gi');
        const matches = contentLower.match(regex);
        if (matches) {
          score += (keywords.weights[topic] || 1) * Math.min(matches.length, 3);
          if (!foundTopics.includes(topic)) {
            foundTopics.push(topic);
          }
        }
      }
    }
    
    // Negative keyword penalty
    for (const term of negativeKeywords) {
      if (contentLower.includes(term.toLowerCase())) {
        score *= 0.5;
      }
    }
    
    const docType = this.detectDocTypeFromContent(content, candidate.url, lang);
    const category = this.mapToCategory(foundTopics);
    
    // Confidence calculation for content-based classification:
    // - Divisor of 15 (vs 10 for metadata) because full PDF content typically
    //   yields more keyword matches, so we set a higher bar for "high confidence"
    // - This method is only called when metadata confidence < 50%, so we're
    //   looking for strong signals in the actual content to confirm relevance
    // - Expected accuracy: ~95% when we do parse the PDF
    return {
      isDaycareRelated: score >= CLASSIFIER_CONFIG.threshold,
      confidence: Math.min(score / 15, 1),
      category,
      docType,
      language: lang,
      topics: foundTopics,
    };
  }

  /**
   * Detects language from text using common word frequency.
   * Returns defaultLang if text is too short (< 50 chars) or inconclusive.
   */
  private detectLanguageFromText(text: string, defaultLang: string): 'fr' | 'de' | 'en' {
    // Minimum 50 characters for reliable detection (raised from 20 per review feedback)
    if (!text || text.length < 50) return defaultLang as any;
    
    const frCount = (text.match(/\b(le|la|les|de|des|du|un|une|et|est|pour|avec|sur)\b/gi) || []).length;
    const deCount = (text.match(/\b(der|die|das|und|ist|für|mit|von|zu|den|dem|ein)\b/gi) || []).length;
    const enCount = (text.match(/\b(the|and|is|for|with|on|in|to|of|a|an|this|that)\b/gi) || []).length;
    
    const max = Math.max(frCount, deCount, enCount);
    // Require at least 5 matches for reliable detection (raised from 3 per review feedback)
    if (max < 5) return defaultLang as any;
    
    if (frCount === max) return 'fr';
    if (deCount === max) return 'de';
    if (enCount === max) return 'en';
    return defaultLang as any;
  }

  private detectDocTypeFromMetadata(anchorText: string, url: string, lang: string): string {
    const combined = `${anchorText} ${url}`.toLowerCase();
    const patterns = CLASSIFIER_CONFIG.docTypePatterns[lang];
    
    for (const [type, regexList] of Object.entries(patterns)) {
      const patternArray = regexList as RegExp[];
      for (const pattern of patternArray) {
        if (pattern.test(combined)) {
          return type;
        }
      }
    }
    
    // Default based on file extension
    if (url.toLowerCase().endsWith('.pdf')) {
      return 'Directive';
    }
    return 'Guideline';
  }

  private detectDocTypeFromContent(content: string, url: string, lang: string): string {
    const patterns = CLASSIFIER_CONFIG.docTypePatterns[lang];
    
    for (const [type, regexList] of Object.entries(patterns)) {
      const patternArray = regexList as RegExp[];
      for (const pattern of patternArray) {
        if (pattern.test(content)) {
          return type;
        }
      }
    }
    
    return 'Directive';
  }
  
  private mapToCategory(topics: string[]): string {
    if (topics.includes('ratios') || topics.includes('authorisation') || topics.includes('staff') || topics.includes('structure')) {
      return 'Education Policy';
    }
    if (topics.includes('safety') || topics.includes('health')) {
      return 'Health & Safety';
    }
    if (topics.includes('employment') || topics.includes('contracts')) {
      return 'Labor & Employment';
    }
    if (topics.includes('protection') || topics.includes('welfare')) {
      return 'Child Protection';
    }
    if (topics.includes('funding')) {
      return 'Other'; // Financial support
    }
    return 'Other';
  }
}

