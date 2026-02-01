# Guide Node.js

## Introduction

Node.js est un environnement d'exécution JavaScript côté serveur. Créé par Ryan Dahl en 2009, il utilise le moteur V8 de Google Chrome. Node.js permet d'exécuter du JavaScript en dehors du navigateur.

## Architecture événementielle

Node.js utilise une architecture non-bloquante basée sur les événements. Un seul thread gère toutes les requêtes grâce à l'event loop. Cette approche est idéale pour les applications I/O intensives comme les serveurs web et les API REST.

## NPM (Node Package Manager)

NPM est le gestionnaire de paquets par défaut de Node.js. Il permet d'installer, partager et gérer les dépendances d'un projet. Le fichier `package.json` contient les métadonnées du projet et la liste des dépendances.

Commandes courantes :
- `npm init` : initialiser un nouveau projet
- `npm install` : installer les dépendances
- `npm run` : exécuter un script
- `npm publish` : publier un package

## Modules

Node.js supporte deux systèmes de modules :

### CommonJS (CJS)
```javascript
const fs = require('fs');
module.exports = { myFunction };
```

### ES Modules (ESM)
```javascript
import fs from 'fs';
export { myFunction };
```

## Modules natifs importants

- **fs** : opérations sur le système de fichiers
- **path** : manipulation des chemins de fichiers
- **http/https** : création de serveurs web
- **crypto** : fonctions cryptographiques
- **os** : informations sur le système d'exploitation
- **events** : création d'émetteurs d'événements

## Frameworks populaires

- **Express.js** : framework web minimaliste et flexible
- **NestJS** : framework structuré inspiré d'Angular
- **Fastify** : framework haute performance
- **Koa** : créé par l'équipe d'Express, plus moderne

## Bonnes pratiques

1. Utiliser des variables d'environnement pour la configuration
2. Gérer les erreurs avec try/catch et les promesses
3. Éviter les callbacks imbriqués (callback hell)
4. Utiliser async/await pour le code asynchrone
5. Valider les entrées utilisateur
6. Logger les erreurs et les événements importants
