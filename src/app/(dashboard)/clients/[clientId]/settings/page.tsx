"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClientStatus } from "@prisma/client";
import { Loader2, Sparkles, Save, X, Plus } from "lucide-react";

export default function ClientSettingsPage() {
  const params = useParams();
  const clientId = params.clientId as string;

  const { data: client, refetch } = trpc.client.byId.useQuery({ id: clientId });
  const { data: aiProfile } = trpc.ai.getAIProfile.useQuery({ clientId }, { enabled: !!clientId });

  const updateStatusMutation = trpc.client.updateStatus.useMutation({ onSuccess: () => refetch() });
  const saveProfileMutation = trpc.ai.saveAIProfile.useMutation({ onSuccess: () => refetch() });

  const [brandVoice, setBrandVoice] = useState("");
  const [guidelines, setGuidelines] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [competitors, setCompetitors] = useState<string[]>([]);
  const [competitorInput, setCompetitorInput] = useState("");
  const [forbiddenWords, setForbiddenWords] = useState<string[]>([]);
  const [forbiddenInput, setForbiddenInput] = useState("");
  const [samplePosts, setSamplePosts] = useState<string[]>([]);
  const [sampleInput, setSampleInput] = useState("");

  useEffect(() => {
    if (aiProfile) {
      setBrandVoice(aiProfile.brandVoice || "");
      setGuidelines(aiProfile.guidelines || "");
      setTargetAudience(aiProfile.targetAudience || "");
      setCompetitors(aiProfile.competitors || []);
      setForbiddenWords(aiProfile.forbiddenWords || []);
      setSamplePosts(aiProfile.samplePosts || []);
    }
  }, [aiProfile]);

  const handleSaveProfile = () => {
    saveProfileMutation.mutate({
      clientId,
      profile: {
        brandVoice: brandVoice || undefined,
        guidelines: guidelines || undefined,
        targetAudience: targetAudience || undefined,
        competitors: competitors.length > 0 ? competitors : undefined,
        forbiddenWords: forbiddenWords.length > 0 ? forbiddenWords : undefined,
        samplePosts: samplePosts.length > 0 ? samplePosts : undefined,
      },
    });
  };

  const addToList = (list: string[], setList: (v: string[]) => void, value: string, setInput: (v: string) => void) => {
    const trimmed = value.trim();
    if (trimmed && !list.includes(trimmed)) {
      setList([...list, trimmed]);
      setInput("");
    }
  };

  if (!client) return null;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Client Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage client details and AI configuration</p>
      </div>

      {/* Status */}
      <Card className="border shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Status</CardTitle>
          <CardDescription>Current: <Badge variant={client.status === "ACTIVE" ? "success" : client.status === "PAUSED" ? "warning" : "destructive"}>{client.status}</Badge></CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={client.status}
            onValueChange={(v) => updateStatusMutation.mutate({ id: clientId, status: v as ClientStatus })}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="PAUSED">Paused</SelectItem>
              <SelectItem value="CHURNED">Churned</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* AI Brand Profile */}
      <Card className="border shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg gradient-blue flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div>
              <CardTitle className="text-base">AI Brand Profile</CardTitle>
              <CardDescription>Configure how AI generates content for this client</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Brand Voice */}
          <div className="space-y-2">
            <Label>Brand Voice</Label>
            <Textarea
              value={brandVoice}
              onChange={(e) => setBrandVoice(e.target.value)}
              placeholder="e.g. Professional yet approachable. Uses data-driven language. Avoids jargon. Warm and empowering tone."
              rows={3}
              className="text-sm resize-none"
            />
          </div>

          {/* Brand Guidelines */}
          <div className="space-y-2">
            <Label>Brand Guidelines</Label>
            <Textarea
              value={guidelines}
              onChange={(e) => setGuidelines(e.target.value)}
              placeholder="e.g. Always include CTA. Use brand colors in visuals. Mention sustainability commitment. End with branded hashtag #BrandName."
              rows={3}
              className="text-sm resize-none"
            />
          </div>

          {/* Target Audience */}
          <div className="space-y-2">
            <Label>Target Audience</Label>
            <Textarea
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              placeholder="e.g. Millennials and Gen Z professionals aged 25-40, interested in sustainable fashion, urban lifestyle, health-conscious."
              rows={2}
              className="text-sm resize-none"
            />
          </div>

          {/* Competitors */}
          <div className="space-y-2">
            <Label>Competitors</Label>
            <div className="flex gap-2">
              <Input
                value={competitorInput}
                onChange={(e) => setCompetitorInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addToList(competitors, setCompetitors, competitorInput, setCompetitorInput))}
                placeholder="Add competitor name..."
                className="text-sm h-8"
              />
              <button
                type="button"
                className="h-8 px-3 rounded-lg text-xs font-semibold gradient-blue text-white border-0 hover:opacity-90 transition-all shadow-sm shadow-blue-500/15 flex items-center gap-1 shrink-0"
                onClick={() => addToList(competitors, setCompetitors, competitorInput, setCompetitorInput)}
              >
                <Plus className="h-3 w-3" />
                Add
              </button>
            </div>
            {competitors.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {competitors.map((c, i) => (
                  <Badge key={i} variant="secondary" className="text-xs gap-1">
                    {c}
                    <button type="button" onClick={() => setCompetitors(competitors.filter((_, j) => j !== i))} className="hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Forbidden Words */}
          <div className="space-y-2">
            <Label>Forbidden Words / Phrases</Label>
            <div className="flex gap-2">
              <Input
                value={forbiddenInput}
                onChange={(e) => setForbiddenInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addToList(forbiddenWords, setForbiddenWords, forbiddenInput, setForbiddenInput))}
                placeholder="Add forbidden word..."
                className="text-sm h-8"
              />
              <button
                type="button"
                className="h-8 px-3 rounded-lg text-xs font-semibold gradient-blue text-white border-0 hover:opacity-90 transition-all shadow-sm shadow-blue-500/15 flex items-center gap-1 shrink-0"
                onClick={() => addToList(forbiddenWords, setForbiddenWords, forbiddenInput, setForbiddenInput)}
              >
                <Plus className="h-3 w-3" />
                Add
              </button>
            </div>
            {forbiddenWords.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {forbiddenWords.map((w, i) => (
                  <Badge key={i} variant="destructive" className="text-xs gap-1">
                    {w}
                    <button type="button" onClick={() => setForbiddenWords(forbiddenWords.filter((_, j) => j !== i))} className="hover:opacity-70">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Sample Posts */}
          <div className="space-y-2">
            <Label>Sample Approved Posts</Label>
            <div className="flex gap-2">
              <Input
                value={sampleInput}
                onChange={(e) => setSampleInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addToList(samplePosts, setSamplePosts, sampleInput, setSampleInput))}
                placeholder="Paste an example post..."
                className="text-sm h-8"
              />
              <button
                type="button"
                className="h-8 px-3 rounded-lg text-xs font-semibold gradient-blue text-white border-0 hover:opacity-90 transition-all shadow-sm shadow-blue-500/15 flex items-center gap-1 shrink-0"
                onClick={() => addToList(samplePosts, setSamplePosts, sampleInput, setSampleInput)}
              >
                <Plus className="h-3 w-3" />
                Add
              </button>
            </div>
            {samplePosts.length > 0 && (
              <div className="space-y-1.5">
                {samplePosts.map((p, i) => (
                  <div key={i} className="flex items-start gap-2 p-2 rounded-md border bg-muted/30 text-xs">
                    <span className="flex-1 line-clamp-2">{p}</span>
                    <button type="button" onClick={() => setSamplePosts(samplePosts.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive shrink-0 mt-0.5">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Save */}
          <button
            type="button"
            className="h-10 px-5 rounded-xl text-sm font-semibold gradient-blue text-white border-0 hover:opacity-90 transition-all shadow-lg shadow-blue-500/25 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleSaveProfile}
            disabled={saveProfileMutation.isLoading}
          >
            {saveProfileMutation.isLoading ? (
              <><Loader2 className="h-4 w-4 animate-spin" />Saving...</>
            ) : (
              <><Save className="h-4 w-4" />Save AI Profile</>
            )}
          </button>
          {saveProfileMutation.isSuccess && (
            <p className="text-xs text-green-500">AI Profile saved successfully.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
