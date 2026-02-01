# Module 2 : Qdrant (Base de données vectorielle)

## Objectif
Apprendre à stocker et rechercher des vecteurs efficacement avec Qdrant.

---

## Théorie

### Qu'est-ce que Qdrant ?

**Qdrant** est une base de données vectorielle open-source. Elle stocke des embeddings et permet de trouver les vecteurs les plus similaires à une requête en quelques millisecondes.

### Concepts clés

| Concept | Définition | Analogie SQL |
|---------|------------|--------------|
| **Collection** | Groupe de vecteurs avec la même dimension | Table |
| **Point** | Un vecteur + son ID + ses métadonnées | Row |
| **Payload** | Données associées au vecteur | Colonnes |
| **Vector** | Le tableau de nombres (embedding) | Index |

### Structure d'un Point

```typescript
{
  id: "abc-123",                          // Identifiant unique
  vector: [0.02, -0.15, 0.89, ...],       // Embedding (1536 dims)
  payload: {                               // Métadonnées
    text: "Le chat dort sur le canapé",
    source: "document.pdf",
    page: 5,
    category: "animaux"
  }
}
```

### Pourquoi pas SQL ?

| Méthode | 1000 vecteurs | 1 million | 100 millions |
|---------|---------------|-----------|--------------|
| Recherche brute | 10ms | 10s | 16 min |
| **Qdrant (HNSW)** | 1ms | 5ms | 50ms |

Qdrant utilise l'algorithme **HNSW** (Hierarchical Navigable Small World) qui organise les vecteurs en graphe pour une recherche ultra-rapide.

### Mesures de distance

| Distance | Usage | Valeurs |
|----------|-------|---------|
| **Cosine** | Similarité sémantique | 0-1 (1 = identique) |
| Euclid | Distance absolue | 0-∞ (0 = identique) |
| Dot | Produit scalaire | -∞-∞ |

Pour les embeddings de texte, on utilise **Cosine**.

---

## Pratique

### Prérequis

1. **Qdrant** en local (Docker) :
```bash
docker run -p 6333:6333 -p 6334:6334 qdrant/qdrant
```

2. **Variables d'environnement** dans `apps/ai-worker/.env` :
```env
OPENAI_API_KEY="sk-..."
QDRANT_URL="http://localhost:6333"
```

### Exécution

```bash
pnpm --filter @corpusai/ai-worker experiment:qdrant
```

### Ce que fait le script

1. **Crée une collection** avec 1536 dimensions (pour text-embedding-3-small)
2. **Insère 6 documents** avec leurs embeddings et métadonnées
3. **Recherche par similarité** avec plusieurs requêtes
4. **Recherche avec filtre** pour limiter par catégorie

---

## Code clé

### Créer une collection

```typescript
import { QdrantClient } from '@qdrant/js-client-rest';

const qdrant = new QdrantClient({ url: 'http://localhost:6333' });

await qdrant.createCollection('documents', {
  vectors: {
    size: 1536,        // Dimension des vecteurs
    distance: 'Cosine' // Mesure de similarité
  }
});
```

### Insérer des points

```typescript
await qdrant.upsert('documents', {
  wait: true,
  points: [
    {
      id: 'abc-123',
      vector: [0.02, -0.15, 0.89, ...], // 1536 nombres
      payload: {
        text: 'Le chat dort',
        source: 'doc.pdf'
      }
    }
  ]
});
```

### Rechercher par similarité

```typescript
const results = await qdrant.search('documents', {
  vector: queryEmbedding,  // Embedding de la question
  limit: 5,                // Top 5 résultats
  with_payload: true       // Inclure les métadonnées
});

// results = [
//   { id: 'abc', score: 0.92, payload: { text: '...' } },
//   { id: 'def', score: 0.87, payload: { text: '...' } },
//   ...
// ]
```

### Rechercher avec filtre

```typescript
const results = await qdrant.search('documents', {
  vector: queryEmbedding,
  limit: 5,
  filter: {
    must: [
      { key: 'category', match: { value: 'programming' } }
    ]
  }
});
```

---

## Opérations CRUD

| Opération | Méthode |
|-----------|---------|
| Créer collection | `createCollection()` |
| Lister collections | `getCollections()` |
| Info collection | `getCollection(name)` |
| Supprimer collection | `deleteCollection(name)` |
| Insérer/MAJ points | `upsert(collection, { points })` |
| Rechercher | `search(collection, { vector, limit })` |
| Supprimer points | `delete(collection, { filter })` |

---

## Concepts avancés

### HNSW (l'algorithme de recherche)

```
Sans HNSW : Compare avec TOUS les vecteurs → O(n)
Avec HNSW : Navigue dans un graphe → O(log n)
```

Qdrant construit un graphe où chaque vecteur est connecté à ses voisins proches. La recherche "saute" de voisin en voisin jusqu'à trouver les meilleurs résultats.

### Batch Upsert (optimisation production)

```typescript
// Au lieu de 1000 appels individuels → UN seul appel
await qdrant.upsert(collection, {
  points: arrayOf1000Points,
  wait: true
});
```

→ **10x plus rapide** pour indexer beaucoup de documents

### Filtres avancés

```typescript
filter: {
  must: [     // AND - obligatoire
    { key: 'category', match: { value: 'ai' } }
  ],
  should: [   // OR - au moins un
    { key: 'source', match: { value: 'doc1.pdf' } },
    { key: 'source', match: { value: 'doc2.pdf' } }
  ],
  must_not: [ // Exclure
    { key: 'deprecated', match: { value: true } }
  ]
}
```

### Pagination (Scroll API)

Pour parcourir une grande collection :

```typescript
const results = await qdrant.scroll(collection, {
  limit: 100,
  offset: nextPageOffset,
  with_payload: true
});
```

### Score Threshold

Ignorer les résultats trop faibles :

```typescript
const results = await qdrant.search(collection, {
  vector: queryEmbedding,
  limit: 10,
  score_threshold: 0.5  // Ignorer si score < 0.5
});
```

---

## Priorités pour CorpusAI

| Concept | Priorité | Pourquoi |
|---------|----------|----------|
| Batch upsert | Haute | Indexation rapide de documents |
| Filtres avancés | Haute | Limiter par workspace/user |
| Score threshold | Moyenne | Éviter les résultats non pertinents |
| Scroll | Basse | Admin/debug seulement |

---

## Points clés à retenir

1. **Collection = table de vecteurs** avec dimension fixe
2. **Point = vecteur + payload** (métadonnées)
3. **Cosine distance** pour la similarité sémantique
4. **HNSW** permet une recherche en O(log n) au lieu de O(n)
5. **Filtres** pour combiner recherche sémantique et critères classiques
6. **Batch upsert** pour les insertions massives
7. **Score threshold** pour filtrer les résultats faibles

---

## Prochaine étape

**Module 3 : Chunking** - Découper les documents en morceaux optimaux avant de les indexer.

```bash
pnpm --filter @corpusai/ai-worker experiment:chunking
```
