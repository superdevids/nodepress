'use client';

import * as React from 'react';
import {
  Upload,
  Download,
  FileText,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Eye,
  FileSpreadsheet,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Globe,
  Users,
  Image,
  MessageSquare,
  Tag,
  Menu,
  Settings,
  ChevronRight,
  File,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/toast';
import { useApi } from '@/lib/use-api';

// ── Types ─────────────────────────────────────────────────────
interface ImportPreviewItem {
  id: string;
  title: string;
  type: string;
  status: string;
  author: string;
  date: string;
  willImport: boolean;
}

interface WxrPreviewData {
  preview: ImportPreviewItem[];
  counts: {
    posts: number;
    pages: number;
    media: number;
    categories: number;
    tags: number;
    users: number;
    comments: number;
    menuItems: number;
  };
  meta: {
    title: string;
    link: string;
    description: string;
    baseSiteUrl: string;
  };
}

interface ImportResult {
  sessionId: string;
  stats: {
    posts: number;
    pages: number;
    media: number;
    categories: number;
    tags: number;
    comments: number;
    users: number;
    menus: number;
    menuItems: number;
    skipped: number;
    errors: number;
  };
  errors: string[];
  totalErrors: number;
}

type ImportStep = 'upload' | 'preview' | 'options' | 'running' | 'complete';

// ── Main Component ────────────────────────────────────────────
export default function ImportExportPage() {
  const { success, error: showError } = useToast();
  const { get, upload } = useApi();
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = React.useState('export');

  // Export state
  const [exportType, setExportType] = React.useState('all');
  const [exportFormat, setExportFormat] = React.useState('json');
  const [exporting, setExporting] = React.useState(false);

  // Import state (JSON/CSV)
  const [importFile, setImportFile] = React.useState<File | null>(null);
  const [importing, setImporting] = React.useState(false);
  const [previewMode, setPreviewMode] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [previewItems, setPreviewItems] = React.useState<ImportPreviewItem[]>([]);
  const [previewLoading, setPreviewLoading] = React.useState(false);
  const [previewError, setPreviewError] = React.useState<string | null>(null);

  // WordPress import state
  const [wpStep, setWpStep] = React.useState<ImportStep>('upload');
  const [wpFile, setWpFile] = React.useState<File | null>(null);
  const [wpUrl, setWpUrl] = React.useState('');
  const [wpPreviewData, setWpPreviewData] = React.useState<WxrPreviewData | null>(null);
  const [wpUploadedPath, setWpUploadedPath] = React.useState('');
  const [wpLoading, setWpLoading] = React.useState(false);
  const [wpProgress, setWpProgress] = React.useState(0);
  const [wpResult, setWpResult] = React.useState<ImportResult | null>(null);
  const [wpError, setWpError] = React.useState<string | null>(null);
  const [wpRollingBack, setWpRollingBack] = React.useState(false);

  // Import options
  const [importOptions, setImportOptions] = React.useState({
    posts: true,
    pages: true,
    media: true,
    categories: true,
    tags: true,
    users: true,
    comments: true,
    menus: true,
    downloadMedia: false,
  });

  // ── Export Handlers ─────────────────────────────────────────
  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await get<{ url: string }>(`/export?type=${exportType}&format=${exportFormat}`);
      if (res.data?.url) {
        const a = document.createElement('a');
        a.href = res.data.url;
        a.download = `export-${exportType}.${exportFormat}`;
        a.click();
      }
      success(
        `${exportFormat.toUpperCase()} export complete`,
        `Your data has been exported as ${exportFormat.toUpperCase()}.`,
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Export failed';
      showError('Export failed', message);
    } finally {
      setExporting(false);
    }
  };

  // ── JSON/CSV Import Handlers ────────────────────────────────
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImportFile(file);
      setPreviewMode(true);
      setPreviewLoading(true);
      setPreviewError(null);
      try {
        const formData = new FormData();
        formData.append('file', file);
        const res = await upload<{ preview: ImportPreviewItem[] }>('/import/preview', formData);
        setPreviewItems(res.data?.preview || []);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to preview file';
        setPreviewError(message);
        showError('Preview failed', message);
      } finally {
        setPreviewLoading(false);
      }
    }
  };

  const handleImport = async () => {
    if (!importFile) return;
    setImporting(true);
    setProgress(0);
    try {
      const formData = new FormData();
      formData.append('file', importFile);
      formData.append('items', JSON.stringify(previewItems.filter((i) => i.willImport)));

      await upload<{ count: number }>('/import', formData, (pct) => setProgress(pct));

      setProgress(100);
      setTimeout(() => {
        setImporting(false);
        setImportFile(null);
        setPreviewMode(false);
        setProgress(0);
        success('Import complete', 'Content has been imported successfully.');
      }, 500);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Import failed';
      showError('Import failed', message);
      setImporting(false);
    }
  };

  // ── WordPress Import Handlers ──────────────────────────────
  const handleWpFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setWpFile(file);
    setWpStep('preview');
    setWpLoading(true);
    setWpError(null);

    try {
      // Upload file first
      const formData = new FormData();
      formData.append('file', file);
      const uploadRes = await upload<{ filePath: string; fileName: string }>(
        '/import/upload',
        formData,
      );
      const filePath = uploadRes?.data?.filePath;
      if (!filePath) throw new Error('Failed to upload file');

      setWpUploadedPath(filePath);

      // Preview with a second request using the file path
      // We need to fetch preview differently since the file is already on server
      const previewRes = await get<WxrPreviewData>(
        `/import/preview?path=${encodeURIComponent(filePath)}`,
      );

      // For now, we'll re-upload for preview via the original multipart endpoint
      const previewFormData = new FormData();
      previewFormData.append('file', file);
      const res = await upload<{ data: WxrPreviewData }>('/import/preview', previewFormData);
      if (res?.data?.data) {
        setWpPreviewData(res.data.data);
      } else {
        // If the endpoint returns flat structure
        setWpPreviewData(res?.data as any);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to process WordPress file';
      setWpError(message);
      showError('Preview failed', message);
    } finally {
      setWpLoading(false);
    }
  };

  const handleWpUrlImport = async () => {
    if (!wpUrl) return;
    setWpStep('preview');
    setWpLoading(true);
    setWpError(null);

    try {
      // Try to fetch the WXR file from the URL via our API
      const res = await upload<{ data: WxrPreviewData }>(
        '/import/from-url',
        new URLSearchParams({ url: wpUrl }).toString(),
      );
      if (res?.data?.data) {
        setWpPreviewData(res.data.data);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch WordPress URL';
      setWpError(message);
      showError('URL import failed', message);
      setWpStep('upload'); // Go back
    } finally {
      setWpLoading(false);
    }
  };

  const handleWpRunImport = async () => {
    if (!wpUploadedPath && !wpFile) return;

    setWpStep('running');
    setWpProgress(0);
    setWpError(null);

    try {
      // If we haven't uploaded yet, upload first
      let filePath = wpUploadedPath;
      if (!filePath && wpFile) {
        const formData = new FormData();
        formData.append('file', wpFile);
        const uploadRes = await upload<{ filePath: string }>('/import/upload', formData);
        filePath = uploadRes?.data?.filePath || '';
        setWpUploadedPath(filePath);
      }

      if (!filePath) throw new Error('Failed to upload file');

      // Simulate progress
      const progressInterval = setInterval(() => {
        setWpProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + Math.random() * 8;
        });
      }, 2000);

      // Execute import via API
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filePath,
          importMedia: importOptions.media,
          importUsers: importOptions.users,
          downloadMedia: importOptions.downloadMedia,
        }),
      });

      clearInterval(progressInterval);

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: 'Import failed' }));
        throw new Error(errorData.message || errorData.error || 'Import failed');
      }

      const result = await res.json();
      setWpResult(result.data || result);
      setWpProgress(100);
      setWpStep('complete');

      success(
        'WordPress import complete',
        `${result.data?.stats?.posts || 0} posts, ${result.data?.stats?.pages || 0} pages, ${result.data?.stats?.comments || 0} comments imported`,
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Import failed';
      setWpError(message);
      showError('Import failed', message);
      setWpStep('options'); // Go back to options
    }
  };

  const handleWpRollback = async () => {
    setWpRollingBack(true);
    try {
      const res = await fetch('/api/import/rollback', { method: 'POST' });
      if (!res.ok) throw new Error('Rollback failed');
      const result = await res.json();
      success('Rollback complete', result.message || 'Import has been undone');
      setWpStep('upload');
      setWpResult(null);
      setWpPreviewData(null);
      setWpFile(null);
      setWpUploadedPath('');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Rollback failed';
      showError('Rollback failed', message);
    } finally {
      setWpRollingBack(false);
    }
  };

  const resetWpImport = () => {
    setWpStep('upload');
    setWpFile(null);
    setWpUrl('');
    setWpPreviewData(null);
    setWpUploadedPath('');
    setWpProgress(0);
    setWpResult(null);
    setWpError(null);
  };

  // ── Render ──────────────────────────────────────────────────
  return (
    <div className="max-w-4xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Import / Export</h1>
        <p className="text-muted-foreground mt-1">
          Import and export your content, settings, and data.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="export">
            <Download className="mr-1.5 h-4 w-4" /> Export
          </TabsTrigger>
          <TabsTrigger value="import">
            <Upload className="mr-1.5 h-4 w-4" /> Import
          </TabsTrigger>
          <TabsTrigger value="wordpress">
            <FileSpreadsheet className="mr-1.5 h-4 w-4" /> WordPress
          </TabsTrigger>
        </TabsList>

        {/* ════════════════ EXPORT TAB ════════════════ */}
        <TabsContent value="export" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Download className="text-muted-foreground h-5 w-5" />
                <div>
                  <CardTitle className="text-lg">Export Content</CardTitle>
                  <CardDescription>
                    Download your content as a file for backup or migration.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Content Type</Label>
                <Select value={exportType} onValueChange={setExportType}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Content</SelectItem>
                    <SelectItem value="post">Posts Only</SelectItem>
                    <SelectItem value="page">Pages Only</SelectItem>
                    <SelectItem value="media">Media Only</SelectItem>
                    <SelectItem value="users">Users Only</SelectItem>
                    <SelectItem value="settings">Settings Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Format</Label>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant={exportFormat === 'json' ? 'default' : 'outline'}
                    className="h-20 flex-col gap-1"
                    onClick={() => setExportFormat('json')}
                  >
                    <FileText className="h-5 w-5" />
                    <span className="text-xs">JSON</span>
                  </Button>
                  <Button
                    variant={exportFormat === 'csv' ? 'default' : 'outline'}
                    className="h-20 flex-col gap-1"
                    onClick={() => setExportFormat('csv')}
                  >
                    <FileSpreadsheet className="h-5 w-5" />
                    <span className="text-xs">CSV</span>
                  </Button>
                </div>
              </div>
              <Button onClick={handleExport} className="w-full" disabled={exporting}>
                {exporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Exporting...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" /> Export as {exportFormat.toUpperCase()}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ════════════════ IMPORT TAB ════════════════ */}
        <TabsContent value="import" className="space-y-4">
          {!previewMode ? (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Upload className="text-muted-foreground h-5 w-5" />
                  <div>
                    <CardTitle className="text-lg">Import Content</CardTitle>
                    <CardDescription>Import content from a JSON or CSV file.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <input
                  ref={fileRef}
                  type="file"
                  accept=".json,.csv"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <div
                  className="hover:border-muted-foreground/50 cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors"
                  onClick={() => fileRef.current?.click()}
                >
                  <Upload className="text-muted-foreground mx-auto mb-2 h-8 w-8" />
                  <p className="text-sm font-medium">Click to upload a file</p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    Supports JSON and CSV formats
                  </p>
                </div>
                <div className="bg-muted flex items-start gap-2 rounded-md p-3">
                  <AlertCircle className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
                  <p className="text-muted-foreground text-xs">
                    Importing will create new content entries. Existing content with the same slug
                    may be skipped. A dry-run preview will be shown before the actual import.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Eye className="text-muted-foreground h-5 w-5" />
                  <div>
                    <CardTitle className="text-lg">Import Preview</CardTitle>
                    <CardDescription>
                      {importFile?.name} &mdash; {previewItems.filter((i) => i.willImport).length}{' '}
                      items will be imported
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {previewLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
                  </div>
                ) : previewError ? (
                  <div className="flex flex-col items-center py-8 text-center">
                    <AlertCircle className="text-destructive mb-2 h-8 w-8" />
                    <p className="text-destructive text-sm">{previewError}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() => {
                        setPreviewMode(false);
                        setImportFile(null);
                      }}
                    >
                      Try Again
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="max-h-80 overflow-auto rounded-md border">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-muted/50 border-b">
                            <th className="w-10 p-2">
                              <Checkbox
                                checked={
                                  previewItems.length > 0 && previewItems.every((i) => i.willImport)
                                }
                                onCheckedChange={() => {
                                  const all = !previewItems.every((i) => i.willImport);
                                  setPreviewItems((prev) =>
                                    prev.map((i) => ({ ...i, willImport: all })),
                                  );
                                }}
                              />
                            </th>
                            <th className="p-2 text-left font-medium">Title</th>
                            <th className="p-2 text-left font-medium">Type</th>
                            <th className="p-2 text-left font-medium">Status</th>
                            <th className="p-2 text-left font-medium">Author</th>
                          </tr>
                        </thead>
                        <tbody>
                          {previewItems.map((item, i) => (
                            <tr key={i} className="hover:bg-muted/50 border-b">
                              <td className="p-2">
                                <Checkbox
                                  checked={item.willImport}
                                  onCheckedChange={(c) => {
                                    setPreviewItems((prev) =>
                                      prev.map((p, idx) =>
                                        idx === i ? { ...p, willImport: !!c } : p,
                                      ),
                                    );
                                  }}
                                />
                              </td>
                              <td className="p-2">{item.title}</td>
                              <td className="p-2">
                                <Badge variant="outline">{item.type}</Badge>
                              </td>
                              <td className="p-2">
                                <Badge
                                  variant={item.status === 'PUBLISHED' ? 'success' : 'secondary'}
                                >
                                  {item.status}
                                </Badge>
                              </td>
                              <td className="text-muted-foreground p-2">{item.author}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {importing && (
                      <div className="space-y-1">
                        <div className="text-muted-foreground flex justify-between text-xs">
                          <span>Importing...</span>
                          <span>{Math.round(progress)}%</span>
                        </div>
                        <div className="bg-muted h-2 w-full rounded-full">
                          <div
                            className="bg-primary h-2 rounded-full transition-all duration-300"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    )}
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setPreviewMode(false);
                          setImportFile(null);
                        }}
                        disabled={importing}
                      >
                        Cancel
                      </Button>
                      <Button onClick={handleImport} disabled={importing}>
                        {importing ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Importing...
                          </>
                        ) : (
                          <>
                            <Upload className="mr-2 h-4 w-4" /> Import{' '}
                            {previewItems.filter((i) => i.willImport).length} Items
                          </>
                        )}
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ════════════════ WORDPRESS TAB ════════════════ */}
        <TabsContent value="wordpress" className="space-y-4">
          {wpStep === 'upload' && (
            <WpUploadStep
              wpFile={wpFile}
              wpUrl={wpUrl}
              setWpUrl={setWpUrl}
              onFileSelect={handleWpFileSelect}
              onUrlImport={handleWpUrlImport}
            />
          )}

          {wpStep === 'preview' && (
            <WpPreviewStep
              loading={wpLoading}
              error={wpError}
              previewData={wpPreviewData}
              onBack={() => {
                setWpStep('upload');
                setWpError(null);
              }}
              onContinue={() => setWpStep('options')}
            />
          )}

          {wpStep === 'options' && (
            <WpOptionsStep
              previewData={wpPreviewData}
              importOptions={importOptions}
              setImportOptions={setImportOptions}
              onBack={() => setWpStep('upload')}
              onImport={handleWpRunImport}
              onReset={resetWpImport}
            />
          )}

          {wpStep === 'running' && <WpRunningStep progress={wpProgress} error={wpError} />}

          {wpStep === 'complete' && (
            <WpCompleteStep
              result={wpResult}
              onRollback={handleWpRollback}
              rollingBack={wpRollingBack}
              onNewImport={resetWpImport}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── WordPress Step Components ─────────────────────────────────

function WpUploadStep({
  wpFile,
  wpUrl,
  setWpUrl,
  onFileSelect,
  onUrlImport,
}: {
  wpFile: File | null;
  wpUrl: string;
  setWpUrl: (v: string) => void;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onUrlImport: () => void;
}) {
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [method, setMethod] = React.useState<'file' | 'url'>('file');

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="text-muted-foreground h-5 w-5" />
            <div>
              <CardTitle className="text-lg">WordPress XML Import</CardTitle>
              <CardDescription>
                Import your entire WordPress site from a WXR export file or site URL.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Method selector */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant={method === 'file' ? 'default' : 'outline'}
              className="h-16 flex-col gap-1"
              onClick={() => setMethod('file')}
            >
              <Upload className="h-4 w-4" />
              <span className="text-xs">Upload WXR File</span>
            </Button>
            <Button
              variant={method === 'url' ? 'default' : 'outline'}
              className="h-16 flex-col gap-1"
              onClick={() => setMethod('url')}
            >
              <Globe className="h-4 w-4" />
              <span className="text-xs">Import from URL</span>
            </Button>
          </div>

          {method === 'file' ? (
            <>
              <input
                ref={fileRef}
                type="file"
                accept=".xml,.wxr"
                className="hidden"
                onChange={onFileSelect}
              />
              <div
                className="hover:border-muted-foreground/50 cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors"
                onClick={() => fileRef.current?.click()}
              >
                {wpFile ? (
                  <>
                    <CheckCircle2 className="text-primary mx-auto mb-2 h-8 w-8" />
                    <p className="text-sm font-medium">{wpFile.name}</p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {(wpFile.size / 1024 / 1024).toFixed(2)} MB — Click to change file
                    </p>
                  </>
                ) : (
                  <>
                    <Upload className="text-muted-foreground mx-auto mb-2 h-8 w-8" />
                    <p className="text-sm font-medium">Upload WordPress WXR file</p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      Select a WordPress eXtended RSS (WXR) export file (.xml)
                    </p>
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>WordPress Site URL</Label>
                <Input
                  placeholder="https://old-wordpress-site.com"
                  value={wpUrl}
                  onChange={(e) => setWpUrl(e.target.value)}
                />
                <p className="text-muted-foreground text-xs">
                  We'll attempt to fetch the WXR export from{' '}
                  <code className="bg-muted rounded px-1">/wp-content/export.xml</code>
                </p>
              </div>
              <Button className="w-full" onClick={onUrlImport} disabled={!wpUrl}>
                <Globe className="mr-2 h-4 w-4" /> Fetch from URL
              </Button>
            </div>
          )}

          {/* Info box */}
          <div className="bg-muted flex items-start gap-2 rounded-md p-3">
            <AlertCircle className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
            <div className="text-muted-foreground space-y-1 text-xs">
              <p>
                WordPress imports support <strong>posts</strong>, <strong>pages</strong>,{' '}
                <strong>media</strong>, <strong>categories</strong>, <strong>tags</strong>,{' '}
                <strong>users</strong>, <strong>comments</strong>, and <strong>menus</strong>.
              </p>
              <p>
                Some WordPress shortcodes and custom blocks will be converted to compatible formats.
                ACF field data is preserved.
              </p>
              <p>
                Existing content with the same slug will be skipped. You can rollback the entire
                import if needed.
              </p>
            </div>
          </div>

          {wpFile && (
            <Button
              className="w-full"
              onClick={() => onFileSelect({ target: { files: null } } as any)}
              disabled
            >
              Actually, the file is already selected. Click to proceed.
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function WpPreviewStep({
  loading,
  error,
  previewData,
  onBack,
  onContinue,
}: {
  loading: boolean;
  error: string | null;
  previewData: WxrPreviewData | null;
  onBack: () => void;
  onContinue: () => void;
}) {
  if (loading) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center py-12">
          <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
          <p className="text-muted-foreground mt-4 text-sm">Analyzing WordPress export file...</p>
          <p className="text-muted-foreground mt-1 text-xs">
            Parsing XML structure and extracting content
          </p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center py-12 text-center">
          <AlertCircle className="text-destructive mb-2 h-10 w-10" />
          <p className="text-destructive text-sm font-medium">Failed to preview file</p>
          <p className="text-muted-foreground mt-1 text-xs">{error}</p>
          <div className="mt-4 flex gap-2">
            <Button variant="outline" size="sm" onClick={onBack}>
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!previewData) return null;

  const { counts, meta } = previewData;
  const totalItems =
    counts.posts + counts.pages + counts.media + counts.comments + counts.menuItems;
  const hasUsers = counts.users > 0;

  return (
    <div className="space-y-4">
      {/* Site info card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Globe className="text-muted-foreground h-5 w-5" />
            <div>
              <CardTitle className="text-lg">{meta.title || 'WordPress Site'}</CardTitle>
              <CardDescription>
                {meta.link && (
                  <a
                    href={meta.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    {meta.link}
                  </a>
                )}
                {meta.description && <span> — {meta.description}</span>}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Counts */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard icon={<File />} label="Posts" count={counts.posts} color="blue" />
        <StatCard icon={<File />} label="Pages" count={counts.pages} color="purple" />
        <StatCard icon={<Image />} label="Media" count={counts.media} color="green" />
        <StatCard icon={<Tag />} label="Categories" count={counts.categories} color="orange" />
        <StatCard icon={<Tag />} label="Tags" count={counts.tags} color="teal" />
        <StatCard icon={<Users />} label="Users" count={counts.users} color="indigo" />
        <StatCard icon={<MessageSquare />} label="Comments" count={counts.comments} color="pink" />
        <StatCard icon={<Menu />} label="Menu Items" count={counts.menuItems} color="gray" />
      </div>

      {/* Actions */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <Button onClick={onContinue}>
          Continue <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function WpOptionsStep({
  previewData,
  importOptions,
  setImportOptions,
  onBack,
  onImport,
  onReset,
}: {
  previewData: WxrPreviewData | null;
  importOptions: any;
  setImportOptions: (opts: any) => void;
  onBack: () => void;
  onImport: () => void;
  onReset: () => void;
}) {
  const counts = previewData?.counts;

  const toggle = (key: string) => {
    setImportOptions({ ...importOptions, [key]: !importOptions[key] });
  };

  const options = [
    { key: 'posts', label: 'Posts', count: counts?.posts || 0, icon: <File className="h-4 w-4" /> },
    { key: 'pages', label: 'Pages', count: counts?.pages || 0, icon: <File className="h-4 w-4" /> },
    {
      key: 'media',
      label: 'Media',
      count: counts?.media || 0,
      icon: <Image className="h-4 w-4" />,
    },
    {
      key: 'categories',
      label: 'Categories',
      count: counts?.categories || 0,
      icon: <Tag className="h-4 w-4" />,
    },
    { key: 'tags', label: 'Tags', count: counts?.tags || 0, icon: <Tag className="h-4 w-4" /> },
    {
      key: 'users',
      label: 'Users',
      count: counts?.users || 0,
      icon: <Users className="h-4 w-4" />,
    },
    {
      key: 'comments',
      label: 'Comments',
      count: counts?.comments || 0,
      icon: <MessageSquare className="h-4 w-4" />,
    },
    {
      key: 'menus',
      label: 'Menus & Nav',
      count: counts?.menuItems || 0,
      icon: <Menu className="h-4 w-4" />,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <Settings className="text-muted-foreground h-5 w-5" />
          <div>
            <CardTitle className="text-lg">Import Options</CardTitle>
            <CardDescription>
              Choose what to import. All items are selected by default.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Import items checklist */}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {options.map((opt) => (
            <label
              key={opt.key}
              className={`hover:bg-accent flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
                importOptions[opt.key] ? 'border-primary/50 bg-primary/5' : ''
              }`}
              onClick={() => toggle(opt.key)}
            >
              <Checkbox checked={importOptions[opt.key]} onCheckedChange={() => toggle(opt.key)} />
              <div className="flex flex-1 items-center gap-2">
                {opt.icon}
                <span className="text-sm font-medium">{opt.label}</span>
              </div>
              <Badge variant="outline" className="ml-auto">
                {opt.count}
              </Badge>
            </label>
          ))}
        </div>

        {/* Advanced options */}
        <div className="space-y-3 rounded-lg border p-4">
          <Label className="text-sm font-medium">Advanced Options</Label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={importOptions.downloadMedia}
              onChange={() => toggle('downloadMedia')}
              className="rounded"
            />
            Download media files from WordPress (may take a while)
          </label>
          <p className="text-muted-foreground text-xs">
            If enabled, the tool will download all images and files from your WordPress site and
            upload them to NodePress.
          </p>
        </div>

        {/* Role mapping info */}
        <div className="bg-muted rounded-md p-3 text-xs">
          <p className="font-medium">WordPress → NodePress Role Mapping:</p>
          <p className="text-muted-foreground mt-1">
            Administrator → Super Admin · Editor → Editor · Author → Author · Contributor →
            Contributor · Subscriber → Subscriber
          </p>
        </div>

        {/* Actions */}
        <div className="flex justify-between">
          <div>
            <Button variant="outline" onClick={onBack}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            <Button variant="ghost" size="sm" className="ml-2" onClick={onReset}>
              <RefreshCw className="mr-1 h-3 w-3" /> Reset
            </Button>
          </div>
          <Button onClick={onImport}>
            Import {counts ? counts.posts + counts.pages + counts.media : 0} Items{' '}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function WpRunningStep({ progress, error }: { progress: number; error: string | null }) {
  return (
    <Card>
      <CardContent className="space-y-6 py-8">
        <div className="flex flex-col items-center text-center">
          {error ? (
            <>
              <AlertCircle className="text-destructive mb-2 h-10 w-10" />
              <p className="text-destructive font-medium">Import Error</p>
              <p className="text-muted-foreground mt-1 text-sm">{error}</p>
            </>
          ) : (
            <>
              <Loader2 className="text-primary mb-2 h-10 w-10 animate-spin" />
              <p className="font-medium">Importing WordPress Content</p>
              <p className="text-muted-foreground mt-1 text-sm">
                Please wait while we process your import...
              </p>
            </>
          )}
        </div>

        <div className="space-y-2">
          <div className="text-muted-foreground flex justify-between text-xs">
            <span>Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="bg-muted h-3 w-full overflow-hidden rounded-full">
            <div
              className="bg-primary h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </div>

        {/* Stage indicators */}
        <div className="space-y-2 text-xs">
          {[
            { label: 'Parsing WXR file', done: progress > 5 },
            { label: 'Importing users', done: progress > 15 },
            { label: 'Importing categories & tags', done: progress > 25 },
            { label: 'Importing posts & pages', done: progress > 45 },
            { label: 'Importing media', done: progress > 60 },
            { label: 'Importing comments', done: progress > 75 },
            { label: 'Importing menus', done: progress > 85 },
            { label: 'Finalizing & saving', done: progress > 92 },
          ].map((stage, i) => (
            <div key={i} className="flex items-center gap-2">
              {stage.done ? (
                <CheckCircle2 className="h-3 w-3 text-green-500" />
              ) : (
                <div className="bg-muted h-3 w-3 rounded-full" />
              )}
              <span className={stage.done ? 'text-green-600' : 'text-muted-foreground'}>
                {stage.label}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function WpCompleteStep({
  result,
  onRollback,
  rollingBack,
  onNewImport,
}: {
  result: ImportResult | null;
  onRollback: () => void;
  rollingBack: boolean;
  onNewImport: () => void;
}) {
  if (!result) return null;

  const { stats, errors, sessionId } = result;

  return (
    <div className="space-y-4">
      {/* Success card */}
      <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20">
        <CardContent className="py-6">
          <div className="flex flex-col items-center text-center">
            <CheckCircle2 className="mb-2 h-12 w-12 text-green-600" />
            <h2 className="text-xl font-bold text-green-700 dark:text-green-400">
              Import Complete!
            </h2>
            <p className="mt-1 text-sm text-green-600/80">
              Your WordPress content has been successfully imported into NodePress.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Import Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <StatCard icon={<File />} label="Posts" count={stats.posts} color="blue" />
            <StatCard icon={<File />} label="Pages" count={stats.pages} color="purple" />
            <StatCard icon={<Image />} label="Media" count={stats.media} color="green" />
            <StatCard icon={<Tag />} label="Categories" count={stats.categories} color="orange" />
            <StatCard icon={<Tag />} label="Tags" count={stats.tags} color="teal" />
            <StatCard icon={<Users />} label="Users" count={stats.users} color="indigo" />
            <StatCard
              icon={<MessageSquare />}
              label="Comments"
              count={stats.comments}
              color="pink"
            />
            <StatCard icon={<Menu />} label="Menu Items" count={stats.menuItems} color="gray" />
          </div>

          {stats.skipped > 0 && (
            <div className="bg-muted mt-4 rounded-md p-3 text-xs">
              <span className="font-medium">{stats.skipped} existing items skipped</span>
              (duplicate slugs were ignored)
            </div>
          )}

          {stats.errors > 0 && (
            <div className="border-destructive/50 mt-4 rounded-md border p-3 text-xs">
              <p className="font-medium text-red-600">{stats.errors} errors during import</p>
              {errors?.length > 0 && (
                <ul className="text-muted-foreground mt-2 list-disc space-y-1 pl-4">
                  {errors.slice(0, 10).map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                  {errors.length > 10 && <li>...and {errors.length - 10} more</li>}
                </ul>
              )}
            </div>
          )}

          <div className="text-muted-foreground mt-4 text-xs">
            Session ID: <code className="bg-muted rounded px-1">{sessionId}</code>
          </div>
        </CardContent>
      </Card>

      {/* Quick links */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">View Imported Content</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {stats.posts > 0 && (
              <Button variant="outline" size="sm" asChild>
                <a href="/admin/content/post">
                  <File className="mr-1 h-3 w-3" /> View Posts ({stats.posts})
                </a>
              </Button>
            )}
            {stats.pages > 0 && (
              <Button variant="outline" size="sm" asChild>
                <a href="/admin/content/page">
                  <File className="mr-1 h-3 w-3" /> View Pages ({stats.pages})
                </a>
              </Button>
            )}
            {stats.media > 0 && (
              <Button variant="outline" size="sm" asChild>
                <a href="/admin/media">
                  <Image className="mr-1 h-3 w-3" /> View Media ({stats.media})
                </a>
              </Button>
            )}
            {stats.users > 0 && (
              <Button variant="outline" size="sm" asChild>
                <a href="/admin/users">
                  <Users className="mr-1 h-3 w-3" /> View Users ({stats.users})
                </a>
              </Button>
            )}
            {stats.comments > 0 && (
              <Button variant="outline" size="sm" asChild>
                <a href="/admin/content/comments">
                  <MessageSquare className="mr-1 h-3 w-3" /> View Comments ({stats.comments})
                </a>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onNewImport}>
          <Upload className="mr-2 h-4 w-4" /> Import Another Site
        </Button>
        <Button variant="destructive" size="sm" onClick={onRollback} disabled={rollingBack}>
          {rollingBack ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Rolling back...
            </>
          ) : (
            <>
              <Trash2 className="mr-2 h-4 w-4" /> Rollback Import
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// ── Stat Card ─────────────────────────────────────────────────
function StatCard({
  icon,
  label,
  count,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  color: string;
}) {
  const colorClasses: Record<string, string> = {
    blue: 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-950/30',
    purple: 'text-purple-600 bg-purple-50 dark:text-purple-400 dark:bg-purple-950/30',
    green: 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-950/30',
    orange: 'text-orange-600 bg-orange-50 dark:text-orange-400 dark:bg-orange-950/30',
    teal: 'text-teal-600 bg-teal-50 dark:text-teal-400 dark:bg-teal-950/30',
    indigo: 'text-indigo-600 bg-indigo-50 dark:text-indigo-400 dark:bg-indigo-950/30',
    pink: 'text-pink-600 bg-pink-50 dark:text-pink-400 dark:bg-pink-950/30',
    gray: 'text-gray-600 bg-gray-50 dark:text-gray-400 dark:bg-gray-950/30',
  };

  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-center gap-2">
        <div className={`rounded-md p-1.5 ${colorClasses[color] || colorClasses.blue}`}>{icon}</div>
        <div>
          <p className="text-2xl font-bold">{count}</p>
          <p className="text-muted-foreground text-xs">{label}</p>
        </div>
      </div>
    </div>
  );
}
