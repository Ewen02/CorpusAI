# Guide JavaScript Fondamentaux

## Introduction

JavaScript est un langage de programmation dynamique, interprété et multi-paradigme. Créé en 1995 par Brendan Eich chez Netscape, il est devenu le langage incontournable du développement web. JavaScript permet de créer des applications interactives côté client (navigateur) et côté serveur (Node.js).

JavaScript est un langage à typage faible et dynamique, ce qui signifie que les types des variables sont déterminés à l'exécution et peuvent changer au cours du programme. Il supporte la programmation orientée objet (via les prototypes et les classes ES6), la programmation fonctionnelle et la programmation événementielle.

---

## Variables et Types de Données

### Déclaration des variables : var, let, const

JavaScript propose trois façons de déclarer des variables :

**var** (ES5) :
- Portée de fonction (function-scoped)
- Peut être redéclaré
- Hoisting : la déclaration est "remontée" en haut de la fonction

```javascript
var x = 10;
var x = 20; // OK, redéclaration autorisée
```

**let** (ES6) :
- Portée de bloc (block-scoped)
- Ne peut pas être redéclaré dans le même bloc
- Pas de hoisting accessible avant déclaration (temporal dead zone)

```javascript
let y = 10;
// let y = 20; // Erreur : déjà déclaré
y = 20; // OK, réassignation autorisée
```

**const** (ES6) :
- Portée de bloc (block-scoped)
- Ne peut pas être réassigné
- Doit être initialisé à la déclaration
- Pour les objets et tableaux, le contenu peut être modifié

```javascript
const PI = 3.14159;
// PI = 3; // Erreur : réassignation interdite

const obj = { name: 'Alice' };
obj.name = 'Bob'; // OK, modification du contenu autorisée
```

### Types primitifs

JavaScript possède 7 types primitifs :

1. **string** : chaînes de caractères
2. **number** : nombres (entiers et décimaux)
3. **boolean** : true ou false
4. **undefined** : variable déclarée mais non initialisée
5. **null** : absence intentionnelle de valeur
6. **symbol** (ES6) : identifiant unique
7. **bigint** (ES2020) : grands entiers

```javascript
const str = "Hello";           // string
const num = 42;                // number
const bool = true;             // boolean
const undef = undefined;       // undefined
const nul = null;              // null
const sym = Symbol('id');      // symbol
const big = 9007199254740991n; // bigint
```

### Coercion de type

JavaScript effectue des conversions de type automatiques (coercion implicite) :

```javascript
// Coercion implicite
"5" + 3    // "53" (number converti en string)
"5" - 3    // 2 (string converti en number)
true + 1   // 2 (true = 1)
false + 1  // 1 (false = 0)

// Coercion explicite
Number("42")   // 42
String(42)     // "42"
Boolean(1)     // true
Boolean(0)     // false
```

---

## Fonctions

### Déclarations de fonctions vs Expressions de fonctions

**Déclaration de fonction** (function declaration) :
- Hoistée : peut être appelée avant sa définition
- A un nom obligatoire

```javascript
// Peut être appelée avant sa définition grâce au hoisting
sayHello("Alice");

function sayHello(name) {
  console.log(`Hello, ${name}!`);
}
```

**Expression de fonction** (function expression) :
- Non hoistée : doit être définie avant d'être appelée
- Peut être anonyme

```javascript
const greet = function(name) {
  console.log(`Hi, ${name}!`);
};

greet("Bob");
```

### Arrow Functions (Fonctions fléchées)

Les arrow functions (ES6) offrent une syntaxe plus concise et un comportement différent pour `this` :

```javascript
// Syntaxe de base
const add = (a, b) => a + b;

// Avec un seul paramètre, les parenthèses sont optionnelles
const double = x => x * 2;

// Avec un corps de fonction
const multiply = (a, b) => {
  const result = a * b;
  return result;
};

// Retourner un objet (nécessite des parenthèses)
const createUser = (name, age) => ({ name, age });
```

