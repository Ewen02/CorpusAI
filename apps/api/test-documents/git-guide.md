# Guide Git Complet

## Introduction

Git est un système de contrôle de version distribué créé par Linus Torvalds en 2005 pour le développement du noyau Linux. Git permet de suivre les modifications apportées aux fichiers, de collaborer avec d'autres développeurs, et de gérer différentes versions d'un projet.

Contrairement aux systèmes centralisés (SVN, CVS), Git est distribué : chaque développeur possède une copie complète de l'historique du projet. Cela permet de travailler hors ligne et offre une meilleure résilience.

---

## Concepts Fondamentaux

### Le modèle Git

Git utilise trois zones principales :

1. **Working Directory** (Répertoire de travail) : vos fichiers actuels
2. **Staging Area** (Index) : zone de préparation pour le prochain commit
3. **Repository** (.git) : historique complet des commits

### Les états des fichiers

- **Untracked** : nouveau fichier non suivi par Git
- **Staged** : fichier ajouté à l'index, prêt pour le commit
- **Committed** : changements enregistrés dans l'historique
- **Modified** : fichier modifié depuis le dernier commit

---

## Commandes de Base

### Configuration initiale

```bash
# Configurer son identité
git config --global user.name "Votre Nom"
git config --global user.email "votre.email@example.com"

# Vérifier la configuration
git config --list

# Configurer l'éditeur par défaut
git config --global core.editor "code --wait"
```

### Créer ou cloner un repository

```bash
# Initialiser un nouveau repository
git init

# Cloner un repository existant
git clone https://github.com/user/repo.git

# Cloner dans un dossier spécifique
git clone https://github.com/user/repo.git mon-dossier

# Cloner une branche spécifique
git clone -b develop https://github.com/user/repo.git
```

### Vérifier l'état du repository

```bash
# État des fichiers
git status

# État condensé
git status -s

# Voir les différences non indexées
git diff

# Voir les différences indexées
git diff --staged
```

### Ajouter des fichiers (staging)

```bash
# Ajouter un fichier spécifique
git add fichier.txt

# Ajouter plusieurs fichiers
git add fichier1.txt fichier2.txt

# Ajouter tous les fichiers modifiés
git add .

# Ajouter tous les fichiers avec extension .js
git add "*.js"

# Ajouter interactivement
git add -p
```

### Créer un commit

```bash
# Commit avec message
git commit -m "Description du changement"

# Commit avec message multi-lignes
git commit -m "Titre" -m "Description détaillée"

# Ajouter et commiter en une commande
git commit -am "Message"

# Modifier le dernier commit
git commit --amend -m "Nouveau message"

# Ajouter des fichiers oubliés au dernier commit
git add fichier-oublie.txt
git commit --amend --no-edit
```

### Synchroniser avec le remote

```bash
# Ajouter un remote
git remote add origin https://github.com/user/repo.git

# Lister les remotes
git remote -v

# Pousser les commits
git push origin main

# Pousser et définir l'upstream
git push -u origin main

# Récupérer les changements (sans fusionner)
git fetch origin

# Récupérer et fusionner
git pull origin main

# Pull avec rebase
git pull --rebase origin main
```

---

## Gestion des Branches

### Qu'est-ce qu'une branche ?

Une branche est un pointeur vers un commit. La branche par défaut s'appelle généralement `main` (ou `master`). Les branches permettent de développer des fonctionnalités isolément.

### Commandes de branches

```bash
# Lister les branches locales
git branch

# Lister toutes les branches (locales et distantes)
git branch -a

# Créer une nouvelle branche
git branch feature/nouvelle-fonctionnalite

# Créer et basculer sur une nouvelle branche
git checkout -b feature/nouvelle-fonctionnalite
# ou (Git 2.23+)
git switch -c feature/nouvelle-fonctionnalite

# Basculer sur une branche existante
git checkout develop
# ou
git switch develop

# Renommer une branche
git branch -m ancien-nom nouveau-nom

# Supprimer une branche locale
git branch -d feature/terminee

# Forcer la suppression
git branch -D feature/abandonnee

# Supprimer une branche distante
git push origin --delete feature/terminee
```

### Stratégie de nommage des branches

