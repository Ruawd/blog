CREATE TABLE `friend_links` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`url` text NOT NULL,
	`avatar_url` text DEFAULT '' NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`backlink_url` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`sort_order` integer NOT NULL,
	`review_message` text DEFAULT '' NOT NULL,
	`last_checked_at` text,
	`submitted_ip_hash` text DEFAULT '' NOT NULL,
	`updated_by` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `friend_links_url_unique` ON `friend_links` (`url`);--> statement-breakpoint
CREATE INDEX `friend_links_status_order_idx` ON `friend_links` (`status`,`sort_order`);
--> statement-breakpoint
INSERT INTO `friend_links` (
	`name`, `url`, `avatar_url`, `description`, `backlink_url`, `status`, `sort_order`,
	`review_message`, `last_checked_at`, `submitted_ip_hash`, `updated_by`
) VALUES
	('汐月观测站', 'https://blog.xiyy.de/', 'https://sls.ruawd.de/uploads/20260222/b32c85255d9b8fed7099e4935d15436f.png', '这里的星光与草莓流心，永远为你在线。', '', 'approved', 0, '迁移友链，已保留', NULL, '', 'migration'),
	('Firefly Docs', 'https://docs-firefly.cuteleaf.cn/', 'https://docs-firefly.cuteleaf.cn/logo.png', 'Firefly 主题模板文档', '', 'approved', 1, '迁移友链，已保留', NULL, '', 'migration'),
	('Astro', 'https://github.com/withastro/astro', 'https://avatars.githubusercontent.com/u/44914786?v=4&s=640', '面向内容型网站的 Web 框架。', '', 'approved', 2, '迁移友链，已保留', NULL, '', 'migration');
