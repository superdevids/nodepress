'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ProgressBar } from '@/components/install/progress-bar';
import { StepDatabase } from '@/components/install/step-database';
import { StepAdmin } from '@/components/install/step-admin';
import { StepSite } from '@/components/install/step-site';
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
  avatar: string;

  // Step 3: Site
  siteName: string;
  siteDescription: string;
  siteUrl: string;
  language: string;
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
    const res = await fetch(`${API_BASE}/install/status`);
    if (!res.ok) return { installed: false };
    const data = await res.json();
    return data;
  } catch {
    return { installed: false };
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

    dbHost: 'localhost',
    dbPort: 5432,
    dbName: 'nodepress',
    dbUser: 'postgres',
    dbPassword: '',
    dbTested: false,
    dbTestSuccess: false,
    dbTesting: false,
    dbTestMessage: '',

    firstName: '',
    lastName: '',
    email: '',
    username: 'admin',
    password: '',
    avatar: '',

    siteName: 'My NodePress Site',
    siteDescription: '',
    siteUrl: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
    language: 'en-US',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    permalink: '/%postname%/',

    selectedPlugins: [...DEFAULT_PLUGINS],
    selectedTheme: 'web-starter',
    installType: 'fresh',

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

  const updateField = React.useCallback((field: string, value: any) => {
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
    }));
  }, []);

  const goToPrevStep = React.useCallback(() => {
    setState((prev) => ({
      ...prev,
      step: Math.max(prev.step - 1, 0),
    }));
  }, []);

  // Step 0 → 1: Mark DB step as completed
  const handleDbNext = React.useCallback(() => {
    completeStep(0);
    goToNextStep();
  }, [completeStep, goToNextStep]);

  // Step 1 → 2
  const handleAdminNext = React.useCallback(() => {
    completeStep(1);
    goToNextStep();
  }, [completeStep, goToNextStep]);

  // Step 2 → 3
  const handleSiteNext = React.useCallback(() => {
    completeStep(2);
    goToNextStep();
  }, [completeStep, goToNextStep]);

  // Step 3 → 4
  const handlePluginsNext = React.useCallback(() => {
    completeStep(3);
    goToNextStep();
  }, [completeStep, goToNextStep]);

  // Step 4 → 5 (Install!)
  const handleInstall = React.useCallback(async () => {
    setState((prev) => ({ ...prev, installing: true, error: null }));

    try {
      const payload = {
        db: {
          host: state.dbHost,
          port: state.dbPort,
          name: state.dbName,
          user: state.dbUser,
          password: state.dbPassword,
        },
        admin: {
          firstName: state.firstName,
          lastName: state.lastName,
          email: state.email,
          username: state.username,
          password: state.password,
          avatar: state.avatar || undefined,
        },
        site: {
          title: state.siteName,
          description: state.siteDescription,
          url: state.siteUrl,
          language: state.language,
          timezone: state.timezone,
          permalink: state.permalink,
        },
        plugins: state.selectedPlugins,
        theme: state.selectedTheme,
        installType: state.installType,
      };

      const res = await fetch(`${API_BASE}/install/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Installation failed' }));
        throw new Error(err.message || err.error || 'Installation failed');
      }

      const data = await res.json();
      completeStep(4);
      setState((prev) => ({
        ...prev,
        installComplete: true,
        installing: false,
        completedSteps: [...prev.completedSteps, 4],
        step: 5,
      }));
      showSuccess('Installation Complete', 'NodePress has been installed successfully!');
    } catch (err: any) {
      const message = err instanceof Error ? err.message : 'Installation failed';
      setState((prev) => ({ ...prev, installing: false, error: message }));
      showError('Installation Failed', message);
    }
  }, [state, completeStep, showError, showSuccess]);

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
      } else {
        setState((prev) => ({
          ...prev,
          dbTesting: false,
          dbTested: true,
          dbTestSuccess: false,
          dbTestMessage: data.message || 'Connection failed',
        }));
      }
    } catch (err: any) {
      const message = err instanceof Error ? err.message : 'Connection test failed';
      setState((prev) => ({
        ...prev,
        dbTesting: false,
        dbTested: true,
        dbTestSuccess: false,
        dbTestMessage: message,
      }));
    }
  }, [state.dbHost, state.dbPort, state.dbName, state.dbUser, state.dbPassword]);

  if (checkingStatus) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="text-muted-foreground mx-auto h-8 w-8 animate-spin" />
          <p className="text-muted-foreground mt-3 text-sm">Checking installation status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-3xl px-4 py-12">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Install NodePress</h1>
        <p className="text-muted-foreground mt-2">
          Set up your content management system in just a few steps.
        </p>
      </div>

      {/* Progress bar */}
      {!state.installComplete && (
        <ProgressBar currentStep={state.step} completedSteps={state.completedSteps} />
      )}

      {/* Error Banner */}
      {state.error && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800 dark:text-red-200">Installation Error</p>
            <p className="mt-0.5 text-xs text-red-600 dark:text-red-400">{state.error}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setState((prev) => ({ ...prev, error: null }))}
            className="shrink-0"
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
          {state.step === 0 && (
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
            />
          )}

          {state.step === 1 && (
            <StepAdmin
              firstName={state.firstName}
              lastName={state.lastName}
              email={state.email}
              username={state.username}
              password={state.password}
              avatar={state.avatar}
              onFieldChange={updateField}
              onNext={handleAdminNext}
              onPrev={goToPrevStep}
            />
          )}

          {state.step === 2 && (
            <StepSite
              siteName={state.siteName}
              siteDescription={state.siteDescription}
              siteUrl={state.siteUrl}
              language={state.language}
              timezone={state.timezone}
              permalink={state.permalink}
              onFieldChange={updateField}
              onNext={handleSiteNext}
              onPrev={goToPrevStep}
            />
          )}

          {state.step === 3 && (
            <StepPlugins
              selectedPlugins={state.selectedPlugins}
              onFieldChange={updateField}
              onNext={handlePluginsNext}
              onPrev={goToPrevStep}
            />
          )}

          {state.step === 4 &&
            (state.installing ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="text-primary h-10 w-10 animate-spin" />
                <h3 className="mt-4 text-lg font-semibold">Installing NodePress...</h3>
                <p className="text-muted-foreground mt-2 text-sm">
                  Running database migrations, seeding data, and activating plugins.
                </p>
                <div className="mt-6 flex gap-1.5">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="bg-primary/30 h-2 w-8 animate-pulse rounded-full"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
                <p className="text-muted-foreground mt-6 text-xs">
                  This may take a minute or two...
                </p>
              </div>
            ) : (
              <StepTheme
                selectedTheme={state.selectedTheme}
                installType={state.installType}
                onFieldChange={updateField}
                onNext={handleInstall}
                onPrev={goToPrevStep}
              />
            ))}
        </>
      )}
    </div>
  );
}
