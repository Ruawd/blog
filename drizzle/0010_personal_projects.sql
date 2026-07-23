CREATE TABLE `projects` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`url` text NOT NULL,
	`repo_url` text DEFAULT '' NOT NULL,
	`image_url` text DEFAULT '' NOT NULL,
	`tags_json` text DEFAULT '[]' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`featured` integer DEFAULT 0 NOT NULL,
	`sort_order` integer NOT NULL,
	`updated_by` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT `projects_status_check` CHECK (`status` IN ('draft', 'published', 'archived')),
	CONSTRAINT `projects_featured_check` CHECK (`featured` IN (0, 1))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `projects_slug_unique` ON `projects` (`slug`);
--> statement-breakpoint
CREATE UNIQUE INDEX `projects_sort_order_unique` ON `projects` (`sort_order`);
--> statement-breakpoint
CREATE INDEX `projects_status_order_idx` ON `projects` (`status`, `sort_order`);
--> statement-breakpoint
INSERT INTO `projects` (
	`slug`, `title`, `description`, `url`, `repo_url`, `image_url`, `tags_json`,
	`status`, `featured`, `sort_order`, `updated_by`
) VALUES
	(
		'personal-page',
		'Ruawd 个人页',
		'集中展示文章、相册、番组与数字生活的个人主页。',
		'https://blog.ruawd.de/',
		'https://github.com/Ruawd/blog',
		'',
		'["Next.js","SQLite","Magic UI"]',
		'published',
		1,
		0,
		'migration'
	),
	(
		'sls-image-hosting',
		'SLS 图床',
		'用于图片上传、管理与稳定外链的个人图床服务。',
		'https://sls.ruawd.de/',
		'',
		'',
		'["Image Hosting","Storage"]',
		'published',
		0,
		1,
		'migration'
	),
	(
		'meow-auth',
		'Meow Auth',
		'基于 Casdoor 的统一认证与单点登录入口。',
		'https://casdoor.ruawd.de/',
		'',
		'',
		'["Casdoor","SSO","OIDC"]',
		'published',
		0,
		2,
		'migration'
	);
