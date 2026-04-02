
-- Create profiles table
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'username', 'USER_' || LEFT(NEW.id::text, 8)));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Add user_id to messages
ALTER TABLE public.messages ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id to direct_messages
ALTER TABLE public.direct_messages ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add validation constraints
ALTER TABLE public.messages ADD CONSTRAINT messages_content_length CHECK (char_length(content) <= 2000);
ALTER TABLE public.messages ADD CONSTRAINT messages_username_length CHECK (char_length(username) <= 50);
ALTER TABLE public.direct_messages ADD CONSTRAINT dm_content_length CHECK (char_length(content) <= 2000);
ALTER TABLE public.direct_messages ADD CONSTRAINT dm_username_length CHECK (char_length(sender_username) <= 50 AND char_length(receiver_username) <= 50);

-- Drop old permissive policies on messages
DROP POLICY IF EXISTS "Anyone can read messages" ON public.messages;
DROP POLICY IF EXISTS "Anyone can send messages" ON public.messages;

-- New authenticated policies for messages
CREATE POLICY "Authenticated users can read messages" ON public.messages
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can send messages" ON public.messages
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Drop old permissive policies on direct_messages
DROP POLICY IF EXISTS "Anyone can read DMs they're part of" ON public.direct_messages;
DROP POLICY IF EXISTS "Anyone can send DMs" ON public.direct_messages;

-- New authenticated policies for direct_messages
CREATE POLICY "Users can read their own DMs" ON public.direct_messages
  FOR SELECT TO authenticated
  USING (
    sender_username = (SELECT username FROM public.profiles WHERE id = auth.uid())
    OR receiver_username = (SELECT username FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Authenticated users can send DMs" ON public.direct_messages
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
