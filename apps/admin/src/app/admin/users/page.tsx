'use client';

import * as React from 'react';
import {
  Plus,
  Search,
  MoreHorizontal,
  Shield,
  UserCog,
  Key,
  Trash2,
  ArrowUpDown,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { formatDate } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';
import { ScreenOptions } from '@/components/admin/screen-options';
import { useApi, ApiError } from '@/lib/api-helper';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
  createdAt: string;
  postsCount: number;
}

const roleColors: Record<
  string,
  'default' | 'destructive' | 'info' | 'warning' | 'secondary' | 'success'
> = {
  SUPER_ADMIN: 'destructive',
  ADMIN: 'info',
  EDITOR: 'warning',
  AUTHOR: 'success',
  CONTRIBUTOR: 'secondary',
  SUBSCRIBER: 'default',
};

export default function UsersPage() {
  const api = useApi();
  const { success, error: showError } = useToast();

  const [search, setSearch] = React.useState('');
  const [roleFilter, setRoleFilter] = React.useState('all');
  const [users, setUsers] = React.useState<User[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [fetchError, setFetchError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  const [showNewUser, setShowNewUser] = React.useState(false);
  const [editUser, setEditUser] = React.useState<User | null>(null);
  const [deleteUser, setDeleteUser] = React.useState<User | null>(null);
  const [sortField, setSortField] = React.useState<'name' | 'date' | 'posts'>('name');
  const [sortDir, setSortDir] = React.useState<'asc' | 'desc'>('asc');

  // ─── Form state ────────────────────────────────────────────────
  const [newName, setNewName] = React.useState('');
  const [newEmail, setNewEmail] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [newRole, setNewRole] = React.useState('CONTRIBUTOR');

  const [editName, setEditName] = React.useState('');
  const [editEmail, setEditEmail] = React.useState('');
  const [editPassword, setEditPassword] = React.useState('');
  const [editRole, setEditRole] = React.useState('');

  // Populate edit form state when user is selected for editing
  React.useEffect(() => {
    if (editUser) {
      setEditName(editUser.name);
      setEditEmail(editUser.email);
      setEditRole(editUser.role);
      setEditPassword('');
    }
  }, [editUser]);

  // ─── Data fetching ──────────────────────────────────────────────

  const fetchUsers = React.useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const data = await api.get<User[]>('/users');
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to load users';
      setFetchError(msg);
      showError('Error', msg);
    } finally {
      setLoading(false);
    }
  }, [api, showError]);

  React.useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // ─── Filtering & sorting ────────────────────────────────────────

  const filtered = users
    .filter(
      (u) =>
        (u.name.toLowerCase().includes(search.toLowerCase()) ||
          u.email.toLowerCase().includes(search.toLowerCase())) &&
        (roleFilter === 'all' || u.role === roleFilter),
    )
    .sort((a, b) => {
      let cmp = 0;
      if (sortField === 'name') cmp = a.name.localeCompare(b.name);
      else if (sortField === 'date')
        cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      else if (sortField === 'posts') cmp = a.postsCount - b.postsCount;
      return sortDir === 'asc' ? cmp : -cmp;
    });

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir(field === 'name' ? 'asc' : 'desc');
    }
  };

  // ─── CRUD handlers ──────────────────────────────────────────────

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post<User>('/users', {
        name: newName,
        email: newEmail,
        password: newPassword,
        role: newRole,
      });
      success('User created', 'New user has been added successfully.');
      setShowNewUser(false);
      setNewName('');
      setNewEmail('');
      setNewPassword('');
      setNewRole('CONTRIBUTOR');
      await fetchUsers();
    } catch (err) {
      showError('Failed to create', err instanceof ApiError ? err.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: editName,
        email: editEmail,
        role: editRole,
      };
      if (editPassword) payload.password = editPassword;

      await api.patch<User>(`/users/${editUser.id}`, payload);
      success('User updated', 'User account has been updated.');
      setEditUser(null);
      setEditPassword('');
      await fetchUsers();
    } catch (err) {
      showError('Failed to update', err instanceof ApiError ? err.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteUser) return;
    setSaving(true);
    try {
      await api.del(`/users/${deleteUser.id}`);
      success('User deleted', `${deleteUser.name} has been deleted.`);
      setDeleteUser(null);
      await fetchUsers();
    } catch (err) {
      showError('Failed to delete', err instanceof ApiError ? err.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // ─── Sort header helper ─────────────────────────────────────────

  const SortHeader = ({
    field,
    children,
  }: {
    field: typeof sortField;
    children: React.ReactNode;
  }) => (
    <button onClick={() => toggleSort(field)} className="flex items-center gap-1 font-medium">
      {children}
      <ArrowUpDown className="h-3 w-3" />
    </button>
  );

  // ─── Loading skeleton ───────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="bg-muted h-8 w-32 animate-pulse rounded" />
            <div className="bg-muted mt-2 h-4 w-56 animate-pulse rounded" />
          </div>
          <div className="bg-muted h-10 w-36 animate-pulse rounded" />
        </div>
        <div className="bg-background rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                {['User', 'Email', 'Role', 'Registered', 'Posts', ''].map((h) => (
                  <TableHead key={h}>{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  // ─── Error state ────────────────────────────────────────────────

  if (fetchError) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Users</h1>
            <p className="text-muted-foreground mt-1">Manage user accounts and roles.</p>
          </div>
        </div>
        <div className="bg-background rounded-md border p-12 text-center">
          <AlertCircle className="text-destructive mx-auto mb-4 h-12 w-12" />
          <h3 className="mb-2 text-lg font-semibold">Failed to load users</h3>
          <p className="text-muted-foreground mb-4">{fetchError}</p>
          <Button onClick={fetchUsers}>
            <RefreshCw className="mr-2 h-4 w-4" /> Retry
          </Button>
        </div>
      </div>
    );
  }

  // ─── Main render ────────────────────────────────────────────────

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Users</h1>
          <p className="text-muted-foreground mt-1">Manage user accounts and roles.</p>
        </div>
        <Dialog open={showNewUser} onOpenChange={setShowNewUser}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add New User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleCreateUser}>
              <DialogHeader>
                <DialogTitle>Add New User</DialogTitle>
                <DialogDescription>
                  Create a new user account with role and password.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-1.5">
                  <Label htmlFor="new-name">Name</Label>
                  <Input
                    id="new-name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Full name"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="new-email">Email</Label>
                  <Input
                    id="new-email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    type="email"
                    placeholder="email@example.com"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="new-password">Password</Label>
                  <Input
                    id="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    type="password"
                    placeholder="Password"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="new-role">Role</Label>
                  <Select value={newRole} onValueChange={setNewRole}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                      <SelectItem value="EDITOR">Editor</SelectItem>
                      <SelectItem value="AUTHOR">Author</SelectItem>
                      <SelectItem value="CONTRIBUTOR">Contributor</SelectItem>
                      <SelectItem value="SUBSCRIBER">Subscriber</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowNewUser(false)}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? 'Creating...' : 'Create User'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] max-w-sm flex-1">
          <Search className="text-muted-foreground absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder="Search by name or email..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
            <SelectItem value="ADMIN">Admin</SelectItem>
            <SelectItem value="EDITOR">Editor</SelectItem>
            <SelectItem value="AUTHOR">Author</SelectItem>
            <SelectItem value="CONTRIBUTOR">Contributor</SelectItem>
            <SelectItem value="SUBSCRIBER">Subscriber</SelectItem>
          </SelectContent>
        </Select>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={fetchUsers} title="Refresh">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <ScreenOptions
            columns={[
              { id: 'name', label: 'Name' },
              { id: 'email', label: 'Email' },
              { id: 'role', label: 'Role' },
              { id: 'registered', label: 'Registered' },
              { id: 'posts', label: 'Posts' },
            ]}
          />
        </div>
      </div>

      <div className="bg-background rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <SortHeader field="name">User</SortHeader>
              </TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>
                <SortHeader field="date">Registered</SortHeader>
              </TableHead>
              <TableHead>
                <SortHeader field="posts">Posts</SortHeader>
              </TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground py-12 text-center">
                  {users.length === 0 ? (
                    <div className="flex flex-col items-center gap-2">
                      <p className="text-lg font-medium">No users yet</p>
                      <p className="text-sm">Get started by adding a new user.</p>
                    </div>
                  ) : (
                    'No users match your search criteria.'
                  )}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.avatar} />
                        <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{user.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{user.email}</TableCell>
                  <TableCell>
                    <Badge variant={roleColors[user.role] || 'default'}>
                      {user.role.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDate(user.createdAt)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{user.postsCount}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditUser(user)}>
                          <UserCog className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Shield className="mr-2 h-4 w-4" /> Capabilities
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Key className="mr-2 h-4 w-4" /> Force Password Change
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setDeleteUser(user)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Delete User
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit User Dialog */}
      <Dialog open={!!editUser} onOpenChange={(o) => !o && setEditUser(null)}>
        <DialogContent className="max-w-lg">
          <form onSubmit={handleUpdateUser}>
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
              <DialogDescription>Update user profile, role, and capabilities.</DialogDescription>
            </DialogHeader>
            {editUser && (
              <div className="space-y-4 py-4">
                <div className="mb-4 flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback>{editUser.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{editUser.name}</p>
                    <p className="text-muted-foreground text-sm">{editUser.email}</p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Display Name</Label>
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    type="email"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Role</Label>
                  <Select value={editRole} onValueChange={setEditRole}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                      <SelectItem value="EDITOR">Editor</SelectItem>
                      <SelectItem value="AUTHOR">Author</SelectItem>
                      <SelectItem value="CONTRIBUTOR">Contributor</SelectItem>
                      <SelectItem value="SUBSCRIBER">Subscriber</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Separator />
                <div className="space-y-1.5">
                  <Label>New Password (leave blank to keep current)</Label>
                  <Input
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    type="password"
                    placeholder="New password"
                  />
                </div>
                <div className="flex items-center gap-2 rounded-lg border p-3">
                  <input type="checkbox" id="force-pw" className="rounded" />
                  <Label htmlFor="force-pw" className="cursor-pointer text-xs">
                    Force password change on next login
                  </Label>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditUser(null)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Update User'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <Dialog open={!!deleteUser} onOpenChange={(o) => !o && setDeleteUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {deleteUser?.name}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <p className="text-muted-foreground text-sm">
              What should happen to content owned by this user?
            </p>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" name="reassign" defaultChecked className="radio" />
                Delete all content
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" name="reassign" className="radio" />
                Assign to:{' '}
                <select className="rounded border p-1 text-xs">
                  {users.slice(0, 5).map((u) => (
                    <option key={u.id}>{u.name}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteUser(null)} disabled={saving}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteUser} disabled={saving}>
              {saving ? 'Deleting...' : 'Delete User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
