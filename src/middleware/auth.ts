import type { Context, Next } from 'hono';

export const rbacMiddleware = (allowedRoles: string[]) => {
  return async (c: Context, next: Next) => {
    const payload = c.get('jwtPayload') as { role: string };
    if (!payload || !allowedRoles.includes(payload.role)) {
      return c.json({ error: 'Forbidden' }, 403);
    }
    await next();
  };
};
