-- Initialisation PostgreSQL avec pgvector
-- Exécuté automatiquement au premier démarrage du conteneur

-- Activer l'extension pgvector pour les embeddings vectoriels
CREATE EXTENSION IF NOT EXISTS vector;

-- Vérification que l'extension est bien installée
SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';
