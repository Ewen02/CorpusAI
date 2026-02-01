# Guide API REST

## Introduction

REST (Representational State Transfer) est un style d'architecture pour concevoir des services web. Défini par Roy Fielding en 2000, REST utilise les protocoles standards du web (HTTP) pour permettre la communication entre systèmes de manière simple et scalable.

Une API REST expose des ressources (données) accessibles via des URLs, manipulables avec les méthodes HTTP standard. REST est stateless : chaque requête contient toutes les informations nécessaires, le serveur ne garde pas d'état de session.

---

## Principes REST

### Les 6 contraintes REST

**1. Architecture Client-Serveur**
- Séparation des responsabilités
- Le client gère l'interface utilisateur
- Le serveur gère le stockage et la logique métier

**2. Stateless (Sans état)**
- Chaque requête est indépendante
- Pas de session côté serveur
- Toute l'information nécessaire est dans la requête

**3. Cacheable**
- Les réponses peuvent être mises en cache
- Améliore les performances
- Headers de cache explicites

**4. Interface uniforme**
- Identification des ressources par URI
- Manipulation via les représentations
- Messages auto-descriptifs
- HATEOAS (Hypermedia as the Engine of Application State)

**5. Système en couches**
- Le client ne sait pas s'il communique avec le serveur final
- Permet d'ajouter des proxies, load balancers, etc.

**6. Code à la demande (optionnel)**
- Le serveur peut envoyer du code exécutable (JavaScript)

---

## Méthodes HTTP

### Les méthodes principales

| Méthode | Action | Idempotent | Safe |
|---------|--------|------------|------|
| GET | Lire une ressource | Oui | Oui |
| POST | Créer une ressource | Non | Non |
| PUT | Remplacer une ressource | Oui | Non |
| PATCH | Modifier partiellement | Non* | Non |
| DELETE | Supprimer une ressource | Oui | Non |

**Idempotent** : Plusieurs appels identiques produisent le même résultat
**Safe** : Ne modifie pas l'état du serveur

### GET - Lecture

```http
# Lister les utilisateurs
GET /api/users

# Obtenir un utilisateur spécifique
GET /api/users/123

# Avec paramètres de requête
GET /api/users?status=active&limit=10
```

### POST - Création

```http
POST /api/users
Content-Type: application/json

{
  "name": "Alice",
  "email": "alice@example.com"
}
```

Réponse :
```http
HTTP/1.1 201 Created
Location: /api/users/124
Content-Type: application/json

{
  "id": 124,
  "name": "Alice",
  "email": "alice@example.com",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

### PUT - Remplacement complet

```http
PUT /api/users/123
Content-Type: application/json

{
  "name": "Alice Martin",
  "email": "alice.martin@example.com",
  "status": "active"
}
```

PUT remplace entièrement la ressource. Si un champ est omis, il devient null.

### PATCH - Modification partielle

```http
PATCH /api/users/123
Content-Type: application/json

{
  "status": "inactive"
}
```

PATCH modifie uniquement les champs fournis.

### DELETE - Suppression

```http
DELETE /api/users/123
```

Réponse :
```http
HTTP/1.1 204 No Content
```

---

## Codes de Statut HTTP

### 2xx - Succès

| Code | Nom | Usage |
|------|-----|-------|
| 200 | OK | Requête réussie (GET, PUT, PATCH) |
| 201 | Created | Ressource créée (POST) |
| 204 | No Content | Succès sans contenu (DELETE) |

### 3xx - Redirection

| Code | Nom | Usage |
|------|-----|-------|
| 301 | Moved Permanently | URL changée définitivement |
| 302 | Found | Redirection temporaire |
| 304 | Not Modified | Ressource non modifiée (cache) |

### 4xx - Erreur client

| Code | Nom | Usage |
|------|-----|-------|
| 400 | Bad Request | Requête invalide |
| 401 | Unauthorized | Authentification requise |
| 403 | Forbidden | Accès interdit |
| 404 | Not Found | Ressource inexistante |
| 405 | Method Not Allowed | Méthode non supportée |
| 409 | Conflict | Conflit (ex: email déjà utilisé) |
| 422 | Unprocessable Entity | Validation échouée |
| 429 | Too Many Requests | Rate limit atteint |

### 5xx - Erreur serveur

| Code | Nom | Usage |
|------|-----|-------|
| 500 | Internal Server Error | Erreur serveur générique |
| 502 | Bad Gateway | Proxy/gateway a reçu une réponse invalide |
| 503 | Service Unavailable | Service indisponible |
| 504 | Gateway Timeout | Timeout du proxy/gateway |

---

## Design d'URL

### Bonnes pratiques

**1. Utiliser des noms, pas des verbes**
```
# Bon
GET /api/users
POST /api/users

