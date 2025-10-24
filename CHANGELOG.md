# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
