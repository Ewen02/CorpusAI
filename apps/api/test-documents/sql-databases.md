# Guide SQL et Bases de Données

## Introduction

SQL (Structured Query Language) est le langage standard pour interagir avec les bases de données relationnelles. Créé dans les années 1970 chez IBM, SQL permet de créer, lire, mettre à jour et supprimer des données (opérations CRUD), ainsi que de gérer la structure des bases de données.

Les bases de données relationnelles organisent les données en tables liées entre elles par des clés. Les systèmes de gestion de bases de données (SGBD) populaires incluent PostgreSQL, MySQL, SQLite, SQL Server et Oracle.

---

## Concepts Fondamentaux

### Structure d'une base de données

- **Database** : conteneur pour toutes les tables et objets
- **Table** : collection de lignes et colonnes (comme un tableau Excel)
- **Column** : attribut/champ avec un type de données
- **Row** : enregistrement/ligne de données
- **Primary Key** : identifiant unique d'une ligne
- **Foreign Key** : référence vers une clé primaire d'une autre table

### Types de données courants

```sql
-- Numériques
INTEGER, INT       -- Entier
BIGINT             -- Grand entier
DECIMAL(10,2)      -- Décimal précis
FLOAT, REAL        -- Nombre flottant

-- Texte
VARCHAR(255)       -- Chaîne variable (max 255)
TEXT               -- Texte long
CHAR(10)           -- Chaîne fixe

-- Date/Temps
DATE               -- Date (YYYY-MM-DD)
TIME               -- Heure (HH:MM:SS)
TIMESTAMP          -- Date + heure
DATETIME           -- Date + heure

-- Autres
BOOLEAN            -- true/false
UUID               -- Identifiant unique
JSON, JSONB        -- Données JSON (PostgreSQL)
```

---

## SELECT : Lire des Données

### Syntaxe de base

```sql
-- Sélectionner toutes les colonnes
SELECT * FROM users;

-- Sélectionner des colonnes spécifiques
SELECT first_name, last_name, email FROM users;

-- Alias de colonnes
SELECT first_name AS prenom, last_name AS nom FROM users;

-- Alias de tables
SELECT u.first_name, u.email FROM users u;
```

### Clause WHERE : Filtrage

```sql
-- Comparaisons
SELECT * FROM users WHERE age > 18;
SELECT * FROM users WHERE age >= 18 AND age <= 65;
SELECT * FROM users WHERE status = 'active';
SELECT * FROM users WHERE status != 'deleted';

-- BETWEEN
SELECT * FROM orders WHERE created_at BETWEEN '2024-01-01' AND '2024-12-31';

-- IN
SELECT * FROM users WHERE country IN ('France', 'Belgium', 'Switzerland');

-- NULL
SELECT * FROM users WHERE phone IS NULL;
SELECT * FROM users WHERE phone IS NOT NULL;

-- LIKE (recherche de motifs)
SELECT * FROM users WHERE email LIKE '%@gmail.com';  -- Se termine par
SELECT * FROM users WHERE name LIKE 'Jean%';         -- Commence par
SELECT * FROM users WHERE name LIKE '%ar%';          -- Contient
SELECT * FROM users WHERE code LIKE 'A_B';           -- _ = un caractère

-- Opérateurs logiques
SELECT * FROM users
WHERE (country = 'France' OR country = 'Belgium')
AND status = 'active';
```

### ORDER BY : Tri

```sql
-- Tri ascendant (par défaut)
SELECT * FROM users ORDER BY last_name;
SELECT * FROM users ORDER BY created_at ASC;

-- Tri descendant
SELECT * FROM users ORDER BY created_at DESC;

-- Tri multiple
SELECT * FROM users ORDER BY country ASC, last_name ASC;

-- Tri par position de colonne
SELECT first_name, last_name FROM users ORDER BY 2, 1;
```

### LIMIT et OFFSET : Pagination

```sql
-- Limiter le nombre de résultats
SELECT * FROM users LIMIT 10;

-- Pagination (page 2, 10 éléments par page)
SELECT * FROM users LIMIT 10 OFFSET 10;

-- PostgreSQL : syntaxe alternative
SELECT * FROM users OFFSET 10 ROWS FETCH NEXT 10 ROWS ONLY;
```

### DISTINCT : Valeurs uniques

