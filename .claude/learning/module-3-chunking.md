# Module 3 : Chunking (Découpage de documents)

## Objectif
Apprendre à découper des documents en chunks optimaux pour le RAG.

---

## Théorie

### Pourquoi le chunking est critique ?

Un document entier est trop long pour :
1. **Être embedé** - Limite de tokens (8191 pour text-embedding-3-small)
2. **Être pertinent** - Trop de sujets mélangés dans un long document
3. **Être utilisé par le LLM** - Le contexte RAG doit être concis

```
Document 50 pages  →  Chunking  →  ~200 chunks  →  Embeddings  →  Qdrant
```

### Stratégies de chunking

| Stratégie | Description | Qualité | Coût |
|-----------|-------------|---------|------|
| **Fixed size** | X caractères/tokens par chunk | Faible | Gratuit |
| **Separator** | Split par `\n\n`, `##`, etc. | Moyenne | Gratuit |
| **Recursive** | Essaie plusieurs séparateurs en cascade | Bonne | Gratuit |
| **Document-Aware** | Respecte la structure (MD, HTML, PDF) | Bonne | Gratuit |
| **Sliding Window** | Fenêtre glissante avec petit pas | Bonne | Gratuit |
| **Semantic** | Détecte les changements de sujet | Excellente | Embeddings |
| **Parent-Child** | Chunks hiérarchiques (contexte large + précis) | Excellente | Storage x2 |
| **Agentic** | LLM décide où couper | Excellente | LLM calls |

### Le problème du contexte perdu

```
Chunk 1: "TypeScript a été créé par Microsoft."
Chunk 2: "Il est très populaire pour le développement web."

❌ "Il" = qui ? Le contexte est perdu !
```

### Solution : Overlap (chevauchement)

```
Chunk 1: "TypeScript a été créé par Microsoft. Il est très populaire"
Chunk 2: "Il est très populaire pour le développement web."
                    ↑ overlap ↑
```

L'overlap permet de :
- Conserver le contexte entre chunks
- Améliorer la recherche sémantique
- Éviter les coupures au milieu d'une idée

### Taille optimale des chunks

| Taille (tokens) | Avantages | Inconvénients | Usage |
|-----------------|-----------|---------------|-------|
| 200-500 | Très précis | Perd le contexte | FAQ, Q&A |
| **500-1000** | Bon équilibre | - | **RAG standard** |
| 1000-2000 | Contexte riche | Moins précis | Articles longs |

**Recommandation CorpusAI : 500-800 tokens avec 100-200 overlap**

---

## Pratique

### Exécution

```bash
pnpm --filter @corpusai/ai-worker experiment:chunking
```

### Ce que fait le script

1. **Fixed Size Chunking** - Découpe par nombre de caractères
2. **Separator Chunking** - Découpe par paragraphes (`\n\n`)
3. **Recursive Chunking** - Essaie `\n\n`, puis `\n`, puis `. `, puis ` `
4. **Chunking avec Overlap** - Chevauchement entre chunks
5. **Comparaison visuelle** - Voir les différences

---

## Code clé

### Fixed Size (simple mais naïf)

```typescript
function chunkBySize(text: string, chunkSize: number): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.slice(i, i + chunkSize));
  }
  return chunks;
}
```

### Separator (meilleur)

```typescript
function chunkBySeparator(text: string, separator: string, maxSize: number): string[] {
  const parts = text.split(separator);
  const chunks: string[] = [];
  let currentChunk = '';

  for (const part of parts) {
    if ((currentChunk + part).length > maxSize && currentChunk) {
      chunks.push(currentChunk.trim());
      currentChunk = part;
    } else {
      currentChunk += (currentChunk ? separator : '') + part;
    }
  }

  if (currentChunk) chunks.push(currentChunk.trim());
  return chunks;
}
```

### Recursive (recommandé)

