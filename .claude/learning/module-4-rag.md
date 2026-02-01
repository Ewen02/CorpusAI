# Module 4 : Pipeline RAG (Retrieval-Augmented Generation)

## Objectif
Assembler Embeddings + Qdrant + Chunking + LLM pour créer un assistant RAG fonctionnel.

---

## Théorie

### Qu'est-ce que le RAG ?

**RAG** = Retrieval-Augmented Generation

Au lieu de demander au LLM de tout savoir, on lui fournit le contexte pertinent extrait d'une base de documents.

```
Sans RAG:  Question → LLM → Hallucination possible
Avec RAG:  Question → Recherche → Contexte → LLM → Réponse fiable
```

### Architecture RAG complète

```
┌─────────────────────────────────────────────────────────────────┐
│                     PHASE D'INDEXATION                          │
├─────────────────────────────────────────────────────────────────┤
│  Document → Chunking → Embeddings → Qdrant (stockage)          │
│                                                                 │
│  Stratégies de chunking (Module 3):                            │
│  • Recursive (production standard)                              │
│  • Document-Aware (Markdown, HTML)                              │
│  • Semantic (détection de sujet)                                │
│  • Parent-Child (contexte riche)                                │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                     PHASE DE REQUÊTE                            │
├─────────────────────────────────────────────────────────────────┤
│  1. Question utilisateur                                        │
│  2. Embedding de la question                                    │
│  3. Recherche vectorielle (Qdrant)                              │
│     • score_threshold pour filtrer                              │
│     • Filtres (must/should/must_not) par workspace/user         │
│  4. Re-ranking (optionnel)                                      │
│  5. Construction du contexte                                    │
│  6. Génération LLM (streaming)                                  │
│  7. Réponse avec sources                                        │
└─────────────────────────────────────────────────────────────────┘
```

### Le flux détaillé

```
1. QUESTION UTILISATEUR
   "Qu'est-ce que TypeScript ?"
            ↓
2. EMBEDDING DE LA QUESTION
   [0.02, -0.15, 0.89, ...] (1536 dims)
            ↓
3. RECHERCHE VECTORIELLE (Qdrant)
   • Top K chunks les plus similaires
   • Filtrés par score_threshold (0.4)
   • Filtrés par workspace/user (must)
            ↓
4. CONSTRUCTION DU CONTEXTE
   Chunk 1: "TypeScript est un sur-ensemble..." [score: 0.89]
   Chunk 2: "Le typage statique permet..." [score: 0.82]
   Chunk 3: "Anders Hejlsberg a créé..." [score: 0.78]
            ↓
5. PROMPT AUGMENTÉ
   [System] Tu es un assistant. Utilise UNIQUEMENT le contexte.
   [Context] {chunks assemblés avec sources}
   [User] Qu'est-ce que TypeScript ?
            ↓
6. GÉNÉRATION (LLM) - Streaming
   "TypeScript est un langage créé par Microsoft..."
            ↓
7. RÉPONSE AVEC SOURCES
   Réponse + [Source: typescript-docs.md, Chunk 1-3]
```

### Prompt RAG

```
Tu es un assistant expert. Réponds UNIQUEMENT en utilisant le contexte fourni.
Si l'information n'est pas dans le contexte, réponds "Je ne dispose pas de cette information."
Cite tes sources à la fin de ta réponse.

CONTEXTE:
---
[Source: typescript-docs.md]
TypeScript est un sur-ensemble de JavaScript qui ajoute le typage statique.
Il a été créé par Microsoft en 2012.

[Source: programming-guide.md]
Le typage statique permet de détecter les erreurs à la compilation plutôt qu'à l'exécution.
---

QUESTION: {question de l'utilisateur}
```

### Paramètres clés

| Paramètre | Description | Valeur recommandée |
|-----------|-------------|-------------------|
| `top_k` | Nombre de chunks récupérés | 3-5 |
| `score_threshold` | Score minimum de similarité | 0.4-0.5 |
| `temperature` | Créativité du LLM (0=déterministe) | 0.1-0.3 |
| `max_tokens` | Longueur max de la réponse | 500-1000 |

