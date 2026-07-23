CREATE TABLE `channels` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `channels_slug_uidx` ON `channels` (`slug`);--> statement-breakpoint
CREATE TABLE `collections` (
	`code` text PRIMARY KEY NOT NULL,
	`month` text,
	`collection_type` text,
	`style` text,
	`name` text,
	`order_date` integer,
	`production_date` integer,
	`launch_date` integer,
	`budget_vnd` integer,
	`status` text,
	`source_row_hash` text NOT NULL,
	`last_seen_batch_id` integer,
	`is_active` integer DEFAULT true NOT NULL,
	`imported_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`last_seen_batch_id`) REFERENCES `import_batches`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `collections_month_idx` ON `collections` (`month`);--> statement-breakpoint
CREATE INDEX `collections_launch_date_idx` ON `collections` (`launch_date`);--> statement-breakpoint
CREATE TABLE `content_formats` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`standard_record_minutes` integer,
	`standard_edit_minutes` integer,
	`standard_graphic_minutes` integer,
	`standard_content_minutes` integer,
	`standard_checking_minutes` integer,
	`standard_posting_minutes` integer,
	`notes` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `content_formats_name_uidx` ON `content_formats` (`name`);--> statement-breakpoint
CREATE TABLE `expense_requests` (
	`code` text PRIMARY KEY NOT NULL,
	`name` text,
	`collection_code` text,
	`shoot_session_code` text,
	`task_code` text,
	`category` text,
	`requested_amount_vnd` integer,
	`payment_status` text,
	`due_date` integer,
	`paid_date` integer,
	`requester_id` integer,
	`source_row_hash` text NOT NULL,
	`last_seen_batch_id` integer,
	`is_active` integer DEFAULT true NOT NULL,
	`imported_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`collection_code`) REFERENCES `collections`(`code`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`shoot_session_code`) REFERENCES `shoot_sessions`(`code`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`task_code`) REFERENCES `tasks`(`code`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`requester_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`last_seen_batch_id`) REFERENCES `import_batches`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `expense_requests_task_idx` ON `expense_requests` (`task_code`);--> statement-breakpoint
CREATE INDEX `expense_requests_payment_status_idx` ON `expense_requests` (`payment_status`);--> statement-breakpoint
CREATE TABLE `import_batches` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`source_file_name` text NOT NULL,
	`source_file_hash` text NOT NULL,
	`status` text DEFAULT 'processing' NOT NULL,
	`total_rows` integer DEFAULT 0 NOT NULL,
	`inserted_rows` integer DEFAULT 0 NOT NULL,
	`updated_rows` integer DEFAULT 0 NOT NULL,
	`unchanged_rows` integer DEFAULT 0 NOT NULL,
	`archived_rows` integer DEFAULT 0 NOT NULL,
	`error_rows` integer DEFAULT 0 NOT NULL,
	`error_summary` text,
	`imported_at` integer DEFAULT (unixepoch()) NOT NULL,
	`completed_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `import_batches_file_hash_uidx` ON `import_batches` (`source_file_hash`);--> statement-breakpoint
CREATE INDEX `import_batches_created_at_idx` ON `import_batches` (`imported_at`);--> statement-breakpoint
CREATE TABLE `marketing_orders` (
	`code` text PRIMARY KEY NOT NULL,
	`marketing_plan_code` text,
	`title` text,
	`campaign_content` text,
	`format_name` text,
	`priority` text,
	`progress_percent` real,
	`planned_post_date` integer,
	`order_date` integer,
	`received_date` integer,
	`channel_id` integer,
	`source_row_hash` text NOT NULL,
	`last_seen_batch_id` integer,
	`is_active` integer DEFAULT true NOT NULL,
	`imported_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`marketing_plan_code`) REFERENCES `marketing_plans`(`code`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`channel_id`) REFERENCES `channels`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`last_seen_batch_id`) REFERENCES `import_batches`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `marketing_orders_plan_idx` ON `marketing_orders` (`marketing_plan_code`);--> statement-breakpoint
CREATE INDEX `marketing_orders_post_date_idx` ON `marketing_orders` (`planned_post_date`);--> statement-breakpoint
CREATE TABLE `marketing_plans` (
	`code` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`month` text,
	`channel_id` integer,
	`strategic_goal` text,
	`content` text,
	`budget_vnd` integer,
	`status` text,
	`source_row_hash` text NOT NULL,
	`last_seen_batch_id` integer,
	`is_active` integer DEFAULT true NOT NULL,
	`imported_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`channel_id`) REFERENCES `channels`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`last_seen_batch_id`) REFERENCES `import_batches`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `marketing_plans_month_idx` ON `marketing_plans` (`month`);--> statement-breakpoint
