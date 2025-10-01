#!/usr/bin/env node

// Decrypt an existing ENCRYPTED JMIX envelope directory.
// Usage:
//   node demo-decrypt-existing.js <envelopeDir> <recipientPrivateKeyBase64>

import { JmixBuilder } from './dist/index.js';

async function main() {
  const envelopeDir = process.argv[2];
  const privKeyB64 = process.argv[3];

  if (!envelopeDir || !privKeyB64) {
    console.error('Usage: node demo-decrypt-existing.js <envelopeDir> <recipientPrivateKeyBase64>');
    process.exit(2);
  }

  const builder = new JmixBuilder();
  console.log('🔓 Decrypting envelope:', envelopeDir);
  const payloadPath = await builder.decryptEnvelope(envelopeDir, privKeyB64);
  console.log('✅ Decrypted payload at:', payloadPath);
}

main().catch(err => {
  console.error('❌ Decryption failed:', err?.message || String(err));
  process.exit(1);
});