### Pourquoi `temperature` basse ?

| Temperature | Comportement | Usage |
|-------------|--------------|-------|
| 0.0 | Déterministe, toujours la même réponse | Tests |
| 0.1-0.3 | Peu créatif, factuel | **RAG** |
| 0.7-1.0 | Créatif, varié | Brainstorming |

Pour le RAG, on veut des réponses **factuelles**, donc temperature basse.

---

## Pratique

### Prérequis

1. **Qdrant** en local :
```bash
docker run -p 6333:6333 qdrant/qdrant
```

2. **Variables d'environnement** dans `apps/ai-worker/.env` :
```env
OPENAI_API_KEY="sk-..."
QDRANT_URL="http://localhost:6333"
```

### Exécution

```bash
pnpm --filter @corpusai/ai-worker experiment:rag
```

### Ce que fait le script

1. **Indexation** : Chunking + Embedding + Stockage dans Qdrant
2. **Question 1** : "Qu'est-ce que TypeScript ?" → Trouve les chunks pertinents
3. **Question 2** : "Qui a créé TypeScript ?" → Teste la précision
4. **Question 3** : "Parle-moi de Python" → Teste le "Je ne sais pas"
5. **Streaming** : Réponse en temps réel

---

## Code clé

### Fonction de recherche RAG

```typescript
async function searchContext(question: string, topK = 3): Promise<string> {
  // 1. Embedding de la question
  const questionEmbedding = await getEmbedding(question);

  // 2. Recherche dans Qdrant
  const results = await qdrant.search(COLLECTION_NAME, {
    vector: questionEmbedding,
    limit: topK,
    score_threshold: 0.4,
    with_payload: true,
  });

  // 3. Assembler le contexte
  const context = results.map((r, i) => {
    const payload = r.payload as { text: string; source: string };
    return `[Source: ${payload.source}]\n${payload.text}`;
  }).join('\n\n');

  return context;
}
```

### Fonction de génération RAG

```typescript
async function generateAnswer(question: string, context: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.2,
    messages: [
      {
        role: 'system',
        content: `Tu es un assistant expert. Réponds UNIQUEMENT en utilisant le contexte fourni.
Si l'information n'est pas dans le contexte, réponds "Je ne dispose pas de cette information."
Cite tes sources.

CONTEXTE:
---
${context}
---`
      },
      {
        role: 'user',
        content: question
      }
    ]
  });

  return response.choices[0].message.content || '';
}
```

### Pipeline complet

```typescript
async function askRAG(question: string): Promise<string> {
  // 1. Récupérer le contexte
  const context = await searchContext(question);

  if (!context) {
    return "Je n'ai pas trouvé d'information pertinente.";
  }

  // 2. Générer la réponse
  const answer = await generateAnswer(question, context);

  return answer;
}
```

---

## Streaming (réponse en temps réel)

```typescript
async function streamRAGAnswer(question: string, context: string): Promise<void> {
  const stream = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.2,
    stream: true,  // ← Active le streaming
    messages: [
      { role: 'system', content: `...${context}...` },
      { role: 'user', content: question }
    ]
  });

  // Afficher token par token
  for await (const chunk of stream) {
    const token = chunk.choices[0]?.delta?.content || '';
    process.stdout.write(token);
  }
}
```

---

## Gestion des cas limites

### 1. Aucun résultat pertinent

```typescript
if (results.length === 0 || results[0].score < 0.3) {
  return "Je ne dispose pas d'information sur ce sujet.";
}
```

### 2. Question hors sujet

Le prompt demande au LLM de répondre "Je ne sais pas" si le contexte ne contient pas l'information.

### 3. Contexte trop long

```typescript
// Limiter le contexte à 3000 tokens max
const maxContextLength = 3000;
let context = '';
for (const result of results) {
  const chunk = result.payload.text;
  if ((context + chunk).length > maxContextLength) break;
  context += chunk + '\n\n';
}
```

