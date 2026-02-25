import { db } from "./db";
import { eq } from "drizzle-orm";
import {
  captures,
  type CreateCaptureRequest,
  type CaptureResponse
} from "@shared/schema";

export interface IStorage {
  getCaptures(): Promise<CaptureResponse[]>;
  getCapture(id: number): Promise<CaptureResponse | undefined>;
  createCapture(capture: CreateCaptureRequest): Promise<CaptureResponse>;
}

export class DatabaseStorage implements IStorage {
  async getCaptures(): Promise<CaptureResponse[]> {
    return await db.select().from(captures);
  }

  async getCapture(id: number): Promise<CaptureResponse | undefined> {
    const [capture] = await db.select().from(captures).where(eq(captures.id, id));
    return capture;
  }

  async createCapture(capture: CreateCaptureRequest): Promise<CaptureResponse> {
    const [newCapture] = await db.insert(captures).values(capture).returning();
    return newCapture;
  }
}

export const storage = new DatabaseStorage();
