
DROP POLICY IF EXISTS "Admins can manage campaign access" ON admin_campaign_access;
DROP POLICY IF EXISTS "Admins can view campaign access" ON admin_campaign_access;

CREATE POLICY "Allow public read campaign access" ON admin_campaign_access FOR SELECT TO public USING (true);
CREATE POLICY "Allow public manage campaign access" ON admin_campaign_access FOR ALL TO public USING (true) WITH CHECK (true);
