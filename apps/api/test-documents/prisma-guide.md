# Guide Prisma ORM

## Qu'est-ce que Prisma ?

Prisma est un ORM (Object-Relational Mapping) moderne pour Node.js et TypeScript. Il offre une approche type-safe pour interagir avec les bases de données. Prisma supporte PostgreSQL, MySQL, SQLite, SQL Server et MongoDB.

## Composants de Prisma

### Prisma Schema

Le fichier `schema.prisma` définit le modèle de données. Il contient la configuration de la base de données et les modèles.

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  name      String?
  posts     Post[]
  createdAt DateTime @default(now())
}

model Post {
  id        Int      @id @default(autoincrement())
  title     String
  content   String?
  published Boolean  @default(false)
  author    User     @relation(fields: [authorId], references: [id])
  authorId  Int
}
```

### Prisma Client

Le client Prisma est généré automatiquement à partir du schéma. Il fournit une API type-safe pour les opérations CRUD.

```typescript
// Créer un utilisateur
const user = await prisma.user.create({
  data: {
    email: 'alice@example.com',
    name: 'Alice',
  },
});

// Lire avec relations
const usersWithPosts = await prisma.user.findMany({
  include: { posts: true },
});

// Mettre à jour
await prisma.user.update({
  where: { id: 1 },
  data: { name: 'Alice Smith' },
});

// Supprimer
await prisma.user.delete({
  where: { id: 1 },
});
```

### Prisma Migrate

Prisma Migrate gère les migrations de schéma de base de données. Il crée des fichiers SQL de migration versionnés.

Commandes :
- `prisma migrate dev` : créer et appliquer une migration en développement
- `prisma migrate deploy` : appliquer les migrations en production
- `prisma db push` : synchroniser le schéma sans créer de migration

## Relations

Prisma supporte plusieurs types de relations :

- **One-to-one** : un utilisateur a un profil
- **One-to-many** : un utilisateur a plusieurs posts
- **Many-to-many** : des posts ont plusieurs tags

## Filtres et requêtes avancées

```typescript
// Filtres
const users = await prisma.user.findMany({
  where: {
    email: { contains: '@example.com' },
    posts: { some: { published: true } },
  },
  orderBy: { createdAt: 'desc' },
  take: 10,
  skip: 0,
});

// Agrégations
const count = await prisma.user.count();
const stats = await prisma.post.aggregate({
  _avg: { views: true },
  _sum: { views: true },
});
```
