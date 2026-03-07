import type { ComponentMetadata, InsertComponent } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getComponent(id: string): Promise<ComponentMetadata | undefined>;
  getAllComponents(): Promise<ComponentMetadata[]>;
  createComponent(component: InsertComponent): Promise<ComponentMetadata>;
  updateComponent(id: string, component: Partial<InsertComponent>): Promise<ComponentMetadata | undefined>;
  deleteComponent(id: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private components: Map<string, ComponentMetadata>;

  constructor() {
    this.components = new Map();
  }

  async getComponent(id: string): Promise<ComponentMetadata | undefined> {
    return this.components.get(id);
  }

  async getAllComponents(): Promise<ComponentMetadata[]> {
    return Array.from(this.components.values());
  }

  async createComponent(insertComponent: InsertComponent): Promise<ComponentMetadata> {
    const id = randomUUID();
    const component: ComponentMetadata = { ...insertComponent, id };
    this.components.set(id, component);
    return component;
  }

  async updateComponent(
    id: string,
    updates: Partial<InsertComponent>
  ): Promise<ComponentMetadata | undefined> {
    const existing = this.components.get(id);
    if (!existing) return undefined;
    const updated: ComponentMetadata = { ...existing, ...updates };
    this.components.set(id, updated);
    return updated;
  }

  async deleteComponent(id: string): Promise<boolean> {
    return this.components.delete(id);
  }
}

export const storage = new MemStorage();
