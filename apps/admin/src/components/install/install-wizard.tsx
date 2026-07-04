'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ProgressBar } from '@/components/install/progress-bar';
import { StepWelcome } from '@/components/install/step-welcome';
import { StepDatabase } from '@/components/install/step-database';
import { StepAdmin } from '@/components/install/step-admin';
import { StepSettings } from '@/components/install/step-settings';
import { StepPlugins } from '@/components/install/step-plugins';
import { StepTheme } from '@/components/install/step-theme';
import { StepComplete } from '@/components/install/step-complete';
import { useToast } from '@/components/ui/toast';
import { Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { env } from '@/lib/env';

interface InstallState {
  step: number;
  completedSteps: number[];
  isLoading: boolean;
  installing: boolean;
  error: string | null;

  // Step 0: Welcome
  language: string;

  // Step 1: Database
  dbHost: string;
  dbPort: number;
  dbName: string;
  dbUser: string;
  dbPassword: string;
  dbTested: boolean;
  dbTestSuccess: boolean;
  dbTesting: boolean;
  dbTestMessage: string;

  // Step 2: Admin
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  password: string;

  // Step 3: Settings
  siteName: string;
  siteDescription: string;
  siteUrl: string;
  timezone: string;
  permalink: string;

  // Step 4: Plugins
  selectedPlugins: string[];

  // Step 5: Theme
  selectedTheme: string;
  installType: 'fresh' | 'import';

  // Completion
  installComplete: boolean;
}

const API_BASE = env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

const DEFAULT_PLUGINS = ['seo', 'cache-redis', 'comments', 'security'];

async function checkInstallStatus(): Promise<{ installed: boolean }> {
  try {
    const res = await fetch(`${API_BASE}/install/status`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return { installed: false };
    return await res.json();
  } catch {
    return { installed: false };
  }
}

async function postStep(endpoint: string, data: unknown): Promise<void> {
  const res = await fetch(`${API_BASE}/install/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(err.message || err.error || `Step ${endpoint} failed`);
  }
}

export function InstallWizard() {
  const router = useRouter();
  const { error: showError, success: showSuccess } = useToast();
  const [checkingStatus, setCheckingStatus] = React.useState(true);

  const [state, setState] = React.useState<InstallState>({
    step: 0,
    completedSteps: [],
    isLoading: false,
    installing: false,
    error: null,

    // Welcome
    language: 'en-US',

    // Database
    dbHost: 'localhost',
    dbPort: 5432,
    dbName: 'nodepress',
    dbUser: 'postgres',
    dbPassword: '',
    dbTested: false,
    dbTestSuccess: false,
    dbTesting: false,
    dbTestMessage: '',

    // Admin
    firstName: '',
    lastName: '',
    email: '',
    username: 'admin',
    password: '',

    // Settings
    siteName: 'My NodePress Site',
    siteDescription: '',
    siteUrl:
      typeof window !== 'undefined'
        ? window.location.origin
        : 'http://localhost:3000',
    timezone: typeof Intl !== 'undefined'
      ? Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
      : 'UTC',
    permalink: '/%postname%/',

    // Plugins
    selectedPlugins: [...DEFAULT_PLUGINS],

    // Theme
    selectedTheme: 'web-starter',
    installType: 'fresh',

    // Completion
    installComplete: false,
  });

  // Check if already installed on mount
  React.useEffect(() => {
    let mounted = true;
    checkInstallStatus().then((status) => {
      if (!mounted) return;
      setCheckingStatus(false);
      if (status.installed) {
        router.push('/admin/login');
      }
    });
    return () => {
      mounted = false;
    };
  }, [router]);

  const updateField = React.useCallback((field: string, value: unknown) => {
    setState((prev) => ({ ...prev, [field]: value }));
  }, []);

  const completeStep = React.useCallback((step: number) => {
    setState((prev) => ({
      ...prev,
      completedSteps: prev.completedSteps.includes(step)
        ? prev.completedSteps
        : [...prev.completedSteps, step],
    }));
  }, []);

  const goToNextStep = React.useCallback(() => {
    setState((prev) => ({
      ...prev,
      step: Math.min(prev.step + 1, 5),
      error: null,
    }));
  }, []);

  const goToPrevStep = React.useCallback(() => {
    setState((prev) => ({
      ...prev,
      step: Math.max(prev.step - 1, 0),
      error: null,
    }));
  }, []);

  // Step 0: Welcome → 1
  const handleWelcomeNext = React.useCallback(() => {
    completeStep(0);
    goToNextStep();
  }, [completeStep, goToNextStep]);

  // Step 1: Database → 2
  const handleDbNext = React.useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      await postStep('step1', {
        host: state.dbHost,
        port: state.dbPort,
        name: state.dbName,
        user: state.dbUser,
        password: state.dbPassword,
      });
      completeStep(1);
      goToNextStep();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Database step failed';
      setState((prev) => ({ ...prev, error: message }));
      showError('Database Configuration Failed', message);
    } finally {
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, [state.dbHost, state.dbPort, state.dbName, state.dbUser, state.dbPassword, completeStep, goToNextStep, showError]);

  // Step 2: Admin → 3
  const handleAdminNext = React.useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      await postStep('step2', {
        firstName: state.firstName,
        lastName: state.lastName,
        email: state.email,
        username: state.username,
        password: state.password,
      });
      completeStep(2);
      goToNextStep();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Admin account step failed';
      setState((prev) => ({ ...prev, error: message }));
      showError('Admin Account Failed', message);
    } finally {
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, [state.firstName, state.lastName, state.email, state.username, state.password, completeStep, goToNextStep, showError]);

  // Step 3: Settings → 4
  const handleSettingsNext = React.useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      await postStep('step3', {
        siteName: state.siteName,
        siteDescription: state.siteDescription,
        siteUrl: state.siteUrl,
        language: state.language,
        timezone: state.timezone,
        permalink: state.permalink,
      });
      completeStep(3);
      goToNextStep();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Site settings step failed';
      setState((prev) => ({ ...prev, error: message }));
      showError('Site Settings Failed', message);
    } finally {
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, [state.siteName, state.siteDescription, state.siteUrl, state.language, state.timezone, state.permalink, completeStep, goToNextStep, showError]);

  // Step 4: Plugins → 5
  const handlePluginsNext = React.useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      await postStep('step4', {
        plugins: state.selectedPlugins,
      });
      completeStep(4);
      goToNextStep();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Plugin selection step failed';
      setState((prev) => ({ ...prev, error: message }));
      showError('Plugin Selection Failed', message);
    } finally {
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, [state.selectedPlugins, completeStep, goToNextStep, showError]);

  // Step 5: Theme → Install → Complete
  const handleInstall = React.useCallback(async () => {
    setState((prev) => ({ ...prev, installing: true, error: null }));

    try {
      // Step 5: Theme
      await postStep('step5', {
        theme: state.selectedTheme,
        installType: state.installType,
      });

      // Finalize installation
      await postStep('complete', {});

      completeStep(5);
      setState((prev) => ({
        ...prev,
        installComplete: true,
        installing: false,
        completedSteps: [...prev.completedSteps, 5],
        step: 6,
      }));
      showSuccess(
        'Installation Complete',
        'NodePress has been installed successfully!'
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Installation failed';
      setState((prev) => ({ ...prev, installing: false, error: message }));
      showError('Installation Failed', message);
    }
  }, [state.selectedTheme, state.installType, completeStep, showError, showSuccess]);

  // Test DB connection
  const handleTestConnection = React.useCallback(async () => {
    setState((prev) => ({ ...prev, dbTesting: true, dbTestMessage: '' }));

    try {
      const res = await fetch(`${API_BASE}/install/test-db`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: state.dbHost,
          port: state.dbPort,
          name: state.dbName,
          user: state.dbUser,
          password: state.dbPassword,
        }),
        signal: AbortSignal.timeout(15000),
      });

      const data = await res.json();

      if (data.success) {
        setState((prev) => ({
          ...prev,
          dbTesting: false,
          dbTested: true,
          dbTestSuccess: true,
          dbTestMessage: data.message || 'Connection successful',
        }));
        showSuccess('Connection Successful', data.message || 'Database connected successfully.');
      } else {
        setState((prev) => ({
          ...prev,
          dbTesting: false,
          dbTested: true,
          dbTestSuccess: false,
          dbTestMessage: data.message || data.error || 'Connection failed',
        }));
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Connection test failed';
      setState((prev) => ({
        ...prev,
        dbTesting: false,
        dbTested: true,
        dbTestSuccess: false,
        dbTestMessage: message,
      }));
    }
  }, [state.dbHost, state.dbPort, state.dbName, state.dbUser, state.dbPassword, showSuccess]);

  // Loading screen while checking install status
  if (checkingStatus) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="relative mx-auto h-12 w-12">
            <Loader2 className="text-muted-foreground h-12 w-12 animate-spin" />
          </div>
          <p className="text-muted-foreground mt-4 text-sm font-medium">
            Checking installation status...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-3xl px-4 py-10 sm:py-16">
      {/* Header */}
      {!state.installComplete && (
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Install NodePress
          </h1>
          <p className="text-muted-foreground mt-2 max-w-md mx-auto text-sm sm:text-base">
            Set up your content management system in just a few simple steps.
          </p>
        </div>
      )}

      {/* Progress bar (hidden on completion page) */}
      {!state.installComplete && (
        <ProgressBar currentStep={state.step} completedSteps={state.completedSteps} />
      )}

      {/* Error Banner */}
      {state.error && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50/80 p-4 shadow-sm dark:border-red-800 dark:bg-red-950/50">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-red-800 dark:text-red-200">
              {state.installing ? 'Installation Error' : 'Error'}
            </p>
            <p className="mt-0.5 text-xs text-red-600 dark:text-red-400 leading-relaxed">
              {state.error}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setState((prev) => ({ ...prev, error: null }))}
            className="shrink-0 h-7 text-xs"
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* Step Content */}
      {state.installComplete ? (
        <StepComplete siteName={state.siteName} />
      ) : (
        <>
          {/* Step 0: Welcome */}
          {state.step === 0 && (
            <StepWelcome
              language={state.language}
              onFieldChange={updateField}
              onNext={handleWelcomeNext}
            />
          )}

          {/* Step 1: Database */}
          {state.step === 1 && (
            <StepDatabase
              dbHost={state.dbHost}
              dbPort={state.dbPort}
              dbName={state.dbName}
              dbUser={state.dbUser}
              dbPassword={state.dbPassword}
              dbTested={state.dbTested}
              dbTestSuccess={state.dbTestSuccess}
              dbTesting={state.dbTesting}
              dbTestMessage={state.dbTestMessage}
              onFieldChange={updateField}
              onTestConnection={handleTestConnection}
              onNext={handleDbNext}
              onPrev={goToPrevStep}
            />
          )}

          {/* Step 2: Admin */}
          {state.step === 2 && (
            <StepAdmin
              firstName={state.firstName}
              lastName={state.lastName}
              email={state.email}
              username={state.username}
              password={state.password}
              onFieldChange={updateField}
              onNext={handleAdminNext}
              onPrev={goToPrevStep}
            />
          )}

          {/* Step 3: Settings */}
          {state.step === 3 && (
            <StepSettings
              siteName={state.siteName}
              siteDescription={state.siteDescription}
              siteUrl={state.siteUrl}
              language={state.language}
              timezone={state.timezone}
              permalink={state.permalink}
              onFieldChange={updateField}
              onNext={handleSettingsNext}
              onPrev={goToPrevStep}
            />
          )}

          {/* Step 4: Plugins */}
          {state.step === 4 && (
            <StepPlugins
              selectedPlugins={state.selectedPlugins}
              onFieldChange={updateField}
              onNext={handlePluginsNext}
              onPrev={goToPrevStep}
            />
          )}

          {/* Step 5: Theme + Install */}
          {state.step === 5 && (
            <>
              {state.installing ? (
                <div className="flex flex-col items-center justify-center py-24">
                  <div className="relative">
                    <div className="h-16 w-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="h-8 w-8 rounded-full bg-primary/10 animate-pulse" />
                    </div>
                  </div>
                  <h3 className="mt-6 text-lg font-semibold">Installing NodePress...</h3>
                  <p className="text-muted-foreground mt-2 max-w-sm text-center text-sm">
                    Running database migrations, seeding sample data, and activating your
                    selected plugins and theme.
                  </p>
                  {/* Animated progress dots */}
                  <div className="mt-8 flex gap-2">
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className="h-2.5 w-2.5 rounded-full bg-primary/60 animate-bounce"
                        style={{ animationDelay: `${i * 0.12}s` }}
                      />
                    ))}
                  </div>
                  <p className="text-muted-foreground mt-8 text-xs">
                    This may take a minute or two...
                  </p>
                </div>
              ) : (
                <StepTheme
                  selectedTheme={state.selectedTheme}
                  installType={state.installType}
                  loading={state.isLoading}
                  onFieldChange={updateField}
                  onNext={handleInstall}
                  onPrev={goToPrevStep}
                />
              )}
            </>
          )}
        </>
      )}

      {/* Footer */}
      {!state.installComplete && (
        <div className="mt-8 text-center">
          <p className="text-muted-foreground text-xs">
            NodePress v1.0.0-beta.2 &mdash; Built with Next.js and TypeScript
          </p>
        </div>
      )}
    </div>
  );
}
