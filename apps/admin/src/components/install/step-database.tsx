'use client';

import * as React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Loader2,
  Database,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Server,
  KeyRound,
  Table,
  User,
} from 'lucide-react';

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
  onPrev: () => void;
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
  onPrev,
}: StepDatabaseProps) {
  const canProceed = dbTested && dbTestSuccess;

  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader>
        <div className="flex items-center gap-4">
          <div className="from-primary/20 to-primary/5 ring-primary/10 rounded-xl bg-gradient-to-br p-2.5 shadow-sm ring-1">
            <Database className="text-primary h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-xl">Database Connection</CardTitle>
            <CardDescription className="text-sm">
              Enter your PostgreSQL database credentials. NodePress will create all required tables
              automatically using Prisma ORM migrations.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Host */}
          <div className="space-y-1.5">
            <Label htmlFor="dbHost" className="flex items-center gap-1.5 text-sm font-medium">
              <Server className="text-muted-foreground h-3.5 w-3.5" />
              Host
            </Label>
            <Input
              id="dbHost"
              placeholder="localhost"
              value={dbHost}
              onChange={(e) => onFieldChange('dbHost', e.target.value)}
              className="transition-shadow focus-visible:shadow-sm"
            />
          </div>

          {/* Port */}
          <div className="space-y-1.5">
            <Label htmlFor="dbPort" className="flex items-center gap-1.5 text-sm font-medium">
              <Server className="text-muted-foreground h-3.5 w-3.5" />
              Port
            </Label>
            <Input
              id="dbPort"
              type="number"
              placeholder="5432"
              value={dbPort}
              onChange={(e) => onFieldChange('dbPort', parseInt(e.target.value) || 5432)}
              className="transition-shadow focus-visible:shadow-sm"
            />
          </div>

          {/* Database Name */}
          <div className="space-y-1.5">
            <Label htmlFor="dbName" className="flex items-center gap-1.5 text-sm font-medium">
              <Table className="text-muted-foreground h-3.5 w-3.5" />
              Database Name
            </Label>
            <Input
              id="dbName"
              placeholder="nodepress"
              value={dbName}
              onChange={(e) => onFieldChange('dbName', e.target.value)}
              className="transition-shadow focus-visible:shadow-sm"
            />
          </div>

          {/* User */}
          <div className="space-y-1.5">
            <Label htmlFor="dbUser" className="flex items-center gap-1.5 text-sm font-medium">
              <User className="text-muted-foreground h-3.5 w-3.5" />
              User
            </Label>
            <Input
              id="dbUser"
              placeholder="postgres"
              value={dbUser}
              onChange={(e) => onFieldChange('dbUser', e.target.value)}
              className="transition-shadow focus-visible:shadow-sm"
            />
          </div>

          {/* Password */}
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="dbPassword" className="flex items-center gap-1.5 text-sm font-medium">
              <KeyRound className="text-muted-foreground h-3.5 w-3.5" />
              Password
            </Label>
            <Input
              id="dbPassword"
              type="password"
              placeholder="Enter database password"
              value={dbPassword}
              onChange={(e) => onFieldChange('dbPassword', e.target.value)}
              className="transition-shadow focus-visible:shadow-sm"
            />
          </div>
        </div>

        {/* Test connection result */}
        {dbTestMessage && (
          <div
            className={`flex items-start gap-3 rounded-lg border p-4 transition-all ${
              dbTestSuccess
                ? 'border-emerald-200 bg-emerald-50/80 dark:border-emerald-800 dark:bg-emerald-950/50'
                : 'border-red-200 bg-red-50/80 dark:border-red-800 dark:bg-red-950/50'
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
                className={`mt-0.5 text-xs leading-relaxed ${
                  dbTestSuccess
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {dbTestMessage}
              </p>
            </div>
            {dbTestSuccess && (
              <Badge
                variant="outline"
                className="shrink-0 border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
              >
                Connected
              </Badge>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="border-border/50 flex items-center justify-between border-t pt-4">
          <Button variant="outline" onClick={onPrev} size="sm">
            <ChevronLeft className="mr-1.5 h-4 w-4" />
            Back
          </Button>
          <div className="flex items-center gap-3">
            <p className="text-muted-foreground hidden text-xs md:block">
              Test your connection before proceeding
            </p>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={onTestConnection}
                disabled={dbTesting || !dbHost || !dbName}
                size="sm"
              >
                {dbTesting ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Testing...
                  </>
                ) : (
                  'Test Connection'
                )}
              </Button>
              <Button onClick={onNext} disabled={!canProceed} size="sm">
                Next Step
                <ChevronRight className="ml-1.5 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
