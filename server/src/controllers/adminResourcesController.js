import { ERROR_CODES } from '@bitbyte/shared';
import { AppError } from '../utils/AppError.js';
import { requestContext } from './requestContext.js';

/** Taxonomies, redirects, media, leads and the dashboard (API_REFERENCE.md §5.4–5.9). */
export function createAdminResourcesController({ taxonomies, redirects, media, leads, dashboard }) {
  const actorOf = (req) => req.auth.admin;
  return {
    taxonomies: {
      async list(req, res) {
        res.json({ data: await taxonomies.list(req.validated.query) });
      },
      async create(req, res) {
        res.status(201).json({
          data: await taxonomies.create(actorOf(req), req.validated.body, requestContext(req)),
        });
      },
      async update(req, res) {
        res.json({
          data: await taxonomies.update(
            actorOf(req),
            req.validated.params.id,
            req.validated.body,
            requestContext(req),
          ),
        });
      },
      async remove(req, res) {
        await taxonomies.remove(actorOf(req), req.validated.params.id, requestContext(req));
        res.status(204).end();
      },
    },

    redirects: {
      async list(req, res) {
        const { items, meta } = await redirects.list(req.validated.query);
        res.json({ data: items, meta });
      },
      async create(req, res) {
        res.status(201).json({
          data: await redirects.create(actorOf(req), req.validated.body, requestContext(req)),
        });
      },
      async update(req, res) {
        res.json({
          data: await redirects.update(
            actorOf(req),
            req.validated.params.id,
            req.validated.body,
            requestContext(req),
          ),
        });
      },
      async remove(req, res) {
        await redirects.remove(actorOf(req), req.validated.params.id, requestContext(req));
        res.status(204).end();
      },
    },

    media: {
      async upload(req, res) {
        const { media: item, duplicateOf } = await media.upload(
          actorOf(req),
          { file: req.file, fields: req.validated.body },
          requestContext(req),
        );
        const body = await media.get(item._id);
        res.status(duplicateOf ? 200 : 201).json({ data: { ...body, duplicateOf } });
      },
      async list(req, res) {
        const { items, meta } = await media.list(req.validated.query);
        res.json({ data: items, meta });
      },
      async get(req, res) {
        res.json({ data: await media.get(req.validated.params.id) });
      },
      async update(req, res) {
        res.json({
          data: await media.update(
            actorOf(req),
            req.validated.params.id,
            req.validated.body,
            requestContext(req),
          ),
        });
      },
      async remove(req, res) {
        await media.remove(actorOf(req), req.validated.params.id, requestContext(req));
        res.status(204).end();
      },
    },

    leads: {
      async list(req, res) {
        const { items, meta } = await leads.list(req.validated.query);
        res.json({ data: items, meta });
      },
      async get(req, res) {
        res.json({ data: await leads.get(req.validated.params.id) });
      },
      async updateStatus(req, res) {
        res.json({
          data: await leads.updateStatus(
            actorOf(req),
            req.validated.params.id,
            req.validated.body,
            requestContext(req),
          ),
        });
      },
      async addNote(req, res) {
        res.status(201).json({
          data: await leads.addNote(
            actorOf(req),
            req.validated.params.id,
            req.validated.body,
            requestContext(req),
          ),
        });
      },
      async resendNotification(req, res) {
        res.json({
          data: await leads.resendNotification(
            actorOf(req),
            req.validated.params.id,
            requestContext(req),
          ),
        });
      },
      async exportCsv(req, res) {
        const csv = await leads.exportCsv(actorOf(req), req.validated.query, requestContext(req));
        const day = new Date().toISOString().slice(0, 10);
        res
          .status(200)
          .set('Content-Type', 'text/csv; charset=utf-8')
          .set('Content-Disposition', `attachment; filename="leads-${day}.csv"`)
          .set('Cache-Control', 'no-store')
          .send(csv);
      },
      async erase(req, res) {
        if (req.validated.body.confirm !== 'DELETE') {
          throw new AppError(422, ERROR_CODES.VALIDATION_ERROR, 'Type DELETE to confirm.');
        }
        await leads.erase(actorOf(req), req.validated.params.id, requestContext(req));
        res.status(204).end();
      },
    },

    dashboard: {
      async summary(_req, res) {
        res.json({ data: await dashboard.summary() });
      },
    },
  };
}
