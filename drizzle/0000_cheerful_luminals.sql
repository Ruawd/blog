CREATE TABLE `posts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`content` text DEFAULT '' NOT NULL,
	`category` text DEFAULT '随笔' NOT NULL,
	`tags_json` text DEFAULT '[]' NOT NULL,
	`image` text,
	`source_link` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`published_at` text NOT NULL,
	`reading_minutes` integer DEFAULT 1 NOT NULL,
	`author_email` text NOT NULL,
	`updated_by` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `posts_slug_unique` ON `posts` (`slug`);--> statement-breakpoint
CREATE INDEX `posts_status_published_idx` ON `posts` (`status`,`published_at`);