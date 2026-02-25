import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const captures = pgTable("captures", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  type: text("type").notNull(), // 'video' | 'photo'
  landscapeUrl: text("landscape_url").notNull(),
  portraitUrl: text("portrait_url").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCaptureSchema = createInsertSchema(captures).omit({ id: true, createdAt: true });

export type Capture = typeof captures.$inferSelect;
export type InsertCapture = z.infer<typeof insertCaptureSchema>;

export type CreateCaptureRequest = InsertCapture;
export type CaptureResponse = Capture;
export type CapturesListResponse = Capture[];