'use client';

import * as React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  UserRound,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Mail,
  AtSign,
  User,
} from 'lucide-react';

interface StepAdminProps {
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  password: string;
  onFieldChange: (field: string, value: any) => void;
  onNext: () => void;
  onPrev: () => void;
}

function getPasswordStrength(password: string): {
  score: number;
  label: string;
  color: string;
  checks: { label: string; passed: boolean }[];
} {
  if (!password) return { score: 0, label: '', color: 'bg-muted', checks: [] };

  let score = 0;
  const checks = [
    { label: 'At least 8 characters', passed: password.length >= 8 },
    { label: 'At least 12 characters', passed: password.length >= 12 },
    { label: 'Uppercase letter (A-Z)', passed: /[A-Z]/.test(password) },
    { label: 'Lowercase letter (a-z)', passed: /[a-z]/.test(password) },
    { label: 'Number (0-9)', passed: /[0-9]/.test(password) },
    { label: 'Special character (!@#...)', passed: /[^A-Za-z0-9]/.test(password) },
  ];

  checks.forEach((c) => {
    if (c.passed && c.label.startsWith('At least 12')) score += 1;
  });

  if (password.length >= 8) score += 1;

  checks.slice(2).forEach((c) => {
    if (c.passed) score += 1;
  });

  // Normalize score to 0-100
  const normalized = Math.min(Math.round((score / 6) * 100), 100);

  if (normalized <= 20) return { score: 20, label: 'Weak', color: 'bg-red-500', checks };
  if (normalized <= 40) return { score: 40, label: 'Fair', color: 'bg-orange-500', checks };
  if (normalized <= 60) return { score: 60, label: 'Good', color: 'bg-yellow-500', checks };
  if (normalized <= 80) return { score: 80, label: 'Strong', color: 'bg-lime-500', checks };
  return { score: 100, label: 'Very Strong', color: 'bg-emerald-500', checks };
}

export function StepAdmin({
  firstName,
  lastName,
  email,
  username,
  password,
  onFieldChange,
  onNext,
  onPrev,
}: StepAdminProps) {
  const [showPassword, setShowPassword] = React.useState(false);

  const strength = getPasswordStrength(password);
  const isValid =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    email.trim().length > 0 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) &&
    username.trim().length >= 3 &&
    password.length >= 8;

  const passwordChecks = [
    { label: 'At least 8 characters', passed: password.length >= 8 },
    { label: 'Uppercase letter', passed: /[A-Z]/.test(password) },
    { label: 'Lowercase letter', passed: /[a-z]/.test(password) },
    { label: 'A number (0-9)', passed: /[0-9]/.test(password) },
    { label: 'Special character', passed: /[^A-Za-z0-9]/.test(password) },
  ];

  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader>
        <div className="flex items-center gap-4">
          <div className="from-primary/20 to-primary/5 ring-primary/10 rounded-xl bg-gradient-to-br p-2.5 shadow-sm ring-1">
            <UserRound className="text-primary h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-xl">Admin User</CardTitle>
            <CardDescription className="text-sm">
              Create the administrator account. You&apos;ll use these credentials to log in and
              manage your site.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          {/* First Name */}
          <div className="space-y-1.5">
            <Label htmlFor="firstName" className="flex items-center gap-1.5 text-sm font-medium">
              <User className="text-muted-foreground h-3.5 w-3.5" />
              First Name
            </Label>
            <Input
              id="firstName"
              placeholder="John"
              value={firstName}
              onChange={(e) => onFieldChange('firstName', e.target.value)}
              className="transition-shadow focus-visible:shadow-sm"
            />
          </div>

          {/* Last Name */}
          <div className="space-y-1.5">
            <Label htmlFor="lastName" className="flex items-center gap-1.5 text-sm font-medium">
              <User className="text-muted-foreground h-3.5 w-3.5" />
              Last Name
            </Label>
            <Input
              id="lastName"
              placeholder="Doe"
              value={lastName}
              onChange={(e) => onFieldChange('lastName', e.target.value)}
              className="transition-shadow focus-visible:shadow-sm"
            />
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="email" className="flex items-center gap-1.5 text-sm font-medium">
              <Mail className="text-muted-foreground h-3.5 w-3.5" />
              Email Address
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="admin@example.com"
              value={email}
              onChange={(e) => onFieldChange('email', e.target.value)}
              className="transition-shadow focus-visible:shadow-sm"
            />
          </div>

          {/* Username */}
          <div className="space-y-1.5">
            <Label htmlFor="username" className="flex items-center gap-1.5 text-sm font-medium">
              <AtSign className="text-muted-foreground h-3.5 w-3.5" />
              Username
            </Label>
            <Input
              id="username"
              placeholder="admin"
              value={username}
              onChange={(e) => onFieldChange('username', e.target.value)}
              className="transition-shadow focus-visible:shadow-sm"
            />
          </div>

          {/* Password */}
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="password" className="flex items-center gap-1.5 text-sm font-medium">
              Password
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Create a strong password (min. 8 characters)"
                value={password}
                onChange={(e) => onFieldChange('password', e.target.value)}
                className="pr-10 transition-shadow focus-visible:shadow-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-muted-foreground hover:text-foreground absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {/* Password Strength */}
            {password && (
              <div className="border-border/50 bg-muted/20 mt-3 space-y-3 rounded-lg border p-3">
                {/* Strength bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-xs font-medium">
                      Password strength
                    </span>
                    <span
                      className="text-xs font-semibold"
                      style={{
                        color:
                          strength.score >= 80
                            ? 'rgb(34 197 94)'
                            : strength.score >= 60
                              ? 'rgb(234 179 8)'
                              : strength.score >= 40
                                ? 'rgb(249 115 22)'
                                : 'rgb(239 68 68)',
                      }}
                    >
                      {strength.label}
                    </span>
                  </div>
                  <Progress
                    value={strength.score}
                    className="h-1.5"
                    indicatorClassName={strength.color}
                  />
                </div>

                {/* Requirement checklist */}
                <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                  {passwordChecks.map((check) => (
                    <div
                      key={check.label}
                      className={`flex items-center gap-2 text-xs ${
                        check.passed
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-muted-foreground'
                      }`}
                    >
                      <span
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
                          check.passed
                            ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400'
                            : 'bg-muted text-muted-foreground/50'
                        }`}
                      >
                        {check.passed ? (
                          <svg
                            className="h-2.5 w-2.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={3}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        ) : (
                          <span className="text-[8px] font-bold">&bull;</span>
                        )}
                      </span>
                      {check.label}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="border-border/50 flex items-center justify-between border-t pt-4">
          <Button variant="outline" onClick={onPrev} size="sm">
            <ChevronLeft className="mr-1.5 h-4 w-4" />
            Back
          </Button>
          <Button onClick={onNext} disabled={!isValid} size="sm">
            Next Step
            <ChevronRight className="ml-1.5 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
