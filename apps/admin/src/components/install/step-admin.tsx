'use client';

import * as React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { UserRound, ChevronLeft, ChevronRight, Eye, EyeOff } from 'lucide-react';

interface StepAdminProps {
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  password: string;
  avatar: string;
  onFieldChange: (field: string, value: any) => void;
  onNext: () => void;
  onPrev: () => void;
}

function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  if (!password) return { score: 0, label: '', color: 'bg-muted' };
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { score: 15, label: 'Weak', color: 'bg-red-500' };
  if (score <= 2) return { score: 30, label: 'Fair', color: 'bg-orange-500' };
  if (score <= 3) return { score: 55, label: 'Good', color: 'bg-yellow-500' };
  if (score <= 4) return { score: 75, label: 'Strong', color: 'bg-lime-500' };
  return { score: 100, label: 'Very Strong', color: 'bg-emerald-500' };
}

export function StepAdmin({
  firstName,
  lastName,
  email,
  username,
  password,
  avatar,
  onFieldChange,
  onNext,
  onPrev,
}: StepAdminProps) {
  const [showPassword, setShowPassword] = React.useState(false);
  const strength = getPasswordStrength(password);
  const isValid =
    firstName.trim() && lastName.trim() && email.trim() && username.trim() && password.length >= 6;

  return (
    <Card className="border-border/60">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 rounded-lg p-2">
            <UserRound className="text-primary h-5 w-5" />
          </div>
          <div>
            <CardTitle>Admin User</CardTitle>
            <CardDescription>
              Create the administrator account. You will use these credentials to log in to the
              admin panel.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          {/* First Name */}
          <div className="space-y-1.5">
            <Label htmlFor="firstName">First Name</Label>
            <Input
              id="firstName"
              placeholder="John"
              value={firstName}
              onChange={(e) => onFieldChange('firstName', e.target.value)}
            />
          </div>

          {/* Last Name */}
          <div className="space-y-1.5">
            <Label htmlFor="lastName">Last Name</Label>
            <Input
              id="lastName"
              placeholder="Doe"
              value={lastName}
              onChange={(e) => onFieldChange('lastName', e.target.value)}
            />
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="admin@example.com"
              value={email}
              onChange={(e) => onFieldChange('email', e.target.value)}
            />
          </div>

          {/* Username */}
          <div className="space-y-1.5">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              placeholder="admin"
              value={username}
              onChange={(e) => onFieldChange('username', e.target.value)}
            />
          </div>

          {/* Password */}
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Minimum 6 characters"
                value={password}
                onChange={(e) => onFieldChange('password', e.target.value)}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-muted-foreground hover:text-foreground absolute right-3 top-1/2 -translate-y-1/2"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {password && (
              <div className="mt-2 space-y-1.5">
                <div className="flex items-center gap-3">
                  <Progress
                    value={strength.score}
                    className="h-1.5 flex-1"
                    indicatorClassName={strength.color}
                  />
                  <span className="text-muted-foreground w-20 text-right text-xs font-medium">
                    {strength.label}
                  </span>
                </div>
                <ul className="text-muted-foreground space-y-0.5 text-xs">
                  <li className={password.length >= 6 ? 'text-emerald-600' : ''}>
                    {password.length >= 6 ? '✓' : '○'} At least 6 characters
                  </li>
                  <li className={/[A-Z]/.test(password) ? 'text-emerald-600' : ''}>
                    {/[A-Z]/.test(password) ? '✓' : '○'} At least one uppercase letter
                  </li>
                  <li className={/[0-9]/.test(password) ? 'text-emerald-600' : ''}>
                    {/[0-9]/.test(password) ? '✓' : '○'} At least one number
                  </li>
                </ul>
              </div>
            )}
          </div>

          {/* Avatar URL */}
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="avatar">Profile Picture URL (optional)</Label>
            <Input
              id="avatar"
              type="url"
              placeholder="https://gravatar.com/avatar/..."
              value={avatar}
              onChange={(e) => onFieldChange('avatar', e.target.value)}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <Button variant="outline" onClick={onPrev}>
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button onClick={onNext} disabled={!isValid}>
            Next Step
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
