import { Hono } from 'hono';

const dagCodegenRouter = new Hono();

interface Node {
  id: string;
  data: Record<string, any>;
}

interface Edge {
  source: string;
  target: string;
}

function topologicalSort(nodes: Node[], edges: Edge[]): Node[] {
  const inDegree = new Map<string, number>();
  const graph = new Map<string, string[]>();

  for (const node of nodes) {
    inDegree.set(node.id, 0);
    graph.set(node.id, []);
  }

  for (const edge of edges) {
    if (!graph.has(edge.source) || !graph.has(edge.target)) continue;
    graph.get(edge.source)!.push(edge.target);
    inDegree.set(edge.target, inDegree.get(edge.target)! + 1);
  }

  const queue: string[] = [];
  for (const [id, degree] of Array.from(inDegree.entries())) {
    if (degree === 0) queue.push(id);
  }

  const sortedIds: string[] = [];
  while (queue.length > 0) {
    const current = queue.shift()!;
    sortedIds.push(current);

    for (const neighbor of graph.get(current)!) {
      inDegree.set(neighbor, inDegree.get(neighbor)! - 1);
      if (inDegree.get(neighbor) === 0) {
        queue.push(neighbor);
      }
    }
  }

  if (sortedIds.length !== nodes.length) {
    const cycleNodes = nodes.filter(n => inDegree.get(n.id)! > 0).map(n => n.id);
    throw new Error(`Cycle detected involving nodes: ${cycleNodes.join(', ')}`);
  }

  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  return sortedIds.map(id => nodeMap.get(id)!);
}

function generateTerraformHCL(sortedNodes: Node[]): string {
  let hcl = '';
  for (const node of sortedNodes) {
    const type = node.data?.type || 'unknown_resource';
    const name = node.data?.name || `resource_${node.id}`;
    
    hcl += `resource "${type}" "${name}" {\n`;
    
    for (const [key, value] of Object.entries(node.data || {})) {
      if (key === 'type' || key === 'name') continue;
      
      if (typeof value === 'string') {
        hcl += `  ${key} = "${value}"\n`;
      } else if (typeof value === 'object') {
        hcl += `  ${key} = ${JSON.stringify(value)}\n`;
      } else {
        hcl += `  ${key} = ${value}\n`;
      }
    }
    
    hcl += `}\n\n`;
  }
  return hcl.trim();
}

dagCodegenRouter.post('/generate', async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body || !Array.isArray(body.nodes) || !Array.isArray(body.edges)) {
    return c.json({ error: 'Invalid payload format. Expected { nodes: [], edges: [] }' }, 400);
  }

  try {
    const sortedNodes = topologicalSort(body.nodes, body.edges);
    const hcl = generateTerraformHCL(sortedNodes);
    
    // TBD: optionally upload to S3 if requested
    return c.json({ 
      message: 'Successfully generated IaC',
      order: sortedNodes.map(n => n.id),
      hcl 
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

export { dagCodegenRouter };
