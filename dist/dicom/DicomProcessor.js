import * as fs from 'fs/promises';
import * as path from 'path';
import { DicomError } from '../types/index.js';
import daikon from 'daikon';
const DICOM_MAGIC_OFFSET = 128;
const DICOM_MAGIC_SIGNATURE = 'DICM';
function toArrayBuffer(buf) {
    const ab = new ArrayBuffer(buf.byteLength);
    const view = new Uint8Array(ab);
    view.set(buf);
    return ab;
}
export class DicomProcessor {
    /**
     * Process a DICOM directory and extract metadata
     */
    async processDicomFolder(dicomPath, config) {
        try {
            const dicomFiles = await this.findDicomFiles(dicomPath);
            if (dicomFiles.length === 0) {
                // Fallback to config data if no DICOM files found
                return this.createMetadataFromConfig(config);
            }
            // Parse files with Daikon and group by series
            const images = [];
            const seriesMap = new Map();
            const modalitiesSet = new Set();
            for (const f of dicomFiles) {
                try {
                    const buf = await fs.readFile(f);
                    const view = new DataView(toArrayBuffer(buf));
                    const image = daikon.Series.parseImage(view);
                    if (!image)
                        continue;
                    images.push(image);
                    const seriesId = image.getSeriesId ? image.getSeriesId() : path.dirname(f);
                    const arr = seriesMap.get(seriesId) || [];
                    arr.push(image);
                    seriesMap.set(seriesId, arr);
                    // Try to read modality if available
                    try {
                        const modality = (image.getModality && image.getModality()) || this.readTag(image, 0x0008, 0x0060) || 'UNKNOWN';
                        if (modality)
                            modalitiesSet.add(String(modality));
                    }
                    catch {
                        // ignore modality errors
                    }
                }
                catch {
                    // skip unreadable file
                }
            }
            const series = [];
            for (const [sid, imgs] of seriesMap.entries()) {
                series.push({
                    series_uid: String(sid),
                    modality: 'UNKNOWN',
                    instance_count: imgs.length,
                });
            }
            // Attempt to extract some study-level tags from the first image
            let study_description = undefined;
            let study_uid = undefined;
            let study_date = undefined;
            let patient_name = config?.patient.name;
            let patient_id = config?.patient.id;
            let patient_dob = config?.patient.dob;
            let patient_sex = config?.patient.sex;
            const first = images[0];
            if (first) {
                study_description = this.readTag(first, 0x0008, 0x1030) || 'Study';
                study_uid = this.readTag(first, 0x0020, 0x000D) || this.generateStudyUID();
                const sd = this.readTag(first, 0x0008, 0x0020);
                study_date = sd && String(sd).length === 8 ? DicomProcessor.formatDicomDate(String(sd)) : new Date().toISOString().split('T')[0];
                patient_name = this.readTag(first, 0x0010, 0x0010) || patient_name;
                patient_id = this.readTag(first, 0x0010, 0x0020) || patient_id;
                const dob = this.readTag(first, 0x0010, 0x0030);
                patient_dob = dob && String(dob).length === 8 ? DicomProcessor.formatDicomDate(String(dob)) : patient_dob;
                patient_sex = this.readTag(first, 0x0010, 0x0040) || patient_sex;
            }
            const metadata = {
                patient_name,
                patient_id,
                patient_dob,
                patient_sex,
                study_description,
                study_uid,
                study_date,
                modalities: Array.from(modalitiesSet.size ? modalitiesSet : new Set(['UNKNOWN'])),
                series_count: seriesMap.size || 1,
                instance_count: images.length,
                series,
            };
            return metadata;
        }
        catch (error) {
            throw new DicomError(`Failed to process DICOM folder: ${dicomPath}`, error instanceof Error ? error : new Error(String(error)));
        }
    }
    /**
     * Recursively find DICOM files in a directory
     */
    async findDicomFiles(dirPath) {
        const dicomFiles = [];
        try {
            const entries = await fs.readdir(dirPath, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(dirPath, entry.name);
                if (entry.isDirectory()) {
                    // Recursively search subdirectories
                    const subDirFiles = await this.findDicomFiles(fullPath);
                    dicomFiles.push(...subDirFiles);
                }
                else if (entry.isFile()) {
                    if (await this.isDicomFile(fullPath)) {
                        dicomFiles.push(fullPath);
                    }
                }
            }
        }
        catch (error) {
            throw new DicomError(`Failed to read directory: ${dirPath}`, error instanceof Error ? error : new Error(String(error)));
        }
        return dicomFiles;
    }
    /**
     * Check if a file is a DICOM file by checking the magic signature
     */
    async isDicomFile(filePath) {
        try {
            // Check file extension first (quick check)
            const ext = path.extname(filePath).toLowerCase();
            if (['.dcm', '.dicom'].includes(ext)) {
                return true;
            }
            // Check for DICM magic number at offset 128
            const fileHandle = await fs.open(filePath, 'r');
            const buffer = Buffer.alloc(4);
            await fileHandle.read(buffer, 0, 4, DICOM_MAGIC_OFFSET);
            await fileHandle.close();
            return buffer.toString('ascii') === DICOM_MAGIC_SIGNATURE;
        }
        catch {
            // If we can't read the file, assume it's not a DICOM file
            return false;
        }
    }
    /**
     * Create metadata from config when DICOM parsing fails or no files found
     */
    createMetadataFromConfig(config) {
        return {
            patient_name: config?.patient.name,
            patient_id: config?.patient.id,
            patient_dob: config?.patient.dob,
            patient_sex: config?.patient.sex,
            study_description: 'Study from configuration',
            study_uid: this.generateStudyUID(),
            study_date: new Date().toISOString().split('T')[0],
            modalities: ['UNKNOWN'],
            series_count: 1,
            instance_count: 0,
            series: [],
        };
    }
    /**
     * Generate a study UID (placeholder implementation)
     */
    generateStudyUID() {
        // Simple UID generation - in production would use proper DICOM UID format
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 10000);
        return `1.2.3.${timestamp}.${random}`;
    }
    /**
     * Estimate series count based on file naming patterns or directory structure
     */
    estimateSeriesCount(files) {
        // Simple estimation based on directory structure
        const directories = new Set();
        for (const file of files) {
            directories.add(path.dirname(file));
        }
        return Math.max(1, directories.size);
    }
    /**
     * Attempt to read a DICOM tag value using Daikon's API (best-effort)
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    readTag(image, group, element) {
        try {
            if (image && image.getTag && typeof image.getTag === 'function') {
                const tag = image.getTag(group, element);
                if (tag && tag.value && tag.value.length) {
                    return String(tag.value[0]);
                }
            }
        }
        catch {
            // ignore
        }
        return undefined;
    }
    /**
     * Format DICOM date to ISO format
     */
    static formatDicomDate(dicomDate) {
        if (!dicomDate || dicomDate.length !== 8) {
            return new Date().toISOString().split('T')[0];
        }
        const year = dicomDate.substring(0, 4);
        const month = dicomDate.substring(4, 6);
        const day = dicomDate.substring(6, 8);
        return `${year}-${month}-${day}`;
    }
    /**
     * Format DICOM person name to readable format
     */
    static formatDicomPersonName(dicomName) {
        if (!dicomName)
            return '';
        // DICOM names are in format: "Last^First^Middle^Prefix^Suffix"
        const parts = dicomName.split('^');
        const last = parts[0] || '';
        const first = parts[1] || '';
        const middle = parts[2] || '';
        return [first, middle, last].filter(Boolean).join(' ').trim();
    }
}
//# sourceMappingURL=DicomProcessor.js.map