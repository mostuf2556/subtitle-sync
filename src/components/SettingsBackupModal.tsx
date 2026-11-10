import React, { useState, useEffect } from "react";
import { Download, Upload, Copy, Check, AlertCircle, X, Settings2 } from "lucide-react";
import { Button } from "./ui/button";
import {
  exportApplicationSettingsJson,
  downloadApplicationSettings,
  importApplicationSettings,
  ImportSettingsResult,
} from "../utils/settingsBackupManager";

interface SettingsBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsImported?: () => void;
  initialTab?: "export" | "import";
}

export const SettingsBackupModal: React.FC<SettingsBackupModalProps> = ({
  isOpen,
  onClose,
  onSettingsImported,
  initialTab = "export",
}) => {
  const [activeTab, setActiveTab] = useState<"export" | "import">(initialTab);
  const [jsonText, setJsonText] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);
  const [importStatus, setImportStatus] = useState<ImportSettingsResult | null>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      if (initialTab === "export") {
        setJsonText(exportApplicationSettingsJson(true));
      } else {
        setJsonText("");
      }
      setImportStatus(null);
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const handleOpenExport = () => {
    setActiveTab("export");
    setJsonText(exportApplicationSettingsJson(true));
    setImportStatus(null);
  };

  const handleOpenImport = () => {
    setActiveTab("import");
    setJsonText("");
    setImportStatus(null);
  };

  const handleDownload = () => {
    downloadApplicationSettings();
  };

  const handleCopy = async () => {
    const textToCopy = jsonText || exportApplicationSettingsJson(true);
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      setCopied(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setJsonText(content);
    };
    reader.readAsText(file);
  };

  const handleApplyImport = () => {
    if (!jsonText.trim()) {
      setImportStatus({
        success: false,
        importedKeysCount: 0,
        message: "Please paste or upload JSON settings first.",
      });
      return;
    }
    const result = importApplicationSettings(jsonText);
    setImportStatus(result);
    if (result.success) {
      if (onSettingsImported) {
        onSettingsImported();
      }
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Export or Import Application Settings"
      data-testid="settings-backup-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
    >
      <div className="relative w-full max-w-xl rounded-xl border border-border bg-card shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-4 bg-muted/40">
          <div className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary" />
            <h2 className="text-base font-semibold text-foreground">
              Application Settings: Export / Import
            </h2>
          </div>
          <button
            type="button"
            data-testid="settings-backup-modal-close"
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border bg-muted/20 px-4 pt-2 gap-2">
          <button
            type="button"
            data-testid="settings-backup-tab-export"
            onClick={handleOpenExport}
            className={`px-4 py-2 text-xs font-semibold rounded-t-md border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === "export"
                ? "border-primary text-primary bg-card"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export Settings</span>
          </button>
          <button
            type="button"
            data-testid="settings-backup-tab-import"
            onClick={handleOpenImport}
            className={`px-4 py-2 text-xs font-semibold rounded-t-md border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === "import"
                ? "border-primary text-primary bg-card"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Upload className="h-3.5 w-3.5" />
            <span>Import Settings</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1 text-xs">
          {activeTab === "export" ? (
            <div className="space-y-3">
              <p className="text-muted-foreground">
                Export all your application settings, learning goals, favorite languages, narration
                ratios, TTS blacklist, and preferences to a portable JSON backup file.
              </p>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Button
                  type="button"
                  size="sm"
                  data-testid="export-settings-download-btn"
                  onClick={handleDownload}
                  className="gap-1.5 text-xs h-8 bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download JSON File</span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  data-testid="export-settings-copy-btn"
                  onClick={handleCopy}
                  className="gap-1.5 text-xs h-8"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-500" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>Copy to Clipboard</span>
                    </>
                  )}
                </Button>
              </div>

              <div className="space-y-1 pt-2">
                <label className="font-semibold text-foreground">Backup JSON Content:</label>
                <textarea
                  readOnly
                  data-testid="export-settings-preview-area"
                  value={jsonText || exportApplicationSettingsJson(true)}
                  rows={8}
                  className="w-full rounded-md border border-input bg-muted/40 p-2 font-mono text-[11px] text-foreground focus:outline-hidden"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-muted-foreground">
                Import settings from a previously exported JSON backup file or paste JSON content
                directly.
              </p>

              <div className="space-y-2">
                <label className="font-semibold text-foreground block">
                  Upload Backup JSON File:
                </label>
                <input
                  type="file"
                  accept=".json,application/json"
                  data-testid="import-settings-file-input"
                  onChange={handleFileUpload}
                  className="block w-full text-xs text-muted-foreground file:mr-2 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground block">
                  Or Paste JSON Content:
                </label>
                <textarea
                  data-testid="import-settings-paste-area"
                  placeholder="Paste settings JSON here..."
                  value={jsonText}
                  onChange={(e) => setJsonText(e.target.value)}
                  rows={6}
                  className="w-full rounded-md border border-input bg-background p-2 font-mono text-[11px] text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                />
              </div>

              {importStatus && (
                <div
                  data-testid="import-settings-status"
                  className={`p-2.5 rounded-md border text-xs flex items-start gap-2 ${
                    importStatus.success
                      ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-400"
                      : "bg-destructive/15 border-destructive/30 text-destructive"
                  }`}
                >
                  {importStatus.success ? (
                    <Check className="h-4 w-4 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div className="font-semibold">{importStatus.message}</div>
                    {importStatus.error && (
                      <div className="text-[11px] opacity-80 mt-0.5">{importStatus.error}</div>
                    )}
                  </div>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onClose}
                  className="text-xs h-8"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  data-testid="import-settings-apply-btn"
                  onClick={handleApplyImport}
                  className="gap-1.5 text-xs h-8 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
                >
                  <Upload className="h-3.5 w-3.5" />
                  <span>Apply Imported Settings</span>
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
