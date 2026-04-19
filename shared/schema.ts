import { z } from "zod";

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