**Différences avec les fonctions classiques** :
- Pas de `this` propre : hérite du `this` du contexte parent
- Pas de `arguments` object
- Ne peut pas être utilisée comme constructeur (pas de `new`)
- Pas de `prototype`

### Paramètres par défaut et Rest parameters

```javascript
// Paramètres par défaut
function greet(name = "Invité", greeting = "Bonjour") {
  console.log(`${greeting}, ${name}!`);
}

greet();           // "Bonjour, Invité!"
greet("Alice");    // "Bonjour, Alice!"

// Rest parameters (...)
function sum(...numbers) {
  return numbers.reduce((total, n) => total + n, 0);
}

sum(1, 2, 3, 4); // 10
```

---

## Closures (Fermetures)

### Qu'est-ce qu'une closure ?

Une closure est une fonction qui "se souvient" de son environnement lexical, c'est-à-dire des variables qui étaient accessibles au moment de sa création, même après que cet environnement ait disparu.

En d'autres termes, une closure permet à une fonction d'accéder à des variables définies dans sa fonction parente, même après que cette fonction parente ait terminé son exécution.

### Comment fonctionne une closure ?

```javascript
function createCounter() {
  let count = 0; // Variable privée

  return function() {
    count++;
    return count;
  };
}

const counter = createCounter();
console.log(counter()); // 1
console.log(counter()); // 2
console.log(counter()); // 3

// count n'est pas accessible directement
// console.log(count); // ReferenceError
```

Dans cet exemple :
1. `createCounter` crée une variable locale `count`
2. Elle retourne une fonction qui a accès à `count`
3. Même après que `createCounter` ait terminé, la fonction retournée "se souvient" de `count`
4. Chaque appel à `counter()` incrémente la même variable `count`

### Cas d'utilisation des closures

**1. Encapsulation et données privées** :

```javascript
function createBankAccount(initialBalance) {
  let balance = initialBalance; // Donnée privée

  return {
    deposit(amount) {
      balance += amount;
      return balance;
    },
    withdraw(amount) {
      if (amount <= balance) {
        balance -= amount;
        return balance;
      }
      return "Fonds insuffisants";
    },
    getBalance() {
      return balance;
    }
  };
}

const account = createBankAccount(100);
account.deposit(50);  // 150
account.withdraw(30); // 120
// account.balance est inaccessible
```

**2. Factory functions** :

```javascript
function createMultiplier(factor) {
  return function(number) {
    return number * factor;
  };
}

const double = createMultiplier(2);
const triple = createMultiplier(3);

double(5); // 10
triple(5); // 15
```

**3. Mémoïsation** :

```javascript
function memoize(fn) {
  const cache = {};

  return function(...args) {
    const key = JSON.stringify(args);
    if (key in cache) {
      return cache[key];
    }
    const result = fn.apply(this, args);
    cache[key] = result;
    return result;
  };
}

const expensiveCalculation = memoize((n) => {
  console.log("Calcul...");
  return n * n;
});

expensiveCalculation(5); // "Calcul..." puis 25
expensiveCalculation(5); // 25 (depuis le cache)
```

---

## Prototypes et Héritage

### La chaîne de prototypes

JavaScript utilise l'héritage par prototype. Chaque objet a un prototype (accessible via `__proto__` ou `Object.getPrototypeOf()`), et les propriétés/méthodes sont recherchées en remontant la chaîne de prototypes.

```javascript
const animal = {
  isAlive: true,
  eat() {
    console.log("L'animal mange");
  }
};

const dog = Object.create(animal);
dog.bark = function() {
  console.log("Woof!");
};

dog.eat();     // "L'animal mange" (hérité de animal)
dog.bark();    // "Woof!"
dog.isAlive;   // true (hérité de animal)
```

### Fonctions constructeurs

