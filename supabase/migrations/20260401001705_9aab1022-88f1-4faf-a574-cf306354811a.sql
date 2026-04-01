
-- Add channel column to messages
ALTER TABLE public.messages ADD COLUMN channel TEXT NOT NULL DEFAULT 'chilling';

-- Create channels table
CREATE TABLE public.channels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  icon TEXT NOT NULL DEFAULT '💬',
  sort_order INTEGER NOT NULL DEFAULT 0
);

ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read channels" ON public.channels FOR SELECT USING (true);

-- Insert default channels
INSERT INTO public.channels (name, description, icon, sort_order) VALUES
  ('gaming', 'Talk about games', '🎮', 1),
  ('chilling', 'Hang out and vibe', '😎', 2),
  ('memes', 'Share funny stuff', '🐸', 3),
  ('suggestions', 'Ideas and feedback', '💡', 4),
  ('announcements', 'Important updates', '📢', 5),
  ('music', 'Share and discuss music', '🎵', 6),
  ('tech', 'Technology discussion', '⚡', 7);

-- Enable realtime for channels (for online counts etc)
ALTER PUBLICATION supabase_realtime ADD TABLE public.channels;
