"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { Loader2, Lock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";

export default function ChangePasswordPage() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  const changePasswordMutation = trpc.user.changePassword.useMutation({
    onSuccess: () => {
      signOut({ callbackUrl: "/login" });
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    changePasswordMutation.mutate({ newPassword });
  };

  return (
    <div className="w-full max-w-[420px]">
      <Card className="border-0 shadow-xl shadow-black/5 rounded-2xl">
        <CardHeader className="space-y-1 pb-4 px-7 pt-7">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Lock className="h-5 w-5 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-heading font-semibold">Change your password</CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            You must set a new password before continuing
          </CardDescription>
        </CardHeader>
        <CardContent className="px-7 pb-7">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-xl bg-destructive/8 border border-destructive/15 p-3.5 text-sm text-destructive flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-destructive shrink-0" />
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="newPassword" className="text-sm font-medium">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                className="h-11 rounded-xl bg-muted/50 border-transparent focus:border-primary/30 focus:bg-background transition-all duration-200"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-medium">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                className="h-11 rounded-xl bg-muted/50 border-transparent focus:border-primary/30 focus:bg-background transition-all duration-200"
              />
            </div>
            <Button
              type="submit"
              className="w-full h-11 rounded-xl gradient-blue border-0 hover:opacity-90 transition-all duration-200 font-medium text-sm group shadow-lg shadow-blue-500/25"
              disabled={changePasswordMutation.isLoading}
            >
              {changePasswordMutation.isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating password...
                </>
              ) : (
                <>
                  Set new password
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <p className="text-center mt-6 text-xs text-muted-foreground/60">
        You will be signed out after changing your password
      </p>
    </div>
  );
}
