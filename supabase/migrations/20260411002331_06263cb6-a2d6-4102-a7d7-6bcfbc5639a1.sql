
-- Create servers table
CREATE TABLE public.servers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
  description TEXT NOT NULL DEFAULT '',
  icon TEXT NOT NULL DEFAULT '🖥️',
  owner_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.servers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can browse servers"
  ON public.servers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create servers"
  ON public.servers FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update their server"
  ON public.servers FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can delete their server"
  ON public.servers FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id);

-- Create server_members table
CREATE TYPE public.server_role AS ENUM ('owner', 'moderator', 'member');

CREATE TABLE public.server_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  server_id UUID NOT NULL REFERENCES public.servers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role server_role NOT NULL DEFAULT 'member',
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (server_id, user_id)
);

ALTER TABLE public.server_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can see server members"
  ON public.server_members FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.server_members sm
      WHERE sm.server_id = server_members.server_id
        AND sm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can join servers"
  ON public.server_members FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id AND role = 'member');

CREATE POLICY "Owners can update member roles"
  ON public.server_members FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.server_members sm
      WHERE sm.server_id = server_members.server_id
        AND sm.user_id = auth.uid()
        AND sm.role = 'owner'
    )
  );

CREATE POLICY "Owners and moderators can remove members"
  ON public.server_members FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.server_members sm
      WHERE sm.server_id = server_members.server_id
        AND sm.user_id = auth.uid()
        AND sm.role IN ('owner', 'moderator')
    )
  );

-- Add server_id to channels (nullable = global)
ALTER TABLE public.channels ADD COLUMN server_id UUID REFERENCES public.servers(id) ON DELETE CASCADE;

-- Add server_id to messages (nullable = global)
ALTER TABLE public.messages ADD COLUMN server_id UUID REFERENCES public.servers(id) ON DELETE CASCADE;

-- Server-scoped bans
CREATE TABLE public.server_bans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  server_id UUID NOT NULL REFERENCES public.servers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  banned_by UUID NOT NULL,
  reason TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (server_id, user_id)
);

ALTER TABLE public.server_bans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Server owners and mods can manage bans"
  ON public.server_bans FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.server_members sm
      WHERE sm.server_id = server_bans.server_id
        AND sm.user_id = auth.uid()
        AND sm.role IN ('owner', 'moderator')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.server_members sm
      WHERE sm.server_id = server_bans.server_id
        AND sm.user_id = auth.uid()
        AND sm.role IN ('owner', 'moderator')
    )
  );

CREATE POLICY "Users can check own server ban"
  ON public.server_bans FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- RLS for channels in servers: members can read server channels
CREATE POLICY "Members can read server channels"
  ON public.channels FOR SELECT
  TO authenticated
  USING (
    server_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.server_members sm
      WHERE sm.server_id = channels.server_id
        AND sm.user_id = auth.uid()
    )
  );

-- Drop the old public select policy for channels since the new one covers it
DROP POLICY IF EXISTS "Anyone can read channels" ON public.channels;

-- Server owners/mods can create channels
CREATE POLICY "Server owners and mods can create channels"
  ON public.channels FOR INSERT
  TO authenticated
  WITH CHECK (
    server_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.server_members sm
      WHERE sm.server_id = channels.server_id
        AND sm.user_id = auth.uid()
        AND sm.role IN ('owner', 'moderator')
    )
  );

-- Server owners/mods can delete channels
CREATE POLICY "Server owners and mods can delete channels"
  ON public.channels FOR DELETE
  TO authenticated
  USING (
    server_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.server_members sm
      WHERE sm.server_id = channels.server_id
        AND sm.user_id = auth.uid()
        AND sm.role IN ('owner', 'moderator')
    )
  );

-- Auto-add owner as member when creating a server
CREATE OR REPLACE FUNCTION public.handle_new_server()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.server_members (server_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner');

  -- Create a default "general" channel
  INSERT INTO public.channels (name, description, icon, server_id, sort_order)
  VALUES ('general', 'General chat', '💬', NEW.id, 0);

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_server_created
  AFTER INSERT ON public.servers
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_server();