```typescript
const separators = ['\n\n', '\n', '. ', ' '];

function recursiveChunk(text: string, maxSize: number, separatorIndex = 0): string[] {
  if (text.length <= maxSize || separatorIndex >= separators.length) {
    return [text];
  }

  const separator = separators[separatorIndex];
  const parts = text.split(separator);
  const chunks: string[] = [];
  let currentChunk = '';

  for (const part of parts) {
    const potential = currentChunk + (currentChunk ? separator : '') + part;

    if (potential.length > maxSize && currentChunk) {
      // Chunk trop grand, on le découpe récursivement
      chunks.push(...recursiveChunk(currentChunk, maxSize, separatorIndex + 1));
      currentChunk = part;
    } else {
      currentChunk = potential;
    }
  }

  if (currentChunk) {
    chunks.push(...recursiveChunk(currentChunk, maxSize, separatorIndex + 1));
  }

  return chunks;
}
```

### Avec Overlap

```typescript
function chunkWithOverlap(text: string, chunkSize: number, overlap: number): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.slice(start, end));
    start += chunkSize - overlap;  // Recule de `overlap` caractères
  }

  return chunks;
}
```

---

## Méthodes avancées

### Semantic Chunking (par changement de sujet)

Détecte les changements de sujet via la similarité des embeddings entre phrases.

```typescript
async function semanticChunk(text: string, threshold = 0.7): Promise<string[]> {
  // 1. Découper en phrases
  const sentences = text.split(/(?<=[.!?])\s+/);

  // 2. Calculer les embeddings
  const embeddings = await getEmbeddings(sentences);

  // 3. Détecter les changements de sujet
  const chunks: string[] = [];
  let currentChunk = sentences[0];

  for (let i = 1; i < sentences.length; i++) {
    const similarity = cosineSimilarity(embeddings[i - 1], embeddings[i]);

    if (similarity < threshold) {
      // Changement de sujet détecté → nouveau chunk
      chunks.push(currentChunk);
      currentChunk = sentences[i];
    } else {
      currentChunk += ' ' + sentences[i];
    }
  }

  if (currentChunk) chunks.push(currentChunk);
  return chunks;
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
```

**Avantages** : Chunks très cohérents, respecte le sens du texte
**Inconvénients** : Coût des embeddings (1 par phrase)

---

### Document-Aware Chunking (par structure)

Respecte la structure du document (Markdown, HTML, PDF).

```typescript
// Markdown-aware chunking
function chunkMarkdown(text: string, maxSize = 800): string[] {
  // Split par titres (##, ###)
  const sections = text.split(/(?=^#{1,3} )/gm);

  const chunks: string[] = [];
  for (const section of sections) {
    if (section.length <= maxSize) {
      chunks.push(section.trim());
    } else {
      // Section trop grande → recursive chunking
      chunks.push(...recursiveChunk(section, maxSize));
    }
  }

  return chunks.filter(c => c.length > 0);
}

// HTML-aware chunking
function chunkHTML(html: string): string[] {
  // Split par balises sémantiques
  const sections = html.split(/(?=<(?:section|article|h[1-3]))/gi);
  return sections.map(s => s.replace(/<[^>]+>/g, '').trim()).filter(Boolean);
}
```

| Format | Découpage par |
|--------|---------------|
| Markdown | `#`, `##`, `###` (titres) |
| HTML | `<section>`, `<article>`, `<h1>-<h3>` |
| PDF | Pages, sections détectées |
| Code | Fonctions, classes, blocs |

---

### Sliding Window (fenêtre glissante)

Avance par petits pas au lieu de chunks entiers. Maximise le recall.

```typescript
function slidingWindow(text: string, windowSize: number, step: number): string[] {
  const chunks: string[] = [];

  for (let i = 0; i < text.length; i += step) {
    const chunk = text.slice(i, i + windowSize);
    chunks.push(chunk);

    if (i + windowSize >= text.length) break;
  }

  return chunks;
}

// Exemple: windowSize=500, step=100
// Texte: "ABCDEFGHIJ..." (1000 chars)
// Chunk 1: chars 0-500
// Chunk 2: chars 100-600  (avance de 100)
// Chunk 3: chars 200-700  (avance de 100)
// ...
```

**Avantages** : Très bon recall, aucune information perdue
**Inconvénients** : Beaucoup de chunks redondants, coût storage

---

### Parent-Child Chunking (hiérarchique)

Stocke deux niveaux : parent (contexte large) et enfants (précis).

