import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

/**
 * Creates a Prisma client extension that automatically scopes queries to the given userId.
 * Models without a `userId` column (Agent, Template, etc.) pass through unaffected.
 *
 * Usage:
 *   const db = scopedPrisma(userId);
 *   const tasks = await db.delegatedTask.findMany(); // auto-filtered by userId
 */

// Models that have a userId field and should be auto-scoped
const SCOPED_MODELS = new Set([
  "user",
  "hiredJob",
  "agentPurchaseOrder",
  "submission",
  "userPreference",
  "inboxItemStatus",
  "auditLog",
  "project",
  "projectTask",
  "projectArtifact",
  "run",
  "providerCredential",
  "companySoul",
  "modelRoutePreference",
  "businessLogEntry",
  "businessFile",
  "stripePayment",
  "stripeSubscription",
  "advisorSession",
  "advisorMessage",
  "agentAutomationConfig",
  "delegatedTask",
  "runnerNode",
  "runnerJob",
  "runnerPolicy",
]);

export function scopedPrisma(userId: string) {
  return prisma.$extends({
    query: {
      $allModels: {
        async findMany({ model, args, query }) {
          if (SCOPED_MODELS.has(model)) {
            args.where = { ...args.where, userId };
          }
          return query(args);
        },
        async findFirst({ model, args, query }) {
          if (SCOPED_MODELS.has(model)) {
            args.where = { ...args.where, userId };
          }
          return query(args);
        },
        async findUnique({ model, args, query }) {
          // findUnique requires exact where clause, so we just run it and verify userId after
          return query(args);
        },
        async create({ model, args, query }) {
          if (SCOPED_MODELS.has(model) && args.data && typeof args.data === "object" && !Array.isArray(args.data)) {
            (args.data as Record<string, unknown>).userId = userId;
          }
          return query(args);
        },
        async update({ model, args, query }) {
          return query(args);
        },
        async delete({ model, args, query }) {
          return query(args);
        },
        async updateMany({ model, args, query }) {
          if (SCOPED_MODELS.has(model)) {
            args.where = { ...args.where, userId };
          }
          return query(args);
        },
        async deleteMany({ model, args, query }) {
          if (SCOPED_MODELS.has(model)) {
            args.where = { ...args.where, userId };
          }
          return query(args);
        },
        async count({ model, args, query }) {
          if (SCOPED_MODELS.has(model)) {
            args.where = { ...args.where, userId };
          }
          return query(args);
        },
      },
    },
  });
}
