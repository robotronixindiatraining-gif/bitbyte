import mongoose from 'mongoose';
import { AuditLog } from '../models/index.js';

export function createAuditLogController() {
  return {
    async list(req, res) {
      const { page, limit, action, actor, entityType, from, to } = req.validated.query;
      const filter = {};
      if (action) filter.action = action;
      if (actor) filter.actor = actor;
      if (entityType) filter.entityType = entityType;
      if (from || to) {
        // Validated dates; trusted() exempts this operator object from sanitizeFilter.
        filter.at = mongoose.trusted({
          ...(from ? { $gte: from } : {}),
          ...(to ? { $lte: to } : {}),
        });
      }
      const [items, total] = await Promise.all([
        AuditLog.find(filter)
          .sort({ at: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
        AuditLog.countDocuments(filter),
      ]);
      res.json({
        data: items.map(({ _id, ...rest }) => ({ id: String(_id), ...rest })),
        meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    },
  };
}
