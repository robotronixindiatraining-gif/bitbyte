import { requestContext } from './requestContext.js';

export function createPublicController({ publicContent, leads }) {
  const send = (load) => async (req, res) => {
    const value = await load(req);
    if (value && Array.isArray(value.items) && value.meta)
      res.json({ data: value.items, meta: value.meta });
    else res.json({ data: value });
  };
  return {
    site: send(() => publicContent.site()),
    resolve: send((req) => publicContent.resolvePath(req.validated.query.path)),
    page: send((req) => publicContent.page(req.validated.params.slug)),
    listServices: send((req) => publicContent.listServices(req.validated.query)),
    getService: send((req) => publicContent.getService(req.validated.params.slug)),
    listProjects: send((req) => publicContent.listProjects(req.validated.query)),
    getProject: send((req) => publicContent.getProject(req.validated.params.slug)),
    listTaxonomies: send((req) => publicContent.listTaxonomies(req.validated.query)),
    listTestimonials: send((req) => publicContent.listTestimonials(req.validated.query)),
    listJobs: send(() => publicContent.listJobs()),
    getJob: send((req) => publicContent.getJob(req.validated.params.slug)),
    async submitLead(req, res) {
      const result = await leads.submit(req.validated.body, requestContext(req));
      res.status(201).json({ data: result });
    },
  };
}