```javascript
function Person(name, age) {
  this.name = name;
  this.age = age;
}

Person.prototype.greet = function() {
  console.log(`Bonjour, je suis ${this.name}`);
};

const alice = new Person("Alice", 30);
alice.greet(); // "Bonjour, je suis Alice"
```

### Classes ES6

Les classes ES6 sont du "sucre syntaxique" au-dessus des prototypes :

```javascript
class Animal {
  constructor(name) {
    this.name = name;
  }

  speak() {
    console.log(`${this.name} fait un bruit.`);
  }
}

class Dog extends Animal {
  constructor(name, breed) {
    super(name); // Appelle le constructeur parent
    this.breed = breed;
  }

  speak() {
    console.log(`${this.name} aboie.`);
  }

  // Méthode statique
  static isDog(animal) {
    return animal instanceof Dog;
  }
}

const rex = new Dog("Rex", "Berger allemand");
rex.speak(); // "Rex aboie."
Dog.isDog(rex); // true
```

---

## Event Loop (Boucle d'événements)

### Comment fonctionne l'Event Loop ?

JavaScript est mono-thread mais peut gérer des opérations asynchrones grâce à l'event loop. Voici les composants clés :

1. **Call Stack** : pile d'exécution des fonctions synchrones
2. **Web APIs** : APIs du navigateur (setTimeout, fetch, DOM events)
3. **Callback Queue (Task Queue)** : file d'attente des callbacks
4. **Microtask Queue** : file prioritaire pour les Promises
5. **Event Loop** : transfère les callbacks vers la call stack quand elle est vide

### Ordre d'exécution

```javascript
console.log("1 - Synchrone");

setTimeout(() => {
  console.log("2 - setTimeout (Task Queue)");
}, 0);

Promise.resolve().then(() => {
  console.log("3 - Promise (Microtask Queue)");
});

console.log("4 - Synchrone");

// Ordre d'affichage :
// 1 - Synchrone
// 4 - Synchrone
// 3 - Promise (Microtask Queue)
// 2 - setTimeout (Task Queue)
```

**Explication** :
1. Les instructions synchrones s'exécutent d'abord (1 et 4)
2. Les microtasks (Promises) ont la priorité sur les tasks
3. Les tasks (setTimeout) s'exécutent après les microtasks

### Exemple pratique

```javascript
async function demo() {
  console.log("A");

  await Promise.resolve();
  console.log("B");

  setTimeout(() => console.log("C"), 0);

  await Promise.resolve();
  console.log("D");
}

demo();
console.log("E");

// Ordre : A, E, B, D, C
```

---

## Programmation Asynchrone

### Callbacks

Les callbacks sont des fonctions passées en argument à d'autres fonctions :

```javascript
function fetchData(callback) {
  setTimeout(() => {
    callback(null, { data: "Données reçues" });
  }, 1000);
}

fetchData((error, result) => {
  if (error) {
    console.error(error);
  } else {
    console.log(result.data);
  }
});
```

**Problème du "Callback Hell"** :

```javascript
// À éviter : callbacks imbriqués
getData((data) => {
  processData(data, (processed) => {
    saveData(processed, (saved) => {
      notify(saved, (result) => {
        console.log(result);
      });
    });
  });
});
```

### Promises (Promesses)

Les Promises représentent une valeur qui sera disponible dans le futur :

```javascript
const promise = new Promise((resolve, reject) => {
  const success = true;

  if (success) {
    resolve("Opération réussie");
  } else {
    reject(new Error("Opération échouée"));
  }
});

promise
  .then(result => console.log(result))
  .catch(error => console.error(error))
  .finally(() => console.log("Terminé"));
```

**Chaînage de Promises** :

```javascript
fetch('/api/user')
  .then(response => response.json())
  .then(user => fetch(`/api/posts/${user.id}`))
  .then(response => response.json())
  .then(posts => console.log(posts))
  .catch(error => console.error(error));
```

**Promise.all et Promise.race** :