```typescript
interface ParentChildChunk {
  parentId: string;
  parentText: string;      // Section complète (~1500 chars)
  children: {
    id: string;
    text: string;          // Sous-chunk (~400 chars)
    position: number;
  }[];
}

function parentChildChunk(text: string): ParentChildChunk[] {
  // 1. Découper en sections (parents)
  const sections = text.split(/\n\n+/);

  return sections.map((section, i) => {
    const parentId = `parent-${i}`;

    // 2. Découper chaque section en enfants
    const childChunks = recursiveChunk(section, 400);

    return {
      parentId,
      parentText: section,
      children: childChunks.map((child, j) => ({
        id: `${parentId}-child-${j}`,
        text: child,
        position: j
      }))
    };
  });
}

// Recherche:
// 1. Match sur un child (précis)
// 2. Retourne le parent (contexte complet) au LLM
```

**Avantages** : Recherche précise + contexte riche pour le LLM
**Inconvénients** : Stockage x2, complexité accrue

---

### Agentic Chunking (avec LLM)

Utilise un LLM pour décider intelligemment où couper.

```typescript
async function agenticChunk(text: string): Promise<string[]> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0,
    messages: [{
      role: 'user',
      content: `Découpe ce texte en chunks cohérents.
Chaque chunk doit contenir UNE idée complète et faire entre 300-600 caractères.
Retourne un JSON array avec les chunks.

Texte:
"""
${text}
"""

Réponds UNIQUEMENT avec le JSON array, sans explication.`
    }]
  });

  return JSON.parse(response.choices[0].message.content || '[]');
}
```

**Avantages** : Très intelligent, comprend le sens
**Inconvénients** : Coûteux (1 appel LLM par document), lent

---

## Comparaison des méthodes

| Méthode | Qualité | Coût | Complexité | Cas d'usage |
|---------|---------|------|------------|-------------|
| Fixed Size | ⭐ | Gratuit | Simple | Prototypage uniquement |
| Separator | ⭐⭐ | Gratuit | Simple | Textes simples |
| Recursive | ⭐⭐⭐ | Gratuit | Moyen | **Production standard** |
| Document-Aware | ⭐⭐⭐⭐ | Gratuit | Moyen | Markdown, HTML, code |
| Sliding Window | ⭐⭐⭐ | Storage | Simple | Maximiser recall |
| Semantic | ⭐⭐⭐⭐ | Embeddings | Moyen | Documents variés |
| Parent-Child | ⭐⭐⭐⭐⭐ | Storage x2 | Complexe | Meilleur contexte LLM |
| Agentic | ⭐⭐⭐⭐⭐ | LLM calls | Complexe | Haute qualité requise |

---

## Recommandation pour CorpusAI

| Type de document | Méthode recommandée |
|------------------|---------------------|
| Markdown (docs) | Document-Aware + Recursive |
| PDF génériques | Recursive + Overlap |
| Code source | Document-Aware (par fonction/classe) |
| Documents variés | Semantic chunking |
| Haute qualité | Parent-Child |

---

## Métriques de qualité

| Métrique | Description | Cible |
|----------|-------------|-------|
| **Taille moyenne** | Longueur des chunks | 500-800 tokens |
| **Variance** | Écart entre tailles | Faible |
| **Cohérence** | Chunk = 1 idée | Haute |
| **Overlap ratio** | % de chevauchement | 15-25% |

---

## Bonnes pratiques pour CorpusAI

1. **Recursive chunking** comme stratégie par défaut
2. **500-800 caractères** par chunk (≈ 125-200 tokens)
3. **20% overlap** pour conserver le contexte
4. **Métadonnées** : source, page, position dans le document
5. **Nettoyage** : supprimer les espaces multiples, normaliser

---

## Points clés à retenir

1. **Chunking = qualité du RAG** - Mauvais chunks = mauvaises réponses
2. **Recursive > Fixed** - Respecte la structure du texte
3. **Overlap** - Indispensable pour le contexte
4. **500-800 tokens** - Taille optimale pour la plupart des cas
5. **Métadonnées** - Toujours conserver la source
6. **Document-Aware** - Utiliser la structure quand elle existe
7. **Semantic chunking** - Pour documents variés, détecte les changements de sujet
8. **Parent-Child** - Meilleure approche pour contexte LLM riche

---

## Prochaine étape

**Module 4 : Pipeline RAG** - Assembler Chunking + Embeddings + Qdrant + LLM.

```bash
pnpm --filter @corpusai/ai-worker experiment:rag
```
