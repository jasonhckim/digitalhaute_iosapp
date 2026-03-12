import { type User, type InsertUser, users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { db } from "./db";

export interface IStorage {
  getUserById(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(
    id: string,
    data: Partial<
      Pick<
        User,
        "businessName" | "name" | "role" | "avatarUrl" | "subscriptionPlan"
      >
    >,
  ): Promise<User | undefined>;
  deleteUser(id: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUserById(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email));
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await db.insert(users).values(user).returning();
    return result[0];
  }

  async updateUser(
    id: string,
    data: Partial<
      Pick<
        User,
        "businessName" | "name" | "role" | "avatarUrl" | "subscriptionPlan"
      >
    >,
  ): Promise<User | undefined> {
    const result = await db
      .update(users)
      .set({ ...data, updatedAt: new Date().toISOString() })
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }
}

export const storage = new DatabaseStorage();
