// Compatibility exports while callers migrate to generated-report storage terminology.
export {
  LocalGeneratedReportStorage as ReportArchive,
  generatedReportStorageRoot as archiveRoot,
} from './storage/local-generated-report-storage';