# Mauvais
GET /api/getUsers
POST /api/createUser
```

**2. Utiliser le pluriel**
```
# Bon
/api/users
/api/users/123

# À éviter
/api/user
/api/user/123
```

**3. Hiérarchie pour les relations**
```
# Commandes d'un utilisateur
GET /api/users/123/orders

# Items d'une commande
GET /api/users/123/orders/456/items
```

**4. Utiliser des query parameters pour filtrer**
```
GET /api/users?status=active
GET /api/orders?userId=123&status=pending
GET /api/products?category=electronics&minPrice=100
```

**5. Nommage cohérent**
```
# kebab-case pour les URLs
/api/user-profiles
/api/order-items

# camelCase ou snake_case pour les paramètres
?userId=123
?user_id=123
```

### Exemples de structure

```
# Ressources principales
GET    /api/users           # Liste des utilisateurs
POST   /api/users           # Créer un utilisateur
GET    /api/users/:id       # Détail d'un utilisateur
PUT    /api/users/:id       # Remplacer un utilisateur
PATCH  /api/users/:id       # Modifier un utilisateur
DELETE /api/users/:id       # Supprimer un utilisateur

# Sous-ressources
GET    /api/users/:id/orders         # Commandes d'un utilisateur
POST   /api/users/:id/orders         # Créer une commande
GET    /api/users/:id/orders/:orderId # Détail d'une commande

# Actions spéciales (quand nécessaire)
POST   /api/users/:id/activate
POST   /api/orders/:id/cancel
```

---

## Authentification

### API Keys

Simple, pour les applications serveur-à-serveur.

```http
# Dans le header
GET /api/users
X-API-Key: your-api-key-here

# Ou dans les query parameters (moins sécurisé)
GET /api/users?api_key=your-api-key-here
```

### JWT (JSON Web Tokens)

Standard pour l'authentification stateless.

```http
# Authentification
POST /api/auth/login
Content-Type: application/json

{
  "email": "alice@example.com",
  "password": "secret"
}

# Réponse
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": 3600
}

# Utilisation du token
GET /api/users
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**Structure d'un JWT** :
```
header.payload.signature

Header: { "alg": "HS256", "typ": "JWT" }
Payload: { "sub": "123", "name": "Alice", "exp": 1234567890 }
Signature: HMACSHA256(base64(header) + "." + base64(payload), secret)
```

### OAuth 2.0

Standard pour l'autorisation déléguée (ex: "Se connecter avec Google").

Flows principaux :
- **Authorization Code** : Applications web
- **Implicit** : Applications SPA (déprécié)
- **Client Credentials** : Applications serveur
- **Resource Owner Password** : Applications de confiance

```http
# 1. Redirection vers le provider
GET https://provider.com/oauth/authorize
    ?client_id=your-client-id
    &redirect_uri=https://yourapp.com/callback
    &response_type=code
    &scope=read:user

# 2. Échange du code contre un token
POST https://provider.com/oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code
&code=auth-code-from-callback
&client_id=your-client-id
&client_secret=your-client-secret
```

### Bearer Tokens

Format standard pour transmettre les tokens.

```http
GET /api/users
Authorization: Bearer <token>
```

---

## Versioning

### Stratégies de versioning

**1. Dans l'URL (recommandé)**
```
GET /api/v1/users
GET /api/v2/users
```

**2. Dans le header**
```http
GET /api/users
Accept: application/vnd.myapi.v1+json
```

**3. Dans les query parameters**
```
GET /api/users?version=1
```

