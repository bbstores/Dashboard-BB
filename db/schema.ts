import { sql } from "drizzle-orm";
import {
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

const importedAt = () =>
  integer("imported_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`);

export const importBatches = sqliteTable(
  "import_batches",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    sourceFileName: text("source_file_name").notNull(),
    sourceFileHash: text("source_file_hash").notNull(),
    status: text("status", {
      enum: ["processing", "completed", "failed"],
    })
      .notNull()
      .default("processing"),
    totalRows: integer("total_rows").notNull().default(0),
    insertedRows: integer("inserted_rows").notNull().default(0),
    updatedRows: integer("updated_rows").notNull().default(0),
    unchangedRows: integer("unchanged_rows").notNull().default(0),
    archivedRows: integer("archived_rows").notNull().default(0),
    errorRows: integer("error_rows").notNull().default(0),
    errorSummary: text("error_summary"),
    createdAt: importedAt(),
    completedAt: integer("completed_at", { mode: "timestamp" }),
  },
  (table) => [
    uniqueIndex("import_batches_file_hash_uidx").on(table.sourceFileHash),
    index("import_batches_created_at_idx").on(table.createdAt),
  ],
);

export const people = sqliteTable(
  "people",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    displayName: text("display_name").notNull(),
    normalizedName: text("normalized_name").notNull(),
    role: text("role"),
    department: text("department"),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  },
  (table) => [
    uniqueIndex("people_normalized_name_uidx").on(table.normalizedName),
    index("people_department_idx").on(table.department),
  ],
);

export const channels = sqliteTable(
  "channels",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  },
  (table) => [uniqueIndex("channels_slug_uidx").on(table.slug)],
);

export const contentFormats = sqliteTable(
  "content_formats",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    standardRecordMinutes: integer("standard_record_minutes"),
    standardEditMinutes: integer("standard_edit_minutes"),
    standardGraphicMinutes: integer("standard_graphic_minutes"),
    standardContentMinutes: integer("standard_content_minutes"),
    standardCheckingMinutes: integer("standard_checking_minutes"),
    standardPostingMinutes: integer("standard_posting_minutes"),
    notes: text("notes"),
  },
  (table) => [uniqueIndex("content_formats_name_uidx").on(table.name)],
);

export const collections = sqliteTable(
  "collections",
  {
    code: text("code").primaryKey(),
    month: text("month"),
    collectionType: text("collection_type"),
    style: text("style"),
    name: text("name"),
    orderDate: integer("order_date", { mode: "timestamp" }),
    productionDate: integer("production_date", { mode: "timestamp" }),
    launchDate: integer("launch_date", { mode: "timestamp" }),
    budgetVnd: integer("budget_vnd"),
    status: text("status"),
    sourceRowHash: text("source_row_hash").notNull(),
    lastSeenBatchId: integer("last_seen_batch_id").references(
      () => importBatches.id,
    ),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    importedAt: importedAt(),
  },
  (table) => [
    index("collections_month_idx").on(table.month),
    index("collections_launch_date_idx").on(table.launchDate),
  ],
);

export const products = sqliteTable(
  "products",
  {
    sku: text("sku").primaryKey(),
    collectionCode: text("collection_code").references(() => collections.code),
    saleStatus: text("sale_status"),
    launchMonth: text("launch_month"),
    launchDate: integer("launch_date", { mode: "timestamp" }),
    driveSourceUrl: text("drive_source_url"),
    driveFinalUrl: text("drive_final_url"),
    sourceRowHash: text("source_row_hash").notNull(),
    lastSeenBatchId: integer("last_seen_batch_id").references(
      () => importBatches.id,
    ),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    importedAt: importedAt(),
  },
  (table) => [
    index("products_collection_idx").on(table.collectionCode),
    index("products_launch_month_idx").on(table.launchMonth),
  ],
);

export const marketingPlans = sqliteTable(
  "marketing_plans",
  {
    code: text("code").primaryKey(),
    name: text("name").notNull(),
    month: text("month"),
    channelId: integer("channel_id").references(() => channels.id),
    strategicGoal: text("strategic_goal"),
    content: text("content"),
    budgetVnd: integer("budget_vnd"),
    status: text("status"),
    sourceRowHash: text("source_row_hash").notNull(),
    lastSeenBatchId: integer("last_seen_batch_id").references(
      () => importBatches.id,
    ),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    importedAt: importedAt(),
  },
  (table) => [
    index("marketing_plans_month_idx").on(table.month),
    index("marketing_plans_channel_idx").on(table.channelId),
  ],
);

