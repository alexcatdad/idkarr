# AI Recommendations Specification

> **idkarr** - Flexible AI-powered recommendations with three distinct tiers

## Table of Contents

1. [Overview](#overview)
2. [Three-Tier Model](#three-tier-model)
3. [Privacy Model](#privacy-model)
4. [Configuration](#configuration)
5. [Tier 1: Local Recommendations](#tier-1-local-recommendations)
6. [Tier 2: RAG-Powered Discovery](#tier-2-rag-powered-discovery)
7. [Tier 3: Full AI Assistant](#tier-3-full-ai-assistant)
8. [Architecture](#architecture)
9. [Embedding System](#embedding-system)
10. [Vector Database](#vector-database)
11. [LLM Integration](#llm-integration)
12. [User Preference Learning](#user-preference-learning)
13. [API Specification](#api-specification)

---

## Overview

### Goals

1. **Flexible Privacy**: Users choose their comfort level with AI features
2. **Progressive Enhancement**: Start simple, enable more as needed
3. **Personalized Recommendations**: Suggest series/movies based on user preferences and viewing history
4. **Natural Language Queries**: "Find shows like Breaking Bad but with more comedy"
5. **Smart Discovery**: Surface hidden gems matching user taste profiles
6. **Actionable Assistant**: AI that can search, grab, and import content

### Design Philosophy

idkarr's AI recommendations are built on a **progressive enhancement** model. Users start with zero external dependencies and can opt into more powerful features as desired. Each tier builds on the previous one:

- **Tier 1** works entirely offline with your existing library
- **Tier 2** adds semantic understanding for smarter search
- **Tier 3** adds conversational AI that takes actions on your behalf

---

## Three-Tier Model

### Tier Overview

| Tier | Name | External Services | Key Features |
|------|------|-------------------|--------------|
| **1** | Local Only | None | Metadata-based recommendations, similarity matching |
| **2** | RAG-Powered | Embedding API (optional) | Natural language search, semantic discovery |
| **3** | Full Assistant | LLM API (optional) | Conversational interface, automated actions |

### Tier 1: Local Only

**No external services required.** All processing happens on your server using your library's metadata.

**Features:**
- "Because you watched X" recommendations
- Genre/actor/director similarity matching
- Collaborative filtering (if multiple users)
- "More like this" buttons
- Trending in your library
- Hidden gems (high-rated, low-watch-count)

**Best for:** Privacy-focused users, air-gapped setups, limited bandwidth

**Example interactions:**
```
User clicks "More Like This" on Breaking Bad
→ System analyzes: Drama, Crime, AMC, Vince Gilligan, Bryan Cranston
→ Returns: Better Call Saul, Ozark, The Wire, Narcos
```

### Tier 2: RAG-Powered Discovery

**Adds semantic search via vector embeddings.** Can use local (Ollama) or cloud (OpenAI) embedding models.

**Features (includes all Tier 1):**
- Natural language search: "90s thriller with twist ending"
- Mood-based discovery: "something light and funny"
- Complex queries: "sci-fi like Arrival but more action"
- Semantic similarity (understands themes, not just tags)

**Best for:** Users wanting smarter search without full AI assistant

**Example interactions:**
```
User: "Cozy mystery shows for a rainy day"
→ System embeds query, searches vector store
→ Returns: Only Murders in the Building, Poker Face, Murder She Wrote
→ Shows match scores and why each was selected
```

### Tier 3: Full AI Assistant

**Complete conversational AI with action capabilities.** Uses LLM for understanding and response generation.

**Features (includes all Tier 1 & 2):**
- Conversational interface with context memory
- Follow-up questions and refinement
- Takes actions: "Add it to my library"
- Multi-step workflows: search → select → grab → import
- Personalized explanations
- Proactive suggestions based on viewing patterns

**Best for:** Users wanting a full media assistant experience

**Example interactions:**
```
User: "I loved Severance. Find me something similar and add the best one"
Assistant: "Based on Severance, I'd recommend:
  1. Homecoming - Similar corporate thriller, psychological elements
  2. The OA - Mysterious, mind-bending narrative
  3. Maniac - Surreal workplace/mind exploration

  I think you'd love Homecoming most - it shares Severance's unsettling
  corporate dystopia vibe. Want me to add it to your library?"

User: "Yes, add Homecoming"
Assistant: "Done! I've added Homecoming to your library.
  Searching for releases... Found 4K HDR version on Usenet.
  Starting download. I'll notify you when it's ready."
```

---

## Privacy Model

### Data Flow by Tier

| Data Type | Tier 1 | Tier 2 | Tier 3 |
|-----------|--------|--------|--------|
| Library metadata | Local only | Local + optional embedding API | Local + LLM API |
| Watch history | Local only | Local only | Local only (summarized for LLM) |
| User queries | N/A | Local or embedding API | Local or LLM API |
| Recommendations | Local only | Local only | Generated by LLM |

### What Stays Local (Always)

Regardless of tier, these **never leave your server**:
- User credentials and authentication data
- Complete watch history with timestamps
- User ratings and reviews
- Download/grab history
- File paths and server configuration
- Personal user profiles

### What May Be Sent Externally

**Tier 1:** Nothing - fully offline

**Tier 2 (if using cloud embeddings):**
- Media titles and overviews (for embedding generation)
- User search queries (for query embedding)
- Genre/keyword lists

**Tier 3 (if using cloud LLM):**
- Summarized user preferences (not raw history)
- Current query context
- Retrieved media metadata
- Conversation context (configurable retention)

### Privacy Configuration

```typescript
interface PrivacyConfig {
  tier: 1 | 2 | 3;

  // Tier 2+ options
  embeddingProvider: 'local' | 'openai';

  // Tier 3 options
  llmProvider: 'local' | 'openai' | 'anthropic';

  // Data handling
  anonymizeQueries: boolean;          // Strip personal references before API calls
  summarizeHistory: boolean;          // Send preferences, not raw watch history
  conversationRetention: 'none' | 'session' | 'persistent';

  // Local processing preferences
  preferLocalWhenAvailable: boolean;  // Use local models if running
  fallbackToCloud: boolean;           // Fall back to cloud if local fails
}
```

### Privacy Levels Explained

**Maximum Privacy (Tier 1):**
```typescript
{
  tier: 1,
  // No external services configured
}
```

**Balanced (Tier 2 with local embeddings):**
```typescript
{
  tier: 2,
  embeddingProvider: 'local',  // Ollama
  anonymizeQueries: true,
}
```

**Full Features with Privacy (Tier 3 with local LLM):**
```typescript
{
  tier: 3,
  embeddingProvider: 'local',
  llmProvider: 'local',  // Ollama with llama3.1
}
```

**Full Features with Cloud:**
```typescript
{
  tier: 3,
  embeddingProvider: 'openai',
  llmProvider: 'anthropic',
  anonymizeQueries: true,
  summarizeHistory: true,
  conversationRetention: 'session',
}
```

---

## Configuration

### Main Configuration Interface

```typescript
interface AIRecommendationConfig {
  // Tier selection
  tier: 1 | 2 | 3;

  // Feature flags (auto-set based on tier, can override)
  features: {
    similarContent: boolean;           // Tier 1+
    genreMatching: boolean;            // Tier 1+
    actorDirectorMatching: boolean;    // Tier 1+
    naturalLanguageSearch: boolean;    // Tier 2+
    moodBasedDiscovery: boolean;       // Tier 2+
    conversationalInterface: boolean;  // Tier 3
    actionableCommands: boolean;       // Tier 3
    proactiveSuggestions: boolean;     // Tier 3
  };

  // Tier 2+ Embedding configuration
  embedding?: {
    provider: 'local' | 'ollama' | 'openai' | 'huggingface';
    model: string;
    dimensions: number;
    batchSize: number;

    ollama?: {
      baseUrl: string;
      model: string; // 'nomic-embed-text', 'mxbai-embed-large'
    };
    openai?: {
      apiKey: string;
      model: 'text-embedding-3-small' | 'text-embedding-3-large';
    };
    local?: {
      modelPath: string;
      quantization: 'f32' | 'f16' | 'int8';
    };
  };

  // Tier 3 LLM configuration
  llm?: {
    provider: 'ollama' | 'openai' | 'anthropic';
    model: string;
    temperature: number;
    maxTokens: number;

    ollama?: {
      baseUrl: string;
      model: string; // 'llama3.1', 'mistral', 'mixtral'
    };
    openai?: {
      apiKey: string;
      model: 'gpt-4o' | 'gpt-4o-mini';
    };
    anthropic?: {
      apiKey: string;
      model: 'claude-sonnet-4-20250514' | 'claude-3-5-haiku-20241022';
    };
  };

  // Vector store (Tier 2+)
  vectorStore?: {
    provider: 'pgvector' | 'qdrant' | 'chroma';
    pgvector?: {
      connectionString: string;
      tableName: string;
      indexType: 'ivfflat' | 'hnsw';
    };
  };

  // Recommendation tuning
  recommendations: {
    maxResults: number;
    minSimilarityScore: number;
    diversityFactor: number;
    recencyBias: number;
    popularityWeight: number;
  };

  // Privacy settings
  privacy: PrivacyConfig;
}
```

### Example Configurations

**Tier 1: Fully Local (No External Services)**
```typescript
const tier1Config: AIRecommendationConfig = {
  tier: 1,
  features: {
    similarContent: true,
    genreMatching: true,
    actorDirectorMatching: true,
    naturalLanguageSearch: false,
    moodBasedDiscovery: false,
    conversationalInterface: false,
    actionableCommands: false,
    proactiveSuggestions: false,
  },
  recommendations: {
    maxResults: 20,
    minSimilarityScore: 0.5,
    diversityFactor: 0.3,
    recencyBias: 0.1,
    popularityWeight: 0.2,
  },
  privacy: {
    tier: 1,
  },
};
```

**Tier 2: RAG with Local Ollama**
```typescript
const tier2LocalConfig: AIRecommendationConfig = {
  tier: 2,
  features: {
    similarContent: true,
    genreMatching: true,
    actorDirectorMatching: true,
    naturalLanguageSearch: true,
    moodBasedDiscovery: true,
    conversationalInterface: false,
    actionableCommands: false,
    proactiveSuggestions: false,
  },
  embedding: {
    provider: 'ollama',
    model: 'nomic-embed-text',
    dimensions: 768,
    batchSize: 32,
    ollama: {
      baseUrl: 'http://localhost:11434',
      model: 'nomic-embed-text',
    },
  },
  vectorStore: {
    provider: 'pgvector',
    pgvector: {
      connectionString: process.env.DATABASE_URL!,
      tableName: 'media_embeddings',
      indexType: 'hnsw',
    },
  },
  recommendations: {
    maxResults: 20,
    minSimilarityScore: 0.4,
    diversityFactor: 0.3,
    recencyBias: 0.1,
    popularityWeight: 0.2,
  },
  privacy: {
    tier: 2,
    embeddingProvider: 'local',
    anonymizeQueries: false,
  },
};
```

**Tier 2: RAG with OpenAI Embeddings**
```typescript
const tier2CloudConfig: AIRecommendationConfig = {
  tier: 2,
  features: {
    similarContent: true,
    genreMatching: true,
    actorDirectorMatching: true,
    naturalLanguageSearch: true,
    moodBasedDiscovery: true,
    conversationalInterface: false,
    actionableCommands: false,
    proactiveSuggestions: false,
  },
  embedding: {
    provider: 'openai',
    model: 'text-embedding-3-small',
    dimensions: 1536,
    batchSize: 100,
    openai: {
      apiKey: process.env.OPENAI_API_KEY!,
      model: 'text-embedding-3-small',
    },
  },
  vectorStore: {
    provider: 'pgvector',
    pgvector: {
      connectionString: process.env.DATABASE_URL!,
      tableName: 'media_embeddings',
      indexType: 'hnsw',
    },
  },
  recommendations: {
    maxResults: 20,
    minSimilarityScore: 0.4,
    diversityFactor: 0.3,
    recencyBias: 0.1,
    popularityWeight: 0.2,
  },
  privacy: {
    tier: 2,
    embeddingProvider: 'openai',
    anonymizeQueries: true,
  },
};
```

**Tier 3: Full Assistant with Local LLM**
```typescript
const tier3LocalConfig: AIRecommendationConfig = {
  tier: 3,
  features: {
    similarContent: true,
    genreMatching: true,
    actorDirectorMatching: true,
    naturalLanguageSearch: true,
    moodBasedDiscovery: true,
    conversationalInterface: true,
    actionableCommands: true,
    proactiveSuggestions: true,
  },
  embedding: {
    provider: 'ollama',
    model: 'nomic-embed-text',
    dimensions: 768,
    batchSize: 32,
    ollama: {
      baseUrl: 'http://localhost:11434',
      model: 'nomic-embed-text',
    },
  },
  llm: {
    provider: 'ollama',
    model: 'llama3.1:8b',
    temperature: 0.7,
    maxTokens: 2048,
    ollama: {
      baseUrl: 'http://localhost:11434',
      model: 'llama3.1:8b',
    },
  },
  vectorStore: {
    provider: 'pgvector',
    pgvector: {
      connectionString: process.env.DATABASE_URL!,
      tableName: 'media_embeddings',
      indexType: 'hnsw',
    },
  },
  recommendations: {
    maxResults: 20,
    minSimilarityScore: 0.4,
    diversityFactor: 0.3,
    recencyBias: 0.1,
    popularityWeight: 0.2,
  },
  privacy: {
    tier: 3,
    embeddingProvider: 'local',
    llmProvider: 'local',
    conversationRetention: 'session',
  },
};
```

**Tier 3: Full Assistant with Cloud Services**
```typescript
const tier3CloudConfig: AIRecommendationConfig = {
  tier: 3,
  features: {
    similarContent: true,
    genreMatching: true,
    actorDirectorMatching: true,
    naturalLanguageSearch: true,
    moodBasedDiscovery: true,
    conversationalInterface: true,
    actionableCommands: true,
    proactiveSuggestions: true,
  },
  embedding: {
    provider: 'openai',
    model: 'text-embedding-3-small',
    dimensions: 1536,
    batchSize: 100,
    openai: {
      apiKey: process.env.OPENAI_API_KEY!,
      model: 'text-embedding-3-small',
    },
  },
  llm: {
    provider: 'anthropic',
    model: 'claude-sonnet-4-20250514',
    temperature: 0.7,
    maxTokens: 2048,
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY!,
      model: 'claude-sonnet-4-20250514',
    },
  },
  vectorStore: {
    provider: 'pgvector',
    pgvector: {
      connectionString: process.env.DATABASE_URL!,
      tableName: 'media_embeddings',
      indexType: 'hnsw',
    },
  },
  recommendations: {
    maxResults: 20,
    minSimilarityScore: 0.4,
    diversityFactor: 0.3,
    recencyBias: 0.1,
    popularityWeight: 0.2,
  },
  privacy: {
    tier: 3,
    embeddingProvider: 'openai',
    llmProvider: 'anthropic',
    anonymizeQueries: true,
    summarizeHistory: true,
    conversationRetention: 'session',
  },
};
```

---

## Tier 1: Local Recommendations

### Overview

Tier 1 provides powerful recommendations using only local metadata - no external API calls, no network requirements. It analyzes your library's existing metadata to find connections between content.

### Similarity Engine

```typescript
interface LocalSimilarityEngine {
  // Core similarity methods
  getSimilarByGenre(mediaId: number, limit?: number): Promise<SimilarItem[]>;
  getSimilarByActor(mediaId: number, limit?: number): Promise<SimilarItem[]>;
  getSimilarByDirector(mediaId: number, limit?: number): Promise<SimilarItem[]>;
  getSimilarByNetwork(mediaId: number, limit?: number): Promise<SimilarItem[]>;

  // Combined similarity
  getSimilar(mediaId: number, options?: SimilarityOptions): Promise<SimilarItem[]>;

  // User-based recommendations
  getBecauseYouWatched(userId: number, recentCount?: number): Promise<RecommendationGroup[]>;
  getBasedOnYourTaste(userId: number): Promise<SimilarItem[]>;
}

interface SimilarityOptions {
  weights?: {
    genre: number;      // default: 0.4
    cast: number;       // default: 0.25
    director: number;   // default: 0.2
    network: number;    // default: 0.1
    year: number;       // default: 0.05
  };
  limit?: number;
  excludeWatched?: boolean;
  excludeInLibrary?: boolean;
}

interface SimilarItem {
  mediaType: 'series' | 'movie';
  mediaId: number;
  title: string;
  year: number;
  posterUrl?: string;
  score: number;
  matchFactors: MatchFactor[];
}

interface MatchFactor {
  type: 'genre' | 'cast' | 'director' | 'network' | 'year' | 'theme';
  value: string;
  weight: number;
}
```

### Implementation

```typescript
class LocalRecommendationEngine implements LocalSimilarityEngine {
  constructor(private db: Database, private mediaService: MediaService) {}

  async getSimilar(
    mediaId: number,
    options: SimilarityOptions = {}
  ): Promise<SimilarItem[]> {
    const source = await this.mediaService.getWithMetadata(mediaId);

    const weights = {
      genre: 0.4,
      cast: 0.25,
      director: 0.2,
      network: 0.1,
      year: 0.05,
      ...options.weights,
    };

    // Get all candidates from library
    const candidates = await this.mediaService.getAllInLibrary({
      excludeIds: [mediaId],
    });

    // Score each candidate
    const scored = candidates.map(candidate => {
      const factors: MatchFactor[] = [];
      let totalScore = 0;

      // Genre overlap
      const genreOverlap = this.calculateOverlap(source.genres, candidate.genres);
      if (genreOverlap > 0) {
        factors.push({
          type: 'genre',
          value: this.getOverlappingItems(source.genres, candidate.genres).join(', '),
          weight: genreOverlap * weights.genre,
        });
        totalScore += genreOverlap * weights.genre;
      }

      // Cast overlap
      const castOverlap = this.calculateOverlap(source.cast, candidate.cast);
      if (castOverlap > 0) {
        factors.push({
          type: 'cast',
          value: this.getOverlappingItems(source.cast, candidate.cast).join(', '),
          weight: castOverlap * weights.cast,
        });
        totalScore += castOverlap * weights.cast;
      }

      // Director match
      const directorOverlap = this.calculateOverlap(source.directors, candidate.directors);
      if (directorOverlap > 0) {
        factors.push({
          type: 'director',
          value: this.getOverlappingItems(source.directors, candidate.directors).join(', '),
          weight: directorOverlap * weights.director,
        });
        totalScore += directorOverlap * weights.director;
      }

      // Network match (for series)
      if (source.network && source.network === candidate.network) {
        factors.push({
          type: 'network',
          value: source.network,
          weight: weights.network,
        });
        totalScore += weights.network;
      }

      // Year proximity
      const yearDiff = Math.abs(source.year - candidate.year);
      const yearScore = Math.max(0, 1 - yearDiff / 20); // 20 year range
      if (yearScore > 0.5) {
        factors.push({
          type: 'year',
          value: `${candidate.year}`,
          weight: yearScore * weights.year,
        });
        totalScore += yearScore * weights.year;
      }

      return {
        mediaType: candidate.mediaType,
        mediaId: candidate.id,
        title: candidate.title,
        year: candidate.year,
        posterUrl: candidate.posterUrl,
        score: totalScore,
        matchFactors: factors.sort((a, b) => b.weight - a.weight),
      };
    });

    // Filter and sort
    return scored
      .filter(item => item.score > 0.1)
      .sort((a, b) => b.score - a.score)
      .slice(0, options.limit ?? 10);
  }

  async getBecauseYouWatched(
    userId: number,
    recentCount: number = 5
  ): Promise<RecommendationGroup[]> {
    // Get recently watched items
    const recentlyWatched = await this.db
      .select()
      .from(watchHistory)
      .where(eq(watchHistory.userId, userId))
      .orderBy(desc(watchHistory.watchedAt))
      .limit(recentCount);

    // Get similar items for each
    const groups: RecommendationGroup[] = [];

    for (const watched of recentlyWatched) {
      const similar = await this.getSimilar(watched.mediaId, {
        limit: 5,
        excludeWatched: true,
      });

      if (similar.length > 0) {
        const sourceItem = await this.mediaService.get(watched.mediaId);
        groups.push({
          reason: `Because you watched ${sourceItem.title}`,
          sourceMedia: sourceItem,
          recommendations: similar,
        });
      }
    }

    return groups;
  }

  private calculateOverlap(a: string[], b: string[]): number {
    if (!a.length || !b.length) return 0;
    const intersection = a.filter(item => b.includes(item));
    return intersection.length / Math.max(a.length, b.length);
  }

  private getOverlappingItems(a: string[], b: string[]): string[] {
    return a.filter(item => b.includes(item));
  }
}
```

### Tier 1 Use Cases

| Use Case | Implementation | Example |
|----------|----------------|---------|
| More Like This | `getSimilar(mediaId)` | Click on Breaking Bad → See similar shows |
| Because You Watched | `getBecauseYouWatched(userId)` | Dashboard shows related recommendations |
| Genre Browse | `getSimilarByGenre(mediaId)` | "More Sci-Fi like this" |
| Actor's Filmography | `getSimilarByActor(mediaId)` | "More with Bryan Cranston" |
| Network Collection | `getSimilarByNetwork(mediaId)` | "More from HBO" |

---

## Tier 2: RAG-Powered Discovery

### Overview

Tier 2 adds semantic understanding through vector embeddings. This enables natural language search and understanding of themes, moods, and abstract concepts that aren't captured in simple metadata tags.

### RAG Pipeline

```typescript
interface RAGPipeline {
  // Step 1: Query Understanding
  parseQuery(query: string): Promise<ParsedQuery>;

  // Step 2: Retrieval
  retrieve(query: ParsedQuery, context: RetrievalContext): Promise<RetrievedDocuments>;

  // Step 3: Results (no generation in Tier 2)
  formatResults(documents: RetrievedDocuments): Promise<SearchResults>;
}

interface ParsedQuery {
  originalQuery: string;
  intent: QueryIntent;
  entities: ExtractedEntity[];
  filters: QueryFilter[];
}

type QueryIntent =
  | 'similar_content'      // "Shows like Breaking Bad"
  | 'natural_search'       // "Sci-fi with time travel"
  | 'mood_based'           // "Something relaxing"
  | 'specific_request'     // "The new season of Severance"
  | 'discovery';           // "What should I watch?"

interface ExtractedEntity {
  type: 'series' | 'movie' | 'person' | 'genre' | 'network' | 'year' | 'mood';
  value: string;
  confidence: number;
}
```

### Semantic Search Implementation

```typescript
class SemanticSearchEngine {
  constructor(
    private vectorStore: VectorStore,
    private embeddingService: EmbeddingService,
    private localEngine: LocalSimilarityEngine
  ) {}

  async search(
    query: string,
    options: SearchOptions = {}
  ): Promise<SearchResults> {
    // Parse query to extract entities and intent
    const parsed = await this.parseQuery(query);

    // Route based on query type
    if (parsed.intent === 'similar_content' && parsed.entities.length > 0) {
      // Use local similarity + vector enhancement
      const sourceEntity = parsed.entities.find(e => e.type === 'series' || e.type === 'movie');
      if (sourceEntity?.resolved) {
        return this.enhancedSimilarSearch(sourceEntity.resolved.id, query, options);
      }
    }

    // Full semantic search
    return this.semanticSearch(query, parsed, options);
  }

  private async semanticSearch(
    query: string,
    parsed: ParsedQuery,
    options: SearchOptions
  ): Promise<SearchResults> {
    // Generate query embedding
    const queryEmbedding = await this.embeddingService.embed(query);

    // Search vector store
    const vectorResults = await this.vectorStore.search({
      vector: queryEmbedding,
      topK: (options.limit ?? 10) * 2,
      filter: this.buildFilter(parsed),
    });

    // Also get text search results for hybrid ranking
    const textResults = await this.textSearch(query, options.limit ?? 10);

    // Merge and re-rank
    const merged = this.mergeResults(vectorResults, textResults);

    // Apply user context if available
    const personalized = options.userId
      ? await this.applyUserPreferences(merged, options.userId)
      : merged;

    return {
      items: personalized.slice(0, options.limit ?? 10),
      query: parsed,
      searchMode: 'semantic',
    };
  }

  private async parseQuery(query: string): Promise<ParsedQuery> {
    // Simple rule-based parsing for Tier 2 (no LLM)
    const patterns = {
      similar: /(?:like|similar to|more like)\s+["']?([^"']+)["']?/i,
      mood: /(?:something|shows?|movies?)\s+(relaxing|exciting|funny|scary|emotional|light|dark|intense)/i,
      genre: /(sci-fi|comedy|drama|thriller|horror|action|romance|documentary)/i,
      decade: /(\d{4}s?|\d{2}s)/,
    };

    const entities: ExtractedEntity[] = [];
    let intent: QueryIntent = 'natural_search';

    // Check for similarity query
    const similarMatch = query.match(patterns.similar);
    if (similarMatch) {
      intent = 'similar_content';
      entities.push({
        type: 'series',
        value: similarMatch[1],
        confidence: 0.9,
      });
    }

    // Check for mood
    const moodMatch = query.match(patterns.mood);
    if (moodMatch) {
      intent = 'mood_based';
      entities.push({
        type: 'mood',
        value: moodMatch[1].toLowerCase(),
        confidence: 0.85,
      });
    }

    // Check for genre
    const genreMatch = query.match(patterns.genre);
    if (genreMatch) {
      entities.push({
        type: 'genre',
        value: genreMatch[1].toLowerCase(),
        confidence: 0.9,
      });
    }

    return {
      originalQuery: query,
      intent,
      entities,
      filters: [],
    };
  }
}
```

### Mood Mappings

```typescript
const MOOD_MAPPINGS: Record<string, MoodMapping> = {
  relaxing: {
    description: 'Calm, low-stakes, feel-good content',
    genres: ['Comedy', 'Documentary', 'Animation'],
    excludeGenres: ['Horror', 'Thriller', 'War'],
    keywords: ['wholesome', 'cozy', 'light-hearted', 'comfort'],
  },
  exciting: {
    description: 'High energy, action-packed, thrilling',
    genres: ['Action', 'Thriller', 'Adventure', 'Sci-Fi'],
    excludeGenres: ['Documentary', 'Drama'],
    keywords: ['intense', 'explosive', 'adrenaline', 'edge-of-seat'],
  },
  funny: {
    description: 'Comedy, humor, laugh-out-loud',
    genres: ['Comedy', 'Animation'],
    excludeGenres: ['Horror', 'War', 'Drama'],
    keywords: ['hilarious', 'witty', 'satirical', 'absurd'],
  },
  scary: {
    description: 'Horror, suspense, frightening',
    genres: ['Horror', 'Thriller'],
    excludeGenres: ['Comedy', 'Animation', 'Documentary'],
    keywords: ['terrifying', 'supernatural', 'psychological', 'gore'],
  },
  emotional: {
    description: 'Moving, touching, thought-provoking',
    genres: ['Drama', 'Romance'],
    excludeGenres: ['Action', 'Comedy'],
    keywords: ['heartfelt', 'poignant', 'tearjerker', 'bittersweet'],
  },
};
```

### Tier 2 Use Cases

| Use Case | Query Example | How It Works |
|----------|---------------|--------------|
| Natural Language Search | "90s thriller with twist ending" | Embeds query, semantic similarity search |
| Mood-Based | "Something cozy for Sunday" | Maps mood to genres + semantic search |
| Abstract Concepts | "Shows about corporate dystopia" | Semantic matching on themes |
| Complex Similarity | "Like Severance but more sci-fi" | Combines similarity + semantic filtering |
| Style Search | "Visually stunning cinematography" | Embeddings capture style descriptions |

---

## Tier 3: Full AI Assistant

### Overview

Tier 3 adds a conversational LLM that understands context, provides explanations, and can take actions on your behalf. The assistant remembers conversation history and can execute multi-step workflows.

### Assistant Architecture

```typescript
interface AIAssistant {
  // Conversation
  chat(message: string, context: ConversationContext): Promise<AssistantResponse>;

  // Actions
  executeAction(action: AssistantAction): Promise<ActionResult>;

  // Proactive features
  getDailySuggestions(userId: number): Promise<ProactiveSuggestion[]>;
  getWatchNextSuggestion(userId: number): Promise<WatchNextSuggestion>;
}

interface ConversationContext {
  userId: number;
  conversationId: string;
  history: ConversationMessage[];
  userProfile?: UserTasteProfile;
}

interface AssistantResponse {
  message: string;
  recommendations?: Recommendation[];
  suggestedActions?: SuggestedAction[];
  followUpQuestions?: string[];
  requiresConfirmation?: ActionConfirmation;
}

interface SuggestedAction {
  type: 'add_to_library' | 'add_to_watchlist' | 'search_releases' | 'start_download';
  description: string;
  mediaId?: number;
  confirmationRequired: boolean;
}

type AssistantAction =
  | { type: 'add_to_library'; mediaId: number }
  | { type: 'add_to_watchlist'; mediaId: number }
  | { type: 'search_releases'; mediaId: number; quality?: string }
  | { type: 'start_download'; releaseId: number }
  | { type: 'set_preference'; preference: UserPreference };
```

### Response Generation

```typescript
class AssistantResponseGenerator {
  constructor(
    private llm: LLMProvider,
    private ragPipeline: RAGPipeline,
    private actionExecutor: ActionExecutor
  ) {}

  async generateResponse(
    message: string,
    context: ConversationContext
  ): Promise<AssistantResponse> {
    // Build context for LLM
    const systemPrompt = this.buildSystemPrompt(context);
    const userPrompt = await this.buildUserPrompt(message, context);

    // Generate response
    const llmResponse = await this.llm.complete({
      system: systemPrompt,
      user: userPrompt,
      temperature: 0.7,
      maxTokens: 2048,
      responseFormat: 'json',
    });

    return this.parseResponse(llmResponse, context);
  }

  private buildSystemPrompt(context: ConversationContext): string {
    return `You are a helpful media assistant for idkarr, a personal media management system.

Your capabilities:
- Recommend TV shows and movies based on user preferences
- Explain why recommendations match the user's taste
- Take actions like adding content to the library or starting downloads
- Remember conversation context and follow up on previous topics

User Profile Summary:
${this.formatUserProfile(context.userProfile)}

Available Actions:
- add_to_library: Add a show/movie to the user's library (triggers search & download)
- add_to_watchlist: Add to watchlist for later
- search_releases: Search for available releases/downloads
- start_download: Begin downloading a specific release

Guidelines:
- Be conversational and helpful
- Explain your reasoning for recommendations
- Ask for confirmation before taking actions that download content
- Reference the user's watch history when relevant
- Suggest follow-up questions to refine recommendations`;
  }

  private async buildUserPrompt(
    message: string,
    context: ConversationContext
  ): Promise<string> {
    // Get relevant context from RAG pipeline
    const ragContext = await this.ragPipeline.retrieve(
      { originalQuery: message, intent: 'natural_search', entities: [], filters: [] },
      { userId: context.userId, maxResults: 10 }
    );

    return `User Message: "${message}"

Recent Conversation:
${this.formatConversationHistory(context.history.slice(-5))}

Available Media for Recommendations:
${this.formatRetrievedContext(ragContext)}

Respond in JSON format:
{
  "message": "Your conversational response",
  "recommendations": [
    {
      "mediaId": <id>,
      "title": "<title>",
      "reason": "<personalized explanation>",
      "matchScore": <0-100>
    }
  ],
  "suggestedActions": [
    {
      "type": "<action_type>",
      "description": "<what this does>",
      "mediaId": <optional>,
      "confirmationRequired": <boolean>
    }
  ],
  "followUpQuestions": ["<question 1>", "<question 2>"]
}`;
  }
}
```

### Action Executor

```typescript
class ActionExecutor {
  constructor(
    private mediaService: MediaService,
    private searchService: SearchService,
    private downloadService: DownloadService
  ) {}

  async execute(action: AssistantAction, userId: number): Promise<ActionResult> {
    switch (action.type) {
      case 'add_to_library':
        return this.addToLibrary(action.mediaId, userId);

      case 'add_to_watchlist':
        return this.addToWatchlist(action.mediaId, userId);

      case 'search_releases':
        return this.searchReleases(action.mediaId, action.quality);

      case 'start_download':
        return this.startDownload(action.releaseId, userId);

      default:
        throw new Error(`Unknown action type: ${(action as AssistantAction).type}`);
    }
  }

  private async addToLibrary(
    mediaId: number,
    userId: number
  ): Promise<ActionResult> {
    // Add to library
    await this.mediaService.addToLibrary(mediaId, userId);

    // Automatically search for releases
    const releases = await this.searchService.searchForMedia(mediaId);

    if (releases.length > 0) {
      // Find best release
      const bestRelease = this.selectBestRelease(releases);

      return {
        success: true,
        message: `Added to library. Found ${releases.length} releases. Best option: ${bestRelease.quality} from ${bestRelease.source}`,
        data: {
          mediaId,
          releases: releases.slice(0, 5),
          suggestedRelease: bestRelease,
        },
        nextAction: {
          type: 'start_download',
          description: `Download ${bestRelease.quality} version?`,
          releaseId: bestRelease.id,
          confirmationRequired: true,
        },
      };
    }

    return {
      success: true,
      message: 'Added to library. No releases found yet - will notify when available.',
      data: { mediaId },
    };
  }

  private async startDownload(
    releaseId: number,
    userId: number
  ): Promise<ActionResult> {
    const download = await this.downloadService.start(releaseId, userId);

    return {
      success: true,
      message: `Download started. ETA: ${download.eta}`,
      data: {
        downloadId: download.id,
        eta: download.eta,
        size: download.size,
      },
    };
  }
}
```

### Tier 3 Use Cases

| Use Case | Conversation | Actions Taken |
|----------|--------------|---------------|
| Find & Add | "Find something like Severance and add the best one" | Search → Recommend → Confirm → Add → Search releases → Download |
| Watchlist Management | "Add those last 3 to my watchlist" | Bulk add to watchlist |
| Quality Preference | "I only want 4K versions" | Set preference → Filter future searches |
| Continue Watching | "What should I watch tonight?" | Analyze partially watched → Suggest resume |
| Proactive Alerts | (System-initiated) "New season of your show available" | Notify → Offer to add |

### Example Tier 3 Conversation

```
User: "I need something to watch with my partner. We both liked Severance and Dark."
Assistant: "Great picks! Both have that mysterious, mind-bending quality. Here are
some shows you might both enjoy:

1. **The OA** - Mysterious sci-fi with puzzle elements like Dark
2. **Homecoming** - Corporate thriller vibes like Severance
3. **Devs** - Tech mystery with beautiful visuals
4. **Tales from the Loop** - Atmospheric sci-fi, slower pace

Based on your shared tastes, I'd especially recommend The OA - it has the
intricate mythology of Dark and the unsettling workplace energy of Severance.
Want me to add any of these?"

User: "Tell me more about The OA - is it finished?"
Assistant: "The OA has 2 seasons (16 episodes total). Unfortunately, it was
cancelled after season 2, so the story isn't complete - though many fans feel
season 2 provides some closure. Fair warning before you get invested!

It was created by Brit Marling and Zal Batmanglij. Very unique storytelling.

Still interested, or would you prefer something with a complete ending?"

User: "Let's try Devs instead - that's finished right? Add it."
Assistant: "Yes! Devs is a limited series - 8 episodes, complete story with
a definitive ending. Created by Alex Garland (Ex Machina, Annihilation).

Adding Devs to your library now...
[Action: add_to_library(devs)]

Done! Found a 4K HDR release. Want me to start the download?"

User: "Yes please"
Assistant: "Download started! Devs (2020) - 4K HDR
Size: 45.2 GB | ETA: ~25 minutes

I'll notify you when it's ready. Enjoy the watch with your partner!"
```

---

## Architecture

### System Overview

```
                              ┌─────────────────────────────────────┐
                              │           User Interface            │
                              │  ┌─────────┐ ┌─────────┐ ┌────────┐ │
                              │  │Dashboard│ │ Search  │ │  Chat  │ │
                              │  │  (T1+)  │ │  (T2+)  │ │  (T3)  │ │
                              │  └────┬────┘ └────┬────┘ └───┬────┘ │
                              └───────┼──────────┼──────────┼───────┘
                                      │          │          │
                                      ▼          ▼          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Recommendation Service                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                        Tier Router                                   │    │
│  │   Determines which engine(s) to use based on config and request     │    │
│  └──────────────────────────────┬──────────────────────────────────────┘    │
│                                  │                                           │
│         ┌────────────────────────┼────────────────────────┐                 │
│         ▼                        ▼                        ▼                 │
│  ┌─────────────┐         ┌─────────────┐          ┌─────────────┐          │
│  │   Tier 1    │         │   Tier 2    │          │   Tier 3    │          │
│  │   Local     │         │    RAG      │          │  Assistant  │          │
│  │  Similarity │         │   Search    │          │    LLM      │          │
│  └──────┬──────┘         └──────┬──────┘          └──────┬──────┘          │
│         │                       │                        │                  │
│         │                       ▼                        ▼                  │
│         │              ┌─────────────────┐      ┌─────────────────┐        │
│         │              │ Embedding Svc   │      │  LLM Provider   │        │
│         │              │ (Local/Cloud)   │      │  (Local/Cloud)  │        │
│         │              └────────┬────────┘      └────────┬────────┘        │
│         │                       │                        │                  │
│         │                       ▼                        │                  │
│         │              ┌─────────────────┐               │                  │
│         │              │  Vector Store   │◄──────────────┘                  │
│         │              │   (pgvector)    │                                  │
│         │              └────────┬────────┘                                  │
│         │                       │                                           │
│         ▼                       ▼                                           │
│  ┌──────────────────────────────────────────────────────────────────┐      │
│  │                      PostgreSQL Database                          │      │
│  │   • Media metadata    • User preferences    • Watch history      │      │
│  │   • Embeddings        • Conversations       • Feedback           │      │
│  └──────────────────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    ▼                 ▼                 ▼
           ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
           │  Local Only  │  │ Ollama (opt) │  │ Cloud APIs   │
           │   No deps    │  │  Embeddings  │  │   (opt)      │
           │              │  │     LLM      │  │  OpenAI      │
           │              │  │              │  │  Anthropic   │
           └──────────────┘  └──────────────┘  └──────────────┘
                Tier 1           Tier 2/3          Tier 2/3
```

### Tier Detection and Routing

```typescript
class TierRouter {
  constructor(private config: AIRecommendationConfig) {}

  async route(request: RecommendationRequest): Promise<RecommendationResponse> {
    const { tier } = this.config;

    // Tier 3: Conversational requests
    if (tier >= 3 && request.type === 'conversation') {
      return this.tier3Handler.handle(request);
    }

    // Tier 2: Natural language search
    if (tier >= 2 && request.type === 'natural_language') {
      return this.tier2Handler.handle(request);
    }

    // Tier 1: Local similarity (always available)
    return this.tier1Handler.handle(request);
  }

  getAvailableFeatures(): FeatureSet {
    const features: FeatureSet = {
      similarContent: true,
      genreMatching: true,
      actorDirectorMatching: true,
      naturalLanguageSearch: this.config.tier >= 2,
      moodBasedDiscovery: this.config.tier >= 2,
      conversationalInterface: this.config.tier >= 3,
      actionableCommands: this.config.tier >= 3,
      proactiveSuggestions: this.config.tier >= 3,
    };

    // Override with explicit feature flags
    return { ...features, ...this.config.features };
  }
}
```

---

## Embedding System

### Content Embedding

```typescript
interface MediaEmbeddingData {
  id: number;
  type: 'series' | 'movie';
  title: string;
  overview: string;
  genres: string[];
  keywords: string[];
  cast: string[];
  directors: string[];
  network?: string;
  year: number;
  rating: number;
}

class EmbeddingService {
  private provider: EmbeddingProvider;
  private cache: EmbeddingCache;

  async embedMedia(media: MediaEmbeddingData): Promise<number[]> {
    const cacheKey = `embed:${media.type}:${media.id}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const text = this.buildEmbeddingText(media);
    const embedding = await this.provider.embed(text);

    await this.cache.set(cacheKey, embedding, { ttl: 86400 * 7 });
    return embedding;
  }

  private buildEmbeddingText(media: MediaEmbeddingData): string {
    const parts: string[] = [];

    parts.push(`${media.type === 'series' ? 'TV Series' : 'Movie'}: ${media.title}`);

    if (media.overview) {
      parts.push(media.overview);
    }

    if (media.genres.length) {
      parts.push(`Genres: ${media.genres.join(', ')}`);
    }

    if (media.keywords.length) {
      parts.push(`Themes: ${media.keywords.join(', ')}`);
    }

    if (media.cast.length) {
      parts.push(`Starring: ${media.cast.slice(0, 5).join(', ')}`);
    }

    return parts.join('\n\n');
  }
}
```

### Embedding Providers

```typescript
// Ollama (Local)
class OllamaEmbeddingProvider implements EmbeddingProvider {
  constructor(private config: { baseUrl: string; model: string }) {}

  async embed(text: string): Promise<number[]> {
    const response = await fetch(`${this.config.baseUrl}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: this.config.model, prompt: text }),
    });
    const data = await response.json();
    return data.embedding;
  }

  get dimensions(): number {
    const dims: Record<string, number> = {
      'nomic-embed-text': 768,
      'mxbai-embed-large': 1024,
    };
    return dims[this.config.model] ?? 768;
  }
}

// OpenAI (Cloud)
class OpenAIEmbeddingProvider implements EmbeddingProvider {
  constructor(private config: { apiKey: string; model: string }) {}

  async embed(text: string): Promise<number[]> {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({ model: this.config.model, input: text }),
    });
    const data = await response.json();
    return data.data[0].embedding;
  }
}
```

---

## Vector Database

### pgvector Schema

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Media embeddings table
CREATE TABLE media_embeddings (
  id SERIAL PRIMARY KEY,
  media_type VARCHAR(10) NOT NULL,
  media_id INTEGER NOT NULL,
  embedding vector(1536),
  embedding_model VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(media_type, media_id, embedding_model)
);

-- HNSW index for fast similarity search
CREATE INDEX ON media_embeddings
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- User taste embeddings
CREATE TABLE user_taste_embeddings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  embedding vector(1536),
  embedding_model VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, embedding_model)
);
```

---

## LLM Integration

### Provider Interface

```typescript
interface LLMProvider {
  complete(request: CompletionRequest): Promise<string>;
  stream(request: CompletionRequest): AsyncIterable<string>;
}

interface CompletionRequest {
  system?: string;
  user: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: 'text' | 'json';
}
```

### Ollama Provider (Local)

```typescript
class OllamaProvider implements LLMProvider {
  constructor(private config: { baseUrl: string; model: string }) {}

  async complete(request: CompletionRequest): Promise<string> {
    const response = await fetch(`${this.config.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.config.model,
        prompt: this.formatPrompt(request),
        stream: false,
        options: {
          temperature: request.temperature ?? 0.7,
          num_predict: request.maxTokens ?? 1024,
        },
      }),
    });
    const data = await response.json();
    return data.response;
  }

  private formatPrompt(request: CompletionRequest): string {
    if (request.system) {
      return `${request.system}\n\nUser: ${request.user}\n\nAssistant:`;
    }
    return request.user;
  }
}
```

### Anthropic Provider (Cloud)

```typescript
class AnthropicProvider implements LLMProvider {
  constructor(private config: { apiKey: string; model: string }) {}

  async complete(request: CompletionRequest): Promise<string> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.config.model,
        max_tokens: request.maxTokens ?? 1024,
        system: request.system,
        messages: [{ role: 'user', content: request.user }],
      }),
    });
    const data = await response.json();
    return data.content[0].text;
  }
}
```

---

## User Preference Learning

### Taste Profile

```typescript
interface UserTasteProfile {
  userId: number;
  tasteEmbedding: number[];
  favoriteGenres: WeightedPreference[];
  dislikedGenres: WeightedPreference[];
  watchedGenreDistribution: Map<string, number>;
  avgWatchedRating: number;
  completionRate: number;
  lastUpdated: Date;
}

class UserPreferenceService {
  async getTasteProfile(userId: number): Promise<UserTasteProfile> {
    const cached = await this.cache.get(`taste:${userId}`);
    if (cached && !this.isStale(cached)) {
      return cached;
    }

    const [watchHistory, ratings, explicitPrefs] = await Promise.all([
      this.getWatchHistory(userId),
      this.getUserRatings(userId),
      this.getExplicitPreferences(userId),
    ]);

    const genreDistribution = this.calculateGenreDistribution(watchHistory);
    const tasteEmbedding = await this.generateTasteEmbedding(watchHistory, ratings);

    const profile: UserTasteProfile = {
      userId,
      tasteEmbedding,
      favoriteGenres: this.extractFavoriteGenres(genreDistribution, explicitPrefs),
      dislikedGenres: explicitPrefs.dislikedGenres ?? [],
      watchedGenreDistribution: genreDistribution,
      avgWatchedRating: this.calculateAvgRating(watchHistory),
      completionRate: this.calculateCompletionRate(watchHistory),
      lastUpdated: new Date(),
    };

    await this.cache.set(`taste:${userId}`, profile, { ttl: 3600 });
    return profile;
  }
}
```

---

## API Specification

### REST Endpoints

```typescript
// GET /api/v1/recommendations
// Works with all tiers
interface GetRecommendationsRequest {
  type?: 'personalized' | 'similar' | 'trending';
  mediaId?: number;  // Required for type='similar'
  limit?: number;
}

// POST /api/v1/recommendations/search (Tier 2+)
interface NaturalLanguageSearchRequest {
  query: string;
  mediaTypes?: ('series' | 'movie')[];
  limit?: number;
}

// POST /api/v1/recommendations/chat (Tier 3)
interface ChatRequest {
  message: string;
  conversationId?: string;  // For context continuity
}

interface ChatResponse {
  message: string;
  recommendations?: Recommendation[];
  suggestedActions?: SuggestedAction[];
  followUpQuestions?: string[];
  conversationId: string;
}

// POST /api/v1/recommendations/action (Tier 3)
interface ExecuteActionRequest {
  action: AssistantAction;
  conversationId?: string;
}
```

### Feature Detection Endpoint

```typescript
// GET /api/v1/recommendations/features
// Returns available features based on current tier
interface FeaturesResponse {
  tier: 1 | 2 | 3;
  features: {
    similarContent: boolean;
    genreMatching: boolean;
    actorDirectorMatching: boolean;
    naturalLanguageSearch: boolean;
    moodBasedDiscovery: boolean;
    conversationalInterface: boolean;
    actionableCommands: boolean;
    proactiveSuggestions: boolean;
  };
  providers: {
    embedding?: 'local' | 'ollama' | 'openai';
    llm?: 'ollama' | 'openai' | 'anthropic';
  };
}
```

---

## Related Documents

- [SEARCH_SPECIFICATION.md](./SEARCH_SPECIFICATION.md) - Release search system
- [DATABASE_SCHEMA.md](../02-architecture/DATABASE_SCHEMA.md) - Data storage
- [REST_API.md](../03-api/REST_API.md) - API endpoints
- [SECURITY.md](../05-security/SECURITY.md) - API key and data protection
