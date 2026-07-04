'use client';

import * as React from 'react';
import {
  Plus,
  Puzzle,
  Power,
  PowerOff,
  Settings,
  Trash2,
  ExternalLink,
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
import { Input } from '@/components/ui/input';
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

interface Plugin {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  active: boolean;
}

export default function PluginsPage() {
  const { get, post, del } = useApi();
  const { success, error: showError } = useToast();
  const [plugins, setPlugins] = React.useState<Plugin[]>([]);
  const [search, setSearch] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [fetchError, setFetchError] = React.useState<string | null>(null);
  const [toggling, setToggling] = React.useState<string | null>(null);
  const [deletePlugin, setDeletePlugin] = React.useState<Plugin | null>(null);
  const [deletingPlugin, setDeletingPlugin] = React.useState(false);

  const fetchPlugins = React.useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await get<Plugin[]>('/plugins');
      setPlugins(res.data || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load plugins';
      setFetchError(message);
      showError('Error', message);
    } finally {
      setLoading(false);
    }
  }, [get, showError]);

  React.useEffect(() => {
    fetchPlugins();
  }, [fetchPlugins]);

  const togglePlugin = async (id: string) => {
    const plugin = plugins.find((p) => p.id === id);
    if (!plugin) return;

    setToggling(id);
    try {
      if (plugin.active) {
        await post(`/plugins/${id}/deactivate`);
        setPlugins((prev) => prev.map((p) => (p.id === id ? { ...p, active: false } : p)));
        success('Plugin Deactivated', plugin.name);
      } else {
        await post(`/plugins/${id}/activate`);
        setPlugins((prev) => prev.map((p) => (p.id === id ? { ...p, active: true } : p)));
        success('Plugin Activated', plugin.name);
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : `Failed to ${plugin.active ? 'deactivate' : 'activate'} plugin`;
      showError('Error', message);
    } finally {
      setToggling(null);
    }
  };

  const handleDeletePlugin = async () => {
    if (!deletePlugin) return;
    setDeletingPlugin(true);
    try {
      await del(`/plugins/${deletePlugin.id}`);
      success('Plugin deleted', `${deletePlugin.name} has been deleted.`);
      setDeletePlugin(null);
      await fetchPlugins();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete plugin';
      showError('Error', message);
    } finally {
      setDeletingPlugin(false);
    }
  };

  const filtered = plugins.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase()),
  );

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
        <Button variant="outline" size="sm" className="mt-4" onClick={fetchPlugins}>
          <RefreshCw className="mr-1.5 h-4 w-4" /> Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Plugins</h1>
          <p className="text-muted-foreground mt-1">Extend NodePress with plugins.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchPlugins} disabled={loading}>
            <RefreshCw className={`mr-1.5 h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Button>
            <Plus className="mr-2 h-4 w-4" /> Add New Plugin
          </Button>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Input
          placeholder="Search plugins..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-muted-foreground py-12 text-center">
          <Puzzle className="mx-auto mb-3 h-12 w-12 opacity-50" />
          <p>{search ? 'No plugins match your search.' : 'No plugins installed.'}</p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((plugin) => (
              <Card key={plugin.id} className={plugin.active ? '' : 'opacity-60'}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-primary/10 rounded-lg p-2">
                        <Puzzle className="text-primary h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{plugin.name}</CardTitle>
                        <CardDescription>v{plugin.version}</CardDescription>
                      </div>
                    </div>
                    <Badge variant={plugin.active ? 'success' : 'secondary'}>
                      {plugin.active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">{plugin.description}</p>
                  <p className="text-muted-foreground mt-2 text-xs">By {plugin.author}</p>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => togglePlugin(plugin.id)}
                      disabled={toggling === plugin.id}
                    >
                      {toggling === plugin.id ? (
                        <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                      ) : plugin.active ? (
                        <>
                          <PowerOff className="mr-1.5 h-4 w-4" /> Deactivate
                        </>
                      ) : (
                        <>
                          <Power className="mr-1.5 h-4 w-4" /> Activate
                        </>
                      )}
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Settings className="mr-1.5 h-4 w-4" /> Settings
                    </Button>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive h-8 w-8"
                    onClick={() => setDeletePlugin(plugin)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
          <div className="py-8 text-center">
            <p className="text-muted-foreground text-sm">
              Looking for more?{' '}
              <a href="#" className="text-primary inline-flex items-center gap-1 hover:underline">
                Browse the plugin registry <ExternalLink className="h-3 w-3" />
              </a>
            </p>
          </div>
        </>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletePlugin} onOpenChange={(o) => !o && setDeletePlugin(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Plugin</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {deletePlugin?.name}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeletePlugin(null)}
              disabled={deletingPlugin}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeletePlugin} disabled={deletingPlugin}>
              {deletingPlugin ? 'Deleting...' : 'Delete Plugin'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
