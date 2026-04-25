-- Track the Stripe subscription item ID for the backup add-on.
-- Storing this allows us to remove the exact item when the user cancels the add-on.
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS backup_addon_stripe_item_id TEXT NULL;

-- Track whether Acronis Backup has been activated on the DirectAdmin account.
ALTER TABLE sites ADD COLUMN IF NOT EXISTS backup_enabled BOOLEAN NOT NULL DEFAULT FALSE;
