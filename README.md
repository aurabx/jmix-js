# JMIX TypeScript Library

TypeScript implementation of the JMIX (JSON Medical Interchange) format for secure medical data exchange.

## Installation

```bash
npm install
npm run build
```

## Prerequisites

- Node.js 20+ LTS
- npm
- TypeScript 5+

## Quick Start

```typescript
import { JmixBuilder } from 'jmix-ts';

// Create a builder
const builder = new JmixBuilder({
  outputPath: './tmp'
});

// Create or load configuration
const config = await JmixBuilder.loadConfig('./samples/sample_config.json');

// Build envelope from DICOM directory
const envelope = await builder.buildFromDicom('./samples/study_1', config);

// Save to files
await builder.saveToFiles(envelope, './output');
```

## Demo

Run the demo to see the library in action:

```bash
npm run build
node demo-no-validation.js
```

This creates a complete JMIX envelope with:
- `manifest.json` - Security, routing, and patient information
- `metadata.json` - Clinical data and DICOM metadata
- `audit.json` - Audit trail and transmission details
ckaging (folder-based JMIX envelope)

Create a proper JMIX folder that includes the original DICOM files under `payload/dicom` and computes a deterministic SHA-256 payload hash stored at `manifest.security.payload_hash`.

CLI-like demo:

```sh
node demo-package.js ./samples/study_1 ./tmp
```

Programmatic API:

```ts
import { JmixBuilder } from './dist/index.js';

const builder = new JmixBuilder();
const config = await JmixBuilder.loadConfig('./samples/sample_config.json');
const packagePath = await builder.packageToDirectory('./samples/study_1', config, './tmp');
console.log(packagePath); // => ./tmp/<envelope_id>.JMIX
```

Resulting layout:

```text
<outputRoot>/<envelope_id>.JMIX/
├── manifest.json
├── audit.json
└── payload/
    ├── metadata.json
    └── dicom/
        └── ... (original DICOM files, structure preserved)
```

### Encryption (AES-256-GCM with X25519 + HKDF)

The library can produce an encrypted JMIX envelope. It tars the plaintext `payload/` directory, encrypts it with AES-256-GCM using a key derived from X25519 ECDH and HKDF-SHA256, then writes `payload.encrypted` and removes the plaintext `payload/`.

- Key agreement: Curve25519 (X25519)
- KDF: HKDF-SHA256 (info = "JMIX-Payload-Encryption")
- Cipher: AES-256-GCM
- Manifest fields:
  - `manifest.security.payload_hash` — SHA-256 over the plaintext `payload/` (deterministic, path+newline+bytes per file)
  - `manifest.security.encryption`:
    - `algorithm`: "AES-256-GCM"
    - `ephemeral_public_key`: base64
    - `iv`: base64 (12 bytes)
    - `auth_tag`: base64 (16 bytes)

Demo:

```sh
# recipientPublicKeyBase64 must be a 32-byte Curve25519 key in base64
node demo-package-encrypted.js <recipientPublicKeyBase64> ./samples/study_1 ./tmp
```

Programmatic API:

```ts
import { JmixBuilder } from './dist/index.js';

const builder = new JmixBuilder();
const config = await JmixBuilder.loadConfig('./samples/sample_config.json');
const packagePath = await builder.packageEncryptedToDirectory(
  './samples/study_1',
  config,
  './tmp',
  '<recipientPublicKeyBase64>'
);
console.log(packagePath);
```

Encrypted layout:

```text
<outputRoot>/<envelope_id>.JMIX/
├── manifest.json               # includes security.payload_hash and security.encryption
├── audit.json
└── payload.encrypted           # AES-256-GCM encrypted TAR of plaintext payload/
```

### Decryption

You can decrypt an encrypted JMIX envelope and restore a plaintext `payload/` directory. The payload hash is verified against `manifest.security.payload_hash`.

Self-contained demo (encrypt + decrypt with a fresh keypair):

```sh
node demo-decrypt.js ./samples/study_1 ./tmp
```

Decrypt an existing folder (requires the matching Curve25519 private key in base64):

```sh
node demo-decrypt-existing.js ./tmp/<envelope_id>.JMIX <recipientPrivateKeyBase64>
```

Programmatic API:

```ts
import { JmixBuilder } from './dist/index.js';

const builder = new JmixBuilder();
const payloadPath = await builder.decryptEnvelope(
  './tmp/<envelope_id>.JMIX',
  '<recipientPrivateKeyBase64>'
);
console.log(payloadPath);
```

### Verify Payload Hash

Verify the payload hash listed in `manifest.security.payload_hash`.

