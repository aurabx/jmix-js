// JMIX Core Types - TypeScript interfaces for JMIX envelope components

export interface Contact {
  system?: string;
  value: string;
  use_field?: string;
}

export interface ContactVariant {
  name: string;
  id: string;
  contact: string | Contact;
}

export interface PatientIdentifier {
  system: string;
  value: string;
  use_field?: string;
}

export interface Patient {
  name: string;
  id: string;
  dob?: string;
  sex?: 'M' | 'F' | 'O' | 'U';
  identifiers?: PatientIdentifier[];
}

export interface Consent {
  status: 'granted' | 'denied' | 'pending';
  scope?: string[];
  method?: string;
}

export interface Security {
  classification: 'public' | 'internal' | 'confidential' | 'restricted';
  // Optional SHA-256 digest of the payload/ directory, formatted as "sha256:<hex>"
  payload_hash?: string;
}

export interface Encryption {
  algorithm: 'AES-256-GCM';
  ephemeral_public_key: string; // base64 encoded
  iv: string; // base64 encoded
  auth_tag: string; // base64 encoded
}

export interface SenderAssertion {
  signing_key: {
    alg: string;
    public_key: string;
    fingerprint: string;
  };
  key_reference?: string;
  signed_fields: string[];
  signature: string;
  expires_at?: string;
  directory_attestation?: {
    provider: string;
    attestation_signature: string;
    attestation_timestamp: string;
    attestation_public_key: string;
  };
}

export interface Manifest {
  jmix_version: string;
  envelope_id: string;
  created_at: string;
  sender: ContactVariant & { assertion?: SenderAssertion };
  requester?: ContactVariant & { assertion?: SenderAssertion };
  receivers: ContactVariant[];
  patient: Patient;
  security: Security;
  consent?: Consent;
  custom_tags?: string[];
  report?: {
    file: string;
  };
  deid_keys?: string[];
  encryption?: Encryption;
}

export interface DicomMetadata {
  patient_name?: string;
  patient_id?: string;
  patient_dob?: string;
  patient_sex?: string;
  study_description?: string;
  study_uid?: string;
  study_date?: string;
  modalities: string[];
  series_count: number;
  instance_count: number;
  series?: Array<{
    series_uid: string;
    series_description?: string;
    modality: string;
    instance_count: number;
  }>;
}

export interface Metadata {
  patient: Patient;
  study: {
    description?: string;
    uid?: string;
    date?: string;
  };
  dicom: DicomMetadata;
  custom_metadata?: Record<string, unknown>;
}

export interface AuditEntityRef {
  id: string;
  name?: string;
}

export interface AuditEntry {
  event: string;
  by: AuditEntityRef;
  to?: AuditEntityRef;
  timestamp: string; // date-time
  assertion?: SenderAssertion;
}

export interface Audit {
  audit: AuditEntry[];
}

export interface FileEntry {
  path: string;
  size: number;
  hash: string;
  mime_type?: string;
  description?: string;
}

export interface Files {
  payload_directory: string;
  files: FileEntry[];
  total_size: number;
  file_count: number;
}

export interface JmixEnvelope {
  manifest: Manifest;
  metadata: Metadata;
  audit: Audit;
  files?: Files;
}

export interface Config {
  version: string;
  sender: ContactVariant;
  requester?: ContactVariant;
  receivers: ContactVariant[];
  patient: Patient;
  security: Security;
  consent?: Consent;
  custom_tags?: string[];
  report?: {
    file: string;
  };
  deid_keys?: string[];
}

// Error types
export class JmixError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'JmixError';
  }
}

export class ValidationError extends JmixError {
  constructor(
    message: string,
    public readonly errors: string[] = []
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class CryptographyError extends JmixError {
  constructor(message: string, cause?: Error) {
    super(message, cause);
    this.name = 'CryptographyError';
  }
}

export class DicomError extends JmixError {
  constructor(message: string, cause?: Error) {
    super(message, cause);
    this.name = 'DicomError';
  }
}
