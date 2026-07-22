ALTER TABLE `posts` ADD `scheduled_at` text;
--> statement-breakpoint
ALTER TABLE `album_photos` ADD `taken_at` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `album_photos` ADD `original_name` text DEFAULT '' NOT NULL;
--> statement-breakpoint
CREATE TABLE `post_revisions` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `slug` text NOT NULL,
  `snapshot_json` text NOT NULL,
  `updated_by` text NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `post_revisions_slug_created_idx` ON `post_revisions` (`slug`,`created_at`,`id`);
--> statement-breakpoint
CREATE TABLE `post_autosaves` (
  `slug` text PRIMARY KEY NOT NULL,
  `snapshot_json` text NOT NULL,
  `updated_by` text NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `request_rate_limits` (
  `action` text NOT NULL,
  `actor_hash` text NOT NULL,
  `window_started` integer NOT NULL,
  `attempts` integer NOT NULL,
  PRIMARY KEY (`action`, `actor_hash`)
);
--> statement-breakpoint
CREATE INDEX `request_rate_limits_window_idx` ON `request_rate_limits` (`window_started`);
