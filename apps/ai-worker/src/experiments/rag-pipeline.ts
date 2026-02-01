/**
 * ============================================
 * EXPERIMENT 4: PIPELINE RAG COMPLET
 * ============================================
 *
 * RAG = Retrieval-Augmented Generation
 * On assemble tout : Chunking + Embeddings + Qdrant + LLM
 *
 * Dans ce script, tu vas :
 * 1. Indexer un document (chunking + embeddings + Qdrant)
 * 2. Poser des questions et obtenir des réponses avec sources
 * 3. Tester le streaming pour une UX réactive
 * 4. Voir comment gérer "Je ne sais pas"
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
const LLM_MODEL = 'gpt-4o-mini';
const COLLECTION_NAME = 'rag_experiment';
const VECTOR_SIZE = 1536;

// ============================================
// DOCUMENT À INDEXER
// ============================================

const DOCUMENT = `# Guide TypeScript pour débutants

## Introduction

TypeScript est un langage de programmation développé par Microsoft. Il a été créé en 2012 par Anders Hejlsberg, qui est également le créateur de C# et Turbo Pascal. TypeScript est un sur-ensemble de JavaScript, ce qui signifie que tout code JavaScript valide est aussi du TypeScript valide.

## Pourquoi utiliser TypeScript ?

JavaScript est un langage à typage dynamique, ce qui signifie que les types sont vérifiés uniquement à l'exécution. Cela peut conduire à des erreurs difficiles à détecter et à déboguer. TypeScript résout ce problème en ajoutant un système de types statiques.

Les principaux avantages sont :
- Détection des erreurs à la compilation plutôt qu'à l'exécution
- Autocomplétion améliorée dans les éditeurs de code
- Documentation implicite grâce aux types
- Refactoring plus sûr et plus facile

## Le système de types

TypeScript propose plusieurs types de base : string, number, boolean, array, object, null, undefined, et any. Le type "any" désactive la vérification de types et devrait être évité dans la mesure du possible.

Les interfaces permettent de définir la structure des objets :

interface User {
  id: number;
  name: string;
  email: string;
  isActive: boolean;
}

## Compilation

Le code TypeScript doit être compilé en JavaScript pour être exécuté. Cette compilation est effectuée par le compilateur TypeScript (tsc). La configuration se fait dans un fichier tsconfig.json qui définit les options de compilation comme la version cible de JavaScript et les règles de strictness.

## Adoption dans l'industrie

TypeScript est maintenant utilisé par de nombreuses grandes entreprises : Microsoft (évidemment), Google, Airbnb, Slack, Asana, et bien d'autres. Les frameworks modernes comme Angular, Vue 3, et Next.js supportent nativement TypeScript. En 2023, TypeScript est devenu le 4ème langage le plus utilisé sur GitHub.`;

// ============================================
// FONCTIONS UTILITAIRES
// ============================================

async function getEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
  });
  return response.data[0].embedding;
}

async function getEmbeddings(texts: string[]): Promise<number[][]> {
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: texts,
  });
  return response.data.map((item) => item.embedding);
}

function chunkDocument(text: string, maxSize = 500): string[] {
  const separators = ['\n\n', '\n', '. '];

  function recursiveChunk(txt: string, sepIndex = 0): string[] {
    if (txt.length <= maxSize || sepIndex >= separators.length) {
      return [txt.trim()].filter((c) => c.length > 0);
    }

    const separator = separators[sepIndex];
    const parts = txt.split(separator);
    const chunks: string[] = [];
    let current = '';

    for (const part of parts) {
      const potential = current + (current ? separator : '') + part;
      if (potential.length > maxSize && current) {
        chunks.push(...recursiveChunk(current, sepIndex + 1));
        current = part;
      } else {
        current = potential;
      }
    }

    if (current.trim()) {
      chunks.push(...recursiveChunk(current, sepIndex + 1));
    }

    return chunks;
  }

  return recursiveChunk(text);
}

// ============================================
// FONCTIONS RAG
// ============================================

/**
 * Recherche les chunks les plus pertinents pour une question
 */
async function searchContext(
  question: string,
  topK = 3,
  threshold = 0.4
): Promise<{ context: string; sources: string[]; scores: number[] }> {
  const questionEmbedding = await getEmbedding(question);

  const results = await qdrant.search(COLLECTION_NAME, {
    vector: questionEmbedding,
    limit: topK,
    score_threshold: threshold,
    with_payload: true,
  });

  if (results.length === 0) {
    return { context: '', sources: [], scores: [] };
  }

  const chunks: string[] = [];
  const sources: string[] = [];
  const scores: number[] = [];

  for (const result of results) {
    const payload = result.payload as { text: string; chunk_index: number };
    chunks.push(`[Chunk ${payload.chunk_index + 1}]\n${payload.text}`);
    sources.push(`Chunk ${payload.chunk_index + 1}`);
    scores.push(result.score);
  }

  return {
    context: chunks.join('\n\n---\n\n'),
    sources,
    scores,
  };
}

/**
 * Génère une réponse à partir du contexte
 */
async function generateAnswer(
  question: string,
  context: string
): Promise<string> {
  const systemPrompt = `Tu es un assistant expert en programmation.
Réponds UNIQUEMENT en utilisant les informations du contexte fourni.
Si l'information n'est pas présente dans le contexte, réponds exactement : "Je ne dispose pas de cette information dans ma base de connaissances."
Sois concis et précis. Cite les sources (numéros de chunks) quand c'est pertinent.

CONTEXTE:
---
${context}
---`;

  const response = await openai.chat.completions.create({
    model: LLM_MODEL,
    temperature: 0.2,
    max_tokens: 500,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: question },
    ],
  });

  return response.choices[0].message.content || '';
}

