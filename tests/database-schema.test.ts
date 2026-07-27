import assert from "node:assert/strict";
import test from "node:test";
import { getTableConfig } from "drizzle-orm/pg-core";
import {
  importBatches,
  tasks,
} from "../db/schema";

test("defines the dashboard persistence model as PostgreSQL tables", () => {
  const batchConfig = getTableConfig(importBatches);
  const taskConfig = getTableConfig(tasks);
  const batchId = batchConfig.columns.find(
    (column) => column.name === "id",
  );
  const startDate = taskConfig.columns.find(
    (column) => column.name === "start_date",
  );
  const isActive = taskConfig.columns.find(
    (column) => column.name === "is_active",
  );

  assert.equal(batchConfig.name, "import_batches");
  assert.equal(taskConfig.name, "tasks");
  assert.equal(batchId?.getSQLType(), "serial");
  assert.equal(startDate?.getSQLType(), "timestamp with time zone");
  assert.equal(isActive?.getSQLType(), "boolean");
});
