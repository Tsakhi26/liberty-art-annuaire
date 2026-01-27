# 🔧 Configuration Supabase pour Liberty Art

## Étape 1: Créer la table `students`

Allez dans **SQL Editor** de votre projet Supabase et exécutez ce script :

```sql
-- Créer la table students
CREATE TABLE students (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  name TEXT NOT NULL,
  insta_url TEXT,
  fb_url TEXT,
  tiktok_url TEXT,
  photo_url TEXT NOT NULL
);

-- Activer Row Level Security
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

-- Politique de lecture publique
CREATE POLICY "Allow public read access" ON students
  FOR SELECT USING (true);

-- Politique d'insertion publique
CREATE POLICY "Allow public insert access" ON students
  FOR INSERT WITH CHECK (true);

-- Politique de suppression publique
CREATE POLICY "Allow public delete access" ON students
  FOR DELETE USING (true);

-- Politique de mise à jour publique
CREATE POLICY "Allow public update access" ON students
  FOR UPDATE USING (true);
```

## Étape 2: Créer le bucket de stockage `student-photos`

1. Allez dans **Storage** dans le menu de gauche
2. Cliquez sur **New bucket**
3. Nom du bucket: `student-photos`
4. Cochez **Public bucket** pour permettre l'accès public aux images
5. Cliquez sur **Create bucket**

## Étape 3: Configurer les politiques du bucket

Allez dans **SQL Editor** et exécutez :

```sql
-- Politique de lecture publique pour les photos
CREATE POLICY "Public Access" ON storage.objects
  FOR SELECT USING (bucket_id = 'student-photos');

-- Politique d'upload publique
CREATE POLICY "Public Upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'student-photos');

-- Politique de suppression publique
CREATE POLICY "Public Delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'student-photos');
```

## ✅ Vérification

Après avoir exécuté ces scripts :

1. **Table students** : Vérifiez dans **Table Editor** que la table existe avec toutes les colonnes
2. **Bucket student-photos** : Vérifiez dans **Storage** que le bucket est créé et public
3. **Politiques** : Vérifiez dans **Authentication > Policies** que toutes les politiques sont actives

## 🚀 Lancer l'application

Une fois Supabase configuré, lancez l'application :

```bash
npm run dev
```

Ouvrez http://localhost:3000 dans votre navigateur.

## 🔐 Identifiants Admin

- **Identifiant**: Isaac
- **Mot de passe**: Polochon85

Accédez à l'admin via : http://localhost:3000/admin

---

**Note**: Les politiques actuelles permettent à tout le monde d'ajouter/supprimer des élèves. Pour une version production, vous devriez restreindre ces permissions.
