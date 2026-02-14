"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";

export default function SettingsPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage agency settings and team</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Agency Profile</CardTitle>
          <CardDescription>Agency branding used in reports and emails</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label>Agency Name</Label>
            <Input defaultValue="DigiMarketing Agency" />
          </div>
          <div className="grid gap-2">
            <Label>Website</Label>
            <Input defaultValue="https://digimarketing.com" />
          </div>
          <div className="grid gap-2">
            <Label>Support Email</Label>
            <Input defaultValue="support@digimarketing.com" />
          </div>
          <Button>Save Changes</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>Configure notification preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>New Lead Alerts</Label>
              <p className="text-sm text-muted-foreground">Get notified when new leads come in</p>
            </div>
            <Switch defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <Label>Post Failures</Label>
              <p className="text-sm text-muted-foreground">Alert when a post fails to publish</p>
            </div>
            <Switch defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <Label>Billing Reminders</Label>
              <p className="text-sm text-muted-foreground">Remind about overdue invoices</p>
            </div>
            <Switch defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <Label>Token Expiry Alerts</Label>
              <p className="text-sm text-muted-foreground">Alert when platform connections expire</p>
            </div>
            <Switch defaultChecked />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Team Management</CardTitle>
          <CardDescription>Manage team members and roles</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Team members are managed via the database seed or admin API. Current roles: Admin, Manager, Viewer.
          </p>
          <Button variant="outline">View Team Members</Button>
        </CardContent>
      </Card>
    </div>
  );
}
