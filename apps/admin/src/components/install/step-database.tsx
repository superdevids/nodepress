'use client';

import * as React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Database, CheckCircle2, XCircle, ChevronRight } from 'lucide-react';

interface StepDatabaseProps {
  dbHost: string;
  dbPort: number;
  dbName: string;
  dbUser: string;
  dbPassword: string;
  dbTested: boolean;
  dbTestSuccess: boolean;
  dbTesting: boolean;
  dbTestMessage: string;
  onFieldChange: (field: string, value: any) => void;
  onTestConnection: () => Promise<void>;
  onNext: () => void;
}

export function StepDatabase({
  dbHost,
  dbPort,
  dbName,
  dbUser,
  dbPassword,
  dbTested,
  dbTestSuccess,
  dbTesting,
  dbTestMessage,
  onFieldChange,
  onTestConnection,
  onNext,
}: StepDatabaseProps) {
  const canProceed = dbTested && dbTestSuccess;

  return (
    <Card className="border-border/60">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 rounded-lg p-2">
            <Database className="text-primary h-5 w-5" />
          </div>
          <div>
            <CardTitle>Database Connection</CardTitle>
            <CardDescription>
              Enter your PostgreSQL database credentials. NodePress will create all required tables
              automatically.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Host */}
          <div className="space-y-1.5">
            <Label htmlFor="dbHost">Host</Label>
            <Input
              id="dbHost"
              placeholder="localhost"
              value={dbHost}
              onChange={(e) => onFieldChange('dbHost', e.target.value)}
            />
          </div>

          {/* Port */}
          <div className="space-y-1.5">
            <Label htmlFor="dbPort">Port</Label>
            <Input
              id="dbPort"
              type="number"
              placeholder="5432"
              value={dbPort}
              onChange={(e) => onFieldChange('dbPort', parseInt(e.target.value) || 5432)}
            />
          </div>

          {/* Database Name */}
          <div className="space-y-1.5">
            <Label htmlFor="dbName">Database Name</Label>
            <Input
              id="dbName"
              placeholder="nodepress"
              value={dbName}
              onChange={(e) => onFieldChange('dbName', e.target.value)}
            />
          </div>

          {/* User */}
          <div className="space-y-1.5">
            <Label htmlFor="dbUser">User</Label>
            <Input
              id="dbUser"
              placeholder="postgres"
              value={dbUser}
              onChange={(e) => onFieldChange('dbUser', e.target.value)}
            />
          </div>

          {/* Password */}
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="dbPassword">Password</Label>
            <Input
              id="dbPassword"
              type="password"
              placeholder="Database password"
              value={dbPassword}
              onChange={(e) => onFieldChange('dbPassword', e.target.value)}
            />
          </div>
        </div>

        {/* Test connection result */}
        {dbTestMessage && (
          <div
            className={`flex items-start gap-3 rounded-md border p-4 ${
              dbTestSuccess
                ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950'
                : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950'
            }`}
          >
            {dbTestSuccess ? (
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
            )}
            <div className="flex-1">
              <p
                className={`text-sm font-medium ${
                  dbTestSuccess
                    ? 'text-emerald-800 dark:text-emerald-200'
                    : 'text-red-800 dark:text-red-200'
                }`}
              >
                {dbTestSuccess ? 'Connection Successful' : 'Connection Failed'}
              </p>
              <p
                className={`mt-0.5 text-xs ${
                  dbTestSuccess
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {dbTestMessage}
              </p>
            </div>
            {dbTestSuccess && (
              <Badge variant="success" className="shrink-0">
                Connected
              </Badge>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <p className="text-muted-foreground text-xs">
            Your credentials are sent directly to the server and never stored until installation.
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onTestConnection}
              disabled={dbTesting || !dbHost || !dbName}
            >
              {dbTesting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Testing...
                </>
              ) : (
                'Test Connection'
              )}
            </Button>
            <Button onClick={onNext} disabled={!canProceed}>
              Next Step
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
