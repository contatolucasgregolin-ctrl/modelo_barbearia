-- Adiciona coluna de porcentagem de comissão para profissionais
-- Execute este script no SQL Editor do seu Dashboard Supabase

ALTER TABLE artists 
ADD COLUMN IF NOT EXISTS commission_percentage NUMERIC DEFAULT 0;

-- Opcional: Recarregar o cache do schema se o erro de "coluna não encontrada" persistir
-- NOTIFY pgrst, 'reload schema';
