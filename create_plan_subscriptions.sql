-- Create plan_subscriptions table
CREATE TABLE IF NOT EXISTS public.plan_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
    plan_id UUID REFERENCES public.plans(id) ON DELETE CASCADE NOT NULL,
    status TEXT DEFAULT 'pending'::text NOT NULL,
    notes TEXT,
    activated_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    features_usage JSONB DEFAULT '{}'::jsonb,
    CONSTRAINT status_check CHECK (status IN ('pending', 'active', 'completed', 'cancelled'))
);

-- Enable RLS
ALTER TABLE public.plan_subscriptions ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (from public site)
CREATE POLICY "Allow public insert to plan_subscriptions" ON public.plan_subscriptions
    FOR INSERT
    TO public
    WITH CHECK (true);

-- Allow admins all access
CREATE POLICY "Allow authenticated full access to plan_subscriptions" ON public.plan_subscriptions
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Allow reading for public to show statuses (if needed) but primarily restricted to admin
CREATE POLICY "Allow public read to plan_subscriptions" ON public.plan_subscriptions
    FOR SELECT
    TO public
    USING (true);
