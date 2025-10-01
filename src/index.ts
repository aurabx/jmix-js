// JMIX TypeScript Library - Main Entry Point
// JSON Medical Interchange format for secure medical data exchange

export { JmixBuilder, type JmixBuilderOptions } from './JmixBuilder.js';
export {
  SchemaValidator,
  type SchemaValidatorOptions,
} from './validation/SchemaValidator.js';
export { DicomProcessor } from './dicom/DicomProcessor.js';

// Export all types
export * from './types/index.js';

// Re-export key types for convenience
export type {
  JmixEnvelope,
  Config,
  Manifest,
  Metadata,
  Audit,
  Files,
  DicomMetadata,
  Patient,
  ContactVariant,
  Contact,
  Security,
  Consent,
  Encryption,
  SenderAssertion,
} from './types/index.js';
