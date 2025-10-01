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
    payload_hash?: string;
}
export interface Encryption {
    algorithm: 'AES-256-GCM';
    ephemeral_public_key: string;
    iv: string;
    auth_tag: string;
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
    sender: ContactVariant & {
        assertion?: SenderAssertion;
    };
    requester?: ContactVariant & {
        assertion?: SenderAssertion;
    };
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
    timestamp: string;
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
export declare class JmixError extends Error {
    readonly cause?: Error | undefined;
    constructor(message: string, cause?: Error | undefined);
}
export declare class ValidationError extends JmixError {
    readonly errors: string[];
    constructor(message: string, errors?: string[]);
}
export declare class CryptographyError extends JmixError {
    constructor(message: string, cause?: Error);
}
export declare class DicomError extends JmixError {
    constructor(message: string, cause?: Error);
}
//# sourceMappingURL=index.d.ts.map