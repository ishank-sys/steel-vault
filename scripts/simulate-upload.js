const fs = require('fs');
const { pipeline } = require('stream/promises');
const { Readable } = require('stream');

async function run() {
  const srcPath = 'C:\\Windows\\Temp\\test-upload.txt';
  const destPath = 'C:\\Windows\\Temp\\test-upload-dest.txt';

  if (!fs.existsSync(srcPath)) {
    console.error('Source test file not found:', srcPath);
    process.exit(2);
  }

  const nodeStream = fs.createReadStream(srcPath);
  const writeStream = fs.createWriteStream(destPath);

  try {
    await pipeline(nodeStream, writeStream);
    console.log('Pipeline finished, wrote to', destPath);
    const out = fs.readFileSync(destPath, 'utf8');
    console.log('Dest content:', out.trim());
    process.exit(0);
  } catch (err) {
    console.error('Pipeline failed:', err);
    process.exit(1);
  }
}

run();