CREATE INDEX `marketing_plans_channel_idx` ON `marketing_plans` (`channel_id`);--> statement-breakpoint
CREATE TABLE `people` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`display_name` text NOT NULL,
	`normalized_name` text NOT NULL,
	`role` text,
	`department` text,
	`is_active` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `people_normalized_name_uidx` ON `people` (`normalized_name`);--> statement-breakpoint
CREATE INDEX `people_department_idx` ON `people` (`department`);--> statement-breakpoint
CREATE TABLE `post_products` (
	`post_code` text NOT NULL,
	`product_sku` text NOT NULL,
	PRIMARY KEY(`post_code`, `product_sku`),
	FOREIGN KEY (`post_code`) REFERENCES `posts`(`code`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_sku`) REFERENCES `products`(`sku`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `post_products_product_idx` ON `post_products` (`product_sku`);--> statement-breakpoint
CREATE TABLE `posts` (
	`code` text PRIMARY KEY NOT NULL,
	`booked_task_code` text,
	`post_date` integer,
	`time_slot` text,
	`channel_id` integer,
	`title` text,
	`description` text,
	`detailed_notes` text,
	`product_url` text,
	`published_url` text,
	`is_published` integer DEFAULT false NOT NULL,
	`post_category` text,
	`post_type` text,
	`format_name` text,
	`marketing_format_name` text,
	`reorder_format_name` text,
	`reorder_code` text,
	`marketing_order_code` text,
	`pic_note` text,
	`digital_marketing_note` text,
	`instagram_status` text,
	`threads_status` text,
	`content` text,
	`task_status_snapshot` text,
	`source_row_hash` text NOT NULL,
	`last_seen_batch_id` integer,
	`is_active` integer DEFAULT true NOT NULL,
	`imported_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`booked_task_code`) REFERENCES `tasks`(`code`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`channel_id`) REFERENCES `channels`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`reorder_code`) REFERENCES `reorder_requests`(`code`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`marketing_order_code`) REFERENCES `marketing_orders`(`code`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`last_seen_batch_id`) REFERENCES `import_batches`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `posts_task_idx` ON `posts` (`booked_task_code`);--> statement-breakpoint
CREATE INDEX `posts_date_idx` ON `posts` (`post_date`);--> statement-breakpoint
CREATE INDEX `posts_channel_idx` ON `posts` (`channel_id`);--> statement-breakpoint
CREATE INDEX `posts_publish_state_idx` ON `posts` (`is_published`,`post_date`);--> statement-breakpoint
CREATE TABLE `products` (
	`sku` text PRIMARY KEY NOT NULL,
	`collection_code` text,
	`sale_status` text,
	`launch_month` text,
	`launch_date` integer,
	`drive_source_url` text,
	`drive_final_url` text,
	`source_row_hash` text NOT NULL,
	`last_seen_batch_id` integer,
	`is_active` integer DEFAULT true NOT NULL,
	`imported_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`collection_code`) REFERENCES `collections`(`code`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`last_seen_batch_id`) REFERENCES `import_batches`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `products_collection_idx` ON `products` (`collection_code`);--> statement-breakpoint
CREATE INDEX `products_launch_month_idx` ON `products` (`launch_month`);--> statement-breakpoint
CREATE TABLE `reorder_requests` (
	`code` text PRIMARY KEY NOT NULL,
	`title` text,
	`format_name` text,
	`priority` text,
	`demand` text,
	`channel_id` integer,
	`order_date` integer,
	`received_date` integer,
	`planned_post_date` integer,
	`status` text,
	`source_row_hash` text NOT NULL,
	`last_seen_batch_id` integer,
	`is_active` integer DEFAULT true NOT NULL,
	`imported_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`channel_id`) REFERENCES `channels`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`last_seen_batch_id`) REFERENCES `import_batches`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `reorder_requests_status_idx` ON `reorder_requests` (`status`);--> statement-breakpoint
