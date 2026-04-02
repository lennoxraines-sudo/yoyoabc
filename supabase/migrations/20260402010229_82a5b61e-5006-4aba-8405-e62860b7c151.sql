
CREATE TABLE public.direct_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_username text NOT NULL,
  receiver_username text NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read DMs they're part of" ON public.direct_messages
  FOR SELECT TO public USING (true);

CREATE POLICY "Anyone can send DMs" ON public.direct_messages
  FOR INSERT TO public WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;
