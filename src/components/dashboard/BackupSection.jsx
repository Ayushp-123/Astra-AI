import { useState, useRef } from 'react';
import { 
  Download, 
  UploadCloud, 
  HardDrive, 
  CheckCircle2, 
  AlertCircle,
  Shield
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { 
  exportBackup, 
  downloadBackupFile, 
  parseBackupJson, 
  validateBackup, 
  previewBackup, 
  restoreBackup 
} from '../../services/backupService';
import ImportPreviewModal from './ImportPreviewModal';

const BackupSection = ({ onRefreshActivities }) => {
  const { applyRestoredState } = useStore();
  const fileInputRef = useRef(null);

  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [exportError, setExportError] = useState(null);

  const [isReadingFile, setIsReadingFile] = useState(false);
  const [importError, setImportError] = useState(null);
  const [parsedBackupData, setParsedBackupData] = useState(null);
  const [previewSummary, setPreviewSummary] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreError, setRestoreError] = useState(null);
  const [restoreSuccess, setRestoreSuccess] = useState(false);

  // Handle Export Flow
  const handleExport = async () => {
    try {
      setIsExporting(true);
      setExportError(null);
      setExportSuccess(false);

      const backupData = await exportBackup();
      downloadBackupFile(backupData);

      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 4000);
    } catch (err) {
      console.error("Export error:", err);
      setExportError(err.message || "Failed to generate backup.");
    } finally {
      setIsExporting(false);
    }
  };

  // Trigger File Input Dialog
  const handleTriggerImport = () => {
    setImportError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  // Handle File Input Change
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      setImportError("Please select a valid ASTRA backup JSON file (.json).");
      return;
    }

    setIsReadingFile(true);
    setImportError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result;
        const parseResult = parseBackupJson(text);

        if (!parseResult.success) {
          setImportError(parseResult.error || "Malformed JSON in backup file.");
          setIsReadingFile(false);
          return;
        }

        const validation = validateBackup(parseResult.data);
        if (!validation.isValid) {
          setImportError(validation.error || "Invalid ASTRA backup format.");
          setIsReadingFile(false);
          return;
        }

        const preview = previewBackup(parseResult.data);
        setParsedBackupData(parseResult.data);
        setPreviewSummary(preview);
        setIsModalOpen(true);
      } catch (err) {
        setImportError("Failed to read backup file: " + err.message);
      } finally {
        setIsReadingFile(false);
      }
    };

    reader.onerror = () => {
      setImportError("Unable to read selected file.");
      setIsReadingFile(false);
    };

    reader.readAsText(file);
  };

  // Handle Modal Restore Confirmation
  const handleConfirmRestore = async (mode) => {
    if (!parsedBackupData) return;

    try {
      setIsRestoring(true);
      setRestoreError(null);
      setRestoreSuccess(false);

      const result = await restoreBackup(parsedBackupData, { mode });

      if (result.success && result.restoredState) {
        applyRestoredState(result.restoredState);
        if (onRefreshActivities) {
          onRefreshActivities();
        }
        setRestoreSuccess(true);

        setTimeout(() => {
          setIsModalOpen(false);
          setRestoreSuccess(false);
          setParsedBackupData(null);
          setPreviewSummary(null);
        }, 1200);
      }
    } catch (err) {
      console.error("Restore error:", err);
      setRestoreError(err.message || "Failed to restore backup.");
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="p-6 md:p-7 rounded-3xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 backdrop-blur-md shadow-xl space-y-6">
      {/* Header & Privacy Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 flex-shrink-0">
            <HardDrive className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white">
                Data & Backup
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-semibold text-indigo-300 uppercase tracking-wider font-mono">
                100% Local
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              Your study data is stored locally in this browser. Export a backup to move your study data to another device.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".json,application/json"
            className="hidden"
          />

          <button
            onClick={handleTriggerImport}
            disabled={isReadingFile || isExporting}
            className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-gray-200 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <UploadCloud className="w-4 h-4 text-purple-400" />
            <span>{isReadingFile ? "Reading..." : "Import Backup"}</span>
          </button>

          <button
            onClick={handleExport}
            disabled={isExporting}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs transition-all flex items-center gap-2 shadow-lg shadow-purple-500/20 cursor-pointer disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{isExporting ? "Exporting..." : "Export Backup"}</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {exportSuccess && (
        <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
          <span>Backup JSON downloaded successfully. You can import this file anytime to restore your study data.</span>
        </div>
      )}

      {exportError && (
        <div className="p-3 rounded-2xl bg-red-950/40 border border-red-500/30 text-xs text-red-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
          <span>{exportError}</span>
        </div>
      )}

      {importError && (
        <div className="p-3 rounded-2xl bg-red-950/40 border border-red-500/30 text-xs text-red-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
          <span>{importError}</span>
        </div>
      )}

      {/* Privacy note */}
      <div className="flex items-center gap-2 text-[11px] text-gray-400 font-mono">
        <Shield className="w-3.5 h-3.5 text-gray-400" />
        <span>ASTRA backups are strictly client-side JSON files and never contain API keys or credentials.</span>
      </div>

      {/* Preview Modal */}
      <ImportPreviewModal
        isOpen={isModalOpen}
        previewData={previewSummary}
        onClose={() => {
          if (!isRestoring) {
            setIsModalOpen(false);
            setParsedBackupData(null);
            setPreviewSummary(null);
          }
        }}
        onConfirmRestore={handleConfirmRestore}
        isRestoring={isRestoring}
        restoreError={restoreError}
        restoreSuccess={restoreSuccess}
      />
    </div>
  );
};

export default BackupSection;
