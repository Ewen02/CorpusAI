Vérifie la cohérence des traductions FR/EN dans apps/web/src/messages/.

Steps:

1. Lire en.json et fr.json
2. Extraire toutes les clés (aplatir les objets imbriqués en notation dotée)
3. Comparer les sets de clés :
   - Clés dans en.json mais pas fr.json → **MISSING in fr.json**
   - Clés dans fr.json mais pas en.json → **EXTRA in fr.json** (orphelines)
4. Pour chaque clé présente dans les deux : vérifier que les placeholders `{variable}` sont identiques
5. Vérifier qu'aucune valeur n'est vide (`""`) dans l'une ou l'autre langue

## Output format

```
## i18n Check — YYYY-MM-DD

Total keys: X en.json / Y fr.json

### Missing in fr.json (N)
- namespace.key

### Extra in fr.json (N)
- namespace.key

### Placeholder mismatch (N)
- namespace.key: en has {name}, fr missing {name}

### Empty values (N)
- fr.json: namespace.key

### Verdict
OK / X issues found
```

Si tout est OK : "✅ Traductions synchronisées — X clés dans chaque langue."