### Quand créer une nouvelle version ?

- Changements incompatibles (breaking changes)
- Suppression de champs
- Modification de la structure des réponses
- Changement de comportement

Les ajouts (nouveaux champs, nouveaux endpoints) ne nécessitent généralement pas de nouvelle version.

---

## Pagination

### Offset-based (simple)

```http
GET /api/users?page=2&limit=20

# Réponse
{
  "data": [...],
  "pagination": {
    "page": 2,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

Avantages : Simple, permet de sauter à une page
Inconvénients : Problèmes avec les données qui changent

### Cursor-based (performant)

```http
GET /api/users?limit=20&cursor=eyJpZCI6MTAwfQ==

# Réponse
{
  "data": [...],
  "pagination": {
    "limit": 20,
    "nextCursor": "eyJpZCI6MTIwfQ==",
    "hasMore": true
  }
}
```

Avantages : Performant, cohérent avec les modifications
Inconvénients : Pas de saut à une page spécifique

### Headers Link (RFC 5988)

```http
HTTP/1.1 200 OK
Link: <https://api.example.com/users?page=3>; rel="next",
      <https://api.example.com/users?page=1>; rel="prev",
      <https://api.example.com/users?page=1>; rel="first",
      <https://api.example.com/users?page=10>; rel="last"
```

---

## Gestion des Erreurs

### Format standard

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Les données fournies sont invalides",
    "details": [
      {
        "field": "email",
        "message": "L'email est requis"
      },
      {
        "field": "password",
        "message": "Le mot de passe doit contenir au moins 8 caractères"
      }
    ]
  }
}
```

### Codes d'erreur personnalisés

```json
{
  "error": {
    "code": "USER_NOT_FOUND",
    "message": "L'utilisateur demandé n'existe pas",
    "requestId": "req_abc123"
  }
}
```

### Bonnes pratiques

1. **Toujours renvoyer JSON**, même pour les erreurs
2. **Inclure un code d'erreur** lisible par les machines
3. **Message clair** pour les développeurs
4. **Request ID** pour le debugging
5. **Détails de validation** pour les erreurs 422

---

## FAQ - Questions Fréquentes

### PUT vs PATCH : quelle différence ?

**PUT** remplace entièrement la ressource :
```http
# État actuel : { "name": "Alice", "email": "alice@ex.com", "status": "active" }

PUT /api/users/123
{ "name": "Alice Martin" }

# Résultat : { "name": "Alice Martin", "email": null, "status": null }
```

**PATCH** modifie partiellement :
```http
# État actuel : { "name": "Alice", "email": "alice@ex.com", "status": "active" }

PATCH /api/users/123
{ "name": "Alice Martin" }

# Résultat : { "name": "Alice Martin", "email": "alice@ex.com", "status": "active" }
```

### Comment gérer les erreurs ?

1. Utiliser les codes HTTP appropriés
2. Retourner un corps JSON avec des détails
3. Logger côté serveur avec un request ID
4. Ne jamais exposer de stack traces en production

### Comment documenter une API ?

**OpenAPI (Swagger)** :
```yaml
openapi: 3.0.0
info:
  title: User API
  version: 1.0.0
paths:
  /users:
    get:
      summary: List users
      parameters:
        - name: status
          in: query
          schema:
            type: string
      responses:
        '200':
          description: List of users
```

**Outils populaires** :
- Swagger UI
- Redoc
- Postman
- Insomnia

### Comment gérer le rate limiting ?

Headers standard :
```http
HTTP/1.1 200 OK
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640000000

# Si limite atteinte
HTTP/1.1 429 Too Many Requests
Retry-After: 60
```

---

## Ressources

- [REST API Tutorial](https://restfulapi.net/)
- [HTTP Specification (RFC 7231)](https://tools.ietf.org/html/rfc7231)
- [JSON API Specification](https://jsonapi.org/)
- [OpenAPI Specification](https://swagger.io/specification/)
- [Best Practices for REST API Design](https://stackoverflow.blog/2020/03/02/best-practices-for-rest-api-design/)
- [HTTP Status Codes](https://httpstatuses.com/)