export const marketingOrders = sqliteTable(
  "marketing_orders",
  {
    code: text("code").primaryKey(),
    marketingPlanCode: text("marketing_plan_code").references(
      () => marketingPlans.code,
    ),
    title: text("title"),
    campaignContent: text("campaign_content"),
    formatName: text("format_name"),
    priority: text("priority"),
    progressPercent: real("progress_percent"),
    plannedPostDate: integer("planned_post_date", { mode: "timestamp" }),
    orderDate: integer("order_date", { mode: "timestamp" }),
    receivedDate: integer("received_date", { mode: "timestamp" }),
    channelId: integer("channel_id").references(() => channels.id),
    sourceRowHash: text("source_row_hash").notNull(),
    lastSeenBatchId: integer("last_seen_batch_id").references(
      () => importBatches.id,
    ),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    importedAt: importedAt(),
  },
  (table) => [
    index("marketing_orders_plan_idx").on(table.marketingPlanCode),
    index("marketing_orders_post_date_idx").on(table.plannedPostDate),
  ],
);

export const reorderRequests = sqliteTable(
  "reorder_requests",
  {
    code: text("code").primaryKey(),
    title: text("title"),
    formatName: text("format_name"),
    priority: text("priority"),
    demand: text("demand"),
    channelId: integer("channel_id").references(() => channels.id),
    orderDate: integer("order_date", { mode: "timestamp" }),
    receivedDate: integer("received_date", { mode: "timestamp" }),
    plannedPostDate: integer("planned_post_date", { mode: "timestamp" }),
    status: text("status"),
    sourceRowHash: text("source_row_hash").notNull(),
    lastSeenBatchId: integer("last_seen_batch_id").references(
      () => importBatches.id,
    ),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    importedAt: importedAt(),
  },
  (table) => [
    index("reorder_requests_status_idx").on(table.status),
    index("reorder_requests_post_date_idx").on(table.plannedPostDate),
  ],
);

export const shootSessions = sqliteTable(
  "shoot_sessions",
  {
    code: text("code").primaryKey(),
    shootDate: integer("shoot_date", { mode: "timestamp" }),
    timeSlot: text("time_slot"),
    durationLabel: text("duration_label"),
    requirements: text("requirements"),
    modelName: text("model_name"),
    totalCostVnd: integer("total_cost_vnd"),
    status: text("status"),
    sourceRowHash: text("source_row_hash").notNull(),
    lastSeenBatchId: integer("last_seen_batch_id").references(
      () => importBatches.id,
    ),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    importedAt: importedAt(),
  },
  (table) => [index("shoot_sessions_date_idx").on(table.shootDate)],
);

export const tasks = sqliteTable(
  "tasks",
  {
    code: text("code").primaryKey(),
    recordId: text("record_id"),
    title: text("title").notNull(),
    stage: text("stage"),
    formatId: integer("format_id").references(() => contentFormats.id),
    formatNameRaw: text("format_name_raw"),
    collectionCode: text("collection_code").references(() => collections.code),
    reorderCode: text("reorder_code").references(() => reorderRequests.code),
    shootSessionCode: text("shoot_session_code").references(
      () => shootSessions.code,
    ),
    marketingOrderCode: text("marketing_order_code").references(
      () => marketingOrders.code,
    ),
    assigneeId: integer("assignee_id").references(() => people.id),
    approverId: integer("approver_id").references(() => people.id),
    creatorId: integer("creator_id").references(() => people.id),
    expectedMinutes: integer("expected_minutes"),
    status: text("status").notNull(),
    isOutsourced: integer("is_outsourced", { mode: "boolean" })
      .notNull()
      .default(false),
    startDate: integer("start_date", { mode: "timestamp" }),
    executionDate: integer("execution_date", { mode: "timestamp" }),
    checkingDate: integer("checking_date", { mode: "timestamp" }),
    completedDate: integer("completed_date", { mode: "timestamp" }),
    expectedPostDate: integer("expected_post_date", { mode: "timestamp" }),
    shootDate: integer("shoot_date", { mode: "timestamp" }),
    milestoneDeadline: integer("milestone_deadline", { mode: "timestamp" }),
    description: text("description"),
    notes: text("notes"),
    inputUrl: text("input_url"),
    outputUrl: text("output_url"),
    handoffRating: text("handoff_rating"),
    overallRating: text("overall_rating"),
    qualityScore: real("quality_score"),
    personalScore: real("personal_score"),
    costVnd: integer("cost_vnd"),
    weekLabel: text("week_label"),
    sourceCreatedAt: integer("source_created_at", { mode: "timestamp" }),
    sourceRowHash: text("source_row_hash").notNull(),
    lastSeenBatchId: integer("last_seen_batch_id").references(
      () => importBatches.id,
    ),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    importedAt: importedAt(),
  },
  (table) => [
    uniqueIndex("tasks_record_id_uidx").on(table.recordId),
    index("tasks_status_idx").on(table.status),
    index("tasks_assignee_idx").on(table.assigneeId),
    index("tasks_expected_post_date_idx").on(table.expectedPostDate),
    index("tasks_collection_idx").on(table.collectionCode),
    index("tasks_marketing_order_idx").on(table.marketingOrderCode),
    index("tasks_reorder_idx").on(table.reorderCode),
  ],
);

