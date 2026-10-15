export function createPublicController({ publicContent }) {
  return {
    async listServices(req, res) {
      res.json({ data: await publicContent.listServices(req.validated.query) });
    },
    async getService(req, res) {
      res.json({ data: await publicContent.getService(req.validated.params.slug) });
    },
  };
}
