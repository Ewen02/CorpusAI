/**
 * ============================================
 * EXPERIMENT 2: QDRANT - BASE DE DONNÉES VECTORIELLE
 * ============================================
 *
 * Qdrant stocke des vecteurs (embeddings) et permet de les rechercher
 * par similarité de manière très rapide grâce à l'algorithme HNSW.
 *
 * Dans ce script, tu vas :
 * 1. Créer une collection pour stocker des documents
 * 2. Insérer des points (vecteurs + métadonnées)
 * 3. Rechercher les documents les plus similaires à une requête
 * 4. Filtrer par catégorie (must)
 * 5. Utiliser score_threshold pour ignorer les résultats faibles
 * 6. Filtres avancés (should/must_not)
 * 7. Pagination avec Scroll API
 */

import 'dotenv/config';
import { QdrantClient } from '@qdrant/js-client-rest';
import OpenAI from 'openai';

// ============================================
// CONFIGURATION
// ============================================

const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL || 'http://localhost:6333',
  apiKey: process.env.QDRANT_API_KEY || undefined,
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const EMBEDDING_MODEL = 'text-embedding-3-small';
const COLLECTION_NAME = 'documents_experiment';
const VECTOR_SIZE = 1536; // Dimension de text-embedding-3-small

// ============================================
// FONCTIONS UTILITAIRES
// ============================================

/**
 * Génère un embedding pour un texte
 */
async function getEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
  });
  return response.data[0].embedding;
}

/**
 * Génère des embeddings pour plusieurs textes
 */
async function getEmbeddings(texts: string[]): Promise<number[][]> {
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: texts,
  });
  return response.data.map((item) => item.embedding);
}

/**
 * Génère un UUID simple
 */
function generateId(): string {
  return crypto.randomUUID();
}

// ============================================
// EXPÉRIENCES QDRANT
// ============================================

