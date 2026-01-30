-- Create refund_requests table (missing from schema)
CREATE TABLE IF NOT EXISTS refund_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
    reason TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    request_date TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    processed_by VARCHAR(255),
    feedback TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_refund_requests_user_id ON refund_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_refund_requests_status ON refund_requests(status);

-- Enable RLS
ALTER TABLE refund_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own requests
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
            AND tablename = 'refund_requests'
            AND policyname = 'Users can view own refund requests'
    ) THEN
        CREATE POLICY "Users can view own refund requests"
        ON refund_requests FOR SELECT
        USING (user_id = auth.uid());
    END IF;
END $$;

-- Policy: Users can insert their own requests
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
            AND tablename = 'refund_requests'
            AND policyname = 'Users can create refund requests'
    ) THEN
        CREATE POLICY "Users can create refund requests"
        ON refund_requests FOR INSERT
        WITH CHECK (user_id = auth.uid());
    END IF;
END $$;

-- Policy: Admins can view all requests
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
            AND tablename = 'refund_requests'
            AND policyname = 'Admins can view all refund requests'
    ) THEN
        CREATE POLICY "Admins can view all refund requests"
        ON refund_requests FOR SELECT
        USING (
                EXISTS (
                        SELECT 1 FROM users 
                        WHERE users.id = auth.uid() 
                        AND users.role IN ('admin', 'super_admin')
                )
        );
    END IF;
END $$;

-- Policy: Admins can update requests
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
            AND tablename = 'refund_requests'
            AND policyname = 'Admins can update refund requests'
    ) THEN
        CREATE POLICY "Admins can update refund requests"
        ON refund_requests FOR UPDATE
        USING (
                EXISTS (
                        SELECT 1 FROM users 
                        WHERE users.id = auth.uid() 
                        AND users.role IN ('admin', 'super_admin')
                )
        );
    END IF;
END $$;
