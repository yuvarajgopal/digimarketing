"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Loader2, ArrowRight, Lock, Mail, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const router = useRouter();

  const handleSubmit = async (providerId: "credentials" | "cognito") => {
    setLoading(true);
    setError("");
    const result = await signIn(providerId, { email, password, redirect: false });
    if (result?.error) {
      setError(result.error === "CredentialsSignin" ? "Invalid email or password." : result.error);
      setLoading(false);
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  };

  return (
    <div className="w-full">

      {/* Mobile logo — only shown on small screens */}
      <div className="flex items-center gap-2.5 mb-8 lg:hidden">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-blue shrink-0">
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
            <path d="M3 10l5 5 9-9" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div className="flex flex-col">
          <span className="font-heading font-bold text-[17px] leading-tight text-foreground">DigiCampaign</span>
          <span className="text-[10px] text-muted-foreground leading-tight">An Infra Delta Solutions Company</span>
        </div>
      </div>

      {/* Card */}
      <div className="rounded-xl border border-border bg-card p-8 shadow-sm shadow-black/5 dark:shadow-black/20">

        {/* Header */}
        <div className="mb-7">
          <h2 className="text-[22px] font-heading font-bold text-foreground tracking-tight">
            Sign in to DigiCampaign
          </h2>
          <p className="text-[14px] text-muted-foreground mt-1.5">
            Enter your credentials to access your workspace.
          </p>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); handleSubmit("credentials"); }} className="space-y-4">

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2.5 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 px-3.5 py-3 text-[13px] text-red-600 dark:text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-[13px] font-semibold text-foreground/80">
              Email address
            </Label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70" />
              <Input
                id="email"
                type="text"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11 pl-10 rounded-lg border-border bg-background
                  focus:border-blue-500 focus:ring-blue-500/20
                  dark:focus:border-blue-400 dark:focus:ring-blue-400/20
                  text-foreground placeholder:text-muted-foreground/50
                  text-[14px] transition-colors duration-150"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-[13px] font-semibold text-foreground/80">
                Password
              </Label>
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70" />
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-11 pl-10 rounded-lg border-border bg-background
                  focus:border-blue-500 focus:ring-blue-500/20
                  dark:focus:border-blue-400 dark:focus:ring-blue-400/20
                  text-foreground placeholder:text-muted-foreground/50
                  text-[14px] transition-colors duration-150"
              />
            </div>
          </div>

          {/* Submit — Blue gradient button */}
          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-xl gradient-blue hover:opacity-90 active:opacity-80
              text-white font-bold text-[15px] border-0 mt-2
              shadow-sm shadow-blue-500/25
              transition-opacity duration-150"
          >
            {loading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Signing in...</>
            ) : (
              <>Sign in<ArrowRight className="ml-2 h-4 w-4" /></>
            )}
          </Button>
        </form>
      </div>

      <p className="text-center mt-5 text-[12px] text-muted-foreground/50">
        DigiCampaign &mdash; An Infra Delta Solutions Company
      </p>
    </div>
  );
}
