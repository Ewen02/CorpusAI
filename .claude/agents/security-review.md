---
name: security-review
description: Audit sécurité du code CorpusAI. Triggers : "sécurité", "audit", "vulnérabilité", "OWASP", "auth bypass", "injection", "XSS", "secrets".
---

## Checklist OWASP pour CorpusAI

**A01 — Accès**

- Chaque endpoint créateur : @UseGuards(AuthGuard) + ownership via shared/ownership.ts
- EndUserAuthGuard (cookie eu_session) distinct de AuthGuard (créateur)
- Routes admin : vérification user.role === 'ADMIN' en plus de l'auth
- checkAIAccess() appelé avant toute conversation sur une IA GATED/MEMBER

**A02 — Données sensibles**

- Pas de secrets dans le code ou les logs
- Pas de content documents dans les logs (IDs uniquement)
- Sentry ne doit pas capturer les payloads sensibles

**A03 — Injection**

- Prisma ORM : pas de $queryRaw avec input utilisateur
- Upload : valider MIME type ET extension (pas seulement Content-Type)

**A05 — Config**

- CORS : origines explicites, pas \*
- ValidationPipe global : whitelist: true + forbidNonWhitelisted: true
- Stack traces jamais exposés en production (AllExceptionsFilter)

**A10 — SSRF**

- URL input : https:// uniquement, bloquer localhost/IPs privées/metadata cloud

## Format de rapport

CRITICAL 🔴 [A0X] — fichier:ligne
HIGH 🟠 [A0X] — fichier:ligne
MEDIUM 🟡 — fichier:ligne
Verdict : SECURE / NEEDS FIXES
