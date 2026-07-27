CREATE TABLE "channels" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "collections" (
	"code" text PRIMARY KEY NOT NULL,
	"month" text,
	"collection_type" text,
	"style" text,
	"name" text,
	"order_date" timestamp with time zone,
	"production_date" timestamp with time zone,
	"launch_date" timestamp with time zone,
	"budget_vnd" integer,
	"status" text,
	"source_row_hash" text NOT NULL,
	"last_seen_batch_id" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"imported_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_formats" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"standard_record_minutes" integer,
	"standard_edit_minutes" integer,
	"standard_graphic_minutes" integer,
	"standard_content_minutes" integer,
	"standard_checking_minutes" integer,
	"standard_posting_minutes" integer,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "expense_requests" (
	"code" text PRIMARY KEY NOT NULL,
	"name" text,
	"collection_code" text,
	"shoot_session_code" text,
	"task_code" text,
	"category" text,
	"requested_amount_vnd" integer,
	"payment_status" text,
	"due_date" timestamp with time zone,
	"paid_date" timestamp with time zone,
	"requester_id" integer,
	"source_row_hash" text NOT NULL,
	"last_seen_batch_id" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"imported_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "import_batches" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_file_name" text NOT NULL,
	"source_file_hash" text NOT NULL,
	"status" text DEFAULT 'processing' NOT NULL,
	"total_rows" integer DEFAULT 0 NOT NULL,
	"inserted_rows" integer DEFAULT 0 NOT NULL,
	"updated_rows" integer DEFAULT 0 NOT NULL,
	"unchanged_rows" integer DEFAULT 0 NOT NULL,
	"archived_rows" integer DEFAULT 0 NOT NULL,
	"error_rows" integer DEFAULT 0 NOT NULL,
	"error_summary" text,
	"imported_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "marketing_orders" (
	"code" text PRIMARY KEY NOT NULL,
	"marketing_plan_code" text,
	"title" text,
	"campaign_content" text,
	"format_name" text,
	"priority" text,
	"progress_percent" real,
	"planned_post_date" timestamp with time zone,
	"order_date" timestamp with time zone,
	"received_date" timestamp with time zone,
	"channel_id" integer,
	"source_row_hash" text NOT NULL,
	"last_seen_batch_id" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"imported_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketing_plans" (
	"code" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"month" text,
	"channel_id" integer,
	"strategic_goal" text,
	"content" text,
	"budget_vnd" integer,
	"status" text,
	"source_row_hash" text NOT NULL,
	"last_seen_batch_id" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"imported_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "people" (
	"id" serial PRIMARY KEY NOT NULL,
	"display_name" text NOT NULL,
	"normalized_name" text NOT NULL,
	"role" text,
	"department" text,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "post_products" (
	"post_code" text NOT NULL,
	"product_sku" text NOT NULL,
	CONSTRAINT "post_products_post_code_product_sku_pk" PRIMARY KEY("post_code","product_sku")
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"code" text PRIMARY KEY NOT NULL,
	"booked_task_code" text,
	"post_date" timestamp with time zone,
	"time_slot" text,
	"channel_id" integer,
	"title" text,
	"description" text,
	"detailed_notes" text,
	"product_url" text,
	"published_url" text,
	"is_published" boolean DEFAULT false NOT NULL,
	"post_category" text,
	"post_type" text,
	"format_name" text,
	"marketing_format_name" text,
	"reorder_format_name" text,
	"reorder_code" text,
	"marketing_order_code" text,
	"pic_note" text,
	"digital_marketing_note" text,
	"instagram_status" text,
	"threads_status" text,
	"content" text,
	"task_status_snapshot" text,
	"source_row_hash" text NOT NULL,
	"last_seen_batch_id" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"imported_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"sku" text PRIMARY KEY NOT NULL,
	"collection_code" text,
	"sale_status" text,
	"launch_month" text,
	"launch_date" timestamp with time zone,
	"drive_source_url" text,
	"drive_final_url" text,
	"source_row_hash" text NOT NULL,
	"last_seen_batch_id" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"imported_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reorder_requests" (
	"code" text PRIMARY KEY NOT NULL,
	"title" text,
	"format_name" text,
	"priority" text,
	"demand" text,
	"channel_id" integer,
	"order_date" timestamp with time zone,
	"received_date" timestamp with time zone,
	"planned_post_date" timestamp with time zone,
	"status" text,
	"source_row_hash" text NOT NULL,
	"last_seen_batch_id" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"imported_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shoot_sessions" (
	"code" text PRIMARY KEY NOT NULL,
	"shoot_date" timestamp with time zone,
	"time_slot" text,
	"duration_label" text,
	"requirements" text,
	"model_name" text,
	"total_cost_vnd" integer,
	"status" text,
	"source_row_hash" text NOT NULL,
	"last_seen_batch_id" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"imported_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_dependencies" (
	"task_code" text NOT NULL,
	"depends_on_task_code" text NOT NULL,
	CONSTRAINT "task_dependencies_task_code_depends_on_task_code_pk" PRIMARY KEY("task_code","depends_on_task_code")
);
--> statement-breakpoint
CREATE TABLE "task_feedback" (
	"code" text PRIMARY KEY NOT NULL,
	"task_code" text NOT NULL,
	"rejected_at" timestamp with time zone,
	"fixed_at" timestamp with time zone,
	"fix_minutes" integer,
	"rejected_by_id" integer,
	"assignee_id" integer,
	"error_description" text,
	"source_row_hash" text NOT NULL,
	"last_seen_batch_id" integer,
	"imported_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_products" (
	"task_code" text NOT NULL,
	"product_sku" text NOT NULL,
	CONSTRAINT "task_products_task_code_product_sku_pk" PRIMARY KEY("task_code","product_sku")
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"code" text PRIMARY KEY NOT NULL,
	"record_id" text,
	"title" text NOT NULL,
	"stage" text,
	"format_id" integer,
	"format_name_raw" text,
	"collection_code" text,
	"reorder_code" text,
	"shoot_session_code" text,
	"marketing_order_code" text,
	"assignee_id" integer,
	"approver_id" integer,
	"creator_id" integer,
	"expected_minutes" integer,
	"status" text NOT NULL,
	"is_outsourced" boolean DEFAULT false NOT NULL,
	"start_date" timestamp with time zone,
	"execution_date" timestamp with time zone,
	"checking_date" timestamp with time zone,
	"completed_date" timestamp with time zone,
	"expected_post_date" timestamp with time zone,
	"shoot_date" timestamp with time zone,
	"milestone_deadline" timestamp with time zone,
	"description" text,
	"notes" text,
	"input_url" text,
	"output_url" text,
	"handoff_rating" text,
	"overall_rating" text,
	"quality_score" real,
	"personal_score" real,
	"cost_vnd" integer,
	"week_label" text,
	"source_created_at" timestamp with time zone,
	"source_row_hash" text NOT NULL,
	"last_seen_batch_id" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"imported_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "collections" ADD CONSTRAINT "collections_last_seen_batch_id_import_batches_id_fk" FOREIGN KEY ("last_seen_batch_id") REFERENCES "public"."import_batches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_requests" ADD CONSTRAINT "expense_requests_collection_code_collections_code_fk" FOREIGN KEY ("collection_code") REFERENCES "public"."collections"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_requests" ADD CONSTRAINT "expense_requests_shoot_session_code_shoot_sessions_code_fk" FOREIGN KEY ("shoot_session_code") REFERENCES "public"."shoot_sessions"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_requests" ADD CONSTRAINT "expense_requests_task_code_tasks_code_fk" FOREIGN KEY ("task_code") REFERENCES "public"."tasks"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_requests" ADD CONSTRAINT "expense_requests_requester_id_people_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_requests" ADD CONSTRAINT "expense_requests_last_seen_batch_id_import_batches_id_fk" FOREIGN KEY ("last_seen_batch_id") REFERENCES "public"."import_batches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_orders" ADD CONSTRAINT "marketing_orders_marketing_plan_code_marketing_plans_code_fk" FOREIGN KEY ("marketing_plan_code") REFERENCES "public"."marketing_plans"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_orders" ADD CONSTRAINT "marketing_orders_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_orders" ADD CONSTRAINT "marketing_orders_last_seen_batch_id_import_batches_id_fk" FOREIGN KEY ("last_seen_batch_id") REFERENCES "public"."import_batches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_plans" ADD CONSTRAINT "marketing_plans_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_plans" ADD CONSTRAINT "marketing_plans_last_seen_batch_id_import_batches_id_fk" FOREIGN KEY ("last_seen_batch_id") REFERENCES "public"."import_batches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_products" ADD CONSTRAINT "post_products_post_code_posts_code_fk" FOREIGN KEY ("post_code") REFERENCES "public"."posts"("code") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_products" ADD CONSTRAINT "post_products_product_sku_products_sku_fk" FOREIGN KEY ("product_sku") REFERENCES "public"."products"("sku") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_booked_task_code_tasks_code_fk" FOREIGN KEY ("booked_task_code") REFERENCES "public"."tasks"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_reorder_code_reorder_requests_code_fk" FOREIGN KEY ("reorder_code") REFERENCES "public"."reorder_requests"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_marketing_order_code_marketing_orders_code_fk" FOREIGN KEY ("marketing_order_code") REFERENCES "public"."marketing_orders"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_last_seen_batch_id_import_batches_id_fk" FOREIGN KEY ("last_seen_batch_id") REFERENCES "public"."import_batches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_collection_code_collections_code_fk" FOREIGN KEY ("collection_code") REFERENCES "public"."collections"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_last_seen_batch_id_import_batches_id_fk" FOREIGN KEY ("last_seen_batch_id") REFERENCES "public"."import_batches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reorder_requests" ADD CONSTRAINT "reorder_requests_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reorder_requests" ADD CONSTRAINT "reorder_requests_last_seen_batch_id_import_batches_id_fk" FOREIGN KEY ("last_seen_batch_id") REFERENCES "public"."import_batches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shoot_sessions" ADD CONSTRAINT "shoot_sessions_last_seen_batch_id_import_batches_id_fk" FOREIGN KEY ("last_seen_batch_id") REFERENCES "public"."import_batches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_dependencies" ADD CONSTRAINT "task_dependencies_task_code_tasks_code_fk" FOREIGN KEY ("task_code") REFERENCES "public"."tasks"("code") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_dependencies" ADD CONSTRAINT "task_dependencies_depends_on_task_code_tasks_code_fk" FOREIGN KEY ("depends_on_task_code") REFERENCES "public"."tasks"("code") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_feedback" ADD CONSTRAINT "task_feedback_task_code_tasks_code_fk" FOREIGN KEY ("task_code") REFERENCES "public"."tasks"("code") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_feedback" ADD CONSTRAINT "task_feedback_rejected_by_id_people_id_fk" FOREIGN KEY ("rejected_by_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_feedback" ADD CONSTRAINT "task_feedback_assignee_id_people_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_feedback" ADD CONSTRAINT "task_feedback_last_seen_batch_id_import_batches_id_fk" FOREIGN KEY ("last_seen_batch_id") REFERENCES "public"."import_batches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_products" ADD CONSTRAINT "task_products_task_code_tasks_code_fk" FOREIGN KEY ("task_code") REFERENCES "public"."tasks"("code") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_products" ADD CONSTRAINT "task_products_product_sku_products_sku_fk" FOREIGN KEY ("product_sku") REFERENCES "public"."products"("sku") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_format_id_content_formats_id_fk" FOREIGN KEY ("format_id") REFERENCES "public"."content_formats"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_collection_code_collections_code_fk" FOREIGN KEY ("collection_code") REFERENCES "public"."collections"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_reorder_code_reorder_requests_code_fk" FOREIGN KEY ("reorder_code") REFERENCES "public"."reorder_requests"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_shoot_session_code_shoot_sessions_code_fk" FOREIGN KEY ("shoot_session_code") REFERENCES "public"."shoot_sessions"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_marketing_order_code_marketing_orders_code_fk" FOREIGN KEY ("marketing_order_code") REFERENCES "public"."marketing_orders"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assignee_id_people_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_approver_id_people_id_fk" FOREIGN KEY ("approver_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_creator_id_people_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_last_seen_batch_id_import_batches_id_fk" FOREIGN KEY ("last_seen_batch_id") REFERENCES "public"."import_batches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "channels_slug_uidx" ON "channels" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "collections_month_idx" ON "collections" USING btree ("month");--> statement-breakpoint
CREATE INDEX "collections_launch_date_idx" ON "collections" USING btree ("launch_date");--> statement-breakpoint
CREATE UNIQUE INDEX "content_formats_name_uidx" ON "content_formats" USING btree ("name");--> statement-breakpoint
CREATE INDEX "expense_requests_task_idx" ON "expense_requests" USING btree ("task_code");--> statement-breakpoint
CREATE INDEX "expense_requests_payment_status_idx" ON "expense_requests" USING btree ("payment_status");--> statement-breakpoint
CREATE UNIQUE INDEX "import_batches_file_hash_uidx" ON "import_batches" USING btree ("source_file_hash");--> statement-breakpoint
CREATE INDEX "import_batches_created_at_idx" ON "import_batches" USING btree ("imported_at");--> statement-breakpoint
CREATE INDEX "marketing_orders_plan_idx" ON "marketing_orders" USING btree ("marketing_plan_code");--> statement-breakpoint
CREATE INDEX "marketing_orders_post_date_idx" ON "marketing_orders" USING btree ("planned_post_date");--> statement-breakpoint
CREATE INDEX "marketing_plans_month_idx" ON "marketing_plans" USING btree ("month");--> statement-breakpoint
CREATE INDEX "marketing_plans_channel_idx" ON "marketing_plans" USING btree ("channel_id");--> statement-breakpoint
CREATE UNIQUE INDEX "people_normalized_name_uidx" ON "people" USING btree ("normalized_name");--> statement-breakpoint
CREATE INDEX "people_department_idx" ON "people" USING btree ("department");--> statement-breakpoint
CREATE INDEX "post_products_product_idx" ON "post_products" USING btree ("product_sku");--> statement-breakpoint
CREATE INDEX "posts_task_idx" ON "posts" USING btree ("booked_task_code");--> statement-breakpoint
CREATE INDEX "posts_date_idx" ON "posts" USING btree ("post_date");--> statement-breakpoint
CREATE INDEX "posts_channel_idx" ON "posts" USING btree ("channel_id");--> statement-breakpoint
CREATE INDEX "posts_publish_state_idx" ON "posts" USING btree ("is_published","post_date");--> statement-breakpoint
CREATE INDEX "products_collection_idx" ON "products" USING btree ("collection_code");--> statement-breakpoint
CREATE INDEX "products_launch_month_idx" ON "products" USING btree ("launch_month");--> statement-breakpoint
CREATE INDEX "reorder_requests_status_idx" ON "reorder_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "reorder_requests_post_date_idx" ON "reorder_requests" USING btree ("planned_post_date");--> statement-breakpoint
CREATE INDEX "shoot_sessions_date_idx" ON "shoot_sessions" USING btree ("shoot_date");--> statement-breakpoint
CREATE INDEX "task_dependencies_parent_idx" ON "task_dependencies" USING btree ("depends_on_task_code");--> statement-breakpoint
CREATE INDEX "task_feedback_task_idx" ON "task_feedback" USING btree ("task_code");--> statement-breakpoint
CREATE INDEX "task_feedback_rejected_at_idx" ON "task_feedback" USING btree ("rejected_at");--> statement-breakpoint
CREATE INDEX "task_products_product_idx" ON "task_products" USING btree ("product_sku");--> statement-breakpoint
CREATE UNIQUE INDEX "tasks_record_id_uidx" ON "tasks" USING btree ("record_id");--> statement-breakpoint
CREATE INDEX "tasks_status_idx" ON "tasks" USING btree ("status");--> statement-breakpoint
CREATE INDEX "tasks_assignee_idx" ON "tasks" USING btree ("assignee_id");--> statement-breakpoint
CREATE INDEX "tasks_expected_post_date_idx" ON "tasks" USING btree ("expected_post_date");--> statement-breakpoint
CREATE INDEX "tasks_collection_idx" ON "tasks" USING btree ("collection_code");--> statement-breakpoint
CREATE INDEX "tasks_marketing_order_idx" ON "tasks" USING btree ("marketing_order_code");--> statement-breakpoint
CREATE INDEX "tasks_reorder_idx" ON "tasks" USING btree ("reorder_code");