---

## Métriques de qualité RAG

| Métrique | Description | Comment mesurer |
|----------|-------------|-----------------|
| **Recall** | % de bonnes réponses trouvées | Test avec questions connues |
| **Precision** | % de chunks pertinents | Score moyen des résultats |
| **Latency** | Temps de réponse | < 2s pour bonne UX |
| **Faithfulness** | Réponse fidèle au contexte | Pas d'hallucination |

---

## Techniques avancées

### 1. Recherche avec filtres Qdrant (Module 2)

```typescript
// Filtrer par workspace et utilisateur
const results = await qdrant.search(COLLECTION_NAME, {
  vector: questionEmbedding,
  limit: 5,
  score_threshold: 0.4,
  with_payload: true,
  filter: {
    must: [
      { key: 'workspaceId', match: { value: 'ws-123' } },
    ],
    should: [
      { key: 'documentType', match: { value: 'faq' } },
      { key: 'documentType', match: { value: 'guide' } },
    ],
  },
});
```

### 2. Choix de la stratégie de chunking (Module 3)

| Type de document | Stratégie recommandée |
|------------------|----------------------|
| Documentation Markdown | Document-Aware + Recursive |
| PDF génériques | Recursive + Overlap (20%) |
| FAQ, Q&A courts | Fixed 200-500 tokens |
| Documents variés | Semantic chunking |
| Contexte LLM riche | Parent-Child |

### 3. Parent-Child RAG (contexte enrichi)

```typescript
// Recherche sur les children (précis)
// Retourne les parents (contexte complet)
async function parentChildSearch(question: string): Promise<string> {
  const results = await qdrant.search('children_collection', {
    vector: await getEmbedding(question),
    limit: 3,
  });

  // Récupérer les parents uniques
  const parentIds = [...new Set(results.map(r => r.payload.parentId))];

  const parents = await qdrant.retrieve('parents_collection', {
    ids: parentIds,
    with_payload: true,
  });

  return parents.map(p => p.payload.text).join('\n\n');
}
```

### 4. Re-ranking (améliorer la pertinence)

```typescript
// Après recherche Qdrant, re-scorer avec un modèle plus précis
async function rerankResults(
  question: string,
  chunks: string[]
): Promise<string[]> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0,
    messages: [{
      role: 'user',
      content: `Classe ces chunks par pertinence pour répondre à la question.
Question: "${question}"

Chunks:
${chunks.map((c, i) => `${i + 1}. ${c}`).join('\n')}

Retourne les numéros dans l'ordre de pertinence (JSON array).`
    }]
  });

  const order = JSON.parse(response.choices[0].message.content || '[]');
  return order.map((i: number) => chunks[i - 1]);
}
```

### 5. Hybrid Search (sémantique + keywords)

```typescript
// Combiner recherche vectorielle et recherche par mots-clés
async function hybridSearch(question: string): Promise<SearchResult[]> {
  // 1. Recherche sémantique
  const semanticResults = await qdrant.search(COLLECTION, {
    vector: await getEmbedding(question),
    limit: 10,
  });

  // 2. Recherche par mots-clés (via payload)
  const keywords = extractKeywords(question);
  const keywordResults = await qdrant.scroll(COLLECTION, {
    filter: {
      should: keywords.map(kw => ({
        key: 'text',
        match: { text: kw }
      }))
    },
    limit: 10,
  });

  // 3. Fusionner et dédupliquer
  return mergeResults(semanticResults, keywordResults.points);
}
```

### 6. Conversational RAG (avec historique)

```typescript
interface Message {
  role: 'user' | 'assistant';
  content: string;
}

