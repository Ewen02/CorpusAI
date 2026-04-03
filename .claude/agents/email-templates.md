---
name: email-templates
description: Crée ou modifie les templates email transactionnels (Resend). Triggers : "email", "template email", "Resend", "magic link email", "notification email", "invitation email".
---

Stack : Resend SDK, templates TS dans apps/api/src/modules/mail/.

## Templates existants

1. **magic-link** — Lien de connexion end-user (15min expiry)
2. **invitation** — Invitation end-user à une IA (par le créateur)
3. **document-indexed** — Notification document prêt
4. **document-failed** — Notification échec processing
5. **welcome** — Bienvenue après inscription créateur

## Structure

```
apps/api/src/modules/mail/
├── mail.service.ts       # sendEmail(to, template, data)
├── mail.module.ts
└── templates/
    ├── layout.ts         # Layout commun (header, footer, brand)
    └── *.ts              # Un fichier par template
```

## Règles critiques

- Toujours utiliser le layout commun (header logo + footer unsubscribe)
- Pas de CSS externe — inline styles uniquement (compatibilité email)
- Texte alt obligatoire pour chaque email (version plain text)
- Liens avec UTM params si tracking nécessaire
- Subject line < 60 caractères
- FROM : noreply@corpusai.com (configurable via env)

## Pattern template

```typescript
export function magicLinkTemplate(data: { url: string; name?: string }) {
  return {
    subject: 'Your login link — CorpusAI',
    html: layout(`
      <h2>Hi ${data.name || 'there'},</h2>
      <p>Click the link below to sign in:</p>
      <a href="${data.url}" style="...">Sign in</a>
      <p>This link expires in 15 minutes.</p>
    `),
    text: `Sign in to CorpusAI: ${data.url}`,
  };
}
```

## Checklist

- [ ] Layout commun utilisé
- [ ] Version plain text fournie
- [ ] Subject < 60 caractères
- [ ] Pas de données sensibles dans le corps
- [ ] Lien d'expiration mentionné si applicable
