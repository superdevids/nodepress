'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { z } from 'zod';
import { Eye, EyeOff, ArrowLeft, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useApi } from '@/lib/use-api';
import { useToast } from '@/components/ui/toast';

const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string().min(8, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

type TokenState = 'loading' | 'valid' | 'invalid' | 'expired';

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const { get, post } = useApi();
  const { success: showSuccess, error: showError } = useToast();

  const [tokenState, setTokenState] = React.useState<TokenState>('loading');
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSuccess, setIsSuccess] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [passwordStrength, setPasswordStrength] = React.useState(0);

  // Verify token on mount
  React.useEffect(() => {
    if (!token) {
      setTokenState('invalid');
      return;
    }

    let cancelled = false;

    get<{ valid: boolean; email?: string }>(`/auth/verify-reset-token/${token}`)
      .then((res) => {
        if (cancelled) return;
        if (res.data?.valid) {
          setTokenState('valid');
        } else {
          setTokenState('expired');
        }
      })
      .catch(() => {
        if (!cancelled) setTokenState('invalid');
      });

    return () => {
      cancelled = true;
    };
  }, [token, get]);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const passwordValue = watch('password');

  // Calculate password strength
  React.useEffect(() => {
    let score = 0;
    if (passwordValue.length >= 8) score += 25;
    if (/[A-Z]/.test(passwordValue)) score += 25;
    if (/[a-z]/.test(passwordValue)) score += 25;
    if (/[0-9]/.test(passwordValue)) score += 25;
    if (/[^A-Za-z0-9]/.test(passwordValue)) score += 25;
    setPasswordStrength(Math.min(score, 100));
  }, [passwordValue]);

  const getStrengthColor = () => {
    if (passwordStrength < 50) return 'bg-red-500';
    if (passwordStrength < 75) return 'bg-amber-500';
    if (passwordStrength < 100) return 'bg-lime-500';
    return 'bg-green-500';
  };

  const getStrengthLabel = () => {
    if (passwordStrength === 0) return '';
    if (passwordStrength < 50) return 'Weak';
    if (passwordStrength < 75) return 'Fair';
    if (passwordStrength < 100) return 'Good';
    return 'Strong';
  };

  const onSubmit = async (data: ResetPasswordForm) => {
    if (!token) return;
    setIsLoading(true);

    try {
      await post('/auth/reset-password', {
        token,
        password: data.password,
        confirmPassword: data.confirmPassword,
      });
      setIsSuccess(true);
      showSuccess('Password reset successful', 'You can now sign in with your new password.');

      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/admin/login');
      }, 3000);
    } catch (err: any) {
      showError(
        'Reset failed',
        err.message || 'Failed to reset password. The link may have expired.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Token loading state
  if (tokenState === 'loading') {
    return (
      <div className="bg-muted/30 flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="text-primary h-8 w-8 animate-spin" />
            <p className="text-muted-foreground mt-4 text-sm">Verifying your reset link...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Invalid token state (no token in URL)
  if (tokenState === 'invalid') {
    return (
      <div className="bg-muted/30 flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900">
              <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <CardTitle className="text-xl font-bold">Invalid Reset Link</CardTitle>
            <CardDescription>
              This password reset link is invalid. Please request a new one.
            </CardDescription>
          </CardHeader>
          <CardFooter className="justify-center">
            <Link
              href="/admin/login/forgot-password"
              className="text-primary inline-flex items-center gap-1 text-sm hover:underline"
            >
              <ArrowLeft className="h-4 w-4" />
              Request new reset link
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Expired token state
  if (tokenState === 'expired') {
    return (
      <div className="bg-muted/30 flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900">
              <XCircle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <CardTitle className="text-xl font-bold">Link Expired</CardTitle>
            <CardDescription>
              This password reset link has expired. Reset links are only valid for 1 hour.
            </CardDescription>
          </CardHeader>
          <CardFooter className="justify-center">
            <Link
              href="/admin/login/forgot-password"
              className="text-primary inline-flex items-center gap-1 text-sm hover:underline"
            >
              <ArrowLeft className="h-4 w-4" />
              Request new reset link
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Success state
  if (isSuccess) {
    return (
      <div className="bg-muted/30 flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
              <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-xl font-bold">Password Reset!</CardTitle>
            <CardDescription>
              Your password has been successfully reset. Redirecting you to login...
            </CardDescription>
          </CardHeader>
          <CardFooter className="justify-center">
            <Link
              href="/admin/login"
              className="text-primary inline-flex items-center gap-1 text-sm hover:underline"
            >
              <ArrowLeft className="h-4 w-4" />
              Go to login
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Valid token — show the reset form
  return (
    <div className="bg-muted/30 flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">NodePress</CardTitle>
          <CardDescription>Create a new password for your account.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* New Password */}
            <div className="space-y-1.5">
              <Label htmlFor="password">New password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter new password"
                  autoComplete="new-password"
                  autoFocus
                  {...register('password')}
                  className={errors.password ? 'border-destructive pr-10' : 'pr-10'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-muted-foreground hover:text-foreground absolute right-3 top-1/2 -translate-y-1/2"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-destructive text-xs">{errors.password.message}</p>
              )}

              {/* Password strength indicator */}
              {passwordValue.length > 0 && (
                <div className="mt-1.5 space-y-1">
                  <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
                    <div
                      className={`h-full rounded-full transition-all ${getStrengthColor()}`}
                      style={{ width: `${passwordStrength}%` }}
                    />
                  </div>
                  <p
                    className={`text-xs ${passwordStrength >= 75 ? 'text-green-600' : 'text-muted-foreground'}`}
                  >
                    {getStrengthLabel()}
                  </p>
                </div>
              )}

              {/* Password requirements */}
              <ul className="space-y-1 pt-1">
                <li
                  className={`flex items-center gap-1.5 text-xs ${passwordValue.length >= 8 ? 'text-green-600' : 'text-muted-foreground'}`}
                >
                  {passwordValue.length >= 8 ? (
                    <CheckCircle className="h-3 w-3" />
                  ) : (
                    <XCircle className="h-3 w-3" />
                  )}
                  At least 8 characters
                </li>
                <li
                  className={`flex items-center gap-1.5 text-xs ${/[A-Z]/.test(passwordValue) ? 'text-green-600' : 'text-muted-foreground'}`}
                >
                  {/[A-Z]/.test(passwordValue) ? (
                    <CheckCircle className="h-3 w-3" />
                  ) : (
                    <XCircle className="h-3 w-3" />
                  )}
                  One uppercase letter
                </li>
                <li
                  className={`flex items-center gap-1.5 text-xs ${/[a-z]/.test(passwordValue) ? 'text-green-600' : 'text-muted-foreground'}`}
                >
                  {/[a-z]/.test(passwordValue) ? (
                    <CheckCircle className="h-3 w-3" />
                  ) : (
                    <XCircle className="h-3 w-3" />
                  )}
                  One lowercase letter
                </li>
                <li
                  className={`flex items-center gap-1.5 text-xs ${/[0-9]/.test(passwordValue) ? 'text-green-600' : 'text-muted-foreground'}`}
                >
                  {/[0-9]/.test(passwordValue) ? (
                    <CheckCircle className="h-3 w-3" />
                  ) : (
                    <XCircle className="h-3 w-3" />
                  )}
                  One number
                </li>
              </ul>
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">Confirm new password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm new password"
                  autoComplete="new-password"
                  {...register('confirmPassword')}
                  className={errors.confirmPassword ? 'border-destructive pr-10' : 'pr-10'}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="text-muted-foreground hover:text-foreground absolute right-3 top-1/2 -translate-y-1/2"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-destructive text-xs">{errors.confirmPassword.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Resetting...
                </>
              ) : (
                'Reset Password'
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center">
          <Link
            href="/admin/login"
            className="text-primary inline-flex items-center gap-1 text-sm hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to login
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
