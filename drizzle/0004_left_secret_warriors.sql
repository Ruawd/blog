CREATE TABLE `album_photos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`src` text NOT NULL,
	`alt` text NOT NULL,
	`caption` text DEFAULT '' NOT NULL,
	`width` integer NOT NULL,
	`height` integer NOT NULL,
	`sort_order` integer NOT NULL,
	`updated_by` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `album_photos_sort_order_unique` ON `album_photos` (`sort_order`);
--> statement-breakpoint
INSERT INTO `album_photos` (`src`, `alt`, `caption`, `width`, `height`, `sort_order`, `updated_by`) VALUES
	('/blog-media/gallery/firefly-2026/cover.avif', '可爱流萤相册封面', '可爱流萤', 4096, 2212, 0, 'migration'),
	('/blog-media/gallery/firefly-2026/1.avif', '可爱流萤相册图片', '可爱流萤', 1631, 917, 1, 'migration'),
	('/blog-media/gallery/firefly-2026/imported/01.webp', '流萤插画', '可爱流萤', 3840, 2160, 2, 'migration'),
	('https://s41.ax1x.com/2026/05/13/peXyh79.jpg', '流萤插画', '可爱流萤', 3328, 4864, 3, 'migration'),
	('https://s41.ax1x.com/2026/05/13/peXshJP.webp', '流萤插画', '可爱流萤', 2688, 1536, 4, 'migration'),
	('https://s41.ax1x.com/2026/05/13/peXyWm4.jpg', '流萤插画', '可爱流萤', 3328, 4864, 5, 'migration'),
	('https://s41.ax1x.com/2026/05/13/peXsRII.webp', '流萤插画', '可爱流萤', 2416, 1376, 6, 'migration'),
	('https://s41.ax1x.com/2026/05/13/peXyf0J.jpg', '流萤插画', '可爱流萤', 3328, 4864, 7, 'migration'),
	('https://s41.ax1x.com/2026/05/13/peXs2dA.webp', '流萤插画', '可爱流萤', 2688, 1536, 8, 'migration');
