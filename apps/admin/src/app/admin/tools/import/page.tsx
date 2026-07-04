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
import { useToast } from '@/components/ui/toast';
import { useApi } from '@/lib/use-api';

interface ImportPreview {
  type: string;
  title: string;
  status: string;
  author: string;
  date: string;
  willImport: boolean;
}

export default function ImportExportPage() {
  const { success, error: showError } = useToast();
  const { get, upload } = useApi();
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = React.useState('export');
  const [exportType, setExportType] = React.useState('all');
  const [exportFormat, setExportFormat] = React.useState('json');
  const [importFile, setImportFile] = React.useState<File | null>(null);
  const [importing, setImporting] = React.useState(false);
  const [previewMode, setPreviewMode] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [exporting, setExporting] = React.useState(false);

  const [previewItems, setPreviewItems] = React.useState<ImportPreview[]>([]);
  const [previewLoading, setPreviewLoading] = React.useState(false);
  const [previewError, setPreviewError] = React.useState<string | null>(null);

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
        const res = await upload<{ preview: ImportPreview[] }>('/import/preview', formData);
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

  return (
    <div className="max-w-3xl space-y-6 p-6">
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
                    <div className="rounded-md border">
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
                                  variant={item.status === 'published' ? 'success' : 'secondary'}
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

        <TabsContent value="wordpress" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="text-muted-foreground h-5 w-5" />
                <div>
                  <CardTitle className="text-lg">WordPress XML Import</CardTitle>
                  <CardDescription>
                    Import content from a WordPress WXR export file.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                className="hover:border-muted-foreground/50 cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors"
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="text-muted-foreground mx-auto mb-2 h-8 w-8" />
                <p className="text-sm font-medium">Upload WordPress XML (WXR) file</p>
                <p className="text-muted-foreground mt-1 text-xs">
                  Select a WordPress eXtended RSS (WXR) export file
                </p>
              </div>
              <div className="bg-muted flex items-start gap-2 rounded-md p-3">
                <AlertCircle className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
                <div className="text-muted-foreground space-y-1 text-xs">
                  <p>
                    WordPress imports support posts, pages, media attachments, categories, and tags.
                  </p>
                  <p>
                    Some WordPress shortcodes and custom blocks may not be fully compatible and will
                    be imported as HTML.
                  </p>
                  <p>A dry-run preview will be shown before the actual import begins.</p>
                </div>
              </div>
              <div className="space-y-2 rounded-lg border p-4">
                <Label className="text-sm">Import Options</Label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" defaultChecked className="rounded" /> Import attachments
                    (download media files)
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" defaultChecked className="rounded" /> Import categories
                    and tags
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" className="rounded" /> Import users (create new accounts)
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
