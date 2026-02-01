# Module 1 : Embeddings

## Objectif
Comprendre comment transformer du texte en vecteurs numériques pour permettre la recherche sémantique.

---

## Théorie

### Qu'est-ce qu'un Embedding ?

Un **embedding** est une représentation numérique d'un texte sous forme de **vecteur** (liste de nombres).

```
"Le chat dort" → [0.023, -0.156, 0.891, ..., 0.042]  (1536 dimensions)
```

### Pourquoi c'est puissant ?

Le modèle d'embedding (entraîné sur des milliards de textes) a appris que :
- Textes avec **sens similaire** → vecteurs **proches**
- Textes avec **sens différent** → vecteurs **éloignés**

```
"Le chat dort"          → [0.02, -0.15, 0.89, ...]
"Le félin se repose"    → [0.01, -0.14, 0.88, ...]  ← Très proche !
"La voiture roule"      → [-0.23, 0.56, -0.12, ...] ← Très différent
```

### Similarité Cosinus

Pour mesurer la proximité entre deux vecteurs :

| Score | Signification |
|-------|---------------|
| `1.0` | Identiques |
| `> 0.8` | Très similaires |
| `0.5 - 0.8` | Liés |
| `< 0.5` | Peu de relation |
| `0.0` | Aucun rapport |

**Formule** :
```
similarity = (A · B) / (||A|| × ||B||)
```

### Modèle utilisé : text-embedding-3-small

| Propriété | Valeur |
|-----------|--------|
| Provider | OpenAI |
| Dimensions | 1536 |
| Prix | ~$0.02 / 1M tokens |
| Usage | Recommandé pour RAG |

---

## Pratique

### Fichier : `apps/ai-worker/src/experiments/embeddings.ts`

### Prérequis

1. Clé API OpenAI dans `apps/ai-worker/.env` :
```env
OPENAI_API_KEY="sk-..."
```

### Exécution

```bash
pnpm --filter @corpusai/ai-worker experiment:embeddings
```

### Ce que fait le script

1. **Génère des embeddings** pour 4 phrases
2. **Calcule la matrice de similarité** entre elles
3. **Effectue une recherche sémantique** avec une requête

### Résultat attendu

```
📊 TEST 1: Similarité sémantique

Phrases à comparer:
  1. "Le chat dort sur le canapé"
  2. "Le félin sommeille sur le sofa"
  3. "Python est un langage de programmation"
  4. "Le chien joue dans le jardin"

Matrice de similarité:
          [1]    [2]    [3]    [4]
  [1]    1.00   0.92   0.15   0.65
  [2]    0.92   1.00   0.12   0.61
  [3]    0.15   0.12   1.00   0.18
  [4]    0.65   0.61   0.18   1.00
```

**Observations** :
- Phrases 1 et 2 (chat/félin) : ~0.92 (synonymes)
- Phrase 3 (Python) : ~0.15 (sujet différent)
- Phrase 4 (chien) : ~0.65 (même domaine "animaux")

---

## Code clé

### Générer un embedding

```typescript
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function getEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });
  return response.data[0].embedding;
}
```

### Générer plusieurs embeddings (batch)

```typescript
async function getEmbeddings(texts: string[]): Promise<number[][]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: texts,  // Tableau de textes
  });
  return response.data.map((item) => item.embedding);
}
```

### Calculer la similarité cosinus

```typescript
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
```

---

## Points clés à retenir

1. **Un embedding = vecteur de 1536 nombres** représentant le sens du texte
2. **Similarité cosinus** mesure la proximité sémantique (0 à 1)
3. **Batch les requêtes** pour optimiser les appels API (max 100 textes)
4. **Le modèle comprend le sens**, pas juste les mots-clés

---

## Prochaine étape

**Module 2 : Qdrant** - Stocker ces vecteurs dans une base de données vectorielle pour faire des recherches rapides.

```bash
pnpm --filter @corpusai/ai-worker experiment:qdrant
```
