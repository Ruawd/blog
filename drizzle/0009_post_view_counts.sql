CREATE TABLE `post_views` (
  `slug` text PRIMARY KEY NOT NULL,
  `view_count` integer DEFAULT 0 NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `post_view_events` (
  `slug` text NOT NULL,
  `actor_hash` text NOT NULL,
  `viewed_day` text NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  PRIMARY KEY (`slug`, `actor_hash`, `viewed_day`)
);
--> statement-breakpoint
CREATE INDEX `post_view_events_day_idx` ON `post_view_events` (`viewed_day`);
