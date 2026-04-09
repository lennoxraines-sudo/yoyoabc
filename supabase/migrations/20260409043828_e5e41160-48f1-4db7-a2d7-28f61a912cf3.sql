
-- Add constraints only if they don't exist (using DO block)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'dm_sender_length') THEN
    ALTER TABLE direct_messages ADD CONSTRAINT dm_sender_length CHECK (char_length(sender_username) <= 50);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'dm_receiver_length') THEN
    ALTER TABLE direct_messages ADD CONSTRAINT dm_receiver_length CHECK (char_length(receiver_username) <= 50);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'dm_content_length') THEN
    ALTER TABLE direct_messages ADD CONSTRAINT dm_content_length CHECK (char_length(content) <= 2000);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'messages_content_length') THEN
    ALTER TABLE messages ADD CONSTRAINT messages_content_length CHECK (char_length(content) <= 2000);
  END IF;
END$$;

-- Remove direct_messages from realtime publication (ignore error if not in publication)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime DROP TABLE public.direct_messages;
EXCEPTION WHEN OTHERS THEN
  NULL;
END$$;
