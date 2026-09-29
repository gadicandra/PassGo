import type { ClientSession } from "mongoose";
import { AuditLog } from "../models";
import { uuidv7 } from "../utils/uuid";

export interface AuditContext { actorId: string | null; actorRole: string; ip?: string | null; userAgent?: string | null }

export async function recordAudit(context: AuditContext, entry: { action: string; entityType: string; entityId: string; eventId?: string | null; before?: unknown; after?: unknown }, session?: ClientSession): Promise<void> {
  await AuditLog.create([{
    id: uuidv7(), actorId: context.actorId, actorRole: context.actorRole, action: entry.action, entityType: entry.entityType, entityId: entry.entityId,
    eventId: entry.eventId ?? null, before: entry.before ?? null, after: entry.after ?? null, ip: context.ip ?? null, userAgent: context.userAgent ?? null,
  }], { session });
}
