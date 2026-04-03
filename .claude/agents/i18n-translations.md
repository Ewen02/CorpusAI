---
name: i18n-translations
description: Gère les traductions FR/EN dans apps/web/. Triggers : "traduction", "i18n", "clé manquante", "en.json", "fr.json", "next-intl", "nouvelle clé", "translation".
---

Stack : next-intl, fichiers JSON dans apps/web/src/messages/ (en.json + fr.json).

## Structure des traductions

apps/web/src/messages/
├── en.json # Source de vérité (~400+ clés)
└── fr.json # Doit avoir exactement les mêmes clés

## Règles critiques

- en.json et fr.json doivent avoir les MÊMES clés (jamais de clé orpheline)
- Clés en camelCase, groupées par namespace : `{ "dashboard": { "title": "..." } }`
- Placeholders : `{variable}` — mêmes placeholders dans les deux langues
- Jamais de HTML dans les valeurs — utiliser `<bold>text</bold>` + rich text next-intl
- Toujours ajouter dans LES DEUX fichiers simultanément

## Ajouter une clé

1. Déterminer le namespace (dashboard, ais, settings, common, chat...)
2. Ajouter dans en.json ET fr.json au même endroit
3. Utiliser dans le code : `const t = useTranslations('namespace'); t('key')`

## Vérification rapide

```bash
# Comparer les clés entre en.json et fr.json
node -e "
const en = require('./apps/web/src/messages/en.json');
const fr = require('./apps/web/src/messages/fr.json');
const flatten = (obj, p='') => Object.entries(obj).flatMap(([k,v]) =>
  typeof v === 'object' ? flatten(v, p+k+'.') : [p+k]);
const enKeys = new Set(flatten(en));
const frKeys = new Set(flatten(fr));
const missing = [...enKeys].filter(k => !frKeys.has(k));
const extra = [...frKeys].filter(k => !enKeys.has(k));
if (missing.length) console.log('Missing in fr.json:', missing);
if (extra.length) console.log('Extra in fr.json:', extra);
if (!missing.length && !extra.length) console.log('OK — all keys match');
"
```

## Checklist

- [ ] Clé présente dans en.json ET fr.json
- [ ] Mêmes placeholders {var} dans les deux langues
- [ ] Namespace cohérent avec les namespaces existants
- [ ] Pas de HTML brut dans les valeurs