export const posts = sqliteTable(
  "posts",
  {
    code: text("code").primaryKey(),
    bookedTaskCode: text("booked_task_code").references(() => tasks.code),
    postDate: integer("post_date", { mode: "timestamp" }),
    timeSlot: text("time_slot"),
    channelId: integer("channel_id").references(() => channels.id),
    title: text("title"),
    description: text("description"),
    detailedNotes: text("detailed_notes"),
    productUrl: text("product_url"),
    publishedUrl: text("published_url"),
    isPublished: integer("is_published", { mode: "boolean" })
      .notNull()
      .default(false),
    postCategory: text("post_category"),
    postType: text("post_type"),
    formatName: text("format_name"),
    marketingFormatName: text("marketing_format_name"),
    reorderFormatName: text("reorder_format_name"),
    reorderCode: text("reorder_code").references(() => reorderRequests.code),
    marketingOrderCode: text("marketing_order_code").references(
      () => marketingOrders.code,
    ),
    picNote: text("pic_note"),
    digitalMarketingNote: text("digital_marketing_note"),
    instagramStatus: text("instagram_status"),
    threadsStatus: text("threads_status"),
    content: text("content"),
    taskStatusSnapshot: text("task_status_snapshot"),
    sourceRowHash: text("source_row_hash").notNull(),
    lastSeenBatchId: integer("last_seen_batch_id").references(
      () => importBatches.id,
    ),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    importedAt: importedAt(),
  },
  (table) => [
    index("posts_task_idx").on(table.bookedTaskCode),
    index("posts_date_idx").on(table.postDate),
    index("posts_channel_idx").on(table.channelId),
    index("posts_publish_state_idx").on(table.isPublished, table.postDate),
  ],
);

export const taskProducts = sqliteTable(
  "task_products",
  {
    taskCode: text("task_code")
      .notNull()
      .references(() => tasks.code, { onDelete: "cascade" }),
    productSku: text("product_sku")
      .notNull()
      .references(() => products.sku, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.taskCode, table.productSku] }),
    index("task_products_product_idx").on(table.productSku),
  ],
);

export const postProducts = sqliteTable(
  "post_products",
  {
    postCode: text("post_code")
      .notNull()
      .references(() => posts.code, { onDelete: "cascade" }),
    productSku: text("product_sku")
      .notNull()
      .references(() => products.sku, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.postCode, table.productSku] }),
    index("post_products_product_idx").on(table.productSku),
  ],
);

export const taskDependencies = sqliteTable(
  "task_dependencies",
  {
    taskCode: text("task_code")
      .notNull()
      .references(() => tasks.code, { onDelete: "cascade" }),
    dependsOnTaskCode: text("depends_on_task_code")
      .notNull()
      .references(() => tasks.code, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.taskCode, table.dependsOnTaskCode] }),
    index("task_dependencies_parent_idx").on(table.dependsOnTaskCode),
  ],
);

export const taskFeedback = sqliteTable(
  "task_feedback",
  {
    code: text("code").primaryKey(),
    taskCode: text("task_code")
      .notNull()
      .references(() => tasks.code, { onDelete: "cascade" }),
    rejectedAt: integer("rejected_at", { mode: "timestamp" }),
    fixedAt: integer("fixed_at", { mode: "timestamp" }),
    fixMinutes: integer("fix_minutes"),
    rejectedById: integer("rejected_by_id").references(() => people.id),
    assigneeId: integer("assignee_id").references(() => people.id),
    errorDescription: text("error_description"),
    sourceRowHash: text("source_row_hash").notNull(),
    lastSeenBatchId: integer("last_seen_batch_id").references(
      () => importBatches.id,
    ),
    importedAt: importedAt(),
  },
  (table) => [
    index("task_feedback_task_idx").on(table.taskCode),
    index("task_feedback_rejected_at_idx").on(table.rejectedAt),
  ],
);

export const expenseRequests = sqliteTable(
  "expense_requests",
  {
    code: text("code").primaryKey(),
    name: text("name"),
    collectionCode: text("collection_code").references(() => collections.code),
    shootSessionCode: text("shoot_session_code").references(
      () => shootSessions.code,
    ),
    taskCode: text("task_code").references(() => tasks.code),
    category: text("category"),
    requestedAmountVnd: integer("requested_amount_vnd"),
    paymentStatus: text("payment_status"),
    dueDate: integer("due_date", { mode: "timestamp" }),
    paidDate: integer("paid_date", { mode: "timestamp" }),
    requesterId: integer("requester_id").references(() => people.id),
    sourceRowHash: text("source_row_hash").notNull(),
    lastSeenBatchId: integer("last_seen_batch_id").references(
      () => importBatches.id,
    ),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    importedAt: importedAt(),
  },
  (table) => [
    index("expense_requests_task_idx").on(table.taskCode),
    index("expense_requests_payment_status_idx").on(table.paymentStatus),
  ],
);

