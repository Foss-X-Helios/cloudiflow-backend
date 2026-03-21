import { Worker } from 'bullmq';
import { redis } from '../lib/redis';
import { db } from '../db';
import { deployments } from '../db/schema';
import { eq } from 'drizzle-orm';
import { spawn } from 'node:child_process';

const processDeployment = async (job: any) => {
  const { deploymentId, hcl } = job.data;
  
  await redis.publish(`logs:${deploymentId}`, `[INFO] Starting deployment ${deploymentId} sandbox`);
  await db.update(deployments).set({ status: 'running' }).where(eq(deployments.id, deploymentId));

  return new Promise((resolve, reject) => {
    const proc = spawn('podman', [
      'run', '--rm', '--network', 'none', '-i', 'busybox', 'sh', '-c', 
      `echo "Simulating Terraform Init..."; sleep 1; echo "Simulating Terraform Plan..."; echo "${hcl.replace(/"/g, '\\"')}"; sleep 1; echo "Simulating Terraform Apply... Success!"`
    ]);

    proc.stdout.on('data', async (data) => {
      await redis.publish(`logs:${deploymentId}`, data.toString().trim());
    });

    proc.stderr.on('data', async (data) => {
      await redis.publish(`logs:${deploymentId}`, `[ERROR] ${data.toString().trim()}`);
    });

    proc.on('close', async (code) => {
      const finalStatus = code === 0 ? 'success' : 'failed';
      await db.update(deployments).set({ status: finalStatus }).where(eq(deployments.id, deploymentId));
      await redis.publish(`logs:${deploymentId}`, `[DONE] Process exited with code ${code}`);
      if (code === 0) resolve(true);
      else reject(new Error(`Exit code ${code}`));
    });
  });
};

export const deploymentWorker = new Worker('deployments', processDeployment, {
  connection: redis
});
