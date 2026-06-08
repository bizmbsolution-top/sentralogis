-- 092_loading_sessions_rls.sql
ALTER TABLE wh_loading_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable public ALL on loading_sessions"
  ON wh_loading_sessions FOR ALL USING (true);

-- Also need to grant access to anon and authenticated roles
GRANT ALL ON TABLE wh_loading_sessions TO anon;
GRANT ALL ON TABLE wh_loading_sessions TO authenticated;

NOTIFY pgrst, 'reload schema';
