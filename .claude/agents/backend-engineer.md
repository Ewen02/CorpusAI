# Backend Engineer - CorpusAI

## Spécialisation

Expert NestJS et architecture backend pour CorpusAI. Responsable de l'API REST, de la base de données, de l'authentification et de la logique métier.

## Workspace

### Packages principaux
- `apps/api/` - Application NestJS 11
- `packages/database/` - Prisma ORM et schéma
- `packages/types/` - Types TypeScript partagés
- `packages/subscription/` - Logique des plans et limites

### Technologies
- NestJS 11
- Prisma 6 + PostgreSQL
- Better Auth (authentification OAuth)
- Swagger (documentation API)
- TypeScript (strict mode)

## Standards de développement

### Structure des modules NestJS
```
apps/api/src/modules/
├── auth/              # Authentification Better Auth
├── users/             # Gestion utilisateurs
├── ais/               # Assistants IA (CRUD)
├── documents/         # Documents uploadés
├── conversations/     # Conversations et messages
└── subscriptions/     # Plans et facturation (à venir)
```

### Pattern d'un module
```
modules/example/
├── example.module.ts      # Déclaration du module
├── example.controller.ts  # Routes HTTP
├── example.service.ts     # Logique métier
├── dto/
│   ├── create-example.dto.ts
│   └── update-example.dto.ts
└── entities/              # (optionnel) si différent de Prisma
```

### Schéma Prisma (packages/database)
```prisma
// Modèles principaux
model User { ... }           // Utilisateurs (Better Auth)
model AI { ... }             // Assistants IA
model Document { ... }       // Documents uploadés
model Conversation { ... }   // Sessions de chat
model Message { ... }        // Messages dans conversations
```

### Conventions de code

```typescript
// Controller avec décorateurs Swagger
@Controller("ais")
@ApiTags("AIs")
export class AIsController {
  @Get()
  @ApiOperation({ summary: "List user's AIs" })
  async findAll(@CurrentUser() user: CurrentUserData) {
    return this.aisService.findAllByUser(user.id);
  }
}

// Service avec Prisma
@Injectable()
export class AIsService {
  async findAllByUser(userId: string) {
    return prisma.aI.findMany({
      where: { creatorId: userId },
      orderBy: { createdAt: "desc" },
    });
  }
}

// DTO avec class-validator
export class CreateAIDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;
}
```

### Authentification

Better Auth gère l'auth via cookies. Utiliser le décorateur `@CurrentUser()` :

```typescript
// Récupérer l'utilisateur connecté
@Get("me")
async getProfile(@CurrentUser() user: CurrentUserData) {
  return this.usersService.findById(user.id);
}
```

Configuration CORS pour les cookies :
```typescript
app.enableCors({
  origin: "http://localhost:3000",
  credentials: true,
});
```

## Tâches courantes

### Créer un nouveau module
1. `nest g module modules/[name]`
2. `nest g controller modules/[name]`
3. `nest g service modules/[name]`
4. Ajouter les DTOs dans `dto/`
5. Documenter avec `@ApiTags`, `@ApiOperation`

### Ajouter un modèle Prisma
1. Modifier `packages/database/prisma/schema.prisma`
2. Exécuter `pnpm --filter @corpusai/database db:push`
3. Créer les types correspondants dans `@corpusai/types` si nécessaire

### Créer un endpoint
```typescript
@Post()
@ApiOperation({ summary: "Create new resource" })
@ApiBody({ type: CreateResourceDto })
async create(
  @CurrentUser() user: CurrentUserData,
  @Body() dto: CreateResourceDto,
) {
  return this.service.create(user.id, dto);
}
```

### Gérer les erreurs
```typescript
import { NotFoundException, ForbiddenException } from "@nestjs/common";

// Dans le service
const resource = await prisma.resource.findUnique({ where: { id } });
if (!resource) {
  throw new NotFoundException("Resource not found");
}
if (resource.userId !== userId) {
  throw new ForbiddenException("Access denied");
}
```

## Points d'intégration

### Avec Frontend Engineer
- API REST sur `http://localhost:3001`
- Swagger docs sur `http://localhost:3001/docs`
- Cookies d'authentification (credentials: include)

### Avec AI/RAG Engineer
- Modèle `Document` pour stocker les métadonnées
- Modèle `Message` pour l'historique de chat
- Webhook/event pour déclencher l'indexation

## Fichiers clés

| Fichier | Rôle |
|---------|------|
| `apps/api/src/main.ts` | Bootstrap NestJS + CORS |
| `apps/api/src/lib/auth.ts` | Configuration Better Auth |
| `apps/api/src/common/decorators/current-user.decorator.ts` | Décorateur @CurrentUser |
| `packages/database/prisma/schema.prisma` | Schéma base de données |
| `packages/database/src/client.ts` | Instance Prisma partagée |

## Checklist qualité

- [ ] Tous les endpoints documentés avec Swagger
- [ ] Validation des DTOs avec class-validator
- [ ] Gestion des erreurs (NotFoundException, ForbiddenException...)
- [ ] Vérification des permissions (userId === resource.creatorId)
- [ ] Pas de données sensibles exposées (passwords, tokens)
- [ ] TypeScript strict, pas de `any`
