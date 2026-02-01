# Guide Qdrant - Base de données vectorielle

## Introduction

Qdrant est une base de données vectorielle open source écrite en Rust. Elle est conçue pour stocker et rechercher des vecteurs de haute dimension avec des métadonnées associées. Qdrant est idéale pour les applications de recherche sémantique, de recommandation et de RAG (Retrieval-Augmented Generation).

## Concepts clés

### Collections

Une collection est un ensemble de points (vecteurs + payload). Chaque collection a une configuration de distance et une taille de vecteur fixe.

```bash
# Créer une collection
PUT /collections/my_collection
{
  "vectors": {
    "size": 1536,
    "distance": "Cosine"
  }
}
```

### Points

Un point contient :
- **id** : identifiant unique (UUID ou entier)
- **vector** : le vecteur d'embedding
- **payload** : métadonnées JSON associées

### Distances supportées

- **Cosine** : similarité cosinus (recommandée pour les embeddings texte)
- **Euclid** : distance euclidienne
- **Dot** : produit scalaire

## Opérations principales

### Insertion de points

```javascript
await client.upsert('my_collection', {
  points: [
    {
      id: 'abc-123',
      vector: [0.1, 0.2, 0.3, ...],
      payload: {
        text: 'Contenu du document',
        source: 'document.pdf',
        page: 5
      }
    }
  ]
});
```

### Recherche vectorielle

```javascript
const results = await client.search('my_collection', {
  vector: queryVector,
  limit: 5,
  score_threshold: 0.7,
  with_payload: true,
  filter: {
    must: [
      { key: 'source', match: { value: 'document.pdf' } }
    ]
  }
});
```

## Filtrage

Qdrant supporte des filtres puissants sur les payloads :

- **must** : toutes les conditions doivent être vraies
- **should** : au moins une condition doit être vraie
- **must_not** : aucune condition ne doit être vraie

Types de filtres :
- **match** : égalité exacte
- **range** : intervalle numérique
- **geo** : filtrage géographique

## Indexation HNSW

Qdrant utilise l'algorithme HNSW (Hierarchical Navigable Small World) pour une recherche approximative rapide. Configuration recommandée :

- **m** : nombre de connexions par nœud (défaut: 16)
- **ef_construct** : taille de la liste de candidats lors de la construction (défaut: 100)

## Utilisation avec RAG

Dans un pipeline RAG :
1. Les documents sont découpés en chunks
2. Chaque chunk est converti en vecteur via un modèle d'embedding
3. Les vecteurs sont stockés dans Qdrant avec les métadonnées
4. À la requête, le texte est vectorisé et Qdrant retourne les chunks similaires
5. Les chunks sont utilisés comme contexte pour le LLM

## Déploiement

```bash
# Docker local
docker run -p 6333:6333 qdrant/qdrant

# Avec persistance
docker run -p 6333:6333 -v ./qdrant_data:/qdrant/storage qdrant/qdrant
```

Qdrant Cloud offre une solution managée avec haute disponibilité et mise à l'échelle automatique.
