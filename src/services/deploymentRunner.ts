import { Hono } from 'hono';
import { db } from '../db';
import { deployments } from '../db/schema';
import { deploymentQueue } from '../lib/queue';
import { redis } from '../lib/redis';
import { streamSSE } from 'hono/streaming';

const deploymentRunnerRouter = new Hono();

deploymentRunnerRouter.post('/', async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body || !body.projectId || !body.hcl) {
    return c.json({ error: 'Expected projectId and hcl' }, 400);
  }

  const [deployment] = await db.insert(deployments).values({
    projectId: parseInt(body.projectId),
    status: 'pending'
  }).returning();

  await deploymentQueue.add('run-deploy', {
    deploymentId: deployment.id,
    hcl: body.hcl
  });

  return c.json({ 
    message: 'Deployment queued', 
    deploymentId: deployment.id 
  });
});

deploymentRunnerRouter.get('/:id/events', async (c) => {
  const id = c.req.param('id');
  
  return streamSSE(c, async (stream) => {
    const subscriber = redis.duplicate();
    await subscriber.subscribe(`logs:${id}`);
    
    let isClosed = false;
    
    subscriber.on('message', async (channel, message) => {
      if (isClosed) return;
      await stream.writeSSE({ data: message });
      if (message.startsWith('[DONE]')) {
        isClosed = true;
        subscriber.unsubscribe();
        subscriber.quit();
        stream.close();
      }
    });
    
    stream.onAbort(() => {
      isClosed = true;
      subscriber.unsubscribe();
      subscriber.quit();
    });
    
    while (!isClosed) {
      await stream.sleep(1000);
    }
  });
});

export { deploymentRunnerRouter };
