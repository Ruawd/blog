CREATE TABLE `bangumi_settings` (
	`id` integer PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`api_base_url` text NOT NULL,
	`subject_base_url` text NOT NULL,
	`user_agent` text NOT NULL,
	`enabled_categories_json` text DEFAULT '["anime","book","music","game"]' NOT NULL,
	`cache_ttl_seconds` integer DEFAULT 900 NOT NULL,
	`include_private` integer DEFAULT 0 NOT NULL,
	`encrypted_access_token` text DEFAULT '' NOT NULL,
	`updated_by` text NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
