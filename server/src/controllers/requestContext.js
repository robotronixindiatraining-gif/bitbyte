/** Request facts passed to services (never the request object itself). */
export function requestContext(req) {
  return { ip: req.ip, userAgent: req.get('User-Agent') ?? null, requestId: req.id };
}
