import { prisma } from "../client.js";
import { AuditLog } from "@prisma/client";

/**
 * Records an auditable administrative or security event.
 */
export async function createAuditLog(
  action: string,
  actorId?: bigint,
  details?: Record<string, unknown>
): Promise<AuditLog> {
  return prisma.auditLog.create({
    data: {
      action,
      actorId,
      detailsJson: details ? JSON.stringify(details) : null,
    },
  });
}
