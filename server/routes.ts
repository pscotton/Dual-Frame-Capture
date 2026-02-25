import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";

async function seedDatabase() {
  try {
    const existingItems = await storage.getCaptures();
    if (existingItems.length === 0) {
      await storage.createCapture({
        title: "Test Video Capture",
        type: "video",
        landscapeUrl: "https://files.vidstack.io/sprite-fight/720p.mp4",
        portraitUrl: "https://files.vidstack.io/sprite-fight/720p.mp4"
      });
      await storage.createCapture({
        title: "Test Photo Capture",
        type: "photo",
        landscapeUrl: "https://images.unsplash.com/photo-1542385151-efd9000785a0?w=1600&q=80",
        portraitUrl: "https://images.unsplash.com/photo-1542385151-efd9000785a0?w=900&q=80"
      });
    }
  } catch (error) {
    console.error("Error seeding database:", error);
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.get(api.captures.list.path, async (req, res) => {
    const caps = await storage.getCaptures();
    res.json(caps);
  });

  app.get(api.captures.get.path, async (req, res) => {
    const cap = await storage.getCapture(Number(req.params.id));
    if (!cap) {
      return res.status(404).json({ message: 'Capture not found' });
    }
    res.json(cap);
  });

  app.post(api.captures.create.path, async (req, res) => {
    try {
      const input = api.captures.create.input.parse(req.body);
      const cap = await storage.createCapture(input);
      res.status(201).json(cap);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Seed data on startup
  seedDatabase();

  return httpServer;
}
