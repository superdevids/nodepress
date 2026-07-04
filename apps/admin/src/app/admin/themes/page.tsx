'use client';

import * as React from 'react';
import {
  Palette,
  Check,
  ExternalLink,
  Trash2,
  Loader2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { useApi } from '@/lib/use-api';

interface Theme {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  active: boolean;
  screenshot?: string;
}

export default function ThemesPage() {
  const { get, post, del } = useApi();
  const { success, error: showError } = useToast();
  const [themes, setThemes] = React.useState<Theme[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [fetchError, setFetchError] = React.useState<string | null>(null);
  const [activating, setActivating] = React.useState<string | null>(null);
  const [deleteTheme, setDeleteTheme] = React.useState<Theme | null>(null);
  const [deletingTheme, setDeletingTheme] = React.useState(false);

  const fetchThemes = React.useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await get<Theme[]>('/api/themes');
      setThemes(res.data || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load themes';
      setFetchError(message);
      showError('Error', message);
    } finally {
      setLoading(false);
    }
  }, [get, showError]);

  React.useEffect(() => {
    fetchThemes();
  }, [fetchThemes]);

  const activateTheme = async (id: string) => {
    setActivating(id);
    try {
      await post(`/api/themes/${id}/activate`);
      setThemes((prev) => prev.map((t) => ({ ...t, active: t.id === id })));
      const theme = themes.find((t) => t.id === id);
      success('Theme Activated', `${theme?.name || 'Theme'} is now the active theme.`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to activate theme';
      showError('Error', message);
    } finally {
      setActivating(null);
    }
  };

  const handleDeleteTheme = async () => {
    if (!deleteTheme) return;
    setDeletingTheme(true);
    try {
      await del(`/api/themes/${deleteTheme.id}`);
      success('Theme deleted', `${deleteTheme.name} has been deleted.`);
      setDeleteTheme(null);
      await fetchThemes();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete theme';
      showError('Error', message);
    } finally {
      setDeletingTheme(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center space-y-6 p-6">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center space-y-6 p-6 text-center">
        <AlertCircle className="text-destructive mb-3 h-10 w-10" />
        <p className="text-destructive font-medium">{fetchError}</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={fetchThemes}>
          <RefreshCw className="mr-1.5 h-4 w-4" /> Retry
        </Button>
      </div>
    );
  }

  const activeTheme = themes.find((t) => t.active);
  const inactiveThemes = themes.filter((t) => !t.active);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Themes</h1>
          <p className="text-muted-foreground mt-1">Manage your site appearance with themes.</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchThemes} disabled={loading}>
          <RefreshCw className={`mr-1.5 h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      {themes.length === 0 ? (
        <div className="text-muted-foreground py-12 text-center">
          <Palette className="mx-auto mb-3 h-12 w-12 opacity-50" />
          <p>No themes found.</p>
        </div>
      ) : (
        <>
          {activeTheme && (
            <div>
              <h2 className="text-muted-foreground mb-3 text-sm font-medium uppercase tracking-wider">
                Active Theme
              </h2>
              <Card className="border-primary border-2">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-primary/10 rounded-lg p-3">
                        <Palette className="text-primary h-6 w-6" />
                      </div>
                      <div>
                        <CardTitle className="text-xl">{activeTheme.name}</CardTitle>
                        <CardDescription>
                          v{activeTheme.version} by {activeTheme.author}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge variant="success" className="gap-1">
                      <Check className="h-3 w-3" /> Active
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">{activeTheme.description}</p>
                </CardContent>
                <CardFooter className="gap-2">
                  <Button variant="outline" size="sm">
                    <ExternalLink className="mr-1.5 h-4 w-4" /> Customize
                  </Button>
                </CardFooter>
              </Card>
            </div>
          )}
          {inactiveThemes.length > 0 && (
            <div>
              <h2 className="text-muted-foreground mb-3 text-sm font-medium uppercase tracking-wider">
                Installed Themes
              </h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {inactiveThemes.map((theme) => (
                  <Card key={theme.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="bg-muted rounded-lg p-2">
                            <Palette className="text-muted-foreground h-5 w-5" />
                          </div>
                          <div>
                            <CardTitle className="text-base">{theme.name}</CardTitle>
                            <CardDescription>v{theme.version}</CardDescription>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground text-sm">{theme.description}</p>
                      <p className="text-muted-foreground mt-2 text-xs">By {theme.author}</p>
                    </CardContent>
                    <CardFooter className="flex justify-between">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => activateTheme(theme.id)}
                        disabled={activating === theme.id}
                      >
                        {activating === theme.id ? (
                          <>
                            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Activating...
                          </>
                        ) : (
                          <>
                            <Check className="mr-1.5 h-4 w-4" /> Activate
                          </>
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive h-8 w-8"
                        onClick={() => setDeleteTheme(theme)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTheme} onOpenChange={(o) => !o && setDeleteTheme(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Theme</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {deleteTheme?.name}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTheme(null)} disabled={deletingTheme}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteTheme} disabled={deletingTheme}>
              {deletingTheme ? 'Deleting...' : 'Delete Theme'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
