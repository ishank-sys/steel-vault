const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function resetData() {
  try {
    console.log('🗑️  Starting database reset...');
    
    // Delete in correct order to avoid foreign key constraints
    console.log('Deleting DocumentLogs...');
    await prisma.documentLog.deleteMany({});
    
    console.log('Deleting Projects...');
    await prisma.project.deleteMany({});
    
    console.log('Deleting Users...');
    await prisma.user.deleteMany({});
    
    console.log('Deleting Clients...');
    await prisma.client.deleteMany({});
    
    console.log('✅ All data deleted successfully!');
    
    // Verify deletion
    const counts = {
      clients: await prisma.client.count(),
      users: await prisma.user.count(),
      projects: await prisma.project.count(),
      documentLogs: await prisma.documentLog.count()
    };
    
    console.log('📊 Final counts:', counts);
    
  } catch (error) {
    console.error('❌ Error resetting database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetData();