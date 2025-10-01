// JMIX Core Types - TypeScript interfaces for JMIX envelope components
// Error types
export class JmixError extends Error {
    cause;
    constructor(message, cause) {
        super(message);
        this.cause = cause;
        this.name = 'JmixError';
    }
}
export class ValidationError extends JmixError {
    errors;
    constructor(message, errors = []) {
        super(message);
        this.errors = errors;
        this.name = 'ValidationError';
    }
}
export class CryptographyError extends JmixError {
    constructor(message, cause) {
        super(message, cause);
        this.name = 'CryptographyError';
    }
}
export class DicomError extends JmixError {
    constructor(message, cause) {
        super(message, cause);
        this.name = 'DicomError';
    }
}
//# sourceMappingURL=index.js.map