# Guide Docker Complet

## Introduction

Docker est une plateforme de conteneurisation open source qui permet d'empaqueter des applications avec toutes leurs dépendances dans des conteneurs standardisés. Créé en 2013 par Solomon Hykes, Docker a révolutionné le déploiement d'applications en offrant portabilité, isolation et reproductibilité.

Les conteneurs Docker sont légers, démarrent rapidement et garantissent que l'application fonctionne de manière identique en développement, en test et en production ("It works on my machine" n'est plus un problème).

---

## Concepts Fondamentaux

### Images vs Conteneurs

**Image Docker** :
- Template en lecture seule contenant le système de fichiers et la configuration
- Composée de couches (layers) empilées
- Immuable : une fois créée, ne change pas
- Stockée dans un registry (Docker Hub, AWS ECR, etc.)

**Conteneur Docker** :
- Instance exécutable d'une image
- Isolé du système hôte et des autres conteneurs
- Possède son propre système de fichiers, réseau et processus
- Peut être démarré, arrêté, supprimé

```
Image (template) → Conteneur (instance)
         ↓
    nginx:latest → nginx_web_1
```

### Architecture Docker

```
┌─────────────────────────────────────┐
│           Docker Client             │
│        (docker CLI, API)            │
└───────────────┬─────────────────────┘
                │
                ▼
┌─────────────────────────────────────┐
│           Docker Daemon             │
│          (dockerd)                  │
└───────────────┬─────────────────────┘
                │
        ┌───────┴───────┐
        ▼               ▼
┌─────────────┐ ┌─────────────────┐
│   Images    │ │   Containers    │
└─────────────┘ └─────────────────┘
```

### Layers (Couches)

Les images Docker sont construites en couches :
- Chaque instruction du Dockerfile crée une couche
- Les couches sont mises en cache et réutilisées
- Seules les couches modifiées sont reconstruites

```
┌─────────────────────────┐
│   Application code      │ ← Couche spécifique
├─────────────────────────┤
│   npm install           │ ← Dépendances
├─────────────────────────┤
│   Node.js runtime       │ ← Image de base
├─────────────────────────┤
│   Alpine Linux          │ ← OS minimal
└─────────────────────────┘
```

---

## Dockerfile

### Structure d'un Dockerfile

Le Dockerfile est un fichier texte contenant les instructions pour construire une image :

```dockerfile
# Image de base
FROM node:18-alpine

# Définir le répertoire de travail
WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer les dépendances
RUN npm ci --only=production

# Copier le code source
COPY . .

# Exposer le port
EXPOSE 3000

# Variable d'environnement
ENV NODE_ENV=production

# Commande de démarrage
CMD ["node", "server.js"]
```

### Instructions principales

**FROM** : Définit l'image de base

```dockerfile
FROM node:18-alpine
FROM ubuntu:22.04
FROM scratch  # Image vide
```

**WORKDIR** : Définit le répertoire de travail

```dockerfile
WORKDIR /app
# Tous les chemins relatifs seront par rapport à /app
```

**COPY et ADD** : Copier des fichiers

```dockerfile
# Copier un fichier
COPY package.json .

# Copier un dossier
COPY src/ ./src/

# ADD peut extraire des archives et télécharger des URLs
ADD archive.tar.gz /app/
```

**RUN** : Exécuter des commandes lors du build

```dockerfile
# Shell form
RUN apt-get update && apt-get install -y curl

# Exec form (recommandé)
RUN ["npm", "install"]

# Chaîner pour réduire les couches
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*
```

**ENV** : Variables d'environnement

```dockerfile
ENV NODE_ENV=production
ENV PORT=3000 HOST=0.0.0.0
```

**ARG** : Arguments de build

```dockerfile
ARG NODE_VERSION=18
FROM node:${NODE_VERSION}-alpine

ARG APP_VERSION
ENV APP_VERSION=${APP_VERSION}
```

**EXPOSE** : Documenter les ports

```dockerfile
EXPOSE 3000
EXPOSE 80/tcp 443/tcp
```

**CMD et ENTRYPOINT** : Commande de démarrage

```dockerfile
# CMD : commande par défaut, remplaçable
CMD ["node", "server.js"]

# ENTRYPOINT : commande fixe
ENTRYPOINT ["node"]
CMD ["server.js"]  # Arguments par défaut

# Avec ENTRYPOINT + CMD :
# docker run myimage          → node server.js
# docker run myimage app.js   → node app.js
```

### Multi-stage builds

Les builds multi-étapes permettent de créer des images plus petites :

```dockerfile
# Étape 1 : Build
FROM node:18 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Étape 2 : Production
FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
CMD ["node", "dist/server.js"]
```

### Bonnes pratiques Dockerfile