```javascript
// Attendre toutes les promesses
Promise.all([
  fetch('/api/users'),
  fetch('/api/posts'),
  fetch('/api/comments')
]).then(responses => {
  // Toutes les réponses sont disponibles
});

// Première promesse résolue
Promise.race([
  fetch('/api/fast'),
  fetch('/api/slow')
]).then(response => {
  // Première réponse reçue
});
```

### async/await

async/await est du sucre syntaxique pour les Promises, rendant le code asynchrone plus lisible :

```javascript
async function fetchUserData(userId) {
  try {
    const response = await fetch(`/api/users/${userId}`);

    if (!response.ok) {
      throw new Error('Utilisateur non trouvé');
    }

    const user = await response.json();
    const posts = await fetch(`/api/posts?userId=${user.id}`);

    return {
      user,
      posts: await posts.json()
    };
  } catch (error) {
    console.error('Erreur:', error.message);
    throw error;
  }
}

// Utilisation
const data = await fetchUserData(1);
```

**Exécution parallèle avec async/await** :

```javascript
async function fetchAllData() {
  // Exécution séquentielle (lent)
  const users = await fetch('/api/users');
  const posts = await fetch('/api/posts');

  // Exécution parallèle (rapide)
  const [usersRes, postsRes] = await Promise.all([
    fetch('/api/users'),
    fetch('/api/posts')
  ]);
}
```

---

## FAQ - Questions Fréquentes

### Quelle est la différence entre == et === ?

- `==` (égalité faible) : compare les valeurs après coercion de type
- `===` (égalité stricte) : compare les valeurs ET les types

```javascript
5 == "5"   // true (coercion : "5" devient 5)
5 === "5"  // false (types différents)

null == undefined   // true
null === undefined  // false

0 == false   // true
0 === false  // false
```

**Recommandation** : Toujours utiliser `===` pour éviter les comportements inattendus.

### Comment fonctionne le hoisting ?

Le hoisting est le comportement de JavaScript qui "remonte" les déclarations (pas les initialisations) en haut de leur portée :

```javascript
console.log(x); // undefined (déclaration hoistée)
var x = 5;

console.log(y); // ReferenceError (temporal dead zone)
let y = 10;

sayHello(); // Fonctionne (fonction hoistée)
function sayHello() {
  console.log("Hello");
}

greet(); // TypeError (expression non hoistée)
var greet = function() {
  console.log("Hi");
};
```

### Qu'est-ce que le 'this' en JavaScript ?

`this` fait référence au contexte d'exécution. Sa valeur dépend de comment la fonction est appelée :

```javascript
// 1. Contexte global
console.log(this); // window (navigateur) ou global (Node.js)

// 2. Méthode d'objet
const obj = {
  name: "Alice",
  greet() {
    console.log(this.name); // "Alice"
  }
};

// 3. Fonction normale
function showThis() {
  console.log(this); // window (ou undefined en strict mode)
}

// 4. Arrow function (hérite du this parent)
const obj2 = {
  name: "Bob",
  greet: () => {
    console.log(this.name); // undefined (this = contexte global)
  }
};

// 5. bind/call/apply
function greet(greeting) {
  console.log(`${greeting}, ${this.name}`);
}
greet.call({ name: "Charlie" }, "Bonjour"); // "Bonjour, Charlie"
```

### Quelle est la différence entre null et undefined ?

- `undefined` : variable déclarée mais non initialisée, ou propriété inexistante
- `null` : absence intentionnelle de valeur, assignée explicitement

```javascript
let x;
console.log(x); // undefined

let y = null;
console.log(y); // null

typeof undefined; // "undefined"
typeof null;      // "object" (bug historique)

undefined == null;  // true
undefined === null; // false
```

---

## Ressources

- [MDN Web Docs - JavaScript](https://developer.mozilla.org/fr/docs/Web/JavaScript)
- [JavaScript.info](https://javascript.info/)
- [ECMAScript Specification](https://tc39.es/ecma262/)
- [You Don't Know JS (livre)](https://github.com/getify/You-Dont-Know-JS)
