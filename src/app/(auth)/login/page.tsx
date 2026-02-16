"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Loader2, Zap, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (providerId: "credentials" | "cognito") => {
    setLoading(true);
    setError("");

    const result = await signIn(providerId, {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError(result.error === "CredentialsSignin"
        ? "Invalid email or password"
        : result.error
      );
      setLoading(false);
    } else {
      router.push("/");
      router.refresh();
    }
  };

  const emailField = (
    <div className="space-y-2">
      <Label htmlFor="email" className="text-sm font-medium">Email</Label>
      <Input
        id="email"
        type="email"
        placeholder="admin@agency.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        className="h-11 rounded-xl bg-muted/50 border-transparent focus:border-primary/30 focus:bg-background transition-all duration-200"
      />
    </div>
  );

  const passwordField = (
    <div className="space-y-2">
      <Label htmlFor="password" className="text-sm font-medium">Password</Label>
      <Input
        id="password"
        type="password"
        placeholder="Enter your password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        className="h-11 rounded-xl bg-muted/50 border-transparent focus:border-primary/30 focus:bg-background transition-all duration-200"
      />
    </div>
  );

  const errorBanner = error ? (
    <div className="rounded-xl bg-destructive/8 border border-destructive/15 p-3.5 text-sm text-destructive flex items-center gap-2">
      <div className="h-1.5 w-1.5 rounded-full bg-destructive shrink-0" />
      {error}
    </div>
  ) : null;

  return (
    <div className="w-full max-w-[420px]">
      {/* Mobile logo */}
      <div className="flex items-center gap-2.5 mb-10 lg:hidden justify-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-blue shadow-lg shadow-blue-500/20">
          <Zap className="h-5 w-5 text-white" />
        </div>
        <div>
          <span className="text-lg font-heading font-semibold">DigiMarketing</span>
          <div className="text-[10px] text-muted-foreground tracking-widest uppercase">AI Platform</div>
        </div>
      </div>

      <Card className="border-0 shadow-xl shadow-black/5 rounded-2xl">
        <CardHeader className="space-y-1 pb-4 px-7 pt-7">
          <CardTitle className="text-2xl font-heading font-semibold">Welcome back</CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            Sign in to your creative dashboard
          </CardDescription>
        </CardHeader>
        <CardContent className="px-7 pb-7">
          <Tabs defaultValue="local">
            <TabsList className="grid w-full grid-cols-2 mb-6 rounded-xl h-11 p-1">
              <TabsTrigger value="local" className="rounded-lg text-sm">Platform Login</TabsTrigger>
              <TabsTrigger value="cognito" className="rounded-lg text-sm">AWS Cognito</TabsTrigger>
            </TabsList>

            <TabsContent value="local">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSubmit("credentials");
                }}
                className="space-y-4"
              >
                {errorBanner}
                {emailField}
                {passwordField}
                <Button
                  type="submit"
                  className="w-full h-11 rounded-xl gradient-blue border-0 hover:opacity-90 transition-all duration-200 font-medium text-sm group shadow-lg shadow-blue-500/25"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      Sign in
                      <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                    </>
                  )}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="cognito">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSubmit("cognito");
                }}
                className="space-y-4"
              >
                {errorBanner}
                {emailField}
                {passwordField}
                <Button
                  type="submit"
                  className="w-full h-11 rounded-xl border-0 hover:opacity-90 transition-all duration-200 font-medium text-sm text-white shadow-lg"
                  style={{ backgroundColor: "#FF9900", boxShadow: "0 10px 25px rgba(255, 153, 0, 0.25)" }}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in with Cognito...
                    </>
                  ) : (
                    <>
                      Sign in with AWS Cognito
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <p className="text-center mt-6 text-xs text-muted-foreground/60">
        Powered by AI &middot; DigiMarketing Platform
      </p>
    </div>
  );
}
