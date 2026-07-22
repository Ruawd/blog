CREATE TABLE `comments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`scope` text NOT NULL,
	`target` text NOT NULL,
	`nickname` text NOT NULL,
	`email` text,
	`website` text,
	`content` text NOT NULL,
	`status` text DEFAULT 'approved' NOT NULL,
	`ip_hash` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `comments_scope_target_idx` ON `comments` (`scope`,`target`,`status`,`created_at`);--> statement-breakpoint
CREATE TABLE `page_contents` (
	`key` text PRIMARY KEY NOT NULL,
	`eyebrow` text DEFAULT '' NOT NULL,
	`title` text DEFAULT '' NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`body` text DEFAULT '' NOT NULL,
	`updated_by` text NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
