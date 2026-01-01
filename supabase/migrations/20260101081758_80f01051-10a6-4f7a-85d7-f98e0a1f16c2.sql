-- First, remove duplicates keeping only the oldest message per message_id
DELETE FROM support_messages a
USING support_messages b
WHERE a.id > b.id 
  AND a.message_id = b.message_id 
  AND a.message_id IS NOT NULL;

-- Add unique constraint on message_id (allowing nulls to be non-unique)
CREATE UNIQUE INDEX IF NOT EXISTS idx_support_messages_unique_message_id 
ON support_messages (message_id) 
WHERE message_id IS NOT NULL;