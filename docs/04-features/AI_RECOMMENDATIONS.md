# AI Recommendations Specification

> **idkarr** - AI-powered recommendations with Retrieval Augmented Generation (RAG)

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [RAG Pipeline](#rag-pipeline)
4. [Embedding System](#embedding-system)
5. [Vector Database](#vector-database)
6. [Recommendation Engine](#recommendation-engine)
7. [LLM Integration](#llm-integration)
8. [User Preference Learning](#user-preference-learning)
9. [API Specification](#api-specification)
10. [Privacy & Data Handling](#privacy--data-handling)

---

## Overview

### Goals

1. **Personalized Recommendations**: Suggest series/movies based on user preferences and viewing history
2. **Natural Language Queries**: "Find shows like Breaking Bad but with more comedy"
3. **Smart Discovery**: Surface hidden gems matching user taste profiles
4. **Context-Aware**: Consider mood, time of day, viewing patterns
5. **Explainable**: Provide reasoning for recommendations

### Use Cases

| Use Case | Description | Example |
|----------|-------------|---------|
| Similar Content | Find similar series/movies | "Shows like Severance" |
| Natural Language Search | Search by description | "Sci-fi with strong female lead" |
| Mood-Based | Recommendations by mood | "Something light and funny" |
| Gap Filling | What's missing from library | "Popular shows you might like" |
| Watchlist Curation | Smart watchlist ordering | "What to watch tonight" |
| Request Suggestions | For Overseerr-style requests | "Users who liked X also requested Y" |

### Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| Embeddings | OpenAI/Ollama/Local | Generate semantic vectors |
| Vector DB | pgvector/Qdrant/Milvus | Store and query embeddings |
| LLM | OpenAI/Anthropic/Ollama | Generate responses |
| RAG Framework | LangChain/LlamaIndex | Orchestrate retrieval |
| Cache | Redis | Cache embeddings & results |

---

## Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         User Interface                                   │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐  │
│  │  Recommendation │  │  Natural Lang   │  │  "More Like This"       │  │
│  │  Dashboard      │  │  Search Bar     │  │  Button                 │  │
│  └────────┬────────┘  └────────┬────────┘  └────────────┬────────────┘  │
└───────────┼────────────────────┼───────────────────────┼────────────────┘
            │                    │                       │
            ▼                    ▼                       ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       Recommendation API                                 │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    Query Processor                               │    │
│  │  • Intent Detection  • Query Expansion  • Context Injection      │    │
│  └──────────────────────────────┬──────────────────────────────────┘    │
└─────────────────────────────────┼───────────────────────────────────────┘
                                  │
            ┌─────────────────────┼─────────────────────┐
            ▼                     ▼                     ▼
┌───────────────────┐  ┌───────────────────┐  ┌───────────────────┐
│   RAG Pipeline    │  │  Preference       │  │  Collaborative    │
│                   │  │  Engine           │  │  Filtering        │
│  • Retrieval      │  │                   │  │                   │
│  • Augmentation   │  │  • User Taste     │  │  • Similar Users  │
│  • Generation     │  │  • Watch History  │  │  • Popular Items  │
└─────────┬─────────┘  └─────────┬─────────┘  └─────────┬─────────┘
          │                      │                      │
          ▼                      ▼                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        Data Layer                                        │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐  │
│  │  Vector Store   │  │  PostgreSQL     │  │  Redis Cache            │  │
│  │  (pgvector)     │  │  (User Data)    │  │  (Embeddings/Results)   │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     External Services                                    │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐  │
│  │  Embedding API  │  │  LLM Provider   │  │  Metadata APIs          │  │
│  │  (OpenAI/Local) │  │  (Claude/GPT)   │  │  (TMDB/TVDB)            │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

### Configuration

```typescript
interface AIRecommendationConfig {
  // Feature flags
  enabled: boolean;
  enableNaturalLanguageSearch: boolean;
  enablePersonalizedRecommendations: boolean;
  enableExplainability: boolean;

  // Embedding configuration
  embedding: {
    provider: 'openai' | 'ollama' | 'local' | 'huggingface';
    model: string;
    dimensions: number;
    batchSize: number;

    // Provider-specific
    openai?: {
      apiKey: string;
      model: 'text-embedding-3-small' | 'text-embedding-3-large' | 'text-embedding-ada-002';
    };
    ollama?: {
      baseUrl: string;
      model: string; // 'nomic-embed-text', 'mxbai-embed-large'
    };
    local?: {
      modelPath: string;
      quantization: 'f32' | 'f16' | 'int8';
    };
  };

  // LLM configuration
  llm: {
    provider: 'openai' | 'anthropic' | 'ollama' | 'local';
    model: string;
    temperature: number;
    maxTokens: number;

    openai?: {
      apiKey: string;
      model: 'gpt-4o' | 'gpt-4o-mini' | 'gpt-4-turbo';
    };
    anthropic?: {
      apiKey: string;
      model: 'claude-sonnet-4-20250514' | 'claude-3-5-haiku-20241022';
    };
    ollama?: {
      baseUrl: string;
      model: string; // 'llama3.1', 'mistral', 'mixtral'
    };
  };

  // Vector store configuration
  vectorStore: {
    provider: 'pgvector' | 'qdrant' | 'milvus' | 'chroma';

    pgvector?: {
      connectionString: string;
      tableName: string;
      indexType: 'ivfflat' | 'hnsw';
    };
    qdrant?: {
      url: string;
      apiKey?: string;
      collectionName: string;
    };
  };

  // Recommendation settings
  recommendations: {
    maxResults: number;
    minSimilarityScore: number;
    diversityFactor: number; // 0-1, higher = more diverse
    recencyBias: number; // Boost newer content
    popularityWeight: number;
  };

  // Privacy settings
  privacy: {
    anonymizeUserData: boolean;
    localProcessingOnly: boolean;
    dataRetentionDays: number;
  };
}
```

---

## RAG Pipeline

### Pipeline Overview

```typescript
interface RAGPipeline {
  // Step 1: Query Understanding
  parseQuery(query: string): Promise<ParsedQuery>;

  // Step 2: Retrieval
  retrieve(query: ParsedQuery, context: RetrievalContext): Promise<RetrievedDocuments>;

  // Step 3: Augmentation
  augment(query: ParsedQuery, documents: RetrievedDocuments): Promise<AugmentedContext>;

  // Step 4: Generation
  generate(context: AugmentedContext): Promise<RecommendationResponse>;
}

interface ParsedQuery {
  originalQuery: string;
  intent: QueryIntent;
  entities: ExtractedEntity[];
  filters: QueryFilter[];
  expandedTerms: string[];
}

type QueryIntent =
  | 'similar_content'      // "Shows like Breaking Bad"
  | 'natural_search'       // "Sci-fi with time travel"
  | 'mood_based'           // "Something relaxing"
  | 'specific_request'     // "The new season of Severance"
  | 'discovery'            // "What should I watch?"
  | 'comparison';          // "Is X better than Y?"

interface ExtractedEntity {
  type: 'series' | 'movie' | 'person' | 'genre' | 'network' | 'year';
  value: string;
  confidence: number;
  resolved?: {
    id: number;
    title: string;
  };
}
```

### Query Processing

```typescript
class QueryProcessor {
  private llm: LLMProvider;
  private entityResolver: EntityResolver;

  async parseQuery(query: string, userId?: number): Promise<ParsedQuery> {
    // Use LLM to understand intent and extract entities
    const analysis = await this.llm.complete({
      system: `You are a media recommendation assistant. Analyze the user's query and extract:
        1. Intent (similar_content, natural_search, mood_based, discovery, comparison)
        2. Entities (series names, genres, actors, years, networks)
        3. Implicit filters (language, rating, length)
        4. Mood/tone preferences`,
      user: query,
      responseFormat: 'json',
    });

    const parsed = JSON.parse(analysis) as RawQueryAnalysis;

    // Resolve entities to database IDs
    const resolvedEntities = await this.resolveEntities(parsed.entities);

    // Expand query with synonyms and related terms
    const expandedTerms = await this.expandQuery(query, parsed);

    return {
      originalQuery: query,
      intent: parsed.intent,
      entities: resolvedEntities,
      filters: this.extractFilters(parsed, userId),
      expandedTerms,
    };
  }

  private async resolveEntities(entities: RawEntity[]): Promise<ExtractedEntity[]> {
    return Promise.all(
      entities.map(async (entity) => {
        const resolved = await this.entityResolver.resolve(entity);
        return {
          ...entity,
          resolved,
        };
      })
    );
  }

  private async expandQuery(query: string, analysis: RawQueryAnalysis): Promise<string[]> {
    const expansions: string[] = [query];

    // Add genre synonyms
    for (const genre of analysis.genres ?? []) {
      const synonyms = GENRE_SYNONYMS[genre.toLowerCase()] ?? [];
      expansions.push(...synonyms);
    }

    // Add related terms from knowledge base
    const related = await this.knowledgeBase.getRelatedTerms(query);
    expansions.push(...related);

    return [...new Set(expansions)];
  }
}
```

### Retrieval Strategy

```typescript
class HybridRetriever {
  private vectorStore: VectorStore;
  private textSearch: TextSearchEngine;
  private metadataFilter: MetadataFilter;

  async retrieve(
    query: ParsedQuery,
    context: RetrievalContext
  ): Promise<RetrievedDocuments> {
    // Parallel retrieval from multiple sources
    const [vectorResults, textResults, collaborativeResults] = await Promise.all([
      this.vectorSearch(query),
      this.textSearch.search(query.originalQuery),
      this.collaborativeFilter(context.userId),
    ]);

    // Merge and re-rank results
    const merged = this.mergeResults(vectorResults, textResults, collaborativeResults);

    // Apply metadata filters
    const filtered = this.metadataFilter.apply(merged, query.filters);

    // Re-rank with user preferences
    const reranked = await this.rerank(filtered, context);

    return {
      documents: reranked.slice(0, context.maxResults),
      totalFound: filtered.length,
      sources: {
        vector: vectorResults.length,
        text: textResults.length,
        collaborative: collaborativeResults.length,
      },
    };
  }

  private async vectorSearch(query: ParsedQuery): Promise<ScoredDocument[]> {
    // Generate embedding for query
    const queryEmbedding = await this.embeddingService.embed(
      this.buildSearchText(query)
    );

    // Search vector store
    const results = await this.vectorStore.search({
      vector: queryEmbedding,
      topK: 100,
      filter: this.buildVectorFilter(query),
    });

    return results.map(r => ({
      id: r.id,
      score: r.score,
      source: 'vector',
      metadata: r.metadata,
    }));
  }

  private async collaborativeFilter(userId?: number): Promise<ScoredDocument[]> {
    if (!userId) return [];

    // Find similar users based on watch history
    const similarUsers = await this.findSimilarUsers(userId);

    // Get items liked by similar users but not by current user
    const recommendations = await this.getCollaborativeRecommendations(
      userId,
      similarUsers
    );

    return recommendations;
  }

  private mergeResults(
    ...resultSets: ScoredDocument[][]
  ): ScoredDocument[] {
    const scoreMap = new Map<string, MergedScore>();

    for (const results of resultSets) {
      for (const doc of results) {
        const existing = scoreMap.get(doc.id);

        if (existing) {
          existing.score += doc.score * this.getSourceWeight(doc.source);
          existing.sources.push(doc.source);
        } else {
          scoreMap.set(doc.id, {
            id: doc.id,
            score: doc.score * this.getSourceWeight(doc.source),
            sources: [doc.source],
            metadata: doc.metadata,
          });
        }
      }
    }

    // Boost items found in multiple sources
    for (const [, merged] of scoreMap) {
      merged.score *= 1 + (merged.sources.length - 1) * 0.2;
    }

    return Array.from(scoreMap.values())
      .sort((a, b) => b.score - a.score);
  }

  private getSourceWeight(source: string): number {
    const weights: Record<string, number> = {
      vector: 1.0,
      text: 0.7,
      collaborative: 0.8,
    };
    return weights[source] ?? 0.5;
  }
}
```

### Response Generation

```typescript
class ResponseGenerator {
  private llm: LLMProvider;

  async generate(context: AugmentedContext): Promise<RecommendationResponse> {
    const systemPrompt = this.buildSystemPrompt(context);
    const userPrompt = this.buildUserPrompt(context);

    const response = await this.llm.complete({
      system: systemPrompt,
      user: userPrompt,
      temperature: 0.7,
      maxTokens: 1500,
    });

    return this.parseResponse(response, context);
  }

  private buildSystemPrompt(context: AugmentedContext): string {
    return `You are a knowledgeable media recommendation assistant for idkarr.
Your role is to provide personalized TV show and movie recommendations.

Guidelines:
- Be conversational but concise
- Explain WHY each recommendation fits the user's request
- Consider the user's watch history and preferences
- Highlight what makes each show/movie unique
- Mention if something is already in their library
- Suggest a mix of popular and hidden gems

User Profile:
${this.formatUserProfile(context.userProfile)}

Available Context:
${this.formatRetrievedContext(context.documents)}`;
  }

  private buildUserPrompt(context: AugmentedContext): string {
    return `User Query: "${context.query.originalQuery}"

Based on the available shows/movies and the user's preferences, provide recommendations.

Format your response as JSON:
{
  "recommendations": [
    {
      "id": <series_or_movie_id>,
      "title": "<title>",
      "reason": "<personalized explanation>",
      "matchScore": <0-100>,
      "highlights": ["<key feature 1>", "<key feature 2>"],
      "similarTo": ["<reference show if applicable>"],
      "inLibrary": <boolean>,
      "warnings": ["<any content warnings if relevant>"]
    }
  ],
  "conversationalResponse": "<Natural language summary>",
  "followUpQuestions": ["<suggested follow-up 1>", "<suggested follow-up 2>"]
}`;
  }

  private parseResponse(
    llmResponse: string,
    context: AugmentedContext
  ): RecommendationResponse {
    const parsed = JSON.parse(llmResponse);

    // Enrich with full metadata
    const enrichedRecommendations = parsed.recommendations.map(
      (rec: RawRecommendation) => {
        const fullData = context.documents.find(d => d.id === rec.id);
        return {
          ...rec,
          metadata: fullData?.metadata,
          posterUrl: fullData?.metadata?.posterUrl,
          year: fullData?.metadata?.year,
          rating: fullData?.metadata?.rating,
        };
      }
    );

    return {
      recommendations: enrichedRecommendations,
      conversationalResponse: parsed.conversationalResponse,
      followUpQuestions: parsed.followUpQuestions,
      query: context.query,
      processingTime: Date.now() - context.startTime,
    };
  }
}
```

---

## Embedding System

### Content Embedding

```typescript
interface MediaEmbeddingData {
  // Identity
  id: number;
  type: 'series' | 'movie';
  title: string;

  // Text content for embedding
  overview: string;
  genres: string[];
  keywords: string[];
  cast: string[];
  directors: string[];
  network?: string;

  // Structured metadata (not embedded, used for filtering)
  year: number;
  rating: number;
  voteCount: number;
  runtime?: number;
  status?: string;
  language: string;
  country: string;
}

class EmbeddingService {
  private provider: EmbeddingProvider;
  private cache: EmbeddingCache;

  async embedMedia(media: MediaEmbeddingData): Promise<number[]> {
    // Check cache first
    const cacheKey = `embed:${media.type}:${media.id}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    // Build embedding text
    const text = this.buildEmbeddingText(media);

    // Generate embedding
    const embedding = await this.provider.embed(text);

    // Cache for future use
    await this.cache.set(cacheKey, embedding, { ttl: 86400 * 7 }); // 7 days

    return embedding;
  }

  private buildEmbeddingText(media: MediaEmbeddingData): string {
    const parts: string[] = [];

    // Title with type context
    parts.push(`${media.type === 'series' ? 'TV Series' : 'Movie'}: ${media.title}`);

    // Overview (main content)
    if (media.overview) {
      parts.push(media.overview);
    }

    // Genres
    if (media.genres.length) {
      parts.push(`Genres: ${media.genres.join(', ')}`);
    }

    // Keywords/themes
    if (media.keywords.length) {
      parts.push(`Themes: ${media.keywords.join(', ')}`);
    }

    // Key cast
    if (media.cast.length) {
      parts.push(`Starring: ${media.cast.slice(0, 5).join(', ')}`);
    }

    // Network/studio context
    if (media.network) {
      parts.push(`Network: ${media.network}`);
    }

    return parts.join('\n\n');
  }

  async embedBatch(items: MediaEmbeddingData[]): Promise<Map<number, number[]>> {
    const results = new Map<number, number[]>();
    const toEmbed: MediaEmbeddingData[] = [];

    // Check cache for all items
    for (const item of items) {
      const cacheKey = `embed:${item.type}:${item.id}`;
      const cached = await this.cache.get(cacheKey);

      if (cached) {
        results.set(item.id, cached);
      } else {
        toEmbed.push(item);
      }
    }

    // Batch embed remaining items
    if (toEmbed.length > 0) {
      const texts = toEmbed.map(item => this.buildEmbeddingText(item));
      const embeddings = await this.provider.embedBatch(texts);

      for (let i = 0; i < toEmbed.length; i++) {
        const item = toEmbed[i];
        const embedding = embeddings[i];

        results.set(item.id, embedding);

        // Cache
        const cacheKey = `embed:${item.type}:${item.id}`;
        await this.cache.set(cacheKey, embedding, { ttl: 86400 * 7 });
      }
    }

    return results;
  }
}
```

### Embedding Providers

```typescript
// OpenAI Embeddings
class OpenAIEmbeddingProvider implements EmbeddingProvider {
  private client: OpenAI;

  constructor(config: OpenAIEmbeddingConfig) {
    this.client = new OpenAI({ apiKey: config.apiKey });
    this.model = config.model ?? 'text-embedding-3-small';
  }

  async embed(text: string): Promise<number[]> {
    const response = await this.client.embeddings.create({
      model: this.model,
      input: text,
    });

    return response.data[0].embedding;
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const response = await this.client.embeddings.create({
      model: this.model,
      input: texts,
    });

    return response.data.map(d => d.embedding);
  }

  get dimensions(): number {
    const dims: Record<string, number> = {
      'text-embedding-3-small': 1536,
      'text-embedding-3-large': 3072,
      'text-embedding-ada-002': 1536,
    };
    return dims[this.model];
  }
}

// Ollama Embeddings (Local)
class OllamaEmbeddingProvider implements EmbeddingProvider {
  private baseUrl: string;
  private model: string;

  constructor(config: OllamaEmbeddingConfig) {
    this.baseUrl = config.baseUrl ?? 'http://localhost:11434';
    this.model = config.model ?? 'nomic-embed-text';
  }

  async embed(text: string): Promise<number[]> {
    const response = await fetch(`${this.baseUrl}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        prompt: text,
      }),
    });

    const data = await response.json();
    return data.embedding;
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    // Ollama doesn't support batch, so we parallelize
    return Promise.all(texts.map(text => this.embed(text)));
  }

  get dimensions(): number {
    const dims: Record<string, number> = {
      'nomic-embed-text': 768,
      'mxbai-embed-large': 1024,
      'all-minilm': 384,
    };
    return dims[this.model] ?? 768;
  }
}

// HuggingFace Local Embeddings
class LocalEmbeddingProvider implements EmbeddingProvider {
  private pipeline: Pipeline;

  async initialize(modelPath: string): Promise<void> {
    // Using transformers.js or similar
    this.pipeline = await pipeline(
      'feature-extraction',
      modelPath,
      { quantized: true }
    );
  }

  async embed(text: string): Promise<number[]> {
    const output = await this.pipeline(text, {
      pooling: 'mean',
      normalize: true,
    });

    return Array.from(output.data);
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const outputs = await this.pipeline(texts, {
      pooling: 'mean',
      normalize: true,
    });

    return outputs.map((o: Tensor) => Array.from(o.data));
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
  media_type VARCHAR(10) NOT NULL, -- 'series' or 'movie'
  media_id INTEGER NOT NULL,
  embedding vector(1536), -- Adjust dimension based on model
  embedding_model VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(media_type, media_id, embedding_model)
);

-- Create HNSW index for fast similarity search
CREATE INDEX ON media_embeddings
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- User taste profile embeddings
CREATE TABLE user_taste_embeddings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  embedding vector(1536),
  embedding_model VARCHAR(100) NOT NULL,
  watch_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(user_id, embedding_model)
);

-- Search history for learning
CREATE TABLE recommendation_feedback (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  query TEXT NOT NULL,
  recommended_media_id INTEGER NOT NULL,
  recommended_media_type VARCHAR(10) NOT NULL,
  feedback_type VARCHAR(20), -- 'clicked', 'added', 'watched', 'dismissed'
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX ON recommendation_feedback(user_id, created_at DESC);
```

### Vector Store Service

```typescript
class PgVectorStore implements VectorStore {
  private db: Database;
  private tableName: string;

  async upsert(items: VectorItem[]): Promise<void> {
    const values = items.map(item => ({
      media_type: item.mediaType,
      media_id: item.mediaId,
      embedding: `[${item.embedding.join(',')}]`,
      embedding_model: item.model,
      updated_at: new Date(),
    }));

    await this.db
      .insert(mediaEmbeddings)
      .values(values)
      .onConflictDoUpdate({
        target: [mediaEmbeddings.mediaType, mediaEmbeddings.mediaId, mediaEmbeddings.embeddingModel],
        set: {
          embedding: sql`EXCLUDED.embedding`,
          updatedAt: new Date(),
        },
      });
  }

  async search(params: VectorSearchParams): Promise<VectorSearchResult[]> {
    const { vector, topK, filter } = params;

    let query = this.db
      .select({
        mediaId: mediaEmbeddings.mediaId,
        mediaType: mediaEmbeddings.mediaType,
        distance: sql<number>`embedding <=> ${`[${vector.join(',')}]`}::vector`,
      })
      .from(mediaEmbeddings)
      .orderBy(sql`embedding <=> ${`[${vector.join(',')}]`}::vector`)
      .limit(topK);

    // Apply filters
    if (filter?.mediaType) {
      query = query.where(eq(mediaEmbeddings.mediaType, filter.mediaType));
    }

    const results = await query;

    // Convert distance to similarity score (cosine distance to similarity)
    return results.map(r => ({
      id: `${r.mediaType}:${r.mediaId}`,
      mediaId: r.mediaId,
      mediaType: r.mediaType,
      score: 1 - r.distance, // Cosine similarity
    }));
  }

  async findSimilar(
    mediaType: string,
    mediaId: number,
    topK: number = 10
  ): Promise<VectorSearchResult[]> {
    // Get the embedding for the source item
    const source = await this.db
      .select({ embedding: mediaEmbeddings.embedding })
      .from(mediaEmbeddings)
      .where(
        and(
          eq(mediaEmbeddings.mediaType, mediaType),
          eq(mediaEmbeddings.mediaId, mediaId)
        )
      )
      .limit(1);

    if (!source.length) {
      throw new Error(`No embedding found for ${mediaType}:${mediaId}`);
    }

    // Find similar items (excluding the source)
    return this.db
      .select({
        mediaId: mediaEmbeddings.mediaId,
        mediaType: mediaEmbeddings.mediaType,
        distance: sql<number>`embedding <=> ${source[0].embedding}`,
      })
      .from(mediaEmbeddings)
      .where(
        not(
          and(
            eq(mediaEmbeddings.mediaType, mediaType),
            eq(mediaEmbeddings.mediaId, mediaId)
          )
        )
      )
      .orderBy(sql`embedding <=> ${source[0].embedding}`)
      .limit(topK)
      .then(results =>
        results.map(r => ({
          id: `${r.mediaType}:${r.mediaId}`,
          mediaId: r.mediaId,
          mediaType: r.mediaType,
          score: 1 - r.distance,
        }))
      );
  }
}
```

---

## Recommendation Engine

### Recommendation Types

```typescript
interface RecommendationEngine {
  // Similar content based on a specific item
  getSimilar(
    mediaType: 'series' | 'movie',
    mediaId: number,
    options?: SimilarOptions
  ): Promise<Recommendation[]>;

  // Personalized recommendations for user
  getPersonalized(
    userId: number,
    options?: PersonalizedOptions
  ): Promise<Recommendation[]>;

  // Natural language query
  queryNaturalLanguage(
    query: string,
    userId?: number,
    options?: QueryOptions
  ): Promise<RecommendationResponse>;

  // Mood-based recommendations
  getMoodBased(
    mood: string,
    userId?: number,
    options?: MoodOptions
  ): Promise<Recommendation[]>;

  // Discovery - new content user might like
  getDiscovery(
    userId: number,
    options?: DiscoveryOptions
  ): Promise<Recommendation[]>;
}

interface Recommendation {
  mediaType: 'series' | 'movie';
  mediaId: number;
  title: string;
  year: number;
  posterUrl?: string;
  overview: string;
  genres: string[];
  rating: number;

  // Recommendation metadata
  score: number;
  reason: string;
  matchFactors: MatchFactor[];
  source: RecommendationSource;

  // User context
  inLibrary: boolean;
  inWatchlist: boolean;
  watched: boolean;
}

interface MatchFactor {
  type: 'genre' | 'theme' | 'cast' | 'director' | 'style' | 'mood' | 'era';
  value: string;
  weight: number;
}

type RecommendationSource =
  | 'vector_similarity'
  | 'collaborative'
  | 'content_based'
  | 'trending'
  | 'llm_generated';
```

### Engine Implementation

```typescript
class RecommendationEngineImpl implements RecommendationEngine {
  constructor(
    private vectorStore: VectorStore,
    private embeddingService: EmbeddingService,
    private ragPipeline: RAGPipeline,
    private userPreferenceService: UserPreferenceService,
    private mediaService: MediaService
  ) {}

  async getSimilar(
    mediaType: 'series' | 'movie',
    mediaId: number,
    options: SimilarOptions = {}
  ): Promise<Recommendation[]> {
    const { limit = 10, excludeInLibrary = false, userId } = options;

    // Get similar items from vector store
    const similar = await this.vectorStore.findSimilar(
      mediaType,
      mediaId,
      limit * 2 // Get extra to allow for filtering
    );

    // Get source item for comparison
    const sourceItem = await this.mediaService.get(mediaType, mediaId);

    // Enrich with metadata
    const enriched = await this.enrichRecommendations(similar, userId);

    // Filter and re-rank
    let filtered = enriched;

    if (excludeInLibrary && userId) {
      filtered = filtered.filter(r => !r.inLibrary);
    }

    // Add explanations
    const withReasons = filtered.map(rec => ({
      ...rec,
      reason: this.generateSimilarityReason(sourceItem, rec),
      source: 'vector_similarity' as RecommendationSource,
    }));

    return withReasons.slice(0, limit);
  }

  async getPersonalized(
    userId: number,
    options: PersonalizedOptions = {}
  ): Promise<Recommendation[]> {
    const { limit = 20, mediaTypes = ['series', 'movie'] } = options;

    // Get user taste profile
    const userProfile = await this.userPreferenceService.getTasteProfile(userId);

    // Multi-strategy recommendation
    const [
      tasteBasedRecs,
      collaborativeRecs,
      trendingRecs,
    ] = await Promise.all([
      this.getTasteBasedRecommendations(userProfile, limit),
      this.getCollaborativeRecommendations(userId, limit),
      this.getTrendingRecommendations(mediaTypes, limit / 2),
    ]);

    // Merge and dedupe
    const merged = this.mergeRecommendations([
      { recs: tasteBasedRecs, weight: 0.5 },
      { recs: collaborativeRecs, weight: 0.3 },
      { recs: trendingRecs, weight: 0.2 },
    ]);

    // Apply diversity
    const diverse = this.applyDiversity(merged, options.diversityFactor ?? 0.3);

    // Filter already watched/in library
    const filtered = diverse.filter(r => !r.watched);

    return filtered.slice(0, limit);
  }

  async queryNaturalLanguage(
    query: string,
    userId?: number,
    options: QueryOptions = {}
  ): Promise<RecommendationResponse> {
    // Full RAG pipeline
    const userProfile = userId
      ? await this.userPreferenceService.getTasteProfile(userId)
      : null;

    const context: RetrievalContext = {
      userId,
      userProfile,
      maxResults: options.limit ?? 10,
      mediaTypes: options.mediaTypes ?? ['series', 'movie'],
    };

    return this.ragPipeline.process(query, context);
  }

  async getMoodBased(
    mood: string,
    userId?: number,
    options: MoodOptions = {}
  ): Promise<Recommendation[]> {
    // Map mood to search terms and genres
    const moodMapping = MOOD_MAPPINGS[mood.toLowerCase()];

    if (!moodMapping) {
      // Use LLM to interpret unknown mood
      return this.queryNaturalLanguage(
        `I want to watch something ${mood}`,
        userId,
        options
      ).then(r => r.recommendations);
    }

    // Search with mood-mapped terms
    const queryEmbedding = await this.embeddingService.embed(
      `${moodMapping.description}. ${moodMapping.genres.join(', ')}`
    );

    const results = await this.vectorStore.search({
      vector: queryEmbedding,
      topK: options.limit ?? 10,
      filter: {
        genres: moodMapping.genres,
        excludeGenres: moodMapping.excludeGenres,
      },
    });

    return this.enrichRecommendations(results, userId);
  }

  private async getTasteBasedRecommendations(
    profile: UserTasteProfile,
    limit: number
  ): Promise<Recommendation[]> {
    // Search using user's taste embedding
    const results = await this.vectorStore.search({
      vector: profile.tasteEmbedding,
      topK: limit * 2,
    });

    return this.enrichRecommendations(results, profile.userId);
  }

  private async getCollaborativeRecommendations(
    userId: number,
    limit: number
  ): Promise<Recommendation[]> {
    // Find users with similar taste
    const similarUsers = await this.userPreferenceService.findSimilarUsers(
      userId,
      10
    );

    // Get items liked by similar users but not by current user
    const candidates = await this.mediaService.getLikedByUsers(
      similarUsers.map(u => u.userId),
      { excludeUserId: userId }
    );

    // Score by how many similar users liked each item
    const scored = candidates.map(item => ({
      ...item,
      score: similarUsers
        .filter(u => u.likedItems.includes(item.id))
        .reduce((sum, u) => sum + u.similarity, 0),
    }));

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  private applyDiversity(
    recommendations: Recommendation[],
    factor: number
  ): Recommendation[] {
    if (factor === 0) return recommendations;

    const diverse: Recommendation[] = [];
    const genreCounts = new Map<string, number>();

    for (const rec of recommendations) {
      // Calculate penalty based on genre representation
      const avgGenreCount = rec.genres.reduce(
        (sum, g) => sum + (genreCounts.get(g) ?? 0),
        0
      ) / rec.genres.length;

      const penalty = avgGenreCount * factor * 0.1;
      const adjustedScore = rec.score - penalty;

      // Add with adjusted score
      diverse.push({ ...rec, score: adjustedScore });

      // Update genre counts
      for (const genre of rec.genres) {
        genreCounts.set(genre, (genreCounts.get(genre) ?? 0) + 1);
      }
    }

    return diverse.sort((a, b) => b.score - a.score);
  }
}
```

---

## LLM Integration

### LLM Provider Interface

```typescript
interface LLMProvider {
  complete(request: CompletionRequest): Promise<string>;
  stream(request: CompletionRequest): AsyncIterable<string>;
  countTokens(text: string): number;
}

interface CompletionRequest {
  system?: string;
  user: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: 'text' | 'json';
  stop?: string[];
}

// Anthropic Claude Implementation
class ClaudeProvider implements LLMProvider {
  private client: Anthropic;

  constructor(config: ClaudeConfig) {
    this.client = new Anthropic({ apiKey: config.apiKey });
    this.model = config.model ?? 'claude-sonnet-4-20250514';
  }

  async complete(request: CompletionRequest): Promise<string> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: request.maxTokens ?? 1024,
      system: request.system,
      messages: [{ role: 'user', content: request.user }],
    });

    return response.content[0].type === 'text'
      ? response.content[0].text
      : '';
  }

  async *stream(request: CompletionRequest): AsyncIterable<string> {
    const stream = await this.client.messages.stream({
      model: this.model,
      max_tokens: request.maxTokens ?? 1024,
      system: request.system,
      messages: [{ role: 'user', content: request.user }],
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        yield event.delta.text;
      }
    }
  }
}

// Ollama Local LLM Implementation
class OllamaProvider implements LLMProvider {
  private baseUrl: string;
  private model: string;

  constructor(config: OllamaConfig) {
    this.baseUrl = config.baseUrl ?? 'http://localhost:11434';
    this.model = config.model ?? 'llama3.1';
  }

  async complete(request: CompletionRequest): Promise<string> {
    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
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

  async *stream(request: CompletionRequest): AsyncIterable<string> {
    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        prompt: this.formatPrompt(request),
        stream: true,
      }),
    });

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(Boolean);

      for (const line of lines) {
        const data = JSON.parse(line);
        if (data.response) {
          yield data.response;
        }
      }
    }
  }

  private formatPrompt(request: CompletionRequest): string {
    if (request.system) {
      return `${request.system}\n\nUser: ${request.user}\n\nAssistant:`;
    }
    return request.user;
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

  // Explicit preferences
  favoriteGenres: WeightedPreference[];
  dislikedGenres: WeightedPreference[];
  favoriteDecades: WeightedPreference[];
  preferredRuntime: { min: number; max: number };
  preferredRating: { min: number; max: number };

  // Derived from watch history
  watchedGenreDistribution: Map<string, number>;
  avgWatchedRating: number;
  completionRate: number; // How often they finish series

  // Implicit signals
  browsingPatterns: BrowsingPattern[];
  searchHistory: SearchHistoryItem[];

  lastUpdated: Date;
}

interface WeightedPreference {
  value: string;
  weight: number; // -1 to 1, negative means dislike
  source: 'explicit' | 'implicit';
}

class UserPreferenceService {
  async getTasteProfile(userId: number): Promise<UserTasteProfile> {
    // Check cache
    const cached = await this.cache.get(`taste:${userId}`);
    if (cached && !this.isStale(cached)) {
      return cached;
    }

    // Build profile from various sources
    const [
      watchHistory,
      ratings,
      explicitPrefs,
      browsingData,
    ] = await Promise.all([
      this.getWatchHistory(userId),
      this.getUserRatings(userId),
      this.getExplicitPreferences(userId),
      this.getBrowsingData(userId),
    ]);

    // Calculate genre preferences from watch history
    const genreDistribution = this.calculateGenreDistribution(watchHistory);

    // Generate taste embedding
    const tasteEmbedding = await this.generateTasteEmbedding(
      watchHistory,
      ratings,
      explicitPrefs
    );

    const profile: UserTasteProfile = {
      userId,
      tasteEmbedding,
      favoriteGenres: this.extractFavoriteGenres(genreDistribution, explicitPrefs),
      dislikedGenres: explicitPrefs.dislikedGenres ?? [],
      favoriteDecades: this.extractDecadePreferences(watchHistory),
      preferredRuntime: this.calculateRuntimePreference(watchHistory),
      preferredRating: this.calculateRatingPreference(watchHistory),
      watchedGenreDistribution: genreDistribution,
      avgWatchedRating: this.calculateAvgRating(watchHistory),
      completionRate: this.calculateCompletionRate(watchHistory),
      browsingPatterns: browsingData.patterns,
      searchHistory: browsingData.searches,
      lastUpdated: new Date(),
    };

    // Cache profile
    await this.cache.set(`taste:${userId}`, profile, { ttl: 3600 }); // 1 hour

    return profile;
  }

  private async generateTasteEmbedding(
    watchHistory: WatchedItem[],
    ratings: UserRating[],
    explicitPrefs: ExplicitPreferences
  ): Promise<number[]> {
    // Get embeddings for highly-rated watched items
    const highlyRated = watchHistory.filter(item => {
      const rating = ratings.find(r => r.mediaId === item.mediaId);
      return rating && rating.score >= 7;
    });

    if (highlyRated.length === 0) {
      // No watch history, use explicit preferences
      const prefText = this.buildPreferenceText(explicitPrefs);
      return this.embeddingService.embed(prefText);
    }

    // Get embeddings for top items
    const topItems = highlyRated
      .sort((a, b) => {
        const ratingA = ratings.find(r => r.mediaId === a.mediaId)?.score ?? 0;
        const ratingB = ratings.find(r => r.mediaId === b.mediaId)?.score ?? 0;
        return ratingB - ratingA;
      })
      .slice(0, 20);

    const embeddings = await Promise.all(
      topItems.map(item =>
        this.vectorStore.getEmbedding(item.mediaType, item.mediaId)
      )
    );

    // Weight by rating and recency
    const weights = topItems.map((item, i) => {
      const rating = ratings.find(r => r.mediaId === item.mediaId)?.score ?? 5;
      const recencyFactor = Math.exp(-i * 0.1); // Decay for older items
      return (rating / 10) * recencyFactor;
    });

    // Weighted average of embeddings
    return this.weightedAverageEmbedding(embeddings, weights);
  }

  private weightedAverageEmbedding(
    embeddings: number[][],
    weights: number[]
  ): number[] {
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    const dimensions = embeddings[0].length;
    const result = new Array(dimensions).fill(0);

    for (let i = 0; i < embeddings.length; i++) {
      const weight = weights[i] / totalWeight;
      for (let j = 0; j < dimensions; j++) {
        result[j] += embeddings[i][j] * weight;
      }
    }

    // Normalize
    const magnitude = Math.sqrt(result.reduce((sum, v) => sum + v * v, 0));
    return result.map(v => v / magnitude);
  }

  async updateFromFeedback(
    userId: number,
    feedback: RecommendationFeedback
  ): Promise<void> {
    // Record feedback
    await this.db.insert(recommendationFeedback).values({
      userId,
      query: feedback.query,
      recommendedMediaId: feedback.mediaId,
      recommendedMediaType: feedback.mediaType,
      feedbackType: feedback.type,
    });

    // Invalidate cached profile if significant feedback
    if (['watched', 'added', 'dismissed'].includes(feedback.type)) {
      await this.cache.delete(`taste:${userId}`);
    }
  }
}
```

---

## API Specification

### REST Endpoints

```typescript
// GET /api/v1/recommendations
interface GetRecommendationsRequest {
  type?: 'personalized' | 'trending' | 'new';
  mediaTypes?: ('series' | 'movie')[];
  limit?: number;
  offset?: number;
}

// GET /api/v1/recommendations/similar/:mediaType/:id
interface GetSimilarRequest {
  limit?: number;
  excludeInLibrary?: boolean;
}

// POST /api/v1/recommendations/query
interface NaturalLanguageQueryRequest {
  query: string;
  mediaTypes?: ('series' | 'movie')[];
  limit?: number;
  includeExplanation?: boolean;
}

// GET /api/v1/recommendations/mood/:mood
interface GetMoodBasedRequest {
  limit?: number;
  mediaTypes?: ('series' | 'movie')[];
}

// POST /api/v1/recommendations/feedback
interface SubmitFeedbackRequest {
  recommendationId: string;
  mediaType: 'series' | 'movie';
  mediaId: number;
  feedbackType: 'clicked' | 'added' | 'watched' | 'dismissed';
  query?: string;
}

// Response types
interface RecommendationListResponse {
  recommendations: Recommendation[];
  total: number;
  page: number;
  pageSize: number;
}

interface NaturalLanguageResponse {
  recommendations: Recommendation[];
  conversationalResponse: string;
  followUpQuestions: string[];
  processingTimeMs: number;
}
```

### WebSocket Events

```typescript
// Real-time recommendation updates
interface RecommendationEvents {
  // Server -> Client
  'recommendation:new': {
    type: 'personalized' | 'trending';
    recommendations: Recommendation[];
  };

  'recommendation:stream': {
    queryId: string;
    chunk: string; // Streaming LLM response
    done: boolean;
  };

  // Client -> Server
  'recommendation:query': {
    queryId: string;
    query: string;
    options?: QueryOptions;
  };

  'recommendation:feedback': {
    mediaType: string;
    mediaId: number;
    feedbackType: string;
  };
}
```

---

## Privacy & Data Handling

### Data Collection

```typescript
interface PrivacyConfig {
  // What data is collected
  collectWatchHistory: boolean;
  collectBrowsingPatterns: boolean;
  collectSearchHistory: boolean;
  collectRatings: boolean;

  // Processing location
  localProcessingOnly: boolean; // Don't send data to external APIs
  useLocalEmbeddings: boolean;
  useLocalLLM: boolean;

  // Data retention
  historyRetentionDays: number;
  searchRetentionDays: number;
  feedbackRetentionDays: number;

  // Anonymization
  anonymizeBeforeExternalApi: boolean;
  stripPersonalInfo: boolean;
}

class PrivacyManager {
  async prepareDataForExternalApi(data: RecommendationContext): Promise<SanitizedContext> {
    if (!this.config.anonymizeBeforeExternalApi) {
      return data as SanitizedContext;
    }

    return {
      // Remove user identifiers
      userId: undefined,

      // Keep only aggregate preferences
      preferences: {
        genres: data.userProfile?.favoriteGenres.map(g => g.value),
        // Don't include specific watch history
      },

      // Sanitize query (remove any personal info)
      query: this.sanitizeQuery(data.query),
    };
  }

  private sanitizeQuery(query: string): string {
    // Remove potential personal information patterns
    return query
      .replace(/\b(my|I|me|we)\b/gi, '') // Remove first-person references
      .replace(/\b[A-Z][a-z]+ [A-Z][a-z]+\b/g, '') // Remove potential names
      .trim();
  }

  async purgeUserData(userId: number): Promise<void> {
    await Promise.all([
      this.db.delete(userTasteEmbeddings).where(eq(userTasteEmbeddings.userId, userId)),
      this.db.delete(recommendationFeedback).where(eq(recommendationFeedback.userId, userId)),
      this.db.delete(userPreferences).where(eq(userPreferences.userId, userId)),
      this.cache.delete(`taste:${userId}`),
    ]);
  }
}
```

### Local-First Option

```typescript
// Configuration for fully local AI recommendations
const localOnlyConfig: AIRecommendationConfig = {
  enabled: true,
  enableNaturalLanguageSearch: true,
  enablePersonalizedRecommendations: true,

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
    maxTokens: 1024,
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

  privacy: {
    anonymizeUserData: false, // Not needed for local
    localProcessingOnly: true,
    dataRetentionDays: 365,
  },
};
```

---

## Related Documents

- [SEARCH_SPECIFICATION.md](./SEARCH_SPECIFICATION.md) - Release search system
- [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) - Data storage
- [REST_API.md](./REST_API.md) - API endpoints
- [SECURITY.md](./SECURITY.md) - API key and data protection
- [DISCOVERY_REQUESTS.md](./DISCOVERY_REQUESTS.md) - Request/discovery features
