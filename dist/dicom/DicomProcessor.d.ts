import { DicomMetadata, Config } from '../types/index.js';
export declare class DicomProcessor {
    /**
     * Process a DICOM directory and extract metadata
     */
    processDicomFolder(dicomPath: string, config?: Config): Promise<DicomMetadata>;
    /**
     * Recursively find DICOM files in a directory
     */
    private findDicomFiles;
    /**
     * Check if a file is a DICOM file by checking the magic signature
     */
    private isDicomFile;
    /**
     * Create metadata from config when DICOM parsing fails or no files found
     */
    private createMetadataFromConfig;
    /**
     * Generate a study UID (placeholder implementation)
     */
    private generateStudyUID;
    /**
     * Estimate series count based on file naming patterns or directory structure
     */
    private estimateSeriesCount;
    /**
     * Attempt to read a DICOM tag value using Daikon's API (best-effort)
     */
    private readTag;
    /**
     * Format DICOM date to ISO format
     */
    static formatDicomDate(dicomDate: string): string;
    /**
     * Format DICOM person name to readable format
     */
    static formatDicomPersonName(dicomName: string): string;
}
//# sourceMappingURL=DicomProcessor.d.ts.map