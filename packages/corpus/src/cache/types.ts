/**
 * Interface abstraite pour un service de cache.
 * Permet d'utiliser différents backends (Redis, Memcached, in-memory, etc.)
 */
export interface CacheService {
  /**
   * Récupère une valeur du cache.
   * @param key - Clé de cache
   * @returns Valeur ou null si non trouvée
   */
  get(key: string): Promise<string | null>;

  /**
   * Stocke une valeur dans le cache.
   * @param key - Clé de cache
   * @param value - Valeur à stocker
   * @param ttlSeconds - Durée de vie en secondes (optionnel)
   */
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;

  /**
   * Récupère plusieurs valeurs du cache.
   * @param keys - Liste des clés
   * @returns Liste des valeurs (null pour les clés manquantes)
   */
  mget(keys: string[]): Promise<(string | null)[]>;

  /**
   * Stocke plusieurs valeurs dans le cache.
   * @param entries - Liste des paires clé/valeur
   * @param ttlSeconds - Durée de vie en secondes (optionnel)
   */
  mset(entries: Array<{ key: string; value: string }>, ttlSeconds?: number): Promise<void>;
}
