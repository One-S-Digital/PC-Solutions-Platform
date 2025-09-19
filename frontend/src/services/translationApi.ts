import { useTranslation } from 'react-i18next';

export interface TranslationApiResponse {
  id: string;
  lang: string;
  fields: Record<string, string>;
}

export interface TranslationMetadata {
  sourceLang: string;
  coverage: Array<{
    field: string;
    hasTranslation: boolean;
    origin: string;
    verified: boolean;
  }>;
}

export class TranslationApiService {
  private baseUrl: string;

  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl;
  }

  /**
   * Get translated entity fields
   */
  async getTranslatedEntity(
    entityType: string,
    entityId: string,
    lang?: string,
    fields?: string[],
  ): Promise<TranslationApiResponse> {
    const params = new URLSearchParams();
    if (lang) params.append('lang', lang);
    if (fields) params.append('fields', fields.join(','));

    const response = await fetch(
      `${this.baseUrl}/translation/entity/${entityType}/${entityId}?${params}`,
      {
        headers: {
          'Authorization': `Bearer ${await this.getAuthToken()}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch translations: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get translated field value
   */
  async getTranslatedField(
    entityType: string,
    entityId: string,
    field: string,
    lang?: string,
  ): Promise<{ id: string; field: string; lang: string; text: string }> {
    const params = new URLSearchParams();
    if (lang) params.append('lang', lang);

    const response = await fetch(
      `${this.baseUrl}/translation/field/${entityType}/${entityId}/${field}?${params}`,
      {
        headers: {
          'Authorization': `Bearer ${await this.getAuthToken()}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch translation: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get entity with translation metadata (admin only)
   */
  async getEntityWithMetadata(
    entityType: string,
    entityId: string,
    lang?: string,
    fields?: string[],
  ): Promise<TranslationApiResponse & { metadata: TranslationMetadata }> {
    const params = new URLSearchParams();
    if (lang) params.append('lang', lang);
    if (fields) params.append('fields', fields.join(','));

    const response = await fetch(
      `${this.baseUrl}/translation/admin/entity/${entityType}/${entityId}?${params}`,
      {
        headers: {
          'Authorization': `Bearer ${await this.getAuthToken()}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch entity with metadata: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get authentication token from Clerk
   */
  private async getAuthToken(): Promise<string> {
    // This would be implemented based on your auth setup
    // For now, return empty string
    return '';
  }
}

/**
 * Hook for using translation API service
 */
export function useTranslationApi() {
  const { i18n } = useTranslation();
  
  const apiService = new TranslationApiService();
  
  const getTranslatedEntity = async (
    entityType: string,
    entityId: string,
    fields?: string[],
  ) => {
    return apiService.getTranslatedEntity(
      entityType,
      entityId,
      i18n.language,
      fields,
    );
  };

  const getTranslatedField = async (
    entityType: string,
    entityId: string,
    field: string,
  ) => {
    return apiService.getTranslatedField(
      entityType,
      entityId,
      field,
      i18n.language,
    );
  };

  return {
    getTranslatedEntity,
    getTranslatedField,
    currentLanguage: i18n.language,
  };
}