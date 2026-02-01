/**
 * ============================================
 * EXPERIMENT 3: CHUNKING - DÉCOUPAGE DE DOCUMENTS
 * ============================================
 *
 * Le chunking est CRITIQUE pour la qualité du RAG.
 * Un mauvais découpage = des réponses hors sujet.
 *
 * Dans ce script, tu vas :
 * 1. Comparer différentes stratégies de chunking basiques
 * 2. Comprendre l'importance de l'overlap
 * 3. Tester le Document-Aware chunking (Markdown)
 * 4. Tester le Sliding Window
 * 5. Tester le Semantic chunking (avec embeddings)
 * 6. Voir le Parent-Child chunking
 */

import 'dotenv/config';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ============================================
// DOCUMENT EXEMPLE (article sur TypeScript)
// ============================================

const SAMPLE_DOCUMENT = `# Introduction à TypeScript

TypeScript est un langage de programmation développé par Microsoft. Il a été créé en 2012 par Anders Hejlsberg, qui est également le créateur de C# et Turbo Pascal.

## Pourquoi TypeScript ?

JavaScript est un langage dynamique, ce qui signifie que les types sont vérifiés à l'exécution. Cela peut conduire à des erreurs difficiles à détecter. TypeScript ajoute un système de types statiques qui permet de détecter les erreurs à la compilation.

Les avantages principaux sont :
- Détection précoce des erreurs
- Meilleure documentation du code
- Autocomplétion améliorée dans les IDE
- Refactoring plus sûr

## Le système de types

TypeScript propose plusieurs types de base : string, number, boolean, array, object, et any. Le type any désactive la vérification de types et devrait être évité.

Les interfaces permettent de définir la structure des objets :

interface User {
  id: number;
  name: string;
  email: string;
}

## Compilation

Le code TypeScript est compilé en JavaScript via le compilateur tsc. La configuration se fait dans le fichier tsconfig.json qui définit les options de compilation.

## Adoption

TypeScript est maintenant utilisé par de nombreuses entreprises : Microsoft, Google, Airbnb, Slack, et bien d'autres. Les frameworks modernes comme Angular, Vue 3, et Next.js supportent TypeScript nativement.

## Conclusion

TypeScript améliore significativement l'expérience de développement JavaScript. Il est devenu un standard dans l'industrie pour les projets de moyenne et grande taille.`;

// ============================================
// STRATÉGIES DE CHUNKING
// ============================================

/**
 * Stratégie 1: Fixed Size (naïf)
 * Coupe le texte tous les X caractères
 */
function chunkByFixedSize(text: string, chunkSize: number): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * Stratégie 2: Separator
 * Coupe par séparateur (paragraphes)
 */
