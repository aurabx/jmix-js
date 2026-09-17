# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.2] - 2026-09-17

### Fixed
- Add a `default` condition to the package `exports` map so CommonJS consumers can `require('@aurabx/jmix-js')`. Only an `import` condition was declared before, so any `require()` of the package (including a TypeScript `import()` compiled under `module: commonjs`) failed with `ERR_PACKAGE_PATH_NOT_EXPORTED`. CommonJS loading relies on Node's `require(esm)` support, so CJS consumers need Node 20.19+ or 22.12+. ESM consumers are unaffected.
- Add a `prepublishOnly` build step so a publish cannot ship a stale `dist/`.

## [0.2.0] - 2025-10-24

### Added
- Payload hash verification feature with new `verifyPayloadHash()` API method
- New demo script `demo-verify-hash.js` for demonstrating payload hash verification
- Support for verifying payload hashes on both plaintext and encrypted envelopes
- Deterministic SHA-256 payload hash computation over sorted file paths and contents

### Changed
- Demo files reorganized into `dist/` directory for better organization
- WARP.md moved from `.ai/` directory to project root for improved visibility
- README.md updated with comprehensive documentation for payload verification features

### Fixed
- Package.json configuration improvements for better npm compatibility

## [0.1.0] - 2025-01-XX

### Added
- Initial release of JMIX TypeScript library
- JmixBuilder for creating JMIX envelopes from DICOM directories
- AES-256-GCM encryption with X25519 key agreement and HKDF key derivation
- Three JSON components: manifest.json, metadata.json, audit.json
- DICOM file processing with metadata extraction
- Schema validation using Ajv
- Encryption and decryption support for JMIX payloads
- Comprehensive test suite with Jest
- Demo scripts for package creation, encryption, and decryption