/**
 * Génère une réponse en streaming
 */
async function streamAnswer(question: string, context: string): Promise<void> {
  const systemPrompt = `Tu es un assistant expert en programmation.
Réponds UNIQUEMENT en utilisant les informations du contexte fourni.
Si l'information n'est pas présente dans le contexte, réponds : "Je ne dispose pas de cette information."

CONTEXTE:
---
${context}
---`;

  const stream = await openai.chat.completions.create({
    model: LLM_MODEL,
    temperature: 0.2,
    max_tokens: 500,
    stream: true,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: question },
    ],
  });

  for await (const chunk of stream) {
    const token = chunk.choices[0]?.delta?.content || '';
    process.stdout.write(token);
  }
  console.log(); // Nouvelle ligne à la fin
}

/**
 * Pipeline RAG complet
 */
async function askRAG(question: string): Promise<void> {
  console.log(`\n🔍 Question: "${question}"\n`);

  // 1. Recherche du contexte
  const { context, sources, scores } = await searchContext(question);

  if (!context) {
    console.log('❌ Aucun contexte pertinent trouvé.');
    console.log('💬 Réponse: Je ne dispose pas d\'information sur ce sujet.\n');
    return;
  }

  // 2. Afficher les sources trouvées
  console.log('📚 Sources trouvées:');
  sources.forEach((source, i) => {
    const bar = '█'.repeat(Math.round(scores[i] * 20));
    console.log(`   ${source}: [${scores[i].toFixed(3)}] ${bar}`);
  });
  console.log();

  // 3. Générer la réponse
  console.log('💬 Réponse:');
  const answer = await generateAnswer(question, context);
  console.log(`   ${answer.split('\n').join('\n   ')}\n`);
}

// ============================================
// EXPÉRIENCES
// ============================================

async function runExperiments() {
  console.log('🧪 EXPÉRIENCE 4: Pipeline RAG complet\n');
  console.log('='.repeat(60));

  // ----------------------------------------
  // Étape 1: Indexation du document
  // ----------------------------------------
  console.log('\n📊 ÉTAPE 1: Indexation du document\n');

  // Supprimer la collection si elle existe
  try {
    await qdrant.deleteCollection(COLLECTION_NAME);
    console.log('   ↳ Collection précédente supprimée');
  } catch {
    // OK
  }

  // Créer la collection
  await qdrant.createCollection(COLLECTION_NAME, {
    vectors: { size: VECTOR_SIZE, distance: 'Cosine' },
  });
  console.log('   ✅ Collection créée');

  // Chunking
  const chunks = chunkDocument(DOCUMENT, 400);
  console.log(`   ✅ Document découpé en ${chunks.length} chunks`);

  // Afficher les chunks
  console.log('\n   Chunks créés:');
  chunks.forEach((chunk, i) => {
    console.log(`   ${i + 1}. [${chunk.length} chars] "${chunk.slice(0, 50)}..."`);
  });

  // Embeddings
  console.log('\n   ⏳ Génération des embeddings...');
  const embeddings = await getEmbeddings(chunks);
  console.log(`   ✅ ${embeddings.length} embeddings générés`);

  // Insertion dans Qdrant
  const points = chunks.map((text, i) => ({
    id: crypto.randomUUID(),
    vector: embeddings[i],
    payload: { text, chunk_index: i, source: 'typescript-guide.md' },
  }));

  await qdrant.upsert(COLLECTION_NAME, { wait: true, points });
  console.log('   ✅ Points insérés dans Qdrant');

  // ----------------------------------------
  // Étape 2: Questions avec RAG
  // ----------------------------------------
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 ÉTAPE 2: Questions avec RAG\n');

  // Question 1: Information présente
  await askRAG('Qu\'est-ce que TypeScript ?');

  // Question 2: Information précise
  await askRAG('Qui a créé TypeScript et quand ?');

  // Question 3: Information hors contexte
  await askRAG('Comment fonctionne Python ?');

  // Question 4: Information détaillée
  await askRAG('Quels sont les avantages du typage statique ?');

  // ----------------------------------------
  // Étape 3: Démonstration du streaming
  // ----------------------------------------
  console.log('='.repeat(60));
  console.log('\n📊 ÉTAPE 3: Réponse en streaming\n');

  const streamQuestion = 'Quelles entreprises utilisent TypeScript ?';
  console.log(`🔍 Question: "${streamQuestion}"\n`);

  const { context } = await searchContext(streamQuestion);

  console.log('💬 Réponse (streaming):');
  process.stdout.write('   ');
  await streamAnswer(streamQuestion, context);

  // ----------------------------------------
  // Conclusion
  // ----------------------------------------
  console.log('\n' + '='.repeat(60));
  console.log('\n📝 CE QUE TU AS APPRIS:\n');
  console.log('1. RAG = Recherche (Qdrant) + Génération (LLM)');
  console.log('2. Le prompt doit dire "utilise UNIQUEMENT le contexte"');
  console.log('3. Temperature basse (0.2) pour des réponses factuelles');
  console.log('4. Le LLM peut dire "Je ne sais pas" si le contexte ne contient pas l\'info');
  console.log('5. Le streaming améliore l\'expérience utilisateur');
  console.log('\n➡️  Prochaine étape: Services production');
  console.log('   Transformer ces expériences en vrais services pour CorpusAI');
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
