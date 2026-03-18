import { Hono } from 'hono';
import { sign, jwt } from 'hono/jwt';
import 'dotenv/config';
import { rbacMiddleware } from './middleware/auth';
import { projectOrgRouter } from './services/projectOrg';

import { logger } from 'hono/logger';

const app = new Hono();
app.use('*', logger());
const jwtSecret = process.env.JWT_SECRET || 'supersecret_dev_key';

app.get('/', (c) => {
  return c.text('CloudiFlow-9000 API Gateway is running');
});

app.post('/api/login', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const role = body.role || 'user';
  const payload = {
    sub: '1234567890',
    role,
    exp: Math.floor(Date.now() / 1000) + 60 * 60,
  };
  const token = await sign(payload, jwtSecret);
  return c.json({ token });
});

const api = new Hono();
api.use('/*', jwt({ secret: jwtSecret, alg: 'HS256' }));

api.route('/', projectOrgRouter);

api.get('/admin/users', rbacMiddleware(['admin']), (c) => {
  return c.json({ message: 'Admin only route - user list' });
});

app.route('/api/v1', api);

const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
Bun.serve({
  port,
  fetch: app.fetch,
});
console.log(`Server is running on port ${port}`);
