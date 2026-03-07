import { z } from "zod";
import { pgTable, text, serial, integer, timestamp, uniqueIndex, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const propTypeSchema = z.enum([
  "string",
  "number",
  "boolean",
  "select",
  "color",
  "range",
]);

export type PropType = z.infer<typeof propTypeSchema>;

export const propDefinitionSchema = z.object({
  name: z.string(),
  type: propTypeSchema,
  defaultValue: z.any(),
  description: z.string().optional(),
  options: z.array(z.string()).optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  step: z.number().optional(),
});

export type PropDefinition = z.infer<typeof propDefinitionSchema>;

export const componentMetadataSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string(),
  description: z.string().optional(),
  props: z.array(propDefinitionSchema),
  code: z.string(),
});

export type ComponentMetadata = z.infer<typeof componentMetadataSchema>;

export const insertComponentSchema = componentMetadataSchema.omit({ id: true });
export type InsertComponent = z.infer<typeof insertComponentSchema>;

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  displayName: text("display_name"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const workspaces = pgTable("workspaces", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").default(""),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const workspaceMembers = pgTable("workspace_members", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: text("role").notNull().default("viewer"),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("workspace_member_unique").on(table.workspaceId, table.userId),
]);

export const collections = pgTable("collections", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description").default(""),
  starred: boolean("starred").default(false),
  variables: jsonb("variables").default([]),
  auth: jsonb("auth"),
  preRequestScript: text("pre_request_script"),
  testScript: text("test_script"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const collectionFolders = pgTable("collection_folders", {
  id: serial("id").primaryKey(),
  collectionId: integer("collection_id").notNull().references(() => collections.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  parentId: integer("parent_id"),
  auth: jsonb("auth"),
  preRequestScript: text("pre_request_script"),
  testScript: text("test_script"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const apiRequests = pgTable("api_requests", {
  id: serial("id").primaryKey(),
  collectionId: integer("collection_id").notNull().references(() => collections.id, { onDelete: "cascade" }),
  folderId: integer("folder_id").references(() => collectionFolders.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  method: text("method").notNull().default("GET"),
  url: text("url").default(""),
  headers: jsonb("headers").default([]),
  queryParams: jsonb("query_params").default([]),
  pathVariables: jsonb("path_variables"),
  body: text("body").default(""),
  bodyType: text("body_type").default("none"),
  bodyFormData: jsonb("body_form_data"),
  bodyUrlEncoded: jsonb("body_url_encoded"),
  auth: jsonb("auth"),
  assertions: jsonb("assertions"),
  extractions: jsonb("extractions"),
  description: text("description"),
  preRequestScript: text("pre_request_script"),
  testScript: text("test_script"),
  jsonSchema: text("json_schema"),
  pinned: boolean("pinned").default(false),
  clientCert: jsonb("client_cert"),
  examples: jsonb("examples"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const selectUserSchema = createSelectSchema(users).omit({
  password: true,
});

export type InsertUser = typeof users.$inferInsert;
export type SelectUser = typeof users.$inferSelect;
export type Workspace = typeof workspaces.$inferSelect;
export type WorkspaceMember = typeof workspaceMembers.$inferSelect;
export type DbCollection = typeof collections.$inferSelect;
export type DbCollectionFolder = typeof collectionFolders.$inferSelect;
export type DbApiRequest = typeof apiRequests.$inferSelect;
