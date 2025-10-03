# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

Repository: jmix-ts - TypeScript library for JMIX (JSON Medical Interchange) format

## What This Library Does

JMIX-TS builds secure JMIX envelopes from DICOM directories, supporting:
- AES-256-GCM encryption with X25519 key agreement and HKDF key derivation
- Three JSON components: manifest.json (routing/security), metadata.json (clinical), audit.json (trail)
- Deterministic payload hash verification over plaintext payload directories
- Full-featured packaging including original DICOM files and encrypted payload support

## Prerequisites

- Node.js 20+ LTS
- npm or compatible package manager
- TypeScript 5+

## Essential Commands

```bash
# Install dependencies
npm install

# Build the library
npm run build

# Run all tests (Jest with ESM support)
npm test

# Run specific test
npm test -- JmixBuilder.test.ts

# Test with coverage report (outputs to coverage/)
npm run test:coverage

# Watch mode for development
npm run test:watch

# Type checking only
npm run typecheck

# Format code
npm run format:fix

# Clean build artifacts and temporary files
npm run clean
```

## Demo Commands

```bash
# Basic package creation (plaintext)
npm run demo:package

# Encrypted package with generated keys
npm run demo:package:encrypted

# Decrypt and verify workflow
npm run demo:decrypt

# Verify payload hash
npm run demo:verify:hash
```

## High-Level Architecture

**Core Flow**: JmixBuilder orchestrates DICOM processing → JSON component generation → schema validation → file output/packaging.

```
DICOM Directory → DicomProcessor → JmixBuilder → {manifest, metadata, audit} → SchemaValidator → Output
                                       ↓
                    PayloadEncryptor/Decryptor → Encrypted JMIX Package
```

**Key Components**:
- `JmixBuilder`: Main orchestrator with buildFromDicom(), packageToDirectory(), and packageEncryptedToDirectory()
- `DicomProcessor`: Recursively scans directories, validates DICOM magic signatures, extracts metadata
- `SchemaValidator`: Ajv-based validation against JSON schemas in configurable path (default: ../jmix/schemas)
- `PayloadEncryptor/Decryptor`: AES-256-GCM with X25519+HKDF, base64-encoded ephemeral keys/IV/auth tags
- Deterministic payload hashing: SHA-256 over sorted (path + newline + bytes) for all payload files

## Configuration

### Schema Path
- Default: `../jmix/schemas` (works in monorepo structure)
- Override: `JMIX_SCHEMA_PATH` environment variable
- Constructor: `new SchemaValidator({ schemaPath: '/custom/path' })`
- Gracefully skips validation when schemas not found

### Output Directory
- Default: `./tmp` (not system /tmp)
- Constructor: `new JmixBuilder({ outputPath: './custom-tmp' })`

## Testing Strategy

- Uses sample DICOM files in `samples/` directory
- All test outputs written to `./tmp` directory
- Comprehensive coverage: unit tests, integration tests, schema validation
- Real DICOM file processing with fallback to configuration data
- Mock-free approach using actual sample data

## Cryptography Implementation

Based on JMIX security whitepaper (see `.ai/security.md`):
- **Algorithm**: AES-256-GCM
- **Key Exchange**: X25519 (Curve25519) ECDH
- **Key Derivation**: HKDF-SHA256 with info="JMIX-Payload-Encryption"
- **Forward Secrecy**: Ephemeral sender keys for each envelope
- **Authentication**: GCM authentication tag prevents tampering

Encryption creates `payload.encrypted` from tar-compressed payload directory, with all crypto material (ephemeral_public_key, iv, auth_tag) stored base64-encoded in manifest.security.encryption.

## File Structure Reference

**Generated JMIX Envelope**:
```
<envelope_id>.JMIX/
├── manifest.json     # Routing, security, patient info
├── audit.json        # Audit trail and events
└── payload/          # OR payload.encrypted (when encrypted)
    ├── metadata.json # Clinical metadata and DICOM info  
    └── dicom/        # Original DICOM files (structure preserved)
```

## Development Notes

- **ESM modules**: Uses import/export syntax, .js extensions in TypeScript imports
- **Jest configuration**: Supports ESM with ts-jest preset
- **Schema validation**: Optional and graceful - continues if schemas missing
- **Error handling**: Structured error types (JmixError, ValidationError, DicomError, CryptographyError)
- **DICOM detection**: Magic number 'DICM' at byte offset 128 plus .dcm/.dicom extensions

## Monorepo Context

This library expects to work within a larger jmix monorepo structure where:
- Schema definitions are available at `../jmix/schemas`
- Related Rust CLI tools may consume this library's output
- Sample data in `samples/` is shared across implementations

For more detailed guidance on general WARP usage patterns, see `.ai/WARP.md`.