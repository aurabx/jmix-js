#!/usr/bin/env node

// Verify payload hash for a JMIX envelope.
// Usage:
//   node demo-verify-hash.js <envelopeDir> [recipientPrivateKeyBase64]
// - If payload/ exists, no key is required.
// - If only payload.encrypted exists, pass the Curve25519 private key.

import { JmixBuilder } from './index.js';

async function main() {
  const envelopeDir = process.argv[2];
  const privKey = process.argv[3];

  if (!envelopeDir) {
    console.error('Usage: node demo-verify-hash.js <envelopeDir> [recipientPrivateKeyBase64]');
    process.exit(2);
  }

  const b = new JmixBuilder();
  const result = await b.verifyPayloadHash(envelopeDir, { recipientPrivateKeyBase64: privKey });
  console.log('Mode:', result.mode);
  console.log('Expected:', result.expected);
  console.log('Computed:', result.computed);
  console.log('OK:', result.ok);

  process.exit(result.ok ? 0 : 1);
}

main().catch(err => { console.error('❌ Verification failed:', err?.message || String(err)); process.exit(1); });
