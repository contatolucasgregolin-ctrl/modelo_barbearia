-- Create promotion_interests table
CREATE TABLE IF NOT EXISTS public.promotion_interests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
    promotion_id UUID REFERENCES public.promotions(id) ON DELETE CASCADE NOT NULL,
    status TEXT DEFAULT 'pending'::text NOT NULL,
    notes TEXT,
    customer_name TEXT,
    customer_phone TEXT,
    CONSTRAINT status_check CHECK (status IN ('pending', 'contacted', 'completed', 'cancelled'))
);

-- Enable RLS
ALTER TABLE public.promotion_interests ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (from public site)
CREATE POLICY "Allow public insert to promotion_interests" ON public.promotion_interests
    FOR INSERT
    TO public
    WITH CHECK (true);

-- Allow admins all access
CREATE POLICY "Allow authenticated full access to promotion_interests" ON public.promotion_interests
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Allow reading for public (if needed)
CREATE POLICY "Allow public read to promotion_interests" ON public.promotion_interests
    FOR SELECT
    TO public
    USING (true);
