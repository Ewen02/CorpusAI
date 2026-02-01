# Guide React

## Qu'est-ce que React ?

React est une bibliothèque JavaScript pour construire des interfaces utilisateur. Créée par Facebook en 2013, elle est maintenant open source et maintenue par Meta. React utilise un DOM virtuel pour optimiser les performances de rendu.

## Composants

Les composants sont les blocs de construction fondamentaux de React. Il existe deux types principaux :

### Composants fonctionnels

Les composants fonctionnels sont des fonctions JavaScript qui retournent du JSX. Depuis React 16.8, les hooks permettent d'utiliser l'état et d'autres fonctionnalités dans les composants fonctionnels.

```jsx
function Welcome({ name }) {
  return <h1>Bonjour, {name}</h1>;
}
```

### Composants classe (legacy)

Les composants classe étaient la méthode traditionnelle avant les hooks. Ils étendent `React.Component` et utilisent `this.state` pour gérer l'état.

## JSX

JSX est une extension de syntaxe qui ressemble à HTML mais s'utilise dans JavaScript. Babel compile le JSX en appels `React.createElement()`.

## Hooks principaux

- **useState** : gère l'état local d'un composant
- **useEffect** : gère les effets de bord (API calls, subscriptions)
- **useContext** : accède au contexte React
- **useReducer** : alternative à useState pour une logique d'état complexe
- **useMemo** : mémorise une valeur calculée
- **useCallback** : mémorise une fonction

## Virtual DOM

React maintient une représentation virtuelle du DOM en mémoire. Quand l'état change, React calcule la différence (diffing) entre l'ancien et le nouveau Virtual DOM, puis met à jour uniquement les parties nécessaires du vrai DOM. C'est ce qu'on appelle la réconciliation.

## État et Props

- **Props** : données passées d'un composant parent à un composant enfant (lecture seule)
- **State** : données locales gérées par le composant lui-même (modifiable)

Le flux de données dans React est unidirectionnel : les données descendent des parents vers les enfants via les props.