async function runExperiments() {
  console.log('🧪 EXPÉRIENCE 2: Qdrant - Base vectorielle\n');
  console.log('='.repeat(60));

  // ----------------------------------------
  // Test 1: Créer une collection
  // ----------------------------------------
  console.log('\n📊 TEST 1: Créer une collection\n');

  // Supprimer la collection si elle existe (pour reset)
  try {
    await qdrant.deleteCollection(COLLECTION_NAME);
    console.log(`  ↳ Collection "${COLLECTION_NAME}" supprimée (reset)`);
  } catch {
    // Collection n'existait pas, c'est OK
  }

  // Créer la collection
  await qdrant.createCollection(COLLECTION_NAME, {
    vectors: {
      size: VECTOR_SIZE,
      distance: 'Cosine', // Mesure de similarité
    },
  });

  console.log(`✅ Collection "${COLLECTION_NAME}" créée`);
  console.log(`   - Dimension: ${VECTOR_SIZE}`);
  console.log(`   - Distance: Cosine (similarité cosinus)`);

  // ----------------------------------------
  // Test 2: Insérer des documents
  // ----------------------------------------
  console.log('\n📊 TEST 2: Insérer des documents\n');

  // Documents à indexer (simulent des chunks de documents réels)
  const documents = [
    {
      text: "TypeScript est un sur-ensemble de JavaScript qui ajoute le typage statique.",
      source: "typescript-docs.md",
      category: "programming",
    },
    {
      text: "React est une bibliothèque JavaScript pour construire des interfaces utilisateur.",
      source: "react-docs.md",
      category: "programming",
    },
    {
      text: "Qdrant est une base de données vectorielle open-source écrite en Rust.",
      source: "qdrant-docs.md",
      category: "database",
    },
    {
      text: "Les embeddings transforment du texte en vecteurs numériques pour la recherche sémantique.",
      source: "ai-basics.md",
      category: "ai",
    },
    {
      text: "Le RAG combine la recherche vectorielle avec la génération de texte par LLM.",
      source: "ai-basics.md",
      category: "ai",
    },
    {
      text: "PostgreSQL est une base de données relationnelle open-source très populaire.",
      source: "postgres-docs.md",
      category: "database",
    },
  ];

  console.log('Documents à indexer:');
  documents.forEach((doc, i) => console.log(`  ${i + 1}. "${doc.text.slice(0, 50)}..."`));
  console.log();

  // Générer les embeddings pour tous les documents
  console.log('⏳ Génération des embeddings...');
  const texts = documents.map((d) => d.text);
  const embeddings = await getEmbeddings(texts);
  console.log(`✅ ${embeddings.length} embeddings générés\n`);

  // Créer les points à insérer
  const points = documents.map((doc, i) => ({
    id: generateId(),
    vector: embeddings[i],
    payload: {
      text: doc.text,
      source: doc.source,
      category: doc.category,
      indexed_at: new Date().toISOString(),
    },
  }));

  // Insérer dans Qdrant
  await qdrant.upsert(COLLECTION_NAME, {
    wait: true, // Attendre que l'insertion soit confirmée
    points,
  });

  console.log(`✅ ${points.length} points insérés dans Qdrant`);

  // Vérifier le nombre de points
  const collectionInfo = await qdrant.getCollection(COLLECTION_NAME);
  console.log(`   Points dans la collection: ${collectionInfo.points_count}`);

  // ----------------------------------------
  // Test 3: Recherche par similarité
  // ----------------------------------------
  console.log('\n📊 TEST 3: Recherche par similarité\n');

  const queries = [
    "Comment fonctionne le typage en JavaScript ?",
    "Qu'est-ce qu'une base de données vectorielle ?",
    "Comment créer des composants web ?",
  ];

  for (const query of queries) {
    console.log(`🔍 Requête: "${query}"\n`);

    // Générer l'embedding de la requête
    const queryEmbedding = await getEmbedding(query);

    // Rechercher les 3 documents les plus similaires
    const results = await qdrant.search(COLLECTION_NAME, {
      vector: queryEmbedding,
      limit: 3,
      with_payload: true, // Inclure les métadonnées
    });

    console.log('   Résultats:');
    results.forEach((result, i) => {
      const payload = result.payload as { text: string; source: string; category: string };
      const scoreBar = '█'.repeat(Math.round(result.score * 20));
      console.log(`   ${i + 1}. [${result.score.toFixed(3)}] ${scoreBar}`);
      console.log(`      "${payload.text.slice(0, 60)}..."`);
      console.log(`      Source: ${payload.source} | Catégorie: ${payload.category}`);
    });
    console.log();
  }

  // ----------------------------------------
  // Test 4: Recherche avec filtre
  // ----------------------------------------
  console.log('📊 TEST 4: Recherche avec filtre (par catégorie)\n');

  const filteredQuery = "Parle-moi des bases de données";
  console.log(`🔍 Requête: "${filteredQuery}"`);
  console.log('   Filtre: category = "database"\n');

  const filteredQueryEmbedding = await getEmbedding(filteredQuery);

  const filteredResults = await qdrant.search(COLLECTION_NAME, {
    vector: filteredQueryEmbedding,
    limit: 3,
    with_payload: true,
    filter: {
      must: [
        {
          key: 'category',
          match: { value: 'database' },
        },
      ],
    },
  });

  console.log('   Résultats (filtrés):');
  filteredResults.forEach((result, i) => {
    const payload = result.payload as { text: string; source: string; category: string };
    console.log(`   ${i + 1}. [${result.score.toFixed(3)}] "${payload.text.slice(0, 50)}..."`);
    console.log(`      Source: ${payload.source}`);
  });

  // ----------------------------------------
  // Test 5: Score Threshold (ignorer résultats faibles)
  // ----------------------------------------
  console.log('\n📊 TEST 5: Score Threshold\n');

  const vagueQuery = "Explique-moi quelque chose d'intéressant";
  console.log(`🔍 Requête vague: "${vagueQuery}"`);
  console.log('   Score threshold: 0.4 (ignorer si score < 0.4)\n');

  const vagueEmbedding = await getEmbedding(vagueQuery);

  const thresholdResults = await qdrant.search(COLLECTION_NAME, {
    vector: vagueEmbedding,
    limit: 6,
    with_payload: true,
    score_threshold: 0.4, // Ignorer les résultats faibles
  });

  console.log(`   ${thresholdResults.length} résultats avec score >= 0.4:`);
  thresholdResults.forEach((result, i) => {
    const payload = result.payload as { text: string };
    console.log(`   ${i + 1}. [${result.score.toFixed(3)}] "${payload.text.slice(0, 45)}..."`);
  });

  if (thresholdResults.length === 0) {
    console.log('   (Aucun résultat suffisamment pertinent)');
  }

  // ----------------------------------------
  // Test 6: Filtres avancés (OR, NOT)
  // ----------------------------------------
  console.log('\n📊 TEST 6: Filtres avancés (should/must_not)\n');

  const advancedQuery = "Comment ça fonctionne ?";
  console.log(`🔍 Requête: "${advancedQuery}"`);
  console.log('   Filtre: (programming OR ai) AND NOT database\n');

  const advancedEmbedding = await getEmbedding(advancedQuery);

  const advancedResults = await qdrant.search(COLLECTION_NAME, {
    vector: advancedEmbedding,
    limit: 5,
    with_payload: true,
    filter: {
      should: [
        { key: 'category', match: { value: 'programming' } },
        { key: 'category', match: { value: 'ai' } },
      ],
      must_not: [
        { key: 'category', match: { value: 'database' } },
      ],
    },
  });

  console.log('   Résultats (sans database):');
  advancedResults.forEach((result, i) => {
    const payload = result.payload as { text: string; category: string };
    console.log(`   ${i + 1}. [${payload.category}] "${payload.text.slice(0, 50)}..."`);
  });

  // ----------------------------------------
  // Test 7: Scroll API (pagination)
  // ----------------------------------------
  console.log('\n📊 TEST 7: Scroll API (pagination)\n');

  console.log('   Parcourir tous les points de la collection (2 par page):\n');

  let nextOffset: string | number | undefined = undefined;
  let page = 1;

  while (true) {
    const scrollResult = await qdrant.scroll(COLLECTION_NAME, {
      limit: 2,
      offset: nextOffset,
      with_payload: true,
    });

    console.log(`   Page ${page}:`);
    scrollResult.points.forEach((point) => {
      const payload = point.payload as { text: string; category: string };
      console.log(`     - [${payload.category}] "${payload.text.slice(0, 40)}..."`);
    });

    // Vérifier s'il y a une page suivante
    const nextPage = scrollResult.next_page_offset;
    if (!nextPage || typeof nextPage === 'object') {
      break;
    }

    nextOffset = nextPage;
    page++;
  }

  console.log(`\n   Total: ${page} pages parcourues`);

  // ----------------------------------------
  // Conclusion
  // ----------------------------------------
  console.log('\n' + '='.repeat(60));
  console.log('📝 CE QUE TU AS APPRIS:\n');
  console.log('1. Une collection Qdrant stocke des vecteurs de même dimension');
  console.log('2. Chaque point = id + vecteur + payload (métadonnées)');
  console.log('3. La recherche retourne les points les plus similaires');
  console.log('4. Les filtres (must/should/must_not) combinent recherche sémantique et critères');
  console.log('5. Score threshold filtre les résultats peu pertinents');
  console.log('6. Scroll API permet de paginer à travers une collection');
  console.log('\n➡️  Prochaine étape: Chunking des documents');
  console.log('   Exécute: pnpm experiment:chunking');
}

// ============================================
// POINT D'ENTRÉE
// ============================================

runExperiments().catch((error) => {
  console.error('❌ Erreur:', error.message);

  if (error.message.includes('API key')) {
    console.log('\n💡 As-tu configuré OPENAI_API_KEY dans ton .env ?');
  }

  if (error.message.includes('ECONNREFUSED') || error.message.includes('connect')) {
    console.log('\n💡 Qdrant ne semble pas accessible.');
    console.log('   Lance-le avec: docker run -p 6333:6333 qdrant/qdrant');
  }

  process.exit(1);
});
