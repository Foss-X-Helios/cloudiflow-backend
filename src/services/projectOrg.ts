import { Hono } from 'hono';
import { db } from '../db';
import { orgs, projects } from '../db/schema';
import { eq } from 'drizzle-orm';

const projectOrgRouter = new Hono();

// Create Org
projectOrgRouter.post('/orgs', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  if (!body.name) return c.json({ error: 'Name is required' }, 400);
  
  const [org] = await db.insert(orgs).values({ name: body.name }).returning();
  return c.json(org);
});

// List Orgs
projectOrgRouter.get('/orgs', async (c) => {
  const allOrgs = await db.select().from(orgs);
  return c.json(allOrgs);
});

// Create Project
projectOrgRouter.post('/projects', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  if (!body.name || !body.orgId) return c.json({ error: 'Name and orgId are required' }, 400);

  const [project] = await db.insert(projects).values({ 
    name: body.name,
    orgId: parseInt(body.orgId)
  }).returning();
  
  return c.json(project);
});

// List Projects
projectOrgRouter.get('/projects', async (c) => {
  const orgId = c.req.query('orgId');
  if (orgId) {
    const orgProjects = await db.select().from(projects).where(eq(projects.orgId, parseInt(orgId)));
    return c.json(orgProjects);
  }
  
  const allProjects = await db.select().from(projects);
  return c.json(allProjects);
});

export { projectOrgRouter };
