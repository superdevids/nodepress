"use client";

import * as React from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";

export default function SecuritySettingsPage() {
  const { success } = useToast();
  const [twoFA, setTwoFA] = React.useState(false);
  const [registration, setRegistration] = React.useState(false);
  const [rateLimiting, setRateLimiting] = React.useState(true);

  const handleSave = () => {
    success("Security settings saved", "Security settings have been updated.");
  };

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Security Settings
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage authentication, password policy, and security preferences.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Password Policy</CardTitle>
          <CardDescription>
            Configure password requirements and expiration.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="minPasswordLength">Minimum password length</Label>
            <Input
              id="minPasswordLength"
              type="number"
              defaultValue="8"
              className="w-32"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="passwordExpiry">Password expiry (days)</Label>
            <Input
              id="passwordExpiry"
              type="number"
              defaultValue="90"
              className="w-32"
            />
            <p className="text-xs text-muted-foreground">
              Set to 0 for no expiration.
            </p>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label>Require strong passwords</Label>
              <p className="text-xs text-muted-foreground">
                Enforce mixed case, numbers, and special characters.
              </p>
            </div>
            <Switch defaultChecked />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Authentication</CardTitle>
          <CardDescription>
            Configure authentication methods and access control.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label>Two-Factor Authentication (2FA)</Label>
              <p className="text-xs text-muted-foreground">
                Require 2FA for all admin users using authenticator app.
              </p>
            </div>
            <Switch checked={twoFA} onCheckedChange={setTwoFA} />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label>User Registration</Label>
              <p className="text-xs text-muted-foreground">
                Allow anyone to register an account.
              </p>
            </div>
            <Switch
              checked={registration}
              onCheckedChange={setRegistration}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label>Rate Limiting</Label>
              <p className="text-xs text-muted-foreground">
                Limit login attempts to prevent brute force attacks.
              </p>
            </div>
            <Switch
              checked={rateLimiting}
              onCheckedChange={setRateLimiting}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Session</CardTitle>
          <CardDescription>Session and token management.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="sessionDuration">Session duration (hours)</Label>
            <Input
              id="sessionDuration"
              type="number"
              defaultValue="24"
              className="w-32"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="maxFailedLogins">
              Max failed login attempts
            </Label>
            <Input
              id="maxFailedLogins"
              type="number"
              defaultValue="5"
              className="w-32"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lockoutDuration">
              Lockout duration (minutes)
            </Label>
            <Input
              id="lockoutDuration"
              type="number"
              defaultValue="15"
              className="w-32"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave}>
          <Save className="h-4 w-4 mr-2" /> Save Changes
        </Button>
      </div>
    </div>
  );
}
