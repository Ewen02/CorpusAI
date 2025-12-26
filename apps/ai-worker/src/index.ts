/**
 * ============================================
 * AI WORKER - Service RAG pour CorpusAI
 * ============================================
 *
 * Ce service gère toute la logique IA :
 * - Génération d'embeddings
 * - Stockage/recherche dans Qdrant
 * - Pipeline RAG complet
 *
 * Pour apprendre, utilise les scripts d'expérimentation :
 *   pnpm experiment:embeddings  - Comprendre les embeddings
 *   pnpm experiment:qdrant      - Manipuler la base vectorielle
 *   pnpm experiment:chunking    - Découper des documents
 *   pnpm experiment:rag         - Pipeline RAG complet
 */

console.log('🤖 CorpusAI AI Worker');
console.log('='.repeat(40));
console.log('\nPour expérimenter, utilise les commandes:');
console.log('  pnpm experiment:embeddings');
console.log('  pnpm experiment:qdrant');
console.log('  pnpm experiment:chunking');
console.log('  pnpm experiment:rag');
