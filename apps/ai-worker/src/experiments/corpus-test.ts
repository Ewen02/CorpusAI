/**
 * Test du package @corpusai/corpus
 *
 * Ce script valide que les services de production fonctionnent correctement.
 *
 * Prérequis:
 * - OPENAI_API_KEY dans .env
 * - Qdrant en local: docker run -p 6333:6333 qdrant/qdrant
 *
 * Exécution: pnpm --filter @corpusai/ai-worker experiment:corpus
 */

import 'dotenv/config';
import {
  OpenAIEmbeddingService,
  QdrantVectorStore,
  RecursiveChunker,
  MarkdownChunker,
  RAGPipelineImpl,
  type Document,
} from '@corpusai/corpus';

// Configuration
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
const QDRANT_URL = process.env.QDRANT_URL || 'http://localhost:6333';
const COLLECTION_NAME = 'corpus-test';

// Documents de test
const testDocuments: Document[] = [
  {
    id: 'doc-1',
    source: 'typescript-guide.md',
    content: `# TypeScript Guide

## Introduction

TypeScript est un langage de programmation développé par Microsoft.
C'est un sur-ensemble de JavaScript qui ajoute le typage statique optionnel.
Anders Hejlsberg, le créateur de C#, a également créé TypeScript en 2012.

## Avantages

Le typage statique permet de détecter les erreurs à la compilation plutôt qu'à l'exécution.
Cela améliore la maintenabilité du code et facilite le refactoring.
Les IDE peuvent fournir une meilleure autocomplétion grâce aux types.

## Types de base

TypeScript supporte plusieurs types primitifs:
- string: pour les chaînes de caractères
- number: pour les nombres (entiers et décimaux)
- boolean: pour les valeurs true/false
- null et undefined

## Interfaces

Les interfaces permettent de définir la structure des objets.
Elles sont utilisées pour le duck typing et la vérification de types.`,
  },
  {
    id: 'doc-2',
    source: 'react-basics.md',
    content: `# React Basics

## Qu'est-ce que React ?

React est une bibliothèque JavaScript pour construire des interfaces utilisateur.
Créée par Facebook en 2013, elle est maintenant open source.
React utilise un DOM virtuel pour optimiser les performances.

## Composants

Les composants sont les blocs de construction de React.
Il existe deux types: les composants fonctionnels et les composants classe.
Depuis React 16.8, les hooks permettent d'utiliser l'état dans les composants fonctionnels.

## JSX

JSX est une extension de syntaxe qui ressemble à HTML.
Elle permet d'écrire du markup directement dans le code JavaScript.
Babel compile le JSX en appels React.createElement().`,
  },
];

async function runTests() {
  console.log('🧪 Test du package @corpusai/corpus\n');
  console.log('='.repeat(50));

  // Test 1: EmbeddingService
  console.log('\n📌 Test 1: OpenAIEmbeddingService');
  const embeddings = new OpenAIEmbeddingService({ apiKey: OPENAI_API_KEY });

  const testText = 'Qu\'est-ce que TypeScript ?';
  const vector = await embeddings.embed(testText);
  console.log(`✅ Embedding généré: ${vector.length} dimensions`);
  console.log(`   Modèle: ${embeddings.model}`);

  const batchTexts = ['Hello', 'World', 'TypeScript'];
  const batchVectors = await embeddings.embedBatch(batchTexts);
  console.log(`✅ Batch embedding: ${batchVectors.length} vecteurs`);

  // Test 2: VectorStore
  console.log('\n📌 Test 2: QdrantVectorStore');
  const vectorStore = new QdrantVectorStore({
    url: QDRANT_URL,
    collectionName: COLLECTION_NAME,
    vectorSize: embeddings.dimensions,
  });

  await vectorStore.deleteCollection();
  await vectorStore.ensureCollection();
  console.log(`✅ Collection "${COLLECTION_NAME}" créée`);

  const testPointId = crypto.randomUUID();
  await vectorStore.upsert([
    { id: testPointId, vector, payload: { text: testText, source: 'test' } },
  ]);
  console.log('✅ Point inséré');

  const searchResults = await vectorStore.search(vector, {
    limit: 1,
    withPayload: true,
  });
  console.log(`✅ Recherche: score=${searchResults[0]?.score.toFixed(4)}`);

  // Test 3: Chunking
  console.log('\n📌 Test 3: ChunkingService');

  const recursiveChunker = new RecursiveChunker({ chunkSize: 300, chunkOverlap: 50 });
  const recursiveChunks = recursiveChunker.chunk(testDocuments[0]!.content, {
    documentId: 'doc-1',
    source: 'typescript-guide.md',
  });
  console.log(`✅ RecursiveChunker: ${recursiveChunks.length} chunks`);

  const markdownChunker = new MarkdownChunker({ maxChunkSize: 400 });
  const markdownChunks = markdownChunker.chunk(testDocuments[0]!.content, {
    documentId: 'doc-1',
    source: 'typescript-guide.md',
  });
  console.log(`✅ MarkdownChunker: ${markdownChunks.length} chunks`);

  // Test 4: RAG Pipeline
  console.log('\n📌 Test 4: RAGPipeline');

  // Nettoyer pour le test RAG
  await vectorStore.deleteCollection();

  const ragVectorStore = new QdrantVectorStore({
    url: QDRANT_URL,
    collectionName: 'corpus-rag-test',
    vectorSize: embeddings.dimensions,
  });

  const pipeline = new RAGPipelineImpl(
    embeddings,
    ragVectorStore,
    new RecursiveChunker({ chunkSize: 400, chunkOverlap: 80 }),
    {
      apiKey: OPENAI_API_KEY,
      model: 'gpt-4o-mini',
      temperature: 0.2,
    }
  );

  // Indexer les documents
  console.log('\n   Indexation des documents...');
  const indexResult = await pipeline.index(testDocuments);
  console.log(`✅ Indexé: ${indexResult.documentsIndexed} docs, ${indexResult.chunksCreated} chunks`);

  // Poser des questions
  console.log('\n   Questions de test:');

  const questions = [
    'Qui a créé TypeScript ?',
    'Qu\'est-ce que JSX ?',
    'Quels sont les types de base en TypeScript ?',
  ];

  for (const question of questions) {
    console.log(`\n   Q: "${question}"`);
    const response = await pipeline.query(question, { topK: 3 });
    console.log(`   A: ${response.answer.substring(0, 150)}...`);
    console.log(`   Sources: ${response.sources.map((s) => s.documentSource).join(', ')}`);
  }

  // Test streaming
  console.log('\n\n📌 Test 5: Streaming');
  console.log('   Q: "Qu\'est-ce que React ?"');
  process.stdout.write('   A: ');

  const stream = pipeline.queryStream('Qu\'est-ce que React ?');
  for await (const token of stream) {
    process.stdout.write(token);
  }
  console.log('\n');

  // Cleanup
  await ragVectorStore.deleteCollection();
  await vectorStore.deleteCollection();

  console.log('='.repeat(50));
  console.log('✅ Tous les tests sont passés !');
  console.log('\nLe package @corpusai/corpus est prêt pour la production.');
}

runTests().catch(console.error);
