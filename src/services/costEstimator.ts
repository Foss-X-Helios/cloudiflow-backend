import { Hono } from 'hono';
import { redis } from '../lib/redis';

const costEstimatorRouter = new Hono();

async function fetchCloudPrice(provider: string, type: string, config: any): Promise<number> {
  await new Promise((resolve) => setTimeout(resolve, 100));
  
  if (provider === 'aws' && type === 'aws_instance') {
    return config.instance_type === 't3.medium' ? 0.0416 : 0.10;
  } else if (provider === 'aws' && type === 'aws_db_instance') {
    return 0.15;
  }
  return 0.05;
}

costEstimatorRouter.post('/estimate', async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body || !Array.isArray(body.nodes)) {
    return c.json({ error: 'Expected { nodes: [...] }' }, 400);
  }

  let totalHourly = 0;
  const breakdown = [];

  for (const node of body.nodes) {
    const data = node.data || {};
    const provider = data.provider || 'aws';
    const type = data.type || 'unknown';
    
    const cacheKey = `price:${provider}:${type}:${JSON.stringify(data)}`;

    let hourlyRateStr = await redis.get(cacheKey);
    let hourlyRate = 0;

    if (hourlyRateStr) {
      hourlyRate = parseFloat(hourlyRateStr);
      breakdown.push({ node: node.id, type, hourlyRate, fromCache: true });
    } else {
      hourlyRate = await fetchCloudPrice(provider, type, data);
      await redis.setex(cacheKey, 86400, hourlyRate.toString());
      breakdown.push({ node: node.id, type, hourlyRate, fromCache: false });
    }

    totalHourly += hourlyRate;
  }

  return c.json({
    breakdown,
    totals: {
      hourly: totalHourly,
      monthly: totalHourly * 730,
      yearly: totalHourly * 8760,
    }
  });
});

export { costEstimatorRouter };
