# Guide de Déploiement - Liberty Art

## Prérequis

- Compte Vercel (https://vercel.com)
- Vercel CLI installé globalement
- Variables d'environnement Supabase configurées

## Installation de Vercel CLI

```bash
npm install -g vercel@latest
```

## Déploiement en Production

### 1. Se connecter à Vercel (première fois uniquement)

```bash
vercel login
```

### 2. Déployer en production

Depuis le dossier du projet `/liberty-art` :

```bash
vercel deploy --prod
```

### 3. Vérifier le déploiement

Le CLI affichera :
- ✅ URL de production : https://liberty-art.vercel.app
- 🔍 Lien d'inspection du déploiement
- 🔗 URL aliasée

## Configuration des Variables d'Environnement

### Via le Dashboard Vercel

1. Aller sur https://vercel.com/dashboard
2. Sélectionner le projet `liberty-art`
3. Aller dans **Settings** → **Environment Variables**
4. Ajouter les variables suivantes :

| Variable | Valeur | Environnement |
|----------|--------|---------------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL de votre projet Supabase | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé anonyme Supabase | Production, Preview, Development |

### Via la CLI (alternative)

```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
```

## Déploiement Automatique

Vercel déploie automatiquement :
- **Production** : À chaque push sur la branche `main`
- **Preview** : À chaque push sur d'autres branches

## Commandes Utiles

### Déployer en mode preview (test)
```bash
vercel
```

### Voir les déploiements récents
```bash
vercel ls
```

### Voir les logs
```bash
vercel logs
```

### Supprimer un déploiement
```bash
vercel remove [deployment-url]
```

## Résolution de Problèmes

### Erreur : "Cannot read properties of undefined"
```bash
npm install -g vercel@latest
```

### Build échoue
Vérifier que toutes les dépendances sont dans `package.json` :
```bash
npm install
npm run build
```

### Variables d'environnement manquantes
Vérifier dans le dashboard Vercel que toutes les variables sont configurées pour l'environnement Production.

## URLs du Projet

- **Production** : https://liberty-art.vercel.app
- **Admin** : https://liberty-art.vercel.app/admin
- **Inscription** : https://liberty-art.vercel.app/inscription
- **Dashboard Vercel** : https://vercel.com/dashboard

## Notes Importantes

- ⚠️ Ne jamais commiter les fichiers `.env.local` dans Git
- ✅ Toujours tester localement avant de déployer : `npm run build`
- 🔄 Le déploiement prend environ 30-60 secondes
- 📱 Vercel génère automatiquement des versions optimisées pour mobile

## Structure du Projet

```
liberty-art/
├── app/                    # Pages Next.js
│   ├── page.js            # Page d'accueil
│   ├── admin/             # Dashboard admin
│   └── inscription/       # Page d'inscription
├── components/            # Composants React
├── lib/                   # Configuration (Supabase)
├── public/               # Assets statiques
└── package.json          # Dépendances
```

## Support

En cas de problème :
1. Vérifier les logs Vercel : https://vercel.com/dashboard
2. Consulter la documentation : https://vercel.com/docs
3. Vérifier la configuration Supabase