function chunkBySeparator(
  text: string,
  separator: string,
  maxSize: number
): string[] {
  const parts = text.split(separator);
  const chunks: string[] = [];
  let currentChunk = '';

  for (const part of parts) {
    const potential = currentChunk + (currentChunk ? separator : '') + part;

    if (potential.length > maxSize && currentChunk) {
      chunks.push(currentChunk.trim());
      currentChunk = part;
    } else {
      currentChunk = potential;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

/**
 * Stratégie 3: Recursive (recommandé)
 * Essaie plusieurs séparateurs en cascade
 */
function chunkRecursive(
  text: string,
  maxSize: number,
  separators = ['\n\n', '\n', '. ', ' ']
): string[] {
  // Si le texte est assez petit, on le retourne tel quel
  if (text.length <= maxSize) {
    return [text.trim()].filter((c) => c.length > 0);
  }

  // Essayer chaque séparateur
  for (const separator of separators) {
    if (text.includes(separator)) {
      const parts = text.split(separator);
      const chunks: string[] = [];
      let currentChunk = '';

      for (const part of parts) {
        const potential = currentChunk + (currentChunk ? separator : '') + part;

        if (potential.length > maxSize && currentChunk) {
          // Récursion sur le chunk actuel avec le séparateur suivant
          const subChunks = chunkRecursive(
            currentChunk,
            maxSize,
            separators.slice(separators.indexOf(separator) + 1)
          );
          chunks.push(...subChunks);
          currentChunk = part;
        } else {
          currentChunk = potential;
        }
      }

      if (currentChunk.trim()) {
        const subChunks = chunkRecursive(
          currentChunk,
          maxSize,
          separators.slice(separators.indexOf(separator) + 1)
        );
        chunks.push(...subChunks);
      }

      return chunks.filter((c) => c.length > 0);
    }
  }

  // Aucun séparateur trouvé, on coupe brutalement
  return chunkByFixedSize(text, maxSize);
}

/**
 * Stratégie 4: Avec Overlap
 * Ajoute un chevauchement entre chunks
 */
function chunkWithOverlap(
  text: string,
  chunkSize: number,
  overlap: number
): string[] {
  const baseChunks = chunkRecursive(text, chunkSize);
  const overlappedChunks: string[] = [];

  for (let i = 0; i < baseChunks.length; i++) {
    let chunk = baseChunks[i];

    // Ajouter le début du chunk suivant (overlap)
    if (i < baseChunks.length - 1) {
      const nextChunk = baseChunks[i + 1];
      const overlapText = nextChunk.slice(0, overlap);
      chunk = chunk + ' [...] ' + overlapText;
    }

    overlappedChunks.push(chunk);
  }

  return overlappedChunks;
}

/**
 * Stratégie 5: Document-Aware (Markdown)
 * Respecte la structure du document
 */
function chunkMarkdown(text: string, maxSize = 800): string[] {
  // Split par titres (##, ###)
  const sections = text.split(/(?=^#{1,3} )/gm);

  const chunks: string[] = [];
  for (const section of sections) {
    if (section.trim().length === 0) continue;

    if (section.length <= maxSize) {
      chunks.push(section.trim());
    } else {
      // Section trop grande → recursive chunking
      chunks.push(...chunkRecursive(section, maxSize));
    }
  }

  return chunks.filter((c) => c.length > 0);
}

/**
 * Stratégie 6: Sliding Window
 * Fenêtre glissante avec petit pas
 */
function slidingWindow(
  text: string,
  windowSize: number,
  step: number
): string[] {
  const chunks: string[] = [];

  for (let i = 0; i < text.length; i += step) {
    const chunk = text.slice(i, i + windowSize);
    chunks.push(chunk);

    if (i + windowSize >= text.length) break;
  }

  return chunks;
}

/**
 * Stratégie 7: Semantic Chunking
 * Détecte les changements de sujet via embeddings
 */
async function getEmbeddings(texts: string[]): Promise<number[][]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: texts,
  });
  return response.data.map((item) => item.embedding);
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    const aVal = a[i] ?? 0;
    const bVal = b[i] ?? 0;
    dot += aVal * bVal;
    normA += aVal * aVal;
    normB += bVal * bVal;
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function chunkSemantic(
  text: string,
  threshold = 0.7
): Promise<string[]> {
  // 1. Découper en phrases
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .filter((s) => s.trim().length > 10);

  if (sentences.length < 2) return [text];

  // 2. Calculer les embeddings
  console.log(`   ⏳ Calcul des embeddings pour ${sentences.length} phrases...`);
  const embeddings = await getEmbeddings(sentences);

  // 3. Détecter les changements de sujet
  const chunks: string[] = [];
  let currentChunk: string = sentences[0] ?? '';

  for (let i = 1; i < sentences.length; i++) {
    const prevEmb = embeddings[i - 1];
    const currEmb = embeddings[i];
    const currSentence = sentences[i];

    if (!prevEmb || !currEmb || !currSentence) continue;

    const similarity = cosineSimilarity(prevEmb, currEmb);

    if (similarity < threshold) {
      // Changement de sujet détecté → nouveau chunk
      chunks.push(currentChunk.trim());
      currentChunk = currSentence;
    } else {
      currentChunk += ' ' + currSentence;
    }
  }

  if (currentChunk.trim()) chunks.push(currentChunk.trim());
  return chunks;
}

/**
 * Stratégie 8: Parent-Child Chunking
 * Chunks hiérarchiques pour meilleur contexte LLM
 */
interface ParentChildChunk {
  parentId: string;
  parentText: string;
  children: {
    id: string;
    text: string;
    position: number;
  }[];
}

function chunkParentChild(text: string): ParentChildChunk[] {
  // 1. Découper en sections (parents) par double saut de ligne
  const sections = text.split(/\n\n+/).filter((s) => s.trim().length > 0);

  return sections.map((section, i) => {
    const parentId = `parent-${i}`;

    // 2. Découper chaque section en enfants
    const childChunks = chunkRecursive(section, 300);

    return {
      parentId,
      parentText: section,
      children: childChunks.map((child, j) => ({
        id: `${parentId}-child-${j}`,
        text: child,
        position: j,
      })),
    };
  });
}

// ============================================
// UTILITAIRES
// ============================================

function printChunks(chunks: string[], title: string, showFull = false): void {
  console.log(`\n📄 ${title}`);
  console.log(`   Nombre de chunks: ${chunks.length}`);
  console.log(
    `   Taille moyenne: ${Math.round(chunks.reduce((a, b) => a + b.length, 0) / chunks.length)} caractères`
  );
  console.log(
    `   Min: ${Math.min(...chunks.map((c) => c.length))} | Max: ${Math.max(...chunks.map((c) => c.length))}`
  );
  console.log('');

  chunks.forEach((chunk, i) => {
    const preview = showFull ? chunk : chunk.slice(0, 60).replace(/\n/g, ' ');
    const truncated = !showFull && chunk.length > 60 ? '...' : '';
    console.log(`   ${i + 1}. [${chunk.length} chars] "${preview}${truncated}"`);
  });
}

function highlightProblem(chunk: string): string | null {
  // Détecter les coupures au milieu d'un mot ou d'une phrase
  if (chunk.endsWith(' ') || chunk.startsWith(' ')) {
    return 'Espaces en début/fin';
  }
  if (/[a-zA-Z]$/.test(chunk) && !/[.!?]$/.test(chunk)) {
    return 'Coupure au milieu d\'une phrase';
  }
  return null;
}

// ============================================
// EXPÉRIENCES
// ============================================

async function runExperiments() {
  console.log('🧪 EXPÉRIENCE 3: Chunking - Découpage de documents\n');
  console.log('='.repeat(60));

  console.log('\n📖 Document source:');
  console.log(`   Longueur: ${SAMPLE_DOCUMENT.length} caractères`);
  console.log(`   Paragraphes: ${SAMPLE_DOCUMENT.split('\n\n').length}`);
  console.log(`   Sections: ${(SAMPLE_DOCUMENT.match(/^##/gm) || []).length}`);

  // ----------------------------------------
  // Test 1: Fixed Size Chunking
  // ----------------------------------------
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 TEST 1: Fixed Size Chunking (400 caractères)\n');
  console.log('   ⚠️  Stratégie NAÏVE - Coupe sans respecter le texte\n');

  const fixedChunks = chunkByFixedSize(SAMPLE_DOCUMENT, 400);
  printChunks(fixedChunks, 'Résultat Fixed Size');

  // Montrer les problèmes
  console.log('\n   🔴 Problèmes détectés:');
  fixedChunks.forEach((chunk, i) => {
    const problem = highlightProblem(chunk);
    if (problem) {
      console.log(`      Chunk ${i + 1}: ${problem}`);
    }
  });

  // ----------------------------------------
  // Test 2: Separator Chunking
  // ----------------------------------------
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 TEST 2: Separator Chunking (\\n\\n, max 500)\n');
  console.log('   ✅ Respecte les paragraphes\n');

  const separatorChunks = chunkBySeparator(SAMPLE_DOCUMENT, '\n\n', 500);
  printChunks(separatorChunks, 'Résultat Separator');

  // ----------------------------------------
  // Test 3: Recursive Chunking
  // ----------------------------------------
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 TEST 3: Recursive Chunking (max 400)\n');
  console.log('   ✅ Essaie \\n\\n → \\n → . → espace\n');

  const recursiveChunks = chunkRecursive(SAMPLE_DOCUMENT, 400);
  printChunks(recursiveChunks, 'Résultat Recursive');

  // ----------------------------------------
  // Test 4: Avec Overlap
  // ----------------------------------------
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 TEST 4: Chunking avec Overlap (100 chars)\n');
  console.log('   ✅ Conserve le contexte entre chunks\n');

  const overlapChunks = chunkWithOverlap(SAMPLE_DOCUMENT, 400, 100);
  printChunks(overlapChunks, 'Résultat avec Overlap');

  // ----------------------------------------
  // Comparaison
  // ----------------------------------------
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 COMPARAISON DES STRATÉGIES\n');

  const strategies = [
    { name: 'Fixed Size', chunks: fixedChunks },
    { name: 'Separator', chunks: separatorChunks },
    { name: 'Recursive', chunks: recursiveChunks },
    { name: 'Overlap', chunks: overlapChunks },
  ];

  console.log(
    '   | Stratégie    | Chunks | Taille moy | Min   | Max   |'
  );
  console.log(
    '   |--------------|--------|------------|-------|-------|'
  );

  for (const { name, chunks } of strategies) {
    const avg = Math.round(
      chunks.reduce((a, b) => a + b.length, 0) / chunks.length
    );
    const min = Math.min(...chunks.map((c) => c.length));
    const max = Math.max(...chunks.map((c) => c.length));
    console.log(
      `   | ${name.padEnd(12)} | ${String(chunks.length).padStart(6)} | ${String(avg).padStart(10)} | ${String(min).padStart(5)} | ${String(max).padStart(5)} |`
    );
  }

  // ----------------------------------------
  // Démonstration du problème de contexte
  // ----------------------------------------
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 TEST 5: Problème de contexte sans overlap\n');

  const shortText =
    'TypeScript a été créé par Microsoft. Il est maintenant très populaire. Son créateur est Anders Hejlsberg.';

  console.log(`   Texte: "${shortText}"\n`);

  const noOverlap = chunkRecursive(shortText, 50);
  console.log('   Sans overlap:');
  noOverlap.forEach((c, i) => console.log(`     ${i + 1}. "${c}"`));

  console.log('\n   🔴 "Il" dans le chunk 2 = qui ?');
  console.log('   🔴 "Son" dans le chunk 3 = de qui ?');
  console.log('\n   → L\'overlap résout ce problème en répétant le contexte');

  // ----------------------------------------
  // Test 6: Document-Aware (Markdown)
  // ----------------------------------------
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 TEST 6: Document-Aware Chunking (Markdown)\n');
  console.log('   ✅ Respecte la structure du document (titres ##)\n');

  const markdownChunks = chunkMarkdown(SAMPLE_DOCUMENT, 600);
  printChunks(markdownChunks, 'Résultat Markdown-Aware');

  // ----------------------------------------
  // Test 7: Sliding Window
  // ----------------------------------------
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 TEST 7: Sliding Window (window=400, step=100)\n');
  console.log('   ✅ Maximise le recall avec chevauchement dense\n');

  const slidingChunks = slidingWindow(SAMPLE_DOCUMENT, 400, 100);
  console.log(`   Nombre de chunks: ${slidingChunks.length}`);
  console.log(`   (Beaucoup plus de chunks car step=100 au lieu de 400)`);
  console.log('\n   Premiers chunks:');
  slidingChunks.slice(0, 4).forEach((c, i) => {
    console.log(`   ${i + 1}. [${c.length} chars] "${c.slice(0, 50).replace(/\n/g, ' ')}..."`);
  });

  // ----------------------------------------
  // Test 8: Semantic Chunking
  // ----------------------------------------
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 TEST 8: Semantic Chunking (détection changement de sujet)\n');
  console.log('   ✅ Utilise les embeddings pour détecter les changements de sujet\n');

  const semanticChunks = await chunkSemantic(SAMPLE_DOCUMENT, 0.75);
  printChunks(semanticChunks, 'Résultat Semantic');

  // ----------------------------------------
  // Test 9: Parent-Child
  // ----------------------------------------
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 TEST 9: Parent-Child Chunking (hiérarchique)\n');
  console.log('   ✅ Deux niveaux: parent (contexte) + enfants (précis)\n');

  const parentChildResult = chunkParentChild(SAMPLE_DOCUMENT);
  console.log(`   Parents: ${parentChildResult.length}`);
  console.log(`   Enfants total: ${parentChildResult.reduce((a, p) => a + p.children.length, 0)}`);
  console.log('\n   Structure:');
  parentChildResult.slice(0, 3).forEach((parent, i) => {
    console.log(`   Parent ${i + 1}: [${parent.parentText.length} chars] "${parent.parentText.slice(0, 40).replace(/\n/g, ' ')}..."`);
    parent.children.forEach((child, j) => {
      console.log(`     └─ Child ${j + 1}: [${child.text.length} chars] "${child.text.slice(0, 30).replace(/\n/g, ' ')}..."`);
    });
  });

  // ----------------------------------------
  // Comparaison finale
  // ----------------------------------------
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 COMPARAISON COMPLÈTE\n');

  const allStrategies = [
    { name: 'Fixed Size', chunks: fixedChunks, quality: '⭐' },
    { name: 'Separator', chunks: separatorChunks, quality: '⭐⭐' },
    { name: 'Recursive', chunks: recursiveChunks, quality: '⭐⭐⭐' },
    { name: 'Overlap', chunks: overlapChunks, quality: '⭐⭐⭐' },
    { name: 'Markdown', chunks: markdownChunks, quality: '⭐⭐⭐⭐' },
    { name: 'Sliding', chunks: slidingChunks, quality: '⭐⭐⭐' },
    { name: 'Semantic', chunks: semanticChunks, quality: '⭐⭐⭐⭐' },
  ];

  console.log(
    '   | Stratégie    | Chunks | Taille moy | Qualité    |'
  );
  console.log(
    '   |--------------|--------|------------|------------|'
  );

  for (const { name, chunks, quality } of allStrategies) {
    const avg = Math.round(
      chunks.reduce((a, b) => a + b.length, 0) / chunks.length
    );
    console.log(
      `   | ${name.padEnd(12)} | ${String(chunks.length).padStart(6)} | ${String(avg).padStart(10)} | ${quality.padEnd(10)} |`
    );
  }

  // ----------------------------------------
  // Conclusion
  // ----------------------------------------
  console.log('\n' + '='.repeat(60));
  console.log('\n📝 CE QUE TU AS APPRIS:\n');
  console.log('1. Fixed Size coupe brutalement → ÉVITER');
  console.log('2. Separator respecte les paragraphes → MIEUX');
  console.log('3. Recursive essaie plusieurs niveaux → PRODUCTION STANDARD');
  console.log('4. Overlap conserve le contexte → INDISPENSABLE');
  console.log('5. Markdown-Aware respecte la structure → POUR DOCS MD');
  console.log('6. Sliding Window maximise le recall → RECHERCHE DENSE');
  console.log('7. Semantic détecte les changements de sujet → HAUTE QUALITÉ');
  console.log('8. Parent-Child offre précision + contexte → MEILLEUR POUR LLM');
  console.log('\n➡️  Prochaine étape: Pipeline RAG complet');
  console.log('   Exécute: pnpm experiment:rag');
}

// ============================================
// POINT D'ENTRÉE
// ============================================

runExperiments().catch((error) => {
  console.error('❌ Erreur:', error.message);
  process.exit(1);
});
