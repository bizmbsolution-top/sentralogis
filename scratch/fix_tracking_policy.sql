-- Allow public (anon) read access to job_tracking to support Global Radar and Public Tracking pages
ALTER POLICY "Enable read access for all users" ON "public"."job_tracking" 
TO public
USING (true);
