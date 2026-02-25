import { z } from "zod";
import { insertCaptureSchema, captures } from "./schema";

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  captures: {
    list: {
      method: "GET" as const,
      path: "/api/captures" as const,
      responses: {
        200: z.array(z.custom<typeof captures.$inferSelect>()),
      },
    },
    get: {
      method: "GET" as const,
      path: "/api/captures/:id" as const,
      responses: {
        200: z.custom<typeof captures.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: "POST" as const,
      path: "/api/captures" as const,
      input: insertCaptureSchema,
      responses: {
        201: z.custom<typeof captures.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

export type CaptureInput = z.infer<typeof api.captures.create.input>;
export type CaptureResponse = z.infer<typeof api.captures.create.responses[201]>;
export type CapturesListResponse = z.infer<typeof api.captures.list.responses[200]>;