async function conversationalRAG(
  question: string,
  history: Message[]
): Promise<string> {
  // 1. Reformuler la question avec le contexte de conversation
  const reformulated = await reformulateQuestion(question, history);

  // 2. Recherche avec la question reformulée
  const context = await searchContext(reformulated);

  // 3. Génération avec historique
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: `...CONTEXTE:\n${context}` },
      ...history,
      { role: 'user', content: question }
    ]
  });

  return response.choices[0].message.content || '';
}

async function reformulateQuestion(
  question: string,
  history: Message[]
): Promise<string> {
  // Résoudre les références ("il", "ce document", etc.)
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{
      role: 'user',
      content: `Reformule cette question en une question autonome.

Historique:
${history.map(m => `${m.role}: ${m.content}`).join('\n')}

Question: ${question}

Question reformulée:`
    }]
  });

  return response.choices[0].message.content || question;
}
```

---

## Optimisations production

### 1. Batch Embedding (Module 1)

```typescript
// Indexer plusieurs documents en une fois
const texts = chunks.map(c => c.text);
const embeddings = await openai.embeddings.create({
  model: 'text-embedding-3-small',
  input: texts,  // Max 100 par requête
});
```

### 2. Batch Upsert Qdrant (Module 2)

```typescript
// Insérer tous les points en une seule requête
await qdrant.upsert(COLLECTION, {
  wait: true,
  points: chunks.map((chunk, i) => ({
    id: crypto.randomUUID(),
    vector: embeddings.data[i].embedding,
    payload: {
      text: chunk.text,
      source: chunk.source,
      workspaceId: chunk.workspaceId,
    }
  }))
});
```

### 3. Caching des embeddings

```typescript
// Éviter de recalculer les embeddings pour les mêmes questions
const cache = new Map<string, number[]>();

async function getCachedEmbedding(text: string): Promise<number[]> {
  const key = text.toLowerCase().trim();

  if (cache.has(key)) {
    return cache.get(key)!;
  }

  const embedding = await getEmbedding(text);
  cache.set(key, embedding);
  return embedding;
}
```

### 4. Limitation du contexte

```typescript
function truncateContext(chunks: string[], maxTokens = 3000): string {
  let context = '';
  let tokenCount = 0;

  for (const chunk of chunks) {
    const chunkTokens = estimateTokens(chunk);
    if (tokenCount + chunkTokens > maxTokens) break;
    context += chunk + '\n\n---\n\n';
    tokenCount += chunkTokens;
  }

  return context;
}

function estimateTokens(text: string): number {
  // Approximation: 1 token ≈ 4 caractères en anglais
  return Math.ceil(text.length / 4);
}
```

---

## Points clés à retenir

1. **RAG = Recherche + Génération** - Pas de magie, juste du contexte
2. **Temperature basse** (0.1-0.3) pour des réponses factuelles
3. **Score threshold** pour filtrer les résultats non pertinents
4. **Prompt explicite** : "Utilise UNIQUEMENT le contexte"
5. **Streaming** pour une UX réactive
6. **Sources** : Toujours citer d'où vient l'information
7. **Filtres Qdrant** : Isoler par workspace/user
8. **Chunking adapté** : Choisir la stratégie selon le type de document
9. **Parent-Child** : Meilleur contexte pour le LLM
10. **Batch operations** : Indexation rapide en production

---

## Récapitulatif des modules

| Module | Concept | Clé |
|--------|---------|-----|
| **1. Embeddings** | Texte → Vecteur | `text-embedding-3-small` (1536 dims) |
| **2. Qdrant** | Stockage + Recherche | Filtres, score_threshold, HNSW |
| **3. Chunking** | Découpage documents | Recursive, Semantic, Parent-Child |
| **4. RAG** | Pipeline complet | Recherche → Contexte → LLM |

---

## Prochaine étape

**Module 5 : Services Production** - Transformer ces expériences en services réutilisables pour CorpusAI.

```
packages/corpus/
├── src/
│   ├── chunking/         # Stratégies de chunking
│   ├── embeddings/       # Service OpenAI
│   ├── vector-store/     # Client Qdrant
│   └── rag/              # Pipeline RAG
```