```sql
-- Valeurs uniques d'une colonne
SELECT DISTINCT country FROM users;

-- Combinaisons uniques
SELECT DISTINCT country, city FROM users;

-- Compter les valeurs uniques
SELECT COUNT(DISTINCT country) FROM users;
```

---

## Jointures (JOIN)

### Qu'est-ce qu'une jointure ?

Une jointure combine des lignes de plusieurs tables basées sur une condition (généralement l'égalité des clés).

### INNER JOIN

Retourne uniquement les lignes qui ont une correspondance dans les deux tables.

```sql
SELECT users.name, orders.total
FROM users
INNER JOIN orders ON users.id = orders.user_id;

-- Syntaxe alternative avec alias
SELECT u.name, o.total
FROM users u
JOIN orders o ON u.id = o.user_id;
```

### LEFT JOIN (LEFT OUTER JOIN)

Retourne toutes les lignes de la table de gauche, même sans correspondance à droite.

```sql
-- Tous les utilisateurs, avec ou sans commandes
SELECT u.name, o.total
FROM users u
LEFT JOIN orders o ON u.id = o.user_id;

-- Utilisateurs SANS commandes
SELECT u.name
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE o.id IS NULL;
```

### RIGHT JOIN (RIGHT OUTER JOIN)

Retourne toutes les lignes de la table de droite, même sans correspondance à gauche.

```sql
SELECT u.name, o.total
FROM users u
RIGHT JOIN orders o ON u.id = o.user_id;
```

### FULL OUTER JOIN

Retourne toutes les lignes des deux tables, avec NULL où il n'y a pas de correspondance.

```sql
SELECT u.name, o.total
FROM users u
FULL OUTER JOIN orders o ON u.id = o.user_id;
```

### CROSS JOIN

Produit cartésien : chaque ligne de la première table avec chaque ligne de la seconde.

```sql
SELECT colors.name, sizes.name
FROM colors
CROSS JOIN sizes;
```

### Self JOIN

Une table jointe avec elle-même.

```sql
-- Trouver les employés et leurs managers
SELECT e.name AS employee, m.name AS manager
FROM employees e
LEFT JOIN employees m ON e.manager_id = m.id;
```

### Jointures multiples

```sql
SELECT
    u.name,
    o.order_number,
    p.name AS product_name
FROM users u
JOIN orders o ON u.id = o.user_id
JOIN order_items oi ON o.id = oi.order_id
JOIN products p ON oi.product_id = p.id
WHERE o.status = 'completed';
```

---

## Agrégation et Groupement

### Fonctions d'agrégation

```sql
-- Compter les lignes
SELECT COUNT(*) FROM users;
SELECT COUNT(email) FROM users;  -- Ignore les NULL
SELECT COUNT(DISTINCT country) FROM users;

-- Somme
SELECT SUM(total) FROM orders;

-- Moyenne
SELECT AVG(price) FROM products;

-- Minimum et maximum
SELECT MIN(price), MAX(price) FROM products;

-- Concaténer (PostgreSQL)
SELECT STRING_AGG(name, ', ') FROM users;
```

### GROUP BY

Regroupe les lignes par valeurs communes.

```sql
-- Nombre de commandes par utilisateur
SELECT user_id, COUNT(*) AS order_count
FROM orders
GROUP BY user_id;

-- Total des ventes par pays
SELECT country, SUM(total) AS total_sales
FROM orders
JOIN users ON orders.user_id = users.id
GROUP BY country;

-- Grouper par plusieurs colonnes
SELECT country, city, COUNT(*) AS user_count
FROM users
GROUP BY country, city;

-- Avec l'année
SELECT
    EXTRACT(YEAR FROM created_at) AS year,
    COUNT(*) AS orders
FROM orders
GROUP BY EXTRACT(YEAR FROM created_at);
```

### HAVING : Filtrer les groupes

HAVING filtre après l'agrégation (contrairement à WHERE qui filtre avant).

```sql
-- Utilisateurs avec plus de 5 commandes
SELECT user_id, COUNT(*) AS order_count
FROM orders
GROUP BY user_id
HAVING COUNT(*) > 5;

-- Pays avec un total de ventes > 10000
SELECT country, SUM(total) AS total_sales
FROM orders
JOIN users ON orders.user_id = users.id
GROUP BY country
HAVING SUM(total) > 10000;
```

---

## Sous-requêtes

### Dans le WHERE

```sql
-- Utilisateurs qui ont passé au moins une commande
SELECT * FROM users
WHERE id IN (SELECT DISTINCT user_id FROM orders);

-- Produits plus chers que la moyenne
SELECT * FROM products
WHERE price > (SELECT AVG(price) FROM products);

-- Avec EXISTS
SELECT * FROM users u
WHERE EXISTS (
    SELECT 1 FROM orders o
    WHERE o.user_id = u.id
);
```

### Dans le FROM

```sql
-- Sous-requête comme table temporaire
SELECT avg_orders.user_id, avg_orders.avg_total
FROM (
    SELECT user_id, AVG(total) AS avg_total
    FROM orders
    GROUP BY user_id
) AS avg_orders
WHERE avg_orders.avg_total > 100;
```

### Dans le SELECT

```sql
-- Sous-requête scalaire
SELECT
    name,
    (SELECT COUNT(*) FROM orders WHERE orders.user_id = users.id) AS order_count
FROM users;
```

### CTE (Common Table Expressions)

```sql
-- Plus lisible que les sous-requêtes imbriquées
WITH active_users AS (
    SELECT * FROM users WHERE status = 'active'
),
recent_orders AS (
    SELECT * FROM orders WHERE created_at > NOW() - INTERVAL '30 days'
)
SELECT au.name, COUNT(ro.id) AS recent_order_count
FROM active_users au
LEFT JOIN recent_orders ro ON au.id = ro.user_id
GROUP BY au.id, au.name;
```

---

## Index

### Qu'est-ce qu'un index ?

Un index est une structure de données qui améliore la vitesse des opérations de lecture en échange d'espace de stockage et de performances d'écriture réduites.

### Créer des index

```sql
-- Index simple
CREATE INDEX idx_users_email ON users(email);

-- Index unique
CREATE UNIQUE INDEX idx_users_email_unique ON users(email);

-- Index composite (plusieurs colonnes)
CREATE INDEX idx_orders_user_date ON orders(user_id, created_at);

-- Index partiel (PostgreSQL)
CREATE INDEX idx_active_users ON users(email) WHERE status = 'active';

-- Supprimer un index
DROP INDEX idx_users_email;
```

### Quand créer un index ?

**Créez un index sur :**
- Les colonnes utilisées dans WHERE
- Les colonnes utilisées dans JOIN
- Les colonnes utilisées dans ORDER BY
- Les clés étrangères

**Évitez les index sur :**
- Les petites tables
- Les colonnes rarement utilisées dans les requêtes
- Les colonnes fréquemment mises à jour
- Les colonnes avec peu de valeurs distinctes (ex: boolean)

### Impact sur les performances

```sql
-- Analyser le plan d'exécution
EXPLAIN SELECT * FROM users WHERE email = 'test@example.com';

-- Avec détails (PostgreSQL)
EXPLAIN ANALYZE SELECT * FROM users WHERE email = 'test@example.com';
```

---

## Transactions

### Propriétés ACID

- **Atomicity** : Tout ou rien
- **Consistency** : La base reste dans un état valide
- **Isolation** : Les transactions sont isolées les unes des autres
- **Durability** : Les changements sont permanents

### Syntaxe des transactions

```sql
-- Démarrer une transaction
BEGIN;
-- ou
START TRANSACTION;

-- Valider les changements
COMMIT;

-- Annuler les changements
ROLLBACK;

-- Exemple complet
BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
UPDATE accounts SET balance = balance + 100 WHERE id = 2;
-- Si tout va bien
COMMIT;
-- Sinon
-- ROLLBACK;
```

### Points de sauvegarde

```sql
BEGIN;
INSERT INTO orders (user_id, total) VALUES (1, 100);

SAVEPOINT order_created;

INSERT INTO order_items (order_id, product_id) VALUES (1, 1);
-- Erreur ! Annuler seulement l'insertion des items
ROLLBACK TO order_created;

-- La commande existe toujours
COMMIT;
```

### Niveaux d'isolation

```sql
-- Définir le niveau d'isolation
SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;
SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
```

---

## Modification des Données

### INSERT

```sql
-- Insérer une ligne
INSERT INTO users (name, email) VALUES ('Alice', 'alice@example.com');

-- Insérer plusieurs lignes
INSERT INTO users (name, email) VALUES
    ('Bob', 'bob@example.com'),
    ('Charlie', 'charlie@example.com');

-- Insérer depuis une requête
INSERT INTO users_backup (name, email)
SELECT name, email FROM users WHERE status = 'active';

-- Avec RETURNING (PostgreSQL)
INSERT INTO users (name, email)
VALUES ('Dave', 'dave@example.com')
RETURNING id, name;
```

### UPDATE

```sql
-- Mettre à jour des lignes
UPDATE users SET status = 'inactive' WHERE last_login < '2023-01-01';

-- Mettre à jour plusieurs colonnes
UPDATE products
SET price = price * 1.1, updated_at = NOW()
WHERE category = 'electronics';

-- Avec jointure
UPDATE orders o
SET status = 'cancelled'
FROM users u
WHERE o.user_id = u.id AND u.status = 'deleted';
```

### DELETE

```sql
-- Supprimer des lignes
DELETE FROM users WHERE status = 'deleted';

-- Supprimer toutes les lignes (attention !)
DELETE FROM logs;

-- TRUNCATE : plus rapide, réinitialise les séquences
TRUNCATE TABLE logs;
```

### UPSERT (INSERT ... ON CONFLICT)

```sql
-- PostgreSQL
INSERT INTO users (email, name)
VALUES ('alice@example.com', 'Alice')
ON CONFLICT (email)
DO UPDATE SET name = EXCLUDED.name;

-- MySQL
INSERT INTO users (email, name)
VALUES ('alice@example.com', 'Alice')
ON DUPLICATE KEY UPDATE name = VALUES(name);
```

---

## FAQ - Questions Fréquentes

### Quelle différence entre WHERE et HAVING ?

- **WHERE** : filtre les lignes AVANT l'agrégation
- **HAVING** : filtre les groupes APRÈS l'agrégation

```sql
-- WHERE filtre les commandes de plus de 50€
SELECT user_id, SUM(total)
FROM orders
WHERE total > 50
GROUP BY user_id;

-- HAVING filtre les utilisateurs avec un total > 500€
SELECT user_id, SUM(total)
FROM orders
GROUP BY user_id
HAVING SUM(total) > 500;
```

### Comment optimiser une requête lente ?

1. **Utiliser EXPLAIN ANALYZE** pour comprendre le plan d'exécution
2. **Ajouter des index** sur les colonnes filtrées/jointes
3. **Éviter SELECT *** : sélectionner uniquement les colonnes nécessaires
4. **Limiter les résultats** avec LIMIT
5. **Optimiser les jointures** : joindre sur des colonnes indexées
6. **Éviter les fonctions dans WHERE** : `WHERE YEAR(date) = 2024` → `WHERE date >= '2024-01-01'`

```sql
-- Avant (lent)
SELECT * FROM orders WHERE YEAR(created_at) = 2024;

-- Après (rapide)
SELECT * FROM orders
WHERE created_at >= '2024-01-01' AND created_at < '2025-01-01';
```

### Quand utiliser un index composite ?

Un index composite (plusieurs colonnes) est utile quand :
- Vous filtrez souvent sur ces colonnes ensemble
- L'ordre des colonnes dans l'index correspond à l'ordre d'utilisation

```sql
-- Si vous faites souvent cette requête :
SELECT * FROM orders WHERE user_id = 1 AND status = 'pending';

-- Créez cet index :
CREATE INDEX idx_orders_user_status ON orders(user_id, status);

-- L'index sera utilisé pour :
-- WHERE user_id = 1
-- WHERE user_id = 1 AND status = 'pending'

-- Mais PAS pour :
-- WHERE status = 'pending'  (la première colonne n'est pas utilisée)
```

### Comment gérer les NULL correctement ?

```sql
-- Comparaison avec NULL
column = NULL     -- FAUX ! Ne fonctionne pas
column IS NULL    -- Correct
column IS NOT NULL

-- Fonctions utiles
COALESCE(column, 'default')  -- Première valeur non-null
NULLIF(a, b)                 -- NULL si a = b, sinon a

-- NULL dans les agrégations
COUNT(*)        -- Compte toutes les lignes
COUNT(column)   -- Ignore les NULL
```

---

## Ressources

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [MySQL Documentation](https://dev.mysql.com/doc/)
- [SQLite Documentation](https://www.sqlite.org/docs.html)
- [SQL Tutorial (W3Schools)](https://www.w3schools.com/sql/)
- [Use The Index, Luke (optimisation)](https://use-the-index-luke.com/)
- [SQLZoo (exercices interactifs)](https://sqlzoo.net/)
