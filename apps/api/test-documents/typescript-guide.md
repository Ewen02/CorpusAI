# Guide TypeScript

## Introduction

TypeScript est un langage de programmation développé par Microsoft en 2012. C'est un sur-ensemble de JavaScript qui ajoute le typage statique optionnel. Anders Hejlsberg, le créateur de C#, a également créé TypeScript.

## Avantages du typage statique

Le typage statique permet de détecter les erreurs à la compilation plutôt qu'à l'exécution. Cela améliore considérablement la maintenabilité du code et facilite le refactoring. Les IDE modernes comme VS Code peuvent fournir une meilleure autocomplétion grâce aux informations de type.

## Types de base

TypeScript supporte plusieurs types primitifs :

- **string** : pour les chaînes de caractères
- **number** : pour les nombres (entiers et décimaux)
- **boolean** : pour les valeurs true/false
- **null** et **undefined** : pour les valeurs nulles
- **symbol** : pour les identifiants uniques
- **bigint** : pour les grands nombres entiers

## Interfaces

Les interfaces permettent de définir la structure des objets. Elles sont utilisées pour le duck typing et la vérification de types à la compilation.

```typescript
interface User {
  id: number;
  name: string;
  email: string;
  isActive?: boolean; // propriété optionnelle
}
```

## Génériques

Les génériques permettent de créer des composants réutilisables qui fonctionnent avec plusieurs types plutôt qu'un seul.

```typescript
function identity<T>(arg: T): T {
  return arg;
}
```

## Configuration

Le fichier `tsconfig.json` contient la configuration du compilateur TypeScript. Les options importantes incluent :

- **strict** : active toutes les vérifications strictes
- **target** : version ECMAScript cible (ES2020, ES2022, etc.)
- **module** : système de modules (CommonJS, ESNext, etc.)
- **outDir** : répertoire de sortie des fichiers compilés
