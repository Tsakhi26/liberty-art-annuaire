# Ajout du champ Google Drive

## Script SQL à exécuter sur Supabase

Pour ajouter le champ Google Drive à la table `students`, exécutez ce script SQL dans l'éditeur SQL de Supabase :

```sql
-- Ajouter la colonne google_drive_url à la table students
ALTER TABLE students ADD COLUMN google_drive_url TEXT;
```

## Instructions

1. Allez sur : https://supabase.com/dashboard/project/edrbriqwisojtgbueklq/editor
2. Cliquez sur "SQL Editor" dans le menu de gauche
3. Cliquez sur "+ New query"
4. Copiez-collez le script SQL ci-dessus
5. Cliquez sur "Run" (ou Ctrl+Enter)
6. Vous devriez voir : "Success. No rows returned" ✅

## Fonctionnalités ajoutées

- ✅ Champ Google Drive dans le formulaire d'inscription
- ✅ Logo Google Drive (vert) dans la galerie publique et iframe
- ✅ Champ Google Drive dans le modal de modification de l'admin
- ✅ Affichage du lien Google Drive dans les cartes élèves

## Icône utilisée

- **Google Drive** : Icône verte de `react-icons/si` (SiGoogledrive)
