-- Adiciona a coluna commission_percentage (se não existir)
-- Isso resolve o erro: Could not find the 'commission_percentage' column of 'artists'
ALTER TABLE public.artists 
ADD COLUMN IF NOT EXISTS commission_percentage DECIMAL(5,2) DEFAULT 0.00;

-- Opcional: Atualiza o schema cache do supabase forçando um reload
NOTIFY pgrst, 'reload schema';
