#!/usr/bin/env node
/*
  scripts/clear_storage.js

  Usage (PowerShell):
    $env:GOOGLE_APPLICATION_CREDENTIALS='C:\path\to\cred.json';
    $env:GCS_BUCKET='your-bucket';
    $env:CONFIRM='YES';
    $env:CLEAR_GCS='true';
    $env:CLEAR_DB='true';
    node scripts/clear_storage.js

  Safety: must set CONFIRM=YES and set CLEAR_GCS and/or CLEAR_DB to 'true'.
*/

const { Storage } = require('@google-cloud/storage');
const { PrismaClient } = require('@prisma/client');

async function main() {
  const CONFIRM = String(process.env.CONFIRM || '').toUpperCase();
  const doGcs = String(process.env.CLEAR_GCS || '').toLowerCase() === 'true';
  const doDb = String(process.env.CLEAR_DB || '').toLowerCase() === 'true';

  if (CONFIRM !== 'YES') {
    console.error('Safety check: set CONFIRM=YES to proceed. Exiting.');
    process.exit(1);
  }

  if (!doGcs && !doDb) {
    console.error('Nothing to do. Set CLEAR_GCS=true and/or CLEAR_DB=true. Exiting.');
    process.exit(1);
  }

  if (doGcs) {
    const bucketName = process.env.GCS_BUCKET;
    if (!bucketName) {
      console.error('GCS_BUCKET not set; cannot clear GCS.');
      process.exit(1);
    }

    console.log(`Connecting to GCS bucket: ${bucketName}`);
    const storage = new Storage();
    const bucket = storage.bucket(bucketName);

    // list files
    const [files] = await bucket.getFiles({ autoPaginate: true });
    console.log(`Found ${files.length} objects in bucket ${bucketName}.`);
    if (files.length === 0) {
      console.log('No objects to delete.');
    } else {
      for (const file of files) {
        try {
          console.log(`Deleting gs://${bucketName}/${file.name}`);
          await file.delete();
        } catch (err) {
          console.error(`Failed to delete ${file.name}:`, err.message || err);
        }
      }
      console.log('GCS cleanup complete.');
    }
  }

  if (doDb) {
    console.log('Connecting to database and clearing documentLog table...');
    const prisma = new PrismaClient();
    try {
      // use deleteMany to avoid raw SQL on providers that restrict TRUNCATE
      const deleted = await prisma.documentLog.deleteMany({});
      console.log(`Deleted ${deleted.count} rows from documentLog.`);
    } catch (err) {
      console.error('Failed to clear documentLog via Prisma:', err.message || err);
    } finally {
      await prisma.$disconnect();
    }
  }

  console.log('Done.');
}

main().catch((err) => {
  console.error('Script failed:', err);
  process.exit(1);
});
