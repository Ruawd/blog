CREATE TABLE `comment_interactions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`comment_id` integer NOT NULL,
	`actor_hash` text NOT NULL,
	`kind` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`comment_id`) REFERENCES `comments`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `comment_interactions_actor_kind_unique` ON `comment_interactions` (`comment_id`,`actor_hash`,`kind`);--> statement-breakpoint
CREATE INDEX `comment_interactions_comment_kind_idx` ON `comment_interactions` (`comment_id`,`kind`);--> statement-breakpoint
ALTER TABLE `comments` ADD `parent_id` integer REFERENCES comments(id) ON DELETE SET NULL;--> statement-breakpoint
CREATE INDEX `comments_parent_status_idx` ON `comments` (`parent_id`,`status`,`created_at`);
