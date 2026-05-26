import { Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { KnowledgeArticle, PLATFORM_ARTICLES } from './platform-knowledge';

export interface KnowledgeSearchResult {
  article: KnowledgeArticle;
  score: number;
}

@Injectable()
export class KnowledgeService {
  search(query: string, role: UserRole, maxResults = 3): KnowledgeArticle[] {
    const terms = query
      .toLowerCase()
      .split(/[\s,?!.]+/)
      .filter((t) => t.length > 2);

    if (terms.length === 0) return [];

    const accessible = PLATFORM_ARTICLES.filter(
      (a) => !a.roles || a.roles.includes(role),
    );

    const scored: KnowledgeSearchResult[] = accessible.map((article) => {
      let score = 0;
      for (const term of terms) {
        if (article.keywords.some((kw) => kw.toLowerCase().includes(term))) score += 3;
        if (article.title.toLowerCase().includes(term)) score += 2;
        if (article.content.toLowerCase().includes(term)) score += 1;
        if (article.category.includes(term)) score += 1;
      }
      return { article, score };
    });

    return scored
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults)
      .map((r) => r.article);
  }

  formatForPrompt(articles: KnowledgeArticle[]): string {
    if (articles.length === 0) return 'No specific documentation found. Answer from general platform knowledge.';
    return articles
      .map((a) => `### ${a.title}${a.route ? ` (${a.route})` : ''}\n${a.content}`)
      .join('\n\n');
  }
}
