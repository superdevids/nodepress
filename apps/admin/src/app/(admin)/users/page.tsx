"use client";

import * as React from "react";
import { Plus, Search, MoreHorizontal, Shield, UserCog, Key, Trash2, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { formatDate } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { ScreenOptions } from "@/components/admin/screen-options";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
  createdAt: Date;
  postsCount: number;
}

const mockUsers: User[] = [
  { id: "1", name: "Aditya", email: "aditya@example.com", role: "SUPER_ADMIN", createdAt: new Date("2026-01-15"), postsCount: 45 },
  { id: "2", name: "Sarah", email: "sarah@example.com", role: "ADMIN", createdAt: new Date("2026-02-20"), postsCount: 23 },
  { id: "3", name: "Mike", email: "mike@example.com", role: "EDITOR", createdAt: new Date("2026-03-10"), postsCount: 67 },
  { id: "4", name: "Lisa", email: "lisa@example.com", role: "AUTHOR", createdAt: new Date("2026-04-05"), postsCount: 12 },
  { id: "5", name: "John", email: "john@example.com", role: "CONTRIBUTOR", createdAt: new Date("2026-05-12"), postsCount: 3 },
  { id: "6", name: "Guest", email: "guest@example.com", role: "SUBSCRIBER", createdAt: new Date("2026-06-01"), postsCount: 0 },
];

const roleColors: Record<string, "default" | "destructive" | "info" | "warning" | "secondary" | "success"> = {
  SUPER_ADMIN: "destructive",
  ADMIN: "info",
  EDITOR: "warning",
  AUTHOR: "success",
  CONTRIBUTOR: "secondary",
  SUBSCRIBER: "default",
};

export default function UsersPage() {
  const [search, setSearch] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState("all");
  const [users, setUsers] = React.useState(mockUsers);
  const [showNewUser, setShowNewUser] = React.useState(false);
  const [editUser, setEditUser] = React.useState<User | null>(null);
  const [deleteUser, setDeleteUser] = React.useState<User | null>(null);
  const [sortField, setSortField] = React.useState<"name" | "date" | "posts">("name");
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("asc");
  const { success, error: showError } = useToast();

  const filtered = users
    .filter(
      (u) =>
        (u.name.toLowerCase().includes(search.toLowerCase()) ||
          u.email.toLowerCase().includes(search.toLowerCase())) &&
        (roleFilter === "all" || u.role === roleFilter),
    )
    .sort((a, b) => {
      let cmp = 0;
      if (sortField === "name") cmp = a.name.localeCompare(b.name);
      else if (sortField === "date") cmp = a.createdAt.getTime() - b.createdAt.getTime();
      else if (sortField === "posts") cmp = a.postsCount - b.postsCount;
      return sortDir === "asc" ? cmp : -cmp;
    });

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir(field === "name" ? "asc" : "desc");
    }
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    success("User created", "New user has been added successfully.");
    setShowNewUser(false);
  };

  const handleUpdateUser = (e: React.FormEvent) => {
    e.preventDefault();
    success("User updated", "User account has been updated.");
    setEditUser(null);
  };

  const handleDeleteUser = () => {
    if (deleteUser) {
      setUsers((prev) => prev.filter((u) => u.id !== deleteUser.id));
      success("User deleted", `${deleteUser.name} has been deleted.`);
      setDeleteUser(null);
    }
  };

  const SortHeader = ({
    field,
    children,
  }: {
    field: typeof sortField;
    children: React.ReactNode;
  }) => (
    <button
      onClick={() => toggleSort(field)}
      className="flex items-center gap-1 font-medium"
    >
      {children}
      <ArrowUpDown className="h-3 w-3" />
    </button>
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Users</h1>
          <p className="text-muted-foreground mt-1">
            Manage user accounts and roles.
          </p>
        </div>
        <Dialog open={showNewUser} onOpenChange={setShowNewUser}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
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
                  <Input id="new-name" placeholder="Full name" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="new-email">Email</Label>
                  <Input id="new-email" type="email" placeholder="email@example.com" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="new-password">Password</Label>
                  <Input id="new-password" type="password" placeholder="Password" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="new-role">Role</Label>
                  <Select defaultValue="CONTRIBUTOR">
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
                <Button type="button" variant="outline" onClick={() => setShowNewUser(false)}>
                  Cancel
                </Button>
                <Button type="submit">Create User</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
        <div className="ml-auto">
          <ScreenOptions
            columns={[
              { id: "name", label: "Name" },
              { id: "email", label: "Email" },
              { id: "role", label: "Role" },
              { id: "registered", label: "Registered" },
              { id: "posts", label: "Posts" },
            ]}
          />
        </div>
      </div>

      <div className="rounded-md border bg-background">
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
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  No users found
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
                  <TableCell className="text-muted-foreground">
                    {user.email}
                  </TableCell>
                  <TableCell>
                    <Badge variant={roleColors[user.role] || "default"}>
                      {user.role.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDate(user.createdAt)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {user.postsCount}
                  </TableCell>
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
              <DialogDescription>
                Update user profile, role, and capabilities.
              </DialogDescription>
            </DialogHeader>
            {editUser && (
              <div className="space-y-4 py-4">
                <div className="flex items-center gap-3 mb-4">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback>{editUser.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{editUser.name}</p>
                    <p className="text-sm text-muted-foreground">{editUser.email}</p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Display Name</Label>
                  <Input defaultValue={editUser.name} />
                </div>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input defaultValue={editUser.email} type="email" />
                </div>
                <div className="space-y-1.5">
                  <Label>Role</Label>
                  <Select defaultValue={editUser.role}>
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
                  <Input type="password" placeholder="New password" />
                </div>
                <div className="flex items-center gap-2 rounded-lg border p-3">
                  <input type="checkbox" id="force-pw" className="rounded" />
                  <Label htmlFor="force-pw" className="text-xs cursor-pointer">
                    Force password change on next login
                  </Label>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditUser(null)}>
                Cancel
              </Button>
              <Button type="submit">Update User</Button>
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
          <div className="py-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              What should happen to content owned by this user?
            </p>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" name="reassign" defaultChecked className="radio" />
                Delete all content
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" name="reassign" className="radio" />
                Assign to:{" "}
                <select className="border rounded text-xs p-1">
                  <option>Aditya</option>
                  <option>Sarah</option>
                  <option>Mike</option>
                </select>
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteUser(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteUser}>
              Delete User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