CREATE INDEX `reorder_requests_post_date_idx` ON `reorder_requests` (`planned_post_date`);--> statement-breakpoint
CREATE TABLE `shoot_sessions` (
	`code` text PRIMARY KEY NOT NULL,
	`shoot_date` integer,
	`time_slot` text,
	`duration_label` text,
	`requirements` text,
	`model_name` text,
	`total_cost_vnd` integer,
	`status` text,
	`source_row_hash` text NOT NULL,
	`last_seen_batch_id` integer,
	`is_active` integer DEFAULT true NOT NULL,
	`imported_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`last_seen_batch_id`) REFERENCES `import_batches`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `shoot_sessions_date_idx` ON `shoot_sessions` (`shoot_date`);--> statement-breakpoint
CREATE TABLE `task_dependencies` (
	`task_code` text NOT NULL,
	`depends_on_task_code` text NOT NULL,
	PRIMARY KEY(`task_code`, `depends_on_task_code`),
	FOREIGN KEY (`task_code`) REFERENCES `tasks`(`code`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`depends_on_task_code`) REFERENCES `tasks`(`code`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `task_dependencies_parent_idx` ON `task_dependencies` (`depends_on_task_code`);--> statement-breakpoint
CREATE TABLE `task_feedback` (
	`code` text PRIMARY KEY NOT NULL,
	`task_code` text NOT NULL,
	`rejected_at` integer,
	`fixed_at` integer,
	`fix_minutes` integer,
	`rejected_by_id` integer,
	`assignee_id` integer,
	`error_description` text,
	`source_row_hash` text NOT NULL,
	`last_seen_batch_id` integer,
	`imported_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`task_code`) REFERENCES `tasks`(`code`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`rejected_by_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`assignee_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`last_seen_batch_id`) REFERENCES `import_batches`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `task_feedback_task_idx` ON `task_feedback` (`task_code`);--> statement-breakpoint
CREATE INDEX `task_feedback_rejected_at_idx` ON `task_feedback` (`rejected_at`);--> statement-breakpoint
CREATE TABLE `task_products` (
	`task_code` text NOT NULL,
	`product_sku` text NOT NULL,
	PRIMARY KEY(`task_code`, `product_sku`),
	FOREIGN KEY (`task_code`) REFERENCES `tasks`(`code`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_sku`) REFERENCES `products`(`sku`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `task_products_product_idx` ON `task_products` (`product_sku`);--> statement-breakpoint
CREATE TABLE `tasks` (
	`code` text PRIMARY KEY NOT NULL,
	`record_id` text,
	`title` text NOT NULL,
	`stage` text,
	`format_id` integer,
	`format_name_raw` text,
	`collection_code` text,
	`reorder_code` text,
	`shoot_session_code` text,
	`marketing_order_code` text,
	`assignee_id` integer,
	`approver_id` integer,
	`creator_id` integer,
	`expected_minutes` integer,
	`status` text NOT NULL,
	`is_outsourced` integer DEFAULT false NOT NULL,
	`start_date` integer,
	`execution_date` integer,
	`checking_date` integer,
	`completed_date` integer,
	`expected_post_date` integer,
	`shoot_date` integer,
	`milestone_deadline` integer,
	`description` text,
	`notes` text,
	`input_url` text,
	`output_url` text,
	`handoff_rating` text,
	`overall_rating` text,
	`quality_score` real,
	`personal_score` real,
	`cost_vnd` integer,
	`week_label` text,
	`source_created_at` integer,
	`source_row_hash` text NOT NULL,
	`last_seen_batch_id` integer,
	`is_active` integer DEFAULT true NOT NULL,
	`imported_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`format_id`) REFERENCES `content_formats`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`collection_code`) REFERENCES `collections`(`code`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`reorder_code`) REFERENCES `reorder_requests`(`code`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`shoot_session_code`) REFERENCES `shoot_sessions`(`code`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`marketing_order_code`) REFERENCES `marketing_orders`(`code`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`assignee_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`approver_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`creator_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`last_seen_batch_id`) REFERENCES `import_batches`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tasks_record_id_uidx` ON `tasks` (`record_id`);--> statement-breakpoint
CREATE INDEX `tasks_status_idx` ON `tasks` (`status`);--> statement-breakpoint
CREATE INDEX `tasks_assignee_idx` ON `tasks` (`assignee_id`);--> statement-breakpoint
CREATE INDEX `tasks_expected_post_date_idx` ON `tasks` (`expected_post_date`);--> statement-breakpoint
CREATE INDEX `tasks_collection_idx` ON `tasks` (`collection_code`);--> statement-breakpoint
CREATE INDEX `tasks_marketing_order_idx` ON `tasks` (`marketing_order_code`);--> statement-breakpoint
CREATE INDEX `tasks_reorder_idx` ON `tasks` (`reorder_code`);