#!/usr/bin/env node

// Demo: Encrypt and then decrypt a JMIX envelope using a fresh X25519 keypair.
// Usage (self-contained):
//   node demo-decrypt.js [dicomPath] [outputRoot]

import { JmixBuilder } from './index.js';
import nacl from 'tweetnacl';
import * as fs from 'fs/promises';

async function main() {
  const dicomPath = process.argv[2] || './samples/study_1';
  const outputRoot = process.argv[3] || './tmp';

  const builder = new JmixBuilder();
  const config = await JmixBuilder.loadConfig('./samples/sample_config.json');

  // Generate a recipient keypair
  const kp = nacl.box.keyPair();
  const pubB64 = Buffer.from(kp.publicKey).toString('base64');
  const privB64 = Buffer.from(kp.secretKey).toString('base64');

  console.log('🔒 Building encrypted envelope...');
  const encryptedDir = await builder.packageEncryptedToDirectory(dicomPath, config, outputRoot, pubB64);
  console.log('Encrypted package:', encryptedDir);

  console.log('🔓 Decrypting envelope...');
  const payloadPath = await builder.decryptEnvelope(encryptedDir, privB64);
  console.log('Decrypted payload path:', payloadPath);

  // Show a couple of files
  const files = await fs.readdir(payloadPath);
  console.log('Payload entries:', files);
}

main().catch(err => {
  console.error('❌ Demo failed:', err?.message || String(err));
  process.exit(1);
});
