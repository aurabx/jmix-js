#!/usr/bin/env node

// Demo that builds an ENCRYPTED JMIX package.
// Usage:
//   node demo-package-encrypted.js <recipientPublicKeyBase64> [dicomPath] [outputRoot]
//
// recipientPublicKeyBase64 is a Curve25519 (X25519) public key, 32 bytes base64.

import { JmixBuilder } from './dist/index.js';

async function main() {
  try {
    const recipientKey = process.argv[2];
    if (!recipientKey) {
      console.error('Usage: node demo-package-encrypted.js <recipientPublicKeyBase64> [dicomPath] [outputRoot]');
      process.exit(2);
    }
    const dicomPath = process.argv[3] || './samples/study_1';
    const outputRoot = process.argv[4] || './tmp';

    const config = await JmixBuilder.loadConfig('./samples/sample_config.json');

    const builder = new JmixBuilder({ outputPath: './tmp' });
    console.log('🔒 Packaging ENCRYPTED JMIX folder...');
    const out = await builder.packageEncryptedToDirectory(dicomPath, config, outputRoot, recipientKey);
    console.log('✅ Encrypted package at:', out);
    console.log('Contains: manifest.json, audit.json, payload.encrypted');
  } catch (err) {
    console.error('❌ Encrypted packaging failed:', err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

main();
