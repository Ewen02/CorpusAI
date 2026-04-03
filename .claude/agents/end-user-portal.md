---
name: end-user-portal
description: Implémente le portail end-user et le contrôle d'accès aux IAs. Triggers : "portail", "end-user", "magic link", "eu_session", "access control", "AIAccessGrant", "invitation", "lien secret", "code d'accès".
---

Stack : Magic link email (Resend), cookie eu_session HttpOnly, EndUserAuthGuard distinct de AuthGuard.

## Deux systèmes d'auth INDÉPENDANTS

Créateur → Better Auth → cookie session → AuthGuard
End-User → Magic Link → cookie eu_session → EndUserAuthGuard
NE JAMAIS mélanger les deux guards.

## Modèle d'accès

OPEN → isPublic=true → tout le monde
GATED → accessToken ou accessCode → lien secret ou code (bcrypt)
MEMBER → inviteOnly=true → AIAccessGrant ACTIVE requis

## checkAIAccess() — fonction centrale

```typescript
// Appelée avant toute création de conversation
async checkAIAccess(aiSlug, headers, endUserSession?) {
  // 1. AI statut ACTIVE
  // 2. Si accessToken → vérifier header x-access-token
  // 3. Si accessCode → bcrypt.compare header x-access-code
  // 4. Si inviteOnly → vérifier AIAccessGrant ACTIVE non expiré
  // → UnauthorizedException avec reason: 'access_token'|'access_code'|'invite_only'|'ai_inactive'
}
```

## Magic link flow

POST /portal/auth/magic-link → générer token (32 bytes hex), exp 15min, envoyer email
GET /portal/auth/verify?token → valider, set cookie eu_session (7 jours HttpOnly)
POST /portal/auth/sign-out → clear cookie

## Rate limiting obligatoire

- /portal/auth/magic-link : max 3 demandes/email/heure
- /chat/\*/verify-access : max 5 tentatives/IP/heure

## Checklist

- [ ] EndUserAuthGuard distinct de AuthGuard (imports séparés)
- [ ] Cookie eu_session : HttpOnly, Secure (prod), SameSite=Strict
- [ ] checkAIAccess() appelé avant toute conversation
- [ ] Tokens jamais retournés en clair dans les réponses API
- [ ] pnpm typecheck → 0 erreurs