Convention courante :
- `main` / `master` : branche principale, production
- `develop` : branche de développement
- `feature/nom` : nouvelles fonctionnalités
- `bugfix/nom` : corrections de bugs
- `hotfix/nom` : corrections urgentes en production
- `release/version` : préparation d'une release

---

## Merge (Fusion)

### Comment fonctionne le merge ?

Le merge combine les historiques de deux branches. Git crée un "merge commit" qui a deux parents.

```bash
# Se placer sur la branche de destination
git checkout main

# Fusionner une branche
git merge feature/ma-fonctionnalite

# Merge sans fast-forward (force un merge commit)
git merge --no-ff feature/ma-fonctionnalite

# Annuler un merge en cours
git merge --abort
```

### Types de merge

**Fast-forward** : Si la branche cible n'a pas divergé, Git déplace simplement le pointeur.

```
Avant (fast-forward possible) :
main:    A---B
              \
feature:       C---D

Après git merge feature :
main:    A---B---C---D
```

**Merge commit** : Si les branches ont divergé, Git crée un commit de fusion.

```
Avant :
main:    A---B---E
              \
feature:       C---D

Après git merge feature :
main:    A---B---E---M
              \     /
feature:       C---D
```

---

## Rebase

### Comment fonctionne le rebase ?

Le rebase "rejoue" les commits d'une branche sur une autre, créant un historique linéaire.

```bash
# Se placer sur la branche à rebaser
git checkout feature/ma-fonctionnalite

# Rebaser sur main
git rebase main

# Rebase interactif (modifier l'historique)
git rebase -i main

# Continuer après résolution de conflit
git rebase --continue

# Annuler le rebase
git rebase --abort
```

### Visualisation du rebase

```
Avant :
main:    A---B---C
              \
feature:       D---E

Après git rebase main (depuis feature) :
main:    A---B---C
                  \
feature:           D'---E'
```

### Rebase interactif

Le rebase interactif permet de modifier l'historique :

```bash
git rebase -i HEAD~3
```

Options disponibles :
- `pick` : garder le commit tel quel
- `reword` : modifier le message
- `edit` : modifier le commit
- `squash` : fusionner avec le commit précédent
- `fixup` : fusionner sans garder le message
- `drop` : supprimer le commit

### Merge vs Rebase : quand utiliser quoi ?

**Utilisez merge quand :**
- Vous fusionnez une feature dans main/develop
- Vous voulez préserver l'historique complet
- Vous travaillez sur une branche partagée

**Utilisez rebase quand :**
- Vous mettez à jour votre branche feature avec main
- Vous voulez un historique linéaire et propre
- Vous travaillez seul sur votre branche

**Règle d'or** : Ne jamais rebaser une branche partagée avec d'autres développeurs.

---

## Résolution de Conflits

### Quand surviennent les conflits ?

Les conflits surviennent quand Git ne peut pas fusionner automatiquement les modifications, par exemple quand deux branches modifient la même ligne.

### Identifier les conflits

```bash
# Après un merge/rebase avec conflit
git status
# Affiche : "both modified: fichier.txt"
```

### Structure d'un conflit

```
<<<<<<< HEAD
Code de votre branche actuelle
=======
Code de la branche à fusionner
>>>>>>> feature/autre-branche
```

### Résoudre manuellement

1. Ouvrir le fichier en conflit
2. Choisir le code à garder (ou combiner)
3. Supprimer les marqueurs de conflit
4. Ajouter le fichier résolu

```bash
# Après résolution
git add fichier.txt

# Pour un merge
git commit

# Pour un rebase
git rebase --continue
```

### Outils de résolution

```bash
# Utiliser l'outil de merge configuré
git mergetool

# Accepter notre version
git checkout --ours fichier.txt

# Accepter leur version
git checkout --theirs fichier.txt
```

---

## Workflows Git

### Git Flow

Workflow structuré pour projets avec cycles de release :

- `main` : production stable
- `develop` : intégration des features
- `feature/*` : développement de fonctionnalités
- `release/*` : préparation de release
- `hotfix/*` : corrections urgentes

```bash
# Démarrer une feature
git checkout develop
git checkout -b feature/nouvelle-fonctionnalite

# Terminer une feature
git checkout develop
git merge --no-ff feature/nouvelle-fonctionnalite
git branch -d feature/nouvelle-fonctionnalite

# Créer une release
git checkout develop
git checkout -b release/1.0.0
# Corrections, mise à jour version...
git checkout main
git merge --no-ff release/1.0.0
git tag -a v1.0.0 -m "Version 1.0.0"
```

