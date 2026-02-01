/**
 * ============================================
 * EXPERIMENT 1: COMPRENDRE LES EMBEDDINGS
 * ============================================
 *
 * Un embedding est une représentation numérique d'un texte.
 * C'est un vecteur (tableau de nombres) qui capture le "sens" du texte.
 *
 * Pourquoi c'est puissant ?
 * - Deux textes similaires auront des vecteurs proches
 * - On peut mesurer la "distance" entre deux textes
 * - Permet la recherche par sens, pas juste par mots-clés
 *
 * Dans ce script, tu vas :
 * 1. Générer des embeddings pour différentes phrases
 * 2. Calculer la similarité entre elles
 * 3. Visualiser comment le modèle comprend le sens
 */

import 'dotenv/config';
import OpenAI from 'openai';

// ============================================
// CONFIGURATION
// ============================================

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Le modèle d'embedding qu'on utilise
// text-embedding-3-small : 1536 dimensions, bon rapport qualité/prix
// text-embedding-3-large : 3072 dimensions, plus précis mais plus cher
const EMBEDDING_MODEL = 'text-embedding-3-small';

// ============================================
// FONCTION PRINCIPALE : Générer un embedding
// ============================================

/**
 * Génère un embedding pour un texte donné
 *
 * @param text - Le texte à transformer en vecteur
 * @returns Un tableau de nombres (le vecteur)
 */
async function getEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
  });

  // L'API retourne un tableau d'embeddings (un par input)
  // On prend le premier car on n'a envoyé qu'un seul texte
  return response.data[0].embedding;
}

/**
 * Génère des embeddings pour plusieurs textes en une seule requête
 * (Plus efficace que d'appeler getEmbedding() plusieurs fois)
 */
async function getEmbeddings(texts: string[]): Promise<number[][]> {
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: texts,
  });

  return response.data.map((item) => item.embedding);
}

// ============================================
// SIMILARITÉ COSINUS
// ============================================

/**
 * Calcule la similarité cosinus entre deux vecteurs
 *
 * La similarité cosinus mesure l'angle entre deux vecteurs :
 * - 1.0 = identiques (angle de 0°)
 * - 0.0 = orthogonaux (angle de 90°, pas de relation)
 * - -1.0 = opposés (angle de 180°)
 *
 * Pour les embeddings de texte, on obtient généralement :
 * - > 0.8 : très similaires
 * - 0.6-0.8 : liés
 * - < 0.5 : peu de relation
 */
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must have the same length');
  }

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

// ============================================
// EXPÉRIENCES
// ============================================

async function runExperiments() {
  console.log('🧪 EXPÉRIENCE 1: Comprendre les Embeddings\n');
  console.log('='.repeat(60));

  // ----------------------------------------
  // Test 1: Phrases similaires vs différentes
  // ----------------------------------------
  console.log('\n📊 TEST 1: Similarité sémantique\n');

  const sentences = [
    'Le chat dort sur le canapé',
    'Le félin sommeille sur le sofa', // Synonymes → devrait être très similaire
    'Python est un langage de programmation', // Sujet différent → devrait être éloigné
    'Le chien joue dans le jardin', // Même structure, sujet proche → moyennement similaire
  ];

  console.log('Phrases à comparer:');
  sentences.forEach((s, i) => console.log(`  ${i + 1}. "${s}"`));
  console.log();

  // Générer tous les embeddings en une requête
  const embeddings = await getEmbeddings(sentences);

  console.log(`✅ Embeddings générés (${embeddings[0].length} dimensions chacun)\n`);

  // Calculer la matrice de similarité
  console.log('Matrice de similarité:');
  console.log('(1.00 = identique, 0.00 = aucune relation)\n');

  // En-tête
  console.log('        ' + sentences.map((_, i) => `  [${i + 1}]  `).join(''));

  for (let i = 0; i < sentences.length; i++) {
    let row = `  [${i + 1}]   `;
    for (let j = 0; j < sentences.length; j++) {
      const sim = cosineSimilarity(embeddings[i], embeddings[j]);
      row += ` ${sim.toFixed(2)}  `;
    }
    console.log(row);
  }

  // ----------------------------------------
  // Test 2: Visualiser les dimensions
  // ----------------------------------------
  console.log('\n📊 TEST 2: Visualiser un embedding\n');

  const sampleEmbedding = embeddings[0];
  console.log(`Embedding de "${sentences[0]}":`);
  console.log(`  - Nombre de dimensions: ${sampleEmbedding.length}`);
  console.log(`  - Premières valeurs: [${sampleEmbedding.slice(0, 5).map((v) => v.toFixed(4)).join(', ')}, ...]`);
  console.log(`  - Min: ${Math.min(...sampleEmbedding).toFixed(4)}`);
  console.log(`  - Max: ${Math.max(...sampleEmbedding).toFixed(4)}`);
  console.log(`  - Moyenne: ${(sampleEmbedding.reduce((a, b) => a + b, 0) / sampleEmbedding.length).toFixed(4)}`);

  // ----------------------------------------
  // Test 3: Recherche par similarité
  // ----------------------------------------
  console.log('\n📊 TEST 3: Recherche par similarité\n');

  const query = 'Mon animal de compagnie se repose';
  console.log(`Requête: "${query}"\n`);

  const queryEmbedding = await getEmbedding(query);

  const similarities = sentences.map((sentence, i) => ({
    sentence,
    similarity: cosineSimilarity(queryEmbedding, embeddings[i]),
  }));

  // Trier par similarité décroissante
  similarities.sort((a, b) => b.similarity - a.similarity);

  console.log('Résultats (triés par pertinence):');
  similarities.forEach((item, i) => {
    const bar = '█'.repeat(Math.round(item.similarity * 20));
    console.log(`  ${i + 1}. [${item.similarity.toFixed(3)}] ${bar}`);
    console.log(`     "${item.sentence}"`);
  });

  // ----------------------------------------
  // Conclusion
  // ----------------------------------------
  console.log('\n' + '='.repeat(60));
  console.log('📝 CE QUE TU AS APPRIS:\n');
  console.log('1. Un embedding transforme du texte en vecteur de nombres');
  console.log('2. La similarité cosinus mesure la proximité sémantique');
  console.log('3. Des phrases synonymes ont des embeddings proches');
  console.log('4. On peut faire de la recherche sémantique avec ces vecteurs');
  console.log('\n➡️  Prochaine étape: Stocker ces vecteurs dans Qdrant');
  console.log('   Exécute: pnpm experiment:qdrant');
}

// ============================================
// POINT D'ENTRÉE
// ============================================

runExperiments().catch((error) => {
  console.error('❌ Erreur:', error.message);
  if (error.message.includes('API key')) {
    console.log('\n💡 As-tu configuré OPENAI_API_KEY dans ton .env ?');
    console.log('   Copie .env.example vers .env et ajoute ta clé API');
  }
  process.exit(1);
});