1. **Utiliser des images minimales** (alpine, slim, distroless)
2. **Ordonner les instructions** du moins au plus changeant
3. **Combiner les RUN** pour réduire les couches
4. **Utiliser .dockerignore** pour exclure les fichiers inutiles
5. **Ne pas exécuter en root** : créer un utilisateur dédié
6. **Utiliser des versions fixes** pour les images de base

```dockerfile
# Exemple optimisé
FROM node:18-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine
WORKDIR /app
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
COPY --from=deps --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --chown=nodejs:nodejs . .
USER nodejs
EXPOSE 3000
CMD ["node", "server.js"]
```

---

## Commandes Docker

### Gestion des images

```bash
# Construire une image
docker build -t mon-app:1.0 .

# Construire avec un Dockerfile spécifique
docker build -f Dockerfile.prod -t mon-app:prod .

# Construire avec des arguments
docker build --build-arg NODE_VERSION=18 -t mon-app .

# Lister les images
docker images
docker image ls

# Supprimer une image
docker rmi mon-app:1.0
docker image rm mon-app:1.0

# Supprimer les images non utilisées
docker image prune

# Taguer une image
docker tag mon-app:1.0 registry.example.com/mon-app:1.0

# Pousser vers un registry
docker push registry.example.com/mon-app:1.0

# Télécharger une image
docker pull nginx:latest
```

### Gestion des conteneurs

```bash
# Créer et démarrer un conteneur
docker run -d --name mon-conteneur nginx

# Options courantes
docker run -d \                      # Détaché (arrière-plan)
  --name web \                       # Nom du conteneur
  -p 8080:80 \                       # Mapping de port host:container
  -v /host/path:/container/path \    # Montage de volume
  -e MY_VAR=value \                  # Variable d'environnement
  --env-file .env \                  # Fichier de variables
  --network my-network \             # Réseau Docker
  --restart unless-stopped \         # Politique de redémarrage
  nginx:latest

# Lister les conteneurs
docker ps            # En cours d'exécution
docker ps -a         # Tous

# Arrêter un conteneur
docker stop mon-conteneur

# Démarrer un conteneur arrêté
docker start mon-conteneur

# Redémarrer
docker restart mon-conteneur

# Supprimer un conteneur
docker rm mon-conteneur
docker rm -f mon-conteneur  # Force la suppression

# Supprimer les conteneurs arrêtés
docker container prune
```

### Interagir avec les conteneurs

```bash
# Exécuter une commande dans un conteneur
docker exec -it mon-conteneur bash
docker exec mon-conteneur ls /app

# Voir les logs
docker logs mon-conteneur
docker logs -f mon-conteneur        # Follow (streaming)
docker logs --tail 100 mon-conteneur

# Copier des fichiers
docker cp fichier.txt mon-conteneur:/app/
docker cp mon-conteneur:/app/data.txt ./

# Inspecter un conteneur
docker inspect mon-conteneur

# Voir les processus
docker top mon-conteneur

# Statistiques d'utilisation
docker stats
```

---

## Docker Compose

### Qu'est-ce que Docker Compose ?

Docker Compose permet de définir et gérer des applications multi-conteneurs. Il utilise un fichier YAML pour configurer les services, réseaux et volumes.

### Structure docker-compose.yml

```yaml
version: '3.8'

services:
  web:
    build: ./web
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgres://db:5432/myapp
    depends_on:
      - db
      - redis
    volumes:
      - ./web:/app
      - /app/node_modules
    networks:
      - app-network

  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: myuser
      POSTGRES_PASSWORD: mypassword
      POSTGRES_DB: myapp
    volumes:
      - postgres-data:/var/lib/postgresql/data
    networks:
      - app-network

  redis:
    image: redis:7-alpine
    networks:
      - app-network

volumes:
  postgres-data:

networks:
  app-network:
    driver: bridge
```

### Options de services

```yaml
services:
  app:
    # Image ou build
    image: nginx:latest
    build:
      context: .
      dockerfile: Dockerfile.prod
      args:
        - NODE_ENV=production

    # Ports
    ports:
      - "80:80"           # host:container
      - "443:443"

    # Variables d'environnement
    environment:
      - NODE_ENV=production
    env_file:
      - .env
      - .env.local

    # Volumes
    volumes:
      - ./src:/app/src           # Bind mount
      - node_modules:/app/node_modules  # Named volume
      - /app/tmp                  # Anonymous volume

    # Dépendances
    depends_on:
      db:
        condition: service_healthy

    # Health check
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

    # Restart policy
    restart: unless-stopped

    # Ressources
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
```

### Commandes Docker Compose

