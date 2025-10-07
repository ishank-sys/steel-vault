import { prisma } from '../src/lib/prisma.js';

async function main(){
  try {
    const projects = await prisma.project.findMany({
      take: 1,
      include: { client: { select: { id: true, name: true } }, solTL: { select: { id: true, name: true } } }
    });
    console.log('Sample project result:', projects);
  } catch (e) {
    console.error('Query error:', e);
  } finally {
    await prisma.$disconnect();
  }
}
main();