- Plaintext payload/: compare directly
- Encrypted payload.encrypted: requires the recipient private key to decrypt to a temp dir before verifying

CLI demo:

```sh
# Plaintext envelope
npm run demo:verify:hash -- ./tmp/<envelope_id>.JMIX

# Encrypted envelope (requires private key)
npm run demo:verify:hash -- ./tmp/<envelope_id>.JMIX <recipientPrivateKeyBase64>
```

Programmatic API:

```ts
import { JmixBuilder } from './dist/index.js';

const builder = new JmixBuilder();
const result = await builder.verifyPayloadHash(
  './tmp/<envelope_id>.JMIX',
  { recipientPrivateKeyBase64: '<privKey-if-encrypted>' }
);
console.log(result.ok, result.expected, result.computed);
```

## Scripts

```bash
# Development
npm run build          # Compile TypeScript
npm run typecheck      # Type checking only
npm test               # Run all tests
npm run test:watch     # Run tests in watch mode
npm run test:coverage  # Generate coverage report

# Code Quality
npm run format         # Check code formatting
npm run format:fix     # Fix code formatting
npm run clean          # Clean build artifacts
```

## Architecture

```
src/
├── JmixBuilder.ts           # Main orchestrator
├── types/index.ts           # TypeScript interfaces
├── validation/              # Ajv schema validation
├── dicom/                   # DICOM file processing
├── crypto/                  # AES-256-GCM encryption (future)
└── errors/                  # Error types

tests/                       # Jest test suite
samples/                     # Sample JSON files
```

## Configuration

### Schema Validation

** This is Alpha quality code and has not yet been fully tested **

The library uses configurable schema validation:

```typescript
const builder = new JmixBuilder({
  schemaValidatorOptions: {
    schemaPath: '../jmix/schemas',  // Default: ../jmix/schemas
    strictMode: true                // Default: true
  }
});

// Or via environment variable
process.env.JMIX_SCHEMA_PATH = '/path/to/schemas';
```

### Output Directory

Follows user rules for temp file output:

```typescript
const builder = new JmixBuilder({
  outputPath: './tmp'  // Default: ./tmp (not /tmp)
});
```

## DICOM Processing

The library automatically:

1. Recursively scans directories for DICOM files
2. Validates files using DICM magic number at byte offset 128
3. Extracts metadata (patient info, study details, series information)
4. Falls back gracefully to configuration data when DICOM parsing fails
5. Supports empty directories for testing

## Schema Validation

- **Default**: Looks for schemas in `../jmix/schemas`
- **Configurable**: Override via constructor or environment variable
- **Graceful Degradation**: Skips validation when schemas not found
- **Comprehensive**: Validates manifest, metadata, and audit components

## Testing

Run the comprehensive test suite:

```bash
# All tests
npm test

# Specific test files
npm test JmixBuilder.test.ts
npm test SchemaValidator.test.ts

# With coverage
npm run test:coverage
```

The test suite includes:
- ✅ JmixBuilder integration tests
- ✅ Schema validator tests
- ✅ Type definition tests
- ✅ DICOM processing tests
- ✅ Configuration loading tests
- ✅ File I/O tests

All tests use the `/samples` directory for realistic test data and output to `./tmp` for temporary files.

## Security Model

Implements the JMIX security whitepaper specifications:
- **AES-256-GCM** encryption with ephemeral public keys
- **Base64 encoding** for all cryptographic material (ephemeral_public_key, iv, auth_tag)
- **Forward secrecy** through ephemeral key usage
- **Optional governance** via Aurabox directory services

See `.ai/security.md` for the complete security model.

## Development

The library follows TypeScript best practices:
- **ESM modules** with .js imports in source
- **Strict TypeScript** configuration
- **Comprehensive type definitions** for all JMIX components
- **Jest testing** with ts-jest for ESM support
- **Prettier formatting** for consistent code style

## Files Generated

A complete JMIX envelope consists of:

- **`manifest.json`** - Routing, security classification, patient info, sender/receiver details
- **`metadata.json`** - Clinical metadata, DICOM study information, custom metadata
- **`audit.json`** - Audit trail, status, and events timeline
- **`files.json`** - (Optional) File manifest with hashes and sizes

## Compatibility

- **JMIX Specification**: Implements JMIX v1.0 format
- **Schema Compatibility**: Works with JMIX JSON Schema Draft 2020-12
- **DICOM Support**: Basic DICOM file detection and metadata extraction
- **Framework Agnostic**: Pure TypeScript, works with any Node.js framework

## License

Matches the licensing of the JMIX specification and related implementations.

---

For detailed API documentation, see the TypeScript declarations in `dist/` after building.