```bash
# Démarrer les services
docker-compose up
docker-compose up -d          # Détaché

# Construire les images
docker-compose build

# Construire et démarrer
docker-compose up --build

# Arrêter les services
docker-compose down

# Arrêter et supprimer les volumes
docker-compose down -v

# Voir les logs
docker-compose logs
docker-compose logs -f web    # Service spécifique

# Exécuter une commande
docker-compose exec web bash
docker-compose run web npm test

# Lister les conteneurs
docker-compose ps

# Redémarrer un service
docker-compose restart web

# Scaler un service
docker-compose up -d --scale web=3
```

---

## Volumes et Persistance

### Types de montages

**1. Volumes nommés** (recommandé pour la persistance) :

```yaml
services:
  db:
    image: postgres
    volumes:
      - postgres-data:/var/lib/postgresql/data

volumes:
  postgres-data:
```

**2. Bind mounts** (pour le développement) :

```yaml
services:
  web:
    volumes:
      - ./src:/app/src     # Chemin absolu ou relatif
      - type: bind
        source: ./config
        target: /app/config
        read_only: true
```

**3. tmpfs** (mémoire temporaire) :

```yaml
services:
  app:
    tmpfs:
      - /tmp
      - /app/cache
```

### Commandes volumes

```bash
# Lister les volumes
docker volume ls

# Créer un volume
docker volume create mon-volume

# Inspecter un volume
docker volume inspect mon-volume

# Supprimer un volume
docker volume rm mon-volume

# Supprimer les volumes non utilisés
docker volume prune
```

---

## Networking

### Types de réseaux

**1. Bridge** (par défaut) : réseau isolé pour les conteneurs

```yaml
networks:
  app-network:
    driver: bridge
```

**2. Host** : utilise le réseau de l'hôte

```bash
docker run --network host nginx
```

**3. None** : pas de réseau

```bash
docker run --network none alpine
```

### Communication entre conteneurs

Dans un réseau Docker Compose, les conteneurs peuvent se joindre par leur nom de service :

```yaml
services:
  web:
    environment:
      - DATABASE_URL=postgres://db:5432/myapp
      - REDIS_URL=redis://redis:6379

  db:
    image: postgres

  redis:
    image: redis
```

### Port mapping

```yaml
ports:
  - "80:80"       # host_port:container_port
  - "443:443"
  - "3000"        # Port aléatoire sur l'hôte
  - "127.0.0.1:8080:80"  # Bind sur localhost uniquement
```

---

## FAQ - Questions Fréquentes

### Quelle différence entre CMD et ENTRYPOINT ?

**CMD** : Commande par défaut, remplaçable à l'exécution
```dockerfile
CMD ["node", "server.js"]
# docker run myimage            → node server.js
# docker run myimage npm test   → npm test (CMD remplacé)
```

**ENTRYPOINT** : Commande fixe, les arguments sont ajoutés
```dockerfile
ENTRYPOINT ["node"]
CMD ["server.js"]
# docker run myimage            → node server.js
# docker run myimage app.js     → node app.js (argument ajouté)
```

### Comment réduire la taille d'une image ?

1. **Utiliser des images de base légères** :
   ```dockerfile
   FROM node:18-alpine    # ~100MB vs ~900MB pour node:18
   ```

2. **Multi-stage builds** pour ne garder que les fichiers nécessaires

3. **Combiner les commandes RUN** :
   ```dockerfile
   RUN apt-get update \
       && apt-get install -y curl \
       && rm -rf /var/lib/apt/lists/*
   ```

4. **Utiliser .dockerignore** :
   ```
   node_modules
   .git
   *.log
   ```

### Comment débugger un conteneur ?

```bash
# Accéder au shell
docker exec -it mon-conteneur /bin/sh

# Voir les logs
docker logs -f mon-conteneur

# Inspecter la configuration
docker inspect mon-conteneur

# Voir les processus
docker top mon-conteneur

# Voir l'utilisation des ressources
docker stats mon-conteneur
```

### Comment gérer les secrets ?

```yaml
# Docker Compose avec secrets
services:
  db:
    image: postgres
    secrets:
      - db_password
    environment:
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password

secrets:
  db_password:
    file: ./secrets/db_password.txt
```

### Comment faire des health checks ?

```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD curl -f http://localhost/health || exit 1
```

```yaml
# docker-compose.yml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost/health"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s
```

---

## Ressources

- [Documentation officielle Docker](https://docs.docker.com/)
- [Docker Hub](https://hub.docker.com/)
- [Best practices for writing Dockerfiles](https://docs.docker.com/develop/develop-images/dockerfile_best-practices/)
- [Docker Compose documentation](https://docs.docker.com/compose/)
- [Play with Docker (sandbox)](https://labs.play-with-docker.com/)
