UPDATE campaigns 
SET status = 'sending', 
    started_at = NOW(), 
    scheduled_at = NOW(),
    total_recipients = 2394,
    target_tags = '{}'
WHERE id = 'cf126ba7-23f8-46ff-bff5-5105cd8533a6';