-- Drop the overly permissive RLS policy that exposes email addresses
DROP POLICY IF EXISTS "Allow rate limit tracking" ON submission_rate_limit;

-- Create a restrictive policy that blocks all direct access
-- Rate limiting will still work via the SECURITY DEFINER trigger check_submission_rate_limit()
CREATE POLICY "Deny all direct access"
ON submission_rate_limit
FOR ALL
USING (false)
WITH CHECK (false);