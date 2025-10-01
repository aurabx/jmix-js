# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

Repository: runbeam/jmix/jmix-ts (TypeScript, Node 20+)

What this library does

- Builds a JMIX (JSON Medical Interchange) envelope from a folder of DICOM files and a configuration object.
- Produces three validated JSON components: manifest.json (security/routing), metadata.json (clinical data), transmission.json (audit trail).
- Supports AES-256-GCM encryption with ephemeral public key, IV, and authentication tag encoded in base64.

Prerequisites

- Node.js 20+ LTS
- npm
- TypeScript 5+
- Optional: External DICOM tools for enhanced metadata extraction

Common commands

- Install dependencies
  - npm install
- Build the library
  - npm run build
- Type-check without emitting
  - npm run typecheck
- Run all tests (Jest)
  - npm test
  - or: npm run test
- Run tests in watch mode
  - npm run test:watch
- Generate coverage report
  - npm run test:coverage
  - HTML report outputs to coverage/
- Run a single test file
  - npm test -- JmixBuilder.test.ts
- Run tests matching a pattern
  - npm test -- --testNamePattern="should build envelope"
- Lint and formatting
  - Check: npm run lint
  - Fix: npm run lint:fix
  - Format check: npm run format
  - Format fix: npm run format:fix
- Clean build artifacts
  - npm run clean

High-level architecture

- Module system: ESM (ES modules)
- Build output: dist/ directory with compiled JavaScript and TypeScript declarations
- Primary orchestrator: src/JmixBuilder.ts
  - Orchestrates the full build pipeline via buildFromDicom(dicomPath: string, config: Config): Promise<JmixEnvelope>
    - Generates transmission ID (crypto.randomUUID()) and timestamp
    - Extracts DICOM metadata via DicomProcessor
    - Builds components: manifest, metadata, transmission
    - Validates each component via SchemaValidator
    - Returns { manifest, metadata, transmission }
  - saveToFiles(envelope: JmixEnvelope, outputPath: string): Promise<void> - writes the three JSON files with pretty-printing to ./tmp or specified output
- DICOM processing: src/dicom/DicomProcessor.ts
  - Recursively scans a directory and detects DICOM files using the DICM magic number at byte offset 128
  - Produces merged metadata: patient details, study description/UID, modalities, series, instance_count
  - Contains fallback strategies for metadata extraction when DICOM parsing fails
  - Uses Node.js Buffer and file system APIs for efficient file processing
- JSON Schema validation: src/validation/SchemaValidator.ts
  - Uses Ajv (Another JSON Schema Validator) to validate each component
  - Looks for schema files by filename (e.g., manifest.schema.json, metadata.schema.json, transmission.schema.json)
  - Default schema base path: ../jmix/schemas (configurable via constructor or environment variable)
- Cryptography: src/crypto/
  - AES-256-GCM encryption with ephemeral public key, IV, and authentication tag encoded in base64
  - ECDH key agreement over Curve25519
  - HKDF key derivation using SHA-256
  - Uses Node.js WebCrypto API for secure operations
- Error handling: src/errors/
  - JmixError: base error class
  - ValidationError: includes structured schema validation errors
  - CryptographyError: encryption/decryption failures
  - DicomError: DICOM processing failures
- Type definitions: src/types/
  - Complete TypeScript interfaces for JMIX envelope components
  - Configuration types and validation

Test Data

- Sample DICOM files: samples/
  - Contains sample JSON configuration and envelope components
  - Used for testing and development without needing to generate dummy DICOM files
  - Provides realistic structure for comprehensive testing

Tests

- Location: tests/ or **tests**/ depending on Jest configuration
- Framework: Jest with TypeScript support via ts-jest
- Strategy: Uses sample data in samples/ directory for realistic testing scenarios
- Coverage: Includes unit tests, integration tests, and schema validation tests
- Temp files: All test outputs go to ./tmp directory (not system /tmp)

Security

- Refer to .ai/security.md for complete security model
- Implements AES-256-GCM encryption as specified in JMIX security whitepaper
- Ephemeral key use ensures forward secrecy
- Base64 encoding for all cryptographic material (ephemeral_public_key, iv, auth_tag)

Operational tips for Warp

- Prefer npm scripts where available (test, build, lint, format)
- For focused debugging, run a single Jest test file or use --testNamePattern
- Use samples/ directory for testing with realistic JMIX structure
- If schema validation fails, verify the schema path used by SchemaValidator (default: ../jmix/schemas)
- Temp files are written to ./tmp directory, not system /tmp
- When skipping features or using placeholder implementations, add TODO comments for future reference
- ESM modules: use import/export syntax, not require()

Schemas

- Canonical source: https://github.com/aurabx/jmix (see /schemas)
- Default schema path: ../jmix/schemas (relative to package root)
- This works automatically in the monorepo structure where jmix-ts and jmix directories are siblings
- Schema path can be overridden via:
  - Environment variable: JMIX_SCHEMA_PATH
  - Constructor parameter: new SchemaValidator({ schemaPath: '/custom/path' })
  - Configuration object passed to JmixBuilder
- Schema validation is optional and gracefully skipped if schema files are not found
