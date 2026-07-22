CREATE TABLE `album_collections` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `slug` text NOT NULL,
  `title` text NOT NULL,
  `description` text DEFAULT '' NOT NULL,
  `period` text DEFAULT '' NOT NULL,
  `cover_src` text DEFAULT '' NOT NULL,
  `sort_order` integer NOT NULL,
  `updated_by` text NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `album_collections_slug_unique` ON `album_collections` (`slug`);
--> statement-breakpoint
CREATE UNIQUE INDEX `album_collections_sort_order_unique` ON `album_collections` (`sort_order`);
--> statement-breakpoint
INSERT INTO `album_collections` (
  `slug`, `title`, `description`, `period`, `cover_src`, `sort_order`, `updated_by`
) VALUES (
  'firefly',
  '流萤相册',
  '崩坏：星穹铁道中的流萤插画收藏。',
  '2026.01.01',
  '/blog-media/gallery/firefly-2026/cover.avif',
  0,
  'migration'
);
--> statement-breakpoint
ALTER TABLE `album_photos` ADD `album_slug` text DEFAULT 'firefly' NOT NULL;
--> statement-breakpoint
DROP INDEX IF EXISTS `album_photos_sort_order_unique`;
--> statement-breakpoint
CREATE UNIQUE INDEX `album_photos_album_order_unique` ON `album_photos` (`album_slug`,`sort_order`);
--> statement-breakpoint
CREATE INDEX `album_photos_album_idx` ON `album_photos` (`album_slug`);
