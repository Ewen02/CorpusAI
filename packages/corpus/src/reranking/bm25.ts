/**
 * BM25 (Best Matching 25) - Algorithme de ranking lexical.
 *
 * Calcule la pertinence d'un document par rapport à une requête
 * basée sur la fréquence des termes (TF) et la fréquence inverse
 * des documents (IDF), avec normalisation par longueur du document.
 *
 * Paramètres:
 * - k1: Saturation de la fréquence des termes (défaut: 1.5)
 * - b: Facteur de normalisation par longueur (défaut: 0.75)
 *
 * Score BM25 = Σ IDF(qi) * (f(qi,D) * (k1 + 1)) / (f(qi,D) + k1 * (1 - b + b * |D|/avgdl))
 */
export class BM25 {
  private readonly k1: number;
  private readonly b: number;
  private readonly idf: Map<string, number> = new Map();
  private readonly avgDocLength: number;
  private readonly docLengths: number[];
  private readonly tokenizedDocs: string[][];
  /** Pre-computed term frequencies for each document (avoids recalculating on each score call) */
  private readonly termFreqs: Map<string, number>[];

  /**
   * Initialise BM25 avec un corpus de documents.
   * @param documents - Liste des textes du corpus
   * @param k1 - Paramètre de saturation TF (défaut: 1.5)
   * @param b - Paramètre de normalisation longueur (défaut: 0.75)
   */
  constructor(documents: string[], k1 = 1.5, b = 0.75) {
    this.k1 = k1;
    this.b = b;

    // Tokenize tous les documents
    this.tokenizedDocs = documents.map((d) => this.tokenize(d));
    this.docLengths = this.tokenizedDocs.map((d) => d.length);

    // Calcul de la longueur moyenne
    const totalLength = this.docLengths.reduce((a, b) => a + b, 0);
    this.avgDocLength = documents.length > 0 ? totalLength / documents.length : 1;

    // Précalculer IDF pour tous les termes
    this.computeIDF();

    // Pre-compute term frequencies for each document
    this.termFreqs = this.tokenizedDocs.map((doc) => {
      const freq = new Map<string, number>();
      for (const term of doc) {
        freq.set(term, (freq.get(term) || 0) + 1);
      }
      return freq;
    });
  }

  /**
   * Tokenize un texte en liste de termes.
   * - Convertit en minuscules
   * - Supprime la ponctuation
   * - Filtre les termes trop courts (< 2 caractères)
   */
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s\u00C0-\u017F]/g, ' ') // Préserve les accents
      .split(/\s+/)
      .filter((t) => t.length > 1);
  }

  /**
   * Calcule l'IDF (Inverse Document Frequency) pour chaque terme.
   * IDF = log((N - n(t) + 0.5) / (n(t) + 0.5) + 1)
   * où N = nombre de documents, n(t) = nombre de documents contenant t
   */
  private computeIDF(): void {
    const docCount = this.tokenizedDocs.length;
    if (docCount === 0) return;

    const termDocCounts = new Map<string, number>();

    // Compter le nombre de documents contenant chaque terme
    for (const doc of this.tokenizedDocs) {
      const uniqueTerms = new Set(doc);
      for (const term of uniqueTerms) {
        termDocCounts.set(term, (termDocCounts.get(term) || 0) + 1);
      }
    }

    // Calculer IDF avec smoothing
    for (const [term, count] of termDocCounts) {
      const idf = Math.log((docCount - count + 0.5) / (count + 0.5) + 1);
      this.idf.set(term, idf);
    }
  }

  /**
   * Calcule le score BM25 brut pour un document.
   * @param query - Requête utilisateur
   * @param documentIndex - Index du document dans le corpus
   * @returns Score BM25 (non borné, typiquement 0-20+)
   */
  score(query: string, documentIndex: number): number {
    if (documentIndex < 0 || documentIndex >= this.tokenizedDocs.length) {
      return 0;
    }

    const queryTerms = this.tokenize(query);
    const docLength = this.docLengths[documentIndex]!;

    // Use pre-computed term frequencies
    const termFreq = this.termFreqs[documentIndex]!;

    let totalScore = 0;

    for (const term of queryTerms) {
      const tf = termFreq.get(term) || 0;
      const idf = this.idf.get(term) || 0;

      if (tf === 0 || idf === 0) continue;

      // Formule BM25
      const numerator = tf * (this.k1 + 1);
      const denominator =
        tf + this.k1 * (1 - this.b + this.b * (docLength / this.avgDocLength));

      totalScore += idf * (numerator / denominator);
    }

    return totalScore;
  }

  /**
   * Calcule le score BM25 normalisé entre 0 et 1.
   * Utilise une fonction sigmoïde pour mapper les scores bruts.
   * @param query - Requête utilisateur
   * @param documentIndex - Index du document dans le corpus
   * @returns Score normalisé [0, 1]
   */
  scoreNormalized(query: string, documentIndex: number): number {
    const rawScore = this.score(query, documentIndex);

    // Sigmoïde avec facteur d'échelle pour mapper vers [0, 1]
    // Le facteur 5 permet une bonne distribution pour des scores BM25 typiques
    return 1 / (1 + Math.exp(-rawScore / 5));
  }

  /**
   * Retourne les scores pour tous les documents.
   * @param query - Requête utilisateur
   * @returns Tableau de scores normalisés
   */
  scoreAll(query: string): number[] {
    return this.tokenizedDocs.map((_, i) => this.scoreNormalized(query, i));
  }
}