### GitHub Flow

Workflow simplifié pour déploiement continu :

1. Créer une branche depuis `main`
2. Développer et commiter
3. Ouvrir une Pull Request
4. Review et discussion
5. Merge dans `main` et déployer

```bash
git checkout main
git pull
git checkout -b feature/ma-feature
# Développer...
git push -u origin feature/ma-feature
# Créer PR sur GitHub
# Après approbation, merge via l'interface
```

### Trunk Based Development

Développement directement sur `main` avec feature flags :

- Commits fréquents sur `main`
- Branches courtes (< 1 jour)
- Feature flags pour cacher les fonctionnalités incomplètes
- CI/CD robuste

---

## Commandes Avancées

### Git stash

Mettre de côté temporairement des modifications :

```bash
# Stash les modifications
git stash

# Stash avec message
git stash save "Message descriptif"

# Lister les stash
git stash list

# Appliquer le dernier stash
git stash pop

# Appliquer sans supprimer
git stash apply

# Appliquer un stash spécifique
git stash apply stash@{2}

# Supprimer un stash
git stash drop stash@{0}

# Vider tous les stash
git stash clear
```

### Git cherry-pick

Appliquer un commit spécifique sur la branche actuelle :

```bash
# Cherry-pick un commit
git cherry-pick abc123

# Cherry-pick plusieurs commits
git cherry-pick abc123 def456

# Cherry-pick sans commiter
git cherry-pick -n abc123
```

### Git bisect

Trouver le commit qui a introduit un bug :

```bash
# Démarrer la recherche
git bisect start

# Marquer le commit actuel comme mauvais
git bisect bad

# Marquer un commit connu comme bon
git bisect good abc123

# Git checkout automatiquement un commit
# Tester et marquer :
git bisect good  # ou git bisect bad

# Répéter jusqu'à trouver le commit fautif

# Terminer
git bisect reset
```

### Git reflog

Historique de toutes les actions (même les commits "perdus") :

```bash
# Voir le reflog
git reflog

# Récupérer un commit "perdu"
git checkout abc123
# ou
git reset --hard abc123
```

---

## FAQ - Questions Fréquentes

### Comment annuler un commit ?

```bash
# Annuler le dernier commit (garder les modifications)
git reset --soft HEAD~1

# Annuler le dernier commit (modifications dans working dir)
git reset HEAD~1

# Annuler le dernier commit (supprimer les modifications)
git reset --hard HEAD~1

# Créer un commit inverse (pour branche partagée)
git revert HEAD
```

### Comment modifier le dernier commit ?

```bash
# Modifier le message
git commit --amend -m "Nouveau message"

# Ajouter des fichiers oubliés
git add fichier-oublie.txt
git commit --amend --no-edit
```

### Comment récupérer un fichier supprimé ?

```bash
# Si pas encore commité
git checkout -- fichier.txt

# Si commité, restaurer depuis un commit
git checkout abc123 -- fichier.txt

# Trouver le commit de suppression
git log --diff-filter=D --summary | grep fichier.txt
```

### Comment nettoyer les branches obsolètes ?

```bash
# Supprimer les références aux branches distantes supprimées
git fetch --prune

# Lister les branches fusionnées
git branch --merged main

# Supprimer les branches fusionnées
git branch --merged main | grep -v main | xargs git branch -d
```

### Comment ignorer des fichiers ?

Créer un fichier `.gitignore` :

```
# Ignorer les fichiers de build
dist/
build/

# Ignorer node_modules
node_modules/

# Ignorer les fichiers d'environnement
.env
.env.local

# Ignorer les fichiers de log
*.log

# Ignorer les fichiers IDE
.vscode/
.idea/
```

---

## Ressources

- [Documentation officielle Git](https://git-scm.com/doc)
- [Pro Git Book (gratuit)](https://git-scm.com/book/fr/v2)
- [GitHub Guides](https://guides.github.com/)
- [Atlassian Git Tutorials](https://www.atlassian.com/git/tutorials)
- [Learn Git Branching (interactif)](https://learngitbranching.js.org/)
