-- ==============================================================================
-- SCHEMA SUPABASE POUR LE SYSTÈME D'AUTHENTIFICATION & GESTION RBAC TRANSMEX
-- ==============================================================================

-- 1. Activer l'extension UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Création de la table des rôles
CREATE TABLE IF NOT EXISTS public.roles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insertion des rôles fondamentaux Transmex
INSERT INTO public.roles (id, name, description) VALUES
    ('admin', 'Administrateur', 'Accès complet, gestion des utilisateurs, rôles et sécurité'),
    ('rh', 'Ressources Humaines', 'Gestion des collaborateurs, dossiers RH et organigramme'),
    ('manager_stock', 'Gestionnaire Stock', 'Supervision des approvisionnements et entrepôts'),
    ('caissier', 'Caissier', 'Opérations de caisse et encaissements'),
    ('agent', 'Agent Opérationnel', 'Consultation et suivi des services Transmex')
ON CONFLICT (id) DO NOTHING;

-- 3. Table des profils utilisateurs liée à auth.users de Supabase
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'agent' REFERENCES public.roles(id),
    department TEXT DEFAULT 'Services Généraux',
    phone TEXT,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Activer le Row Level Security (RLS) sur la table des profils
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 5. POLICIES RLS (Sécurité des accès)
-- Tout utilisateur authentifié peut lire son propre profil
CREATE POLICY "Les utilisateurs peuvent lire leur propre profil"
    ON public.profiles
    FOR SELECT
    USING (auth.uid() = id);

-- Les administrateurs peuvent lire tous les profils
CREATE POLICY "Les administrateurs peuvent lire tous les profils"
    ON public.profiles
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Les administrateurs peuvent créer/insérer de nouveaux profils
CREATE POLICY "Les administrateurs peuvent insérer des profils"
    ON public.profiles
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Les administrateurs peuvent modifier tous les profils
CREATE POLICY "Les administrateurs peuvent mettre à jour tous les profils"
    ON public.profiles
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Un utilisateur peut modifier ses informations non sensibles (prénom, nom, téléphone)
CREATE POLICY "Les utilisateurs peuvent modifier leurs informations personnelles"
    ON public.profiles
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- 6. Trigger automatique pour créer un profil lors de l'inscription dans auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, first_name, last_name, role, department)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'first_name', 'Utilisateur'),
        COALESCE(NEW.raw_user_meta_data->>'last_name', 'Transmex'),
        COALESCE(NEW.raw_user_meta_data->>'role', 'agent'),
        COALESCE(NEW.raw_user_meta_data->>'department', 'Services Généraux')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
