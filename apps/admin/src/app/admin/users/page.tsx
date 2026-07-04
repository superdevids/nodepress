'use client';

import * as React from 'react';
import {
  Plus,
  Search,
  MoreHorizontal,
  Trash2,
  Mail,
  RefreshCw,
  AlertCircle,
  UserPlus,
  Users,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { formatDate, getInitials, cn } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';
import { useApi } from '@/lib/use-api';
import { useAuth } from '@/lib/auth';

// ─── Types ────────────────────────────────────────────────────────

interface UserRecord {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  avatarUrl?: string;
  website?: string;
  bio?: string;
  postsCount?: number;
  createdAt: string;
  updatedAt: string;
}

type RoleKey = 'SUPER_ADMIN' | 'ADMIN' | 'EDITOR' | 'AUTHOR' | 'CONTRIBUTOR' | 'SUBSCRIBER';

const ROLES: { value: RoleKey; label: string }[] = [
  { value: 'SUPER_ADMIN', label: 'Super Admin' },
  { value: 'ADMIN', label: 'Admin' },
  { value: 'EDITOR', label: 'Editor' },
  { value: 'AUTHOR', label: 'Author' },
  { value: 'CONTRIBUTOR', label: 'Contributor' },
  { value: 'SUBSCRIBER', label: 'Subscriber' },
];

const roleBadgeColor: Record<RoleKey, string> = {
  SUPER_ADMIN: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100',
  ADMIN: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100',
  EDITOR: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-100',
  AUTHOR: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100',
  CONTRIBUTOR: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100',
  SUBSCRIBER: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-100',
};

// ─── Password Strength ────────────────────────────────────────────

type StrengthLevel = 'empty' | 'too-short' | 'weak' | 'medium' | 'strong';

interface StrengthInfo {
  level: StrengthLevel;
  label: string;
  percent: number;
  barColor: string;
  textColor: string;
}

function evaluatePasswordStrength(password: string): StrengthInfo {
  if (!password) {
    return { level: 'empty', label: '', percent: 0, barColor: '', textColor: '' };
  }

  const len = password.length;

  if (len < 6) {
    return {
      level: 'too-short',
      label: 'Too short',
      percent: 15,
      barColor: 'bg-red-500',
      textColor: 'text-red-600 dark:text-red-400',
    };
  }

  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasMixed = hasUpper && hasLower;

  if (len >= 12 && hasMixed && hasNumber) {
    return {
      level: 'strong',
      label: 'Strong',
      percent: 100,
      barColor: 'bg-green-500',
      textColor: 'text-green-600 dark:text-green-400',
    };
  }

  if (len >= 8 && hasMixed) {
    return {
      level: 'medium',
      label: 'Medium',
      percent: 65,
      barColor: 'bg-yellow-500',
      textColor: 'text-yellow-600 dark:text-yellow-400',
    };
  }

  return {
    level: 'weak',
    label: 'Weak',
    percent: 35,
    barColor: 'bg-orange-500',
    textColor: 'text-orange-600 dark:text-orange-400',
  };
}

// ─── Password Strength Meter Component ────────────────────────────

function PasswordStrengthMeter({ password }: { password: string }) {
  const strength = evaluatePasswordStrength(password);

  if (strength.level === 'empty') return null;

  return (
    <div className="mt-1.5 space-y-1">
      <Progress
        value={strength.percent}
        max={100}
        indicatorClassName={strength.barColor}
        className="h-1.5"
      />
      <p className={cn('text-xs font-medium', strength.textColor)}>{strength.label}</p>
    </div>
  );
}

// ─── Simple Hover Tooltip ─────────────────────────────────────────

function Tooltip({ content, children }: { content: string; children: React.ReactNode }) {
  return (
    <span className="group relative inline-block">
      {children}
      <span className="bg-popover text-popover-foreground pointer-events-none absolute bottom-full left-1/2 z-50 mb-1 -translate-x-1/2 whitespace-nowrap rounded-md border px-2 py-1 text-xs opacity-0 shadow-md transition-opacity group-hover:opacity-100">
        {content}
      </span>
    </span>
  );
}

// ─── Validation Errors ────────────────────────────────────────────

function FieldError({ error }: { error?: string | null }) {
  if (!error) return null;
  return <p className="text-destructive mt-1 text-xs">{error}</p>;
}

// ─── Page Component ───────────────────────────────────────────────

export default function UsersPage() {
  const api = useApi();
  const { user: currentUser } = useAuth();
  const { success, error: showError } = useToast();

  // ── Data ────────────────────────────────────────────────────────
  const [users, setUsers] = React.useState<UserRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [fetchError, setFetchError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  // ── Filters ─────────────────────────────────────────────────────
  const [search, setSearch] = React.useState('');
  const [roleFilter, setRoleFilter] = React.useState('all');

  // ── Dialogs ──────────────────────────────────────────────────────
  const [showNewUser, setShowNewUser] = React.useState(false);
  const [editUser, setEditUser] = React.useState<UserRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<UserRecord | null>(null);
  const [reassignTo, setReassignTo] = React.useState('');

  // ── New User Form ────────────────────────────────────────────────
  const [formEmail, setFormEmail] = React.useState('');
  const [formUsername, setFormUsername] = React.useState('');
  const [formPassword, setFormPassword] = React.useState('');
  const [formRole, setFormRole] = React.useState<RoleKey>('SUBSCRIBER');
  const [formFirstName, setFormFirstName] = React.useState('');
  const [formLastName, setFormLastName] = React.useState('');
  const [formWebsite, setFormWebsite] = React.useState('');
  const [formBio, setFormBio] = React.useState('');
  const [formSendNotify, setFormSendNotify] = React.useState(true);

  // ── Edit User Form ───────────────────────────────────────────────
  const [editEmail, setEditEmail] = React.useState('');
  const [editUsername, setEditUsername] = React.useState('');
  const [editPassword, setEditPassword] = React.useState('');
  const [editRole, setEditRole] = React.useState<RoleKey>('SUBSCRIBER');
  const [editFirstName, setEditFirstName] = React.useState('');
  const [editLastName, setEditLastName] = React.useState('');
  const [editWebsite, setEditWebsite] = React.useState('');
  const [editBio, setEditBio] = React.useState('');
  const [editSendNewPassword, setEditSendNewPassword] = React.useState(false);

  // ── Form Validation Errors ───────────────────────────────────────
  const [newUserErrors, setNewUserErrors] = React.useState<Record<string, string>>({});
  const [editUserErrors, setEditUserErrors] = React.useState<Record<string, string>>({});

  // ── Populate edit form when user is selected ─────────────────────
  React.useEffect(() => {
    if (editUser) {
      setEditEmail(editUser.email);
      setEditUsername(editUser.username);
      setEditRole((editUser.role as RoleKey) || 'SUBSCRIBER');
      setEditFirstName(editUser.firstName);
      setEditLastName(editUser.lastName);
      setEditWebsite(editUser.website || '');
      setEditBio(editUser.bio || '');
      setEditPassword('');
      setEditSendNewPassword(false);
      setEditUserErrors({});
    }
  }, [editUser]);

  // ── Auto-generate username from email ────────────────────────────
  React.useEffect(() => {
    if (!showNewUser) return;
    if (formEmail && !formUsername) {
      const generated = formEmail
        .split('@')[0]
        .replace(/[^a-zA-Z0-9_-]/g, '')
        .toLowerCase();
      setFormUsername(generated);
    }
  }, [formEmail, formUsername, showNewUser]);

  // ── Data fetching ────────────────────────────────────────────────

  const normalizeUser = (u: Record<string, unknown>): UserRecord => ({
    id: u.id as string,
    username: (u.username as string) || '',
    firstName: (u.firstName as string) || '',
    lastName: (u.lastName as string) || '',
    email: u.email as string,
    role: ((u.role as string) || 'SUBSCRIBER').toUpperCase(),
    avatarUrl: u.avatarUrl as string | undefined,
    website: u.website as string | undefined,
    bio: u.bio as string | undefined,
    postsCount: (u.postsCount as number) || 0,
    createdAt: u.createdAt as string,
    updatedAt: u.updatedAt as string,
  });

  const fetchUsers = React.useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await api.get<unknown[]>('/api/users');
      const raw = Array.isArray(res.data) ? res.data : [];
      setUsers(raw.map((u: unknown) => normalizeUser(u as Record<string, unknown>)));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load users';
      setFetchError(msg);
      showError('Error', msg);
    } finally {
      setLoading(false);
    }
  }, [api, showError]);

  React.useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // ── Filtering ────────────────────────────────────────────────────

  const filtered = users.filter((u) => {
    const query = search.toLowerCase();
    const matchesSearch =
      !query ||
      u.firstName.toLowerCase().includes(query) ||
      u.lastName.toLowerCase().includes(query) ||
      `${u.firstName} ${u.lastName}`.toLowerCase().includes(query) ||
      u.email.toLowerCase().includes(query) ||
      u.username.toLowerCase().includes(query);

    const matchesRole = roleFilter === 'all' || u.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  // ── Validation helpers ───────────────────────────────────────────

  function validateNewUser(): boolean {
    const errors: Record<string, string> = {};

    if (!formEmail.trim()) errors.email = 'Email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formEmail)) errors.email = 'Invalid email format.';

    if (!formUsername.trim()) errors.username = 'Username is required.';
    else if (formUsername.length < 3) errors.username = 'Username must be at least 3 characters.';

    if (!formPassword) errors.password = 'Password is required.';
    else if (formPassword.length < 6) errors.password = 'Password must be at least 6 characters.';

    setNewUserErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function validateEditUser(): boolean {
    const errors: Record<string, string> = {};

    if (!editEmail.trim()) errors.email = 'Email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editEmail)) errors.email = 'Invalid email format.';

    if (!editUsername.trim()) errors.username = 'Username is required.';
    else if (editUsername.length < 3) errors.username = 'Username must be at least 3 characters.';

    if (editPassword && editPassword.length < 6)
      errors.password = 'Password must be at least 6 characters.';

    setEditUserErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function resetNewForm() {
    setFormEmail('');
    setFormUsername('');
    setFormPassword('');
    setFormRole('SUBSCRIBER');
    setFormFirstName('');
    setFormLastName('');
    setFormWebsite('');
    setFormBio('');
    setFormSendNotify(true);
    setNewUserErrors({});
  }

  // ── CRUD Handlers ────────────────────────────────────────────────

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateNewUser()) return;

    setSaving(true);
    try {
      await api.post<UserRecord>('/api/users', {
        email: formEmail,
        username: formUsername,
        password: formPassword,
        role: formRole,
        firstName: formFirstName,
        lastName: formLastName,
        website: formWebsite || undefined,
        bio: formBio || undefined,
        sendNotification: formSendNotify,
      });
      success('User created', 'New user has been added successfully.');
      setShowNewUser(false);
      resetNewForm();
      await fetchUsers();
    } catch (err) {
      showError('Failed to create', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;
    if (!validateEditUser()) return;

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        email: editEmail,
        username: editUsername,
        role: editRole,
        firstName: editFirstName,
        lastName: editLastName,
        website: editWebsite || undefined,
        bio: editBio || undefined,
      };
      if (editPassword) {
        payload.password = editPassword;
        payload.sendPasswordChangeNotification = editSendNewPassword;
      }

      await api.patch<UserRecord>(`/api/users/${editUser.id}`, payload);
      success('User updated', 'User account has been updated.');
      setEditUser(null);
      setEditPassword('');
      setEditSendNewPassword(false);
      await fetchUsers();
    } catch (err) {
      showError('Failed to update', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await api.del(`/api/users/${deleteTarget.id}`, {
        body: reassignTo ? JSON.stringify({ reassignTo }) : undefined,
      } as any);
      success(
        'User deleted',
        `${deleteTarget.firstName} ${deleteTarget.lastName} has been deleted.`,
      );
      setDeleteTarget(null);
      setReassignTo('');
      await fetchUsers();
    } catch (err) {
      showError('Failed to delete', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const isSelf = (userId: string) => currentUser?.id === userId;

  // ── Loading State ────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="bg-muted h-8 w-36 animate-pulse rounded" />
            <div className="bg-muted mt-2 h-4 w-64 animate-pulse rounded" />
          </div>
          <div className="bg-muted h-10 w-36 animate-pulse rounded" />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="bg-muted h-10 w-72 animate-pulse rounded-md" />
          <div className="bg-muted h-10 w-36 animate-pulse rounded-md" />
        </div>

        {/* Table skeleton */}
        <div className="bg-background rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                {['Username', 'Name', 'Email', 'Role', 'Posts', 'Registered', ''].map((h) => (
                  <TableHead key={h}>{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-6 w-6 rounded-full" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-28" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-36" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-20 rounded-full" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-8" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-8 w-8 rounded-md" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-40" />
          <div className="flex gap-1">
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
        </div>
      </div>
    );
  }

  // ── Error State ──────────────────────────────────────────────────

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
          <p className="text-muted-foreground mx-auto mb-4 max-w-md">{fetchError}</p>
          <Button onClick={fetchUsers}>
            <RefreshCw className="mr-2 h-4 w-4" /> Retry
          </Button>
        </div>
      </div>
    );
  }

  // ── Main Render ──────────────────────────────────────────────────

  return (
    <div className="space-y-6 p-6">
      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Users</h1>
          <p className="text-muted-foreground mt-1">
            Users have access to specific areas of the site based on their role.
          </p>
        </div>
        <Dialog
          open={showNewUser}
          onOpenChange={(open) => {
            setShowNewUser(open);
            if (!open) resetNewForm();
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              Add New User
            </Button>
          </DialogTrigger>

          {/* ── Add New User Modal ───────────────────────────────── */}
          <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
            <form onSubmit={handleCreateUser} noValidate>
              <DialogHeader>
                <DialogTitle>Add New User</DialogTitle>
                <DialogDescription>
                  Create a brand new user account. They will receive an email with login
                  instructions.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-5 py-4">
                {/* Email */}
                <div className="space-y-1.5">
                  <Label htmlFor="nu-email">
                    Email <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="nu-email"
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="user@example.com"
                    required
                  />
                  <FieldError error={newUserErrors.email} />
                </div>

                {/* Username */}
                <div className="space-y-1.5">
                  <Label htmlFor="nu-username">
                    Username <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="nu-username"
                    value={formUsername}
                    onChange={(e) => setFormUsername(e.target.value)}
                    placeholder="johndoe"
                    required
                  />
                  <p className="text-muted-foreground text-xs">
                    Auto-generated from email. You can edit it.
                  </p>
                  <FieldError error={newUserErrors.username} />
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <Label htmlFor="nu-password">
                    Password <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="nu-password"
                    type="password"
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    placeholder="Strong password"
                    required
                  />
                  <PasswordStrengthMeter password={formPassword} />
                  <FieldError error={newUserErrors.password} />
                </div>

                {/* Send password change notification */}
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="nu-notify"
                    checked={formSendNotify}
                    onCheckedChange={(c) => setFormSendNotify(c as boolean)}
                  />
                  <Label htmlFor="nu-notify" className="cursor-pointer text-sm font-normal">
                    Send password change notification
                  </Label>
                </div>

                <Separator />

                {/* Role */}
                <div className="space-y-1.5">
                  <Label htmlFor="nu-role">Role</Label>
                  <Select value={formRole} onValueChange={(v) => setFormRole(v as RoleKey)}>
                    <SelectTrigger id="nu-role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* First Name */}
                <div className="space-y-1.5">
                  <Label htmlFor="nu-first">First Name</Label>
                  <Input
                    id="nu-first"
                    value={formFirstName}
                    onChange={(e) => setFormFirstName(e.target.value)}
                    placeholder="John"
                  />
                </div>

                {/* Last Name */}
                <div className="space-y-1.5">
                  <Label htmlFor="nu-last">Last Name</Label>
                  <Input
                    id="nu-last"
                    value={formLastName}
                    onChange={(e) => setFormLastName(e.target.value)}
                    placeholder="Doe"
                  />
                </div>

                {/* Website */}
                <div className="space-y-1.5">
                  <Label htmlFor="nu-website">Website</Label>
                  <Input
                    id="nu-website"
                    type="url"
                    value={formWebsite}
                    onChange={(e) => setFormWebsite(e.target.value)}
                    placeholder="https://example.com"
                  />
                </div>

                {/* Bio */}
                <div className="space-y-1.5">
                  <Label htmlFor="nu-bio">Bio</Label>
                  <Textarea
                    id="nu-bio"
                    value={formBio}
                    onChange={(e) => setFormBio(e.target.value)}
                    placeholder="Tell us a little about this user..."
                    rows={3}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowNewUser(false);
                    resetNewForm();
                  }}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? 'Adding...' : 'Add New User'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* ── Filters ──────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px] max-w-sm flex-1">
          <Search className="text-muted-foreground absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder="Search by name, email, or username..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            {ROLES.map((r) => (
              <SelectItem key={r.value} value={r.value}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={fetchUsers} title="Refresh">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* ── Users Table ──────────────────────────────────────────── */}
      <div className="bg-background rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[250px]">Username</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="hidden md:table-cell">Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="w-16 text-center">Posts</TableHead>
              <TableHead className="hidden lg:table-cell">Registered</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-16 text-center">
                  {users.length === 0 ? (
                    /* ── Empty State ───────────────────────────── */
                    <div className="flex flex-col items-center gap-3">
                      <Users className="text-muted-foreground h-12 w-12" />
                      <div>
                        <p className="text-lg font-medium">No users found</p>
                        <p className="text-muted-foreground text-sm">
                          Get started by adding a new user to the site.
                        </p>
                      </div>
                      <Button variant="default" onClick={() => setShowNewUser(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add New User
                      </Button>
                    </div>
                  ) : (
                    /* ── No Search Results ─────────────────────── */
                    <div className="flex flex-col items-center gap-2">
                      <Search className="text-muted-foreground h-8 w-8" />
                      <p className="text-muted-foreground text-base">
                        No users match your search criteria.
                      </p>
                      <Button
                        variant="link"
                        onClick={() => {
                          setSearch('');
                          setRoleFilter('all');
                        }}
                      >
                        Clear filters
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((user) => {
                const displayName =
                  [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username;
                const initials = getInitials(displayName);
                const isCurrentUser = isSelf(user.id);

                return (
                  <TableRow key={user.id} className={isCurrentUser ? 'bg-muted/30' : ''}>
                    {/* Username + Avatar */}
                    <TableCell>
                      <Tooltip content={displayName}>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={user.avatarUrl} alt={user.username} />
                            <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
                          </Avatar>
                          <span className="max-w-[160px] truncate text-sm font-medium">
                            {user.username || displayName}
                          </span>
                          {isCurrentUser && (
                            <span className="text-muted-foreground text-xs italic">(you)</span>
                          )}
                        </div>
                      </Tooltip>
                    </TableCell>

                    {/* Name */}
                    <TableCell className="text-sm">{displayName}</TableCell>

                    {/* Email */}
                    <TableCell className="hidden md:table-cell">
                      <a
                        href={`mailto:${user.email}`}
                        className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-sm transition-colors"
                      >
                        <Mail className="h-3 w-3 shrink-0" />
                        <span className="max-w-[180px] truncate">{user.email}</span>
                      </a>
                    </TableCell>

                    {/* Role */}
                    <TableCell>
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
                          roleBadgeColor[user.role as RoleKey] ||
                            'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-100',
                        )}
                      >
                        {ROLES.find((r) => r.value === user.role)?.label || user.role}
                      </span>
                    </TableCell>

                    {/* Posts Count */}
                    <TableCell className="text-center">
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm transition-colors"
                        title="View user's posts"
                      >
                        <Eye className="h-3 w-3" />
                        {user.postsCount ?? 0}
                      </button>
                    </TableCell>

                    {/* Registered */}
                    <TableCell className="text-muted-foreground hidden text-sm lg:table-cell">
                      {formatDate(user.createdAt, { dateStyle: 'medium' })}
                    </TableCell>

                    {/* Actions */}
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        {/* Edit */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setEditUser(user)}
                          title="Edit user"
                        >
                          <svg
                            className="h-4 w-4"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </Button>

                        {/* Delete (disabled for self) */}
                        <Tooltip
                          content={
                            isCurrentUser ? 'You cannot delete your own account' : 'Delete user'
                          }
                        >
                          <span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className={cn(
                                'h-8 w-8',
                                isCurrentUser
                                  ? 'text-muted-foreground/40 cursor-not-allowed'
                                  : 'text-destructive hover:text-destructive',
                              )}
                              disabled={isCurrentUser}
                              onClick={() => {
                                if (!isCurrentUser) setDeleteTarget(user);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </span>
                        </Tooltip>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── Footer count ────────────────────────────────────────── */}
      <div className="text-muted-foreground text-sm">
        {filtered.length} {filtered.length === 1 ? 'user' : 'users'}
        {roleFilter !== 'all' && ` with role ${ROLES.find((r) => r.value === roleFilter)?.label}`}
        {search && ` matching "${search}"`}
        {users.length > 0 && filtered.length !== users.length && (
          <span> (out of {users.length} total)</span>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════
          EDIT USER MODAL
         ══════════════════════════════════════════════════════════════ */}
      <Dialog open={!!editUser} onOpenChange={(o) => !o && setEditUser(null)}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <form onSubmit={handleUpdateUser} noValidate>
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
              <DialogDescription>
                Update user profile, role, and account settings.
              </DialogDescription>
            </DialogHeader>

            {editUser && (
              <div className="space-y-5 py-4">
                {/* Current user info header */}
                <div className="bg-muted/30 mb-2 flex items-center gap-3 rounded-lg border p-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={editUser.avatarUrl} alt={editUser.username} />
                    <AvatarFallback>
                      {getInitials(
                        [editUser.firstName, editUser.lastName].filter(Boolean).join(' ') ||
                          editUser.username,
                      )}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">
                      {[editUser.firstName, editUser.lastName].filter(Boolean).join(' ') ||
                        editUser.username}
                    </p>
                    <p className="text-muted-foreground truncate text-sm">{editUser.email}</p>
                  </div>
                  <span
                    className={cn(
                      'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold',
                      roleBadgeColor[editUser.role as RoleKey] ||
                        'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-100',
                    )}
                  >
                    {ROLES.find((r) => r.value === editUser.role)?.label || editUser.role}
                  </span>
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <Label htmlFor="eu-email">
                    Email <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="eu-email"
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    required
                  />
                  <FieldError error={editUserErrors.email} />
                </div>

                {/* Username */}
                <div className="space-y-1.5">
                  <Label htmlFor="eu-username">
                    Username <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="eu-username"
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                    required
                  />
                  <FieldError error={editUserErrors.username} />
                </div>

                {/* Role */}
                <div className="space-y-1.5">
                  <Label htmlFor="eu-role">Role</Label>
                  <Select value={editRole} onValueChange={(v) => setEditRole(v as RoleKey)}>
                    <SelectTrigger id="eu-role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* First Name */}
                <div className="space-y-1.5">
                  <Label htmlFor="eu-first">First Name</Label>
                  <Input
                    id="eu-first"
                    value={editFirstName}
                    onChange={(e) => setEditFirstName(e.target.value)}
                    placeholder="John"
                  />
                </div>

                {/* Last Name */}
                <div className="space-y-1.5">
                  <Label htmlFor="eu-last">Last Name</Label>
                  <Input
                    id="eu-last"
                    value={editLastName}
                    onChange={(e) => setEditLastName(e.target.value)}
                    placeholder="Doe"
                  />
                </div>

                {/* Website */}
                <div className="space-y-1.5">
                  <Label htmlFor="eu-website">Website</Label>
                  <Input
                    id="eu-website"
                    type="url"
                    value={editWebsite}
                    onChange={(e) => setEditWebsite(e.target.value)}
                    placeholder="https://example.com"
                  />
                </div>

                {/* Bio */}
                <div className="space-y-1.5">
                  <Label htmlFor="eu-bio">Bio</Label>
                  <Textarea
                    id="eu-bio"
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    placeholder="Tell us a little about this user..."
                    rows={3}
                  />
                </div>

                <Separator />

                {/* New Password */}
                <div className="space-y-1.5">
                  <Label htmlFor="eu-password">New Password</Label>
                  <Input
                    id="eu-password"
                    type="password"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    placeholder="Leave blank to keep current"
                  />
                  <PasswordStrengthMeter password={editPassword} />
                  <FieldError error={editUserErrors.password} />
                </div>

                {/* Send new password checkbox */}
                {editPassword && (
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="eu-send-pw"
                      checked={editSendNewPassword}
                      onCheckedChange={(c) => setEditSendNewPassword(c as boolean)}
                    />
                    <Label htmlFor="eu-send-pw" className="cursor-pointer text-sm font-normal">
                      Send new password change notification
                    </Label>
                  </div>
                )}
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
                {saving ? 'Updating...' : 'Update User'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ══════════════════════════════════════════════════════════════
          DELETE USER MODAL
         ══════════════════════════════════════════════════════════════ */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(o) => {
          if (!o) {
            setDeleteTarget(null);
            setReassignTo('');
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Delete User
            </DialogTitle>
            <DialogDescription className="pt-1">
              Are you sure you want to delete{' '}
              <strong>
                {deleteTarget
                  ? [deleteTarget.firstName, deleteTarget.lastName].filter(Boolean).join(' ') ||
                    deleteTarget.username
                  : ''}
              </strong>
              ?
            </DialogDescription>
          </DialogHeader>

          {deleteTarget && (
            <div className="space-y-4 py-2">
              {/* Warning */}
              <div className="bg-destructive/10 border-destructive/20 text-destructive rounded-md border px-4 py-3 text-sm">
                <p className="font-medium">Warning</p>
                <p className="mt-0.5 text-xs opacity-80">
                  This action cannot be undone. All data associated with this user may be lost.
                </p>
              </div>

              {/* Reassign content */}
              <div className="space-y-2">
                <Label htmlFor="del-reassign">Reassign content to:</Label>
                <Select value={reassignTo} onValueChange={setReassignTo}>
                  <SelectTrigger id="del-reassign">
                    <SelectValue placeholder="Select a user..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__delete__">Delete all content</SelectItem>
                    {users
                      .filter((u) => u.id !== deleteTarget.id)
                      .map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {[u.firstName, u.lastName].filter(Boolean).join(' ') || u.username}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <p className="text-muted-foreground text-xs">
                  {reassignTo && reassignTo !== '__delete__'
                    ? 'All posts and content will be reassigned to the selected user.'
                    : 'All content owned by this user will be permanently deleted.'}
                </p>
              </div>

              {/* Self-deletion guard */}
              {isSelf(deleteTarget.id) && (
                <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
                  <p className="font-medium">You cannot delete your own account</p>
                  <p className="mt-0.5 text-xs opacity-80">
                    Please ask another administrator to perform this action.
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteTarget(null);
                setReassignTo('');
              }}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteUser}
              disabled={saving || (deleteTarget ? isSelf(deleteTarget.id) : false)}
            >
              {saving
                ? 'Deleting...'
                : deleteTarget && isSelf(deleteTarget.id)
                  ? 'Cannot Delete Yourself'
                  : 'Delete User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
