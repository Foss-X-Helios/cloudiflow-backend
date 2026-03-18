import { Hono } from 'hono';
import { db } from '../db';
import { cloudAccounts } from '../db/schema';
import { eq } from 'drizzle-orm';
import { encrypt } from '../lib/encryption';

const cloudConnectorRouter = new Hono();

// Add Cloud Connection
cloudConnectorRouter.post('/', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  if (!body.provider || !body.credentials || !body.orgId) {
    return c.json({ error: 'Missing provider, credentials or orgId' }, 400);
  }

  const encryptedCredentials = encrypt(JSON.stringify(body.credentials));

  const [account] = await db.insert(cloudAccounts).values({
    orgId: parseInt(body.orgId),
    provider: body.provider,
    encryptedCredentials,
  }).returning();

  return c.json({
    id: account.id,
    orgId: account.orgId,
    provider: account.provider,
    createdAt: account.createdAt
  });
});

// List Cloud Connections
cloudConnectorRouter.get('/', async (c) => {
  const orgId = c.req.query('orgId');
  let query = db.select({
    id: cloudAccounts.id,
    orgId: cloudAccounts.orgId,
    provider: cloudAccounts.provider,
    createdAt: cloudAccounts.createdAt
  }).from(cloudAccounts);

  if (orgId) {
    query = query.where(eq(cloudAccounts.orgId, parseInt(orgId))) as any;
  }
  
  const accounts = await query;
  return c.json(accounts);
});

export { cloudConnectorRouter };
