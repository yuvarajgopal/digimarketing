import OpenAI from "openai";

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!client) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
}

// ─── Client Context ──────────────────────────────────────────────

export interface ClientContext {
  name: string;
  company?: string;
  industry?: string;
  brandVoice?: string;
  guidelines?: string;
  targetAudience?: string;
  competitors?: string[];
  forbiddenWords?: string[];
  samplePosts?: string[];
}

function buildContextBlock(ctx?: ClientContext): string {
  if (!ctx) return "";
  const parts: string[] = [];
  parts.push(`Client: ${ctx.name}${ctx.company ? ` (${ctx.company})` : ""}`);
  if (ctx.industry) parts.push(`Industry: ${ctx.industry}`);
  if (ctx.brandVoice) parts.push(`Brand Voice: ${ctx.brandVoice}`);
  if (ctx.guidelines) parts.push(`Brand Guidelines: ${ctx.guidelines}`);
  if (ctx.targetAudience) parts.push(`Target Audience: ${ctx.targetAudience}`);
  if (ctx.competitors?.length) parts.push(`Competitors: ${ctx.competitors.join(", ")}`);
  if (ctx.forbiddenWords?.length) parts.push(`Forbidden Words/Phrases: ${ctx.forbiddenWords.join(", ")}`);
  if (ctx.samplePosts?.length) parts.push(`Example approved posts:\n${ctx.samplePosts.map((p, i) => `${i + 1}. ${p}`).join("\n")}`);
  return `\n\n--- CLIENT CONTEXT ---\n${parts.join("\n")}`;
}

function parseJsonArray(raw: string): any[] | null {
  try {
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch { /* fallback */ }
  return null;
}

function parseJsonObject(raw: string): Record<string, any> | null {
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch { /* fallback */ }
  return null;
}

// ─── Existing: Post Content Generation ───────────────────────────

export async function generatePostContent(
  prompt: string,
  mediaType: "image" | "video",
  platforms: string[],
  clientCtx?: ClientContext,
): Promise<string> {
  const openai = getClient();

  const platformList = platforms.length > 0 ? platforms.join(", ") : "social media";
  const systemPrompt = `You are a social media content writer for a digital marketing agency. Write engaging post content for ${platformList}. The post will include ${mediaType === "video" ? "a video" : "an image"}. Keep the text concise, engaging, and platform-appropriate. Include relevant hashtags. Return only the post text, no explanations.${buildContextBlock(clientCtx)}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt },
    ],
    max_tokens: 500,
    temperature: 0.8,
  });

  return response.choices[0]?.message?.content?.trim() || "";
}

// ─── Existing: Post Variants ─────────────────────────────────────

export interface PostVariant {
  content: string;
  tone: string;
  platform?: string;
}

export async function generatePostVariants(
  seedContent: string,
  platforms: string[],
  count: number = 4,
  clientCtx?: ClientContext,
): Promise<PostVariant[]> {
  const openai = getClient();

  const platformList = platforms.length > 0 ? platforms.join(", ") : "social media";
  const tones = ["Professional", "Casual", "Bold", "Playful", "Inspirational"];
  const selectedTones = tones.slice(0, count);

  const systemPrompt = `You are an expert social media copywriter for a digital marketing agency. Given an ad copy, generate ${count} distinct variations with different tones. Keep the same core message but vary the style, wording, and hashtags. Target platforms: ${platformList}.

Return ONLY a JSON array with objects having "content", "tone", and "platform" fields. Example:
[{"content":"...", "tone":"Professional", "platform":"FACEBOOK"}]

Use these tones: ${selectedTones.join(", ")}${buildContextBlock(clientCtx)}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Generate ${count} variations of this ad copy:\n\n${seedContent}` },
    ],
    max_tokens: 2000,
    temperature: 0.9,
  });

  const raw = response.choices[0]?.message?.content?.trim() || "[]";
  const parsed = parseJsonArray(raw);
  if (parsed) {
    return parsed.map((v: any) => ({
      content: String(v.content || ""),
      tone: String(v.tone || "Variation"),
      platform: v.platform ? String(v.platform) : platforms[0],
    }));
  }
  return [{ content: raw, tone: "Variation", platform: platforms[0] }];
}

// ─── Existing: Generate from Brief ───────────────────────────────

export async function generateFromBrief(brief: {
  objective: string;
  audience: string;
  tone: string;
  keyMessage: string;
  guidelines?: string;
  platforms: string[];
  count?: number;
}, clientCtx?: ClientContext): Promise<PostVariant[]> {
  const openai = getClient();
  const count = brief.count || 3;

  const systemPrompt = `You are an expert social media copywriter. Generate ${count} ad copy variants based on the creative brief below. Each variant should match the brief's tone and objective while remaining distinct.

Return ONLY a JSON array with objects having "content", "tone", and "platform" fields.${buildContextBlock(clientCtx)}`;

  const briefText = `
Objective: ${brief.objective}
Target Audience: ${brief.audience}
Tone: ${brief.tone}
Key Message / CTA: ${brief.keyMessage}
${brief.guidelines ? `Brand Guidelines: ${brief.guidelines}` : ""}
Target Platforms: ${brief.platforms.join(", ")}
`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: briefText },
    ],
    max_tokens: 2000,
    temperature: 0.9,
  });

  const raw = response.choices[0]?.message?.content?.trim() || "[]";
  const parsed = parseJsonArray(raw);
  if (parsed) {
    return parsed.map((v: any) => ({
      content: String(v.content || ""),
      tone: String(v.tone || brief.tone),
      platform: v.platform ? String(v.platform) : brief.platforms[0],
    }));
  }
  return [{ content: raw, tone: brief.tone, platform: brief.platforms[0] }];
}

// ─── Feature 2: AI Analytics Insights ────────────────────────────

export interface AnalyticsInsight {
  title: string;
  insight: string;
  recommendation: string;
  priority: "high" | "medium" | "low";
}

export async function generateAnalyticsInsights(
  metricsData: Record<string, any>[],
  clientCtx?: ClientContext,
): Promise<AnalyticsInsight[]> {
  const openai = getClient();

  const systemPrompt = `You are a senior digital marketing analyst at an agency. Analyze the following social media metrics data and provide actionable insights. Focus on trends, anomalies, and opportunities.

Return ONLY a JSON array with objects having "title", "insight", "recommendation", and "priority" (high/medium/low) fields. Generate 3-5 insights.${buildContextBlock(clientCtx)}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Analyze this metrics data:\n${JSON.stringify(metricsData, null, 2)}` },
    ],
    max_tokens: 2000,
    temperature: 0.5,
  });

  const raw = response.choices[0]?.message?.content?.trim() || "[]";
  const parsed = parseJsonArray(raw);
  if (parsed) {
    return parsed.map((v: any) => ({
      title: String(v.title || "Insight"),
      insight: String(v.insight || ""),
      recommendation: String(v.recommendation || ""),
      priority: (["high", "medium", "low"].includes(v.priority) ? v.priority : "medium") as "high" | "medium" | "low",
    }));
  }
  return [{ title: "Analysis", insight: raw, recommendation: "Review data manually.", priority: "medium" }];
}

// ─── Feature 3: AI Report Narrator ───────────────────────────────

export async function generateReportNarrative(
  reportData: Record<string, any>,
  reportType: string,
  dateRange: { from: string; to: string },
  clientCtx?: ClientContext,
): Promise<string> {
  const openai = getClient();

  const systemPrompt = `You are a senior digital marketing strategist writing an executive summary for a client report. Write a clear, professional narrative that interprets the data, highlights wins, identifies concerns, and provides forward-looking recommendations. Use specific numbers from the data. Keep it 3-5 paragraphs.${buildContextBlock(clientCtx)}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Report type: ${reportType}\nPeriod: ${dateRange.from} to ${dateRange.to}\n\nData:\n${JSON.stringify(reportData, null, 2)}` },
    ],
    max_tokens: 1500,
    temperature: 0.6,
  });

  return response.choices[0]?.message?.content?.trim() || "";
}

// ─── Feature 5: Smart Scheduling ─────────────────────────────────

export interface PostingTimeSlot {
  day: string;
  time: string;
  platform: string;
  score: number;
  reason: string;
}

export async function suggestBestPostingTimes(
  metricsData: Record<string, any>[],
  platforms: string[],
  clientCtx?: ClientContext,
): Promise<PostingTimeSlot[]> {
  const openai = getClient();

  const systemPrompt = `You are a social media scheduling expert. Based on the engagement metrics data provided, suggest the best posting times for each platform. Consider day of week, time of day, and historical engagement patterns.

Return ONLY a JSON array with objects having "day" (e.g. "Monday"), "time" (e.g. "14:00"), "platform", "score" (1-100), and "reason" fields. Suggest 2-3 slots per platform.${buildContextBlock(clientCtx)}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Platforms: ${platforms.join(", ")}\n\nEngagement data:\n${JSON.stringify(metricsData, null, 2)}` },
    ],
    max_tokens: 1500,
    temperature: 0.4,
  });

  const raw = response.choices[0]?.message?.content?.trim() || "[]";
  const parsed = parseJsonArray(raw);
  if (parsed) {
    return parsed.map((v: any) => ({
      day: String(v.day || ""),
      time: String(v.time || ""),
      platform: String(v.platform || ""),
      score: Number(v.score) || 50,
      reason: String(v.reason || ""),
    }));
  }
  return [];
}

// ─── Feature 6: A/B Copy Generator (Hook Variants) ──────────────

export interface ABVariant {
  content: string;
  hook: string;
  hookType: "question" | "statistic" | "emotion" | "testimonial" | "bold_claim";
  platform?: string;
}

export async function generateABVariants(
  seedContent: string,
  platforms: string[],
  count: number = 4,
  clientCtx?: ClientContext,
): Promise<ABVariant[]> {
  const openai = getClient();

  const platformList = platforms.length > 0 ? platforms.join(", ") : "social media";
  const hookTypes = ["question", "statistic", "emotion", "testimonial", "bold_claim"];

  const systemPrompt = `You are an A/B testing specialist for social media ads. Given ad copy, generate ${count} variants, each using a different opening hook strategy. The core message stays the same but the hook (first line) changes dramatically.

Hook types to use: ${hookTypes.slice(0, count).join(", ")}

Return ONLY a JSON array with objects having "content" (full post text), "hook" (just the opening line), "hookType" (one of: question, statistic, emotion, testimonial, bold_claim), and "platform" fields. Target platforms: ${platformList}.${buildContextBlock(clientCtx)}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Generate A/B hook variants for:\n\n${seedContent}` },
    ],
    max_tokens: 2000,
    temperature: 0.9,
  });

  const raw = response.choices[0]?.message?.content?.trim() || "[]";
  const parsed = parseJsonArray(raw);
  if (parsed) {
    return parsed.map((v: any) => ({
      content: String(v.content || ""),
      hook: String(v.hook || ""),
      hookType: hookTypes.includes(v.hookType) ? v.hookType : "question",
      platform: v.platform ? String(v.platform) : platforms[0],
    }));
  }
  return [];
}

// ─── Feature 7: Lead Scoring ─────────────────────────────────────

export interface LeadScore {
  leadId: string;
  score: number;
  reasoning: string;
  tier: "hot" | "warm" | "cold";
}

export async function scoreLeads(
  leads: Array<{ id: string; name?: string; email?: string; company?: string; source?: string; data?: any }>,
  clientCtx?: ClientContext,
): Promise<LeadScore[]> {
  const openai = getClient();

  const systemPrompt = `You are a lead scoring specialist. Score each lead from 0-100 based on quality signals: source platform, completeness of info, company presence, and engagement indicators. Higher = more likely to convert.

Return ONLY a JSON array with objects having "leadId", "score" (0-100), "reasoning" (brief), and "tier" ("hot" for 70+, "warm" for 40-69, "cold" for 0-39).${buildContextBlock(clientCtx)}`;

  const leadsText = leads.map(l => `ID: ${l.id} | Name: ${l.name || "N/A"} | Email: ${l.email || "N/A"} | Company: ${l.company || "N/A"} | Source: ${l.source || "N/A"} | Data: ${l.data ? JSON.stringify(l.data) : "N/A"}`).join("\n");

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Score these leads:\n${leadsText}` },
    ],
    max_tokens: 2000,
    temperature: 0.3,
  });

  const raw = response.choices[0]?.message?.content?.trim() || "[]";
  const parsed = parseJsonArray(raw);
  if (parsed) {
    return parsed.map((v: any) => ({
      leadId: String(v.leadId || ""),
      score: Math.min(100, Math.max(0, Number(v.score) || 0)),
      reasoning: String(v.reasoning || ""),
      tier: (["hot", "warm", "cold"].includes(v.tier) ? v.tier : v.score >= 70 ? "hot" : v.score >= 40 ? "warm" : "cold") as "hot" | "warm" | "cold",
    }));
  }
  return [];
}

// ─── Feature 9: Content Repurposing ──────────────────────────────

export interface RepurposedPost {
  platform: string;
  content: string;
  format: string;  // e.g. "thread", "carousel", "story", "short_video_script"
  notes: string;
}

export async function repurposeContent(
  longContent: string,
  platforms: string[],
  clientCtx?: ClientContext,
): Promise<RepurposedPost[]> {
  const openai = getClient();

  const systemPrompt = `You are a content repurposing specialist. Take the long-form content below and break it into platform-optimized social media posts. Adapt the tone, length, and format for each platform.

For each platform, choose the best format:
- Twitter/X: Thread (multiple tweets) or single tweet
- Instagram: Carousel caption, story script, or reel script
- Facebook: Engaging post with CTA
- LinkedIn: Professional thought-leadership post
- YouTube: Short video script or community post
- TikTok: Short video script with hook

Return ONLY a JSON array with objects having "platform", "content" (the actual post text), "format" (e.g. "thread", "carousel", "story", "reel_script", "post"), and "notes" (tips for the content manager).${buildContextBlock(clientCtx)}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Repurpose for ${platforms.join(", ")}:\n\n${longContent}` },
    ],
    max_tokens: 3000,
    temperature: 0.7,
  });

  const raw = response.choices[0]?.message?.content?.trim() || "[]";
  const parsed = parseJsonArray(raw);
  if (parsed) {
    return parsed.map((v: any) => ({
      platform: String(v.platform || ""),
      content: String(v.content || ""),
      format: String(v.format || "post"),
      notes: String(v.notes || ""),
    }));
  }
  return [];
}

// ─── Feature 10: AI Creative Brief Generator ─────────────────────

export interface GeneratedBrief {
  objective: string;
  audience: string;
  tone: string;
  keyMessage: string;
  suggestedPlatforms: string[];
  contentThemes: string[];
  reasoning: string;
}

export async function generateCreativeBrief(
  recentMetrics: Record<string, any>[],
  recentPosts: Array<{ content: string; platforms: string[]; status: string }>,
  clientCtx?: ClientContext,
): Promise<GeneratedBrief> {
  const openai = getClient();

  const systemPrompt = `You are a creative director at a digital marketing agency. Based on the client's recent performance data and post history, generate a creative brief for their next content push. Consider what's working, what's not, and current marketing trends.

Return ONLY a JSON object with: "objective", "audience", "tone", "keyMessage", "suggestedPlatforms" (array), "contentThemes" (array of 3-5 themes), and "reasoning" (why you chose this direction).${buildContextBlock(clientCtx)}`;

  const context = `Recent metrics:\n${JSON.stringify(recentMetrics.slice(0, 10), null, 2)}\n\nRecent posts:\n${recentPosts.slice(0, 5).map(p => `[${p.platforms.join(",")}] ${p.status}: ${p.content.slice(0, 200)}`).join("\n")}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: context },
    ],
    max_tokens: 1500,
    temperature: 0.7,
  });

  const raw = response.choices[0]?.message?.content?.trim() || "{}";
  const parsed = parseJsonObject(raw);
  if (parsed) {
    return {
      objective: String(parsed.objective || ""),
      audience: String(parsed.audience || ""),
      tone: String(parsed.tone || ""),
      keyMessage: String(parsed.keyMessage || ""),
      suggestedPlatforms: Array.isArray(parsed.suggestedPlatforms) ? parsed.suggestedPlatforms.map(String) : [],
      contentThemes: Array.isArray(parsed.contentThemes) ? parsed.contentThemes.map(String) : [],
      reasoning: String(parsed.reasoning || ""),
    };
  }
  return { objective: "", audience: "", tone: "", keyMessage: "", suggestedPlatforms: [], contentThemes: [], reasoning: raw };
}

// ─── Feature 4: Campaign Planner ─────────────────────────────────

export interface CampaignPost {
  day: number;
  date: string;
  platform: string;
  contentAngle: string;
  suggestedCopy: string;
  visualDirection: string;
  time: string;
}

export interface CampaignPlan {
  name: string;
  strategy: string;
  posts: CampaignPost[];
  budgetSplit: Record<string, number>;
  kpis: string[];
}

export async function generateCampaignPlan(input: {
  objective: string;
  duration: number; // days
  budget?: number;
  platforms: string[];
  notes?: string;
}, clientCtx?: ClientContext): Promise<CampaignPlan> {
  const openai = getClient();

  const systemPrompt = `You are a campaign strategist at a digital marketing agency. Create a detailed content calendar for a social media campaign. Plan specific posts across platforms with posting times, content angles, and visual direction.

Return ONLY a JSON object with:
- "name": campaign name
- "strategy": 2-3 sentence strategy summary
- "posts": array of {"day" (1-based), "date" (YYYY-MM-DD starting from today), "platform", "contentAngle", "suggestedCopy", "visualDirection", "time" (HH:MM)}
- "budgetSplit": object mapping platform to percentage (e.g. {"FACEBOOK": 40, "INSTAGRAM": 60})
- "kpis": array of KPI strings to track

Plan 1-2 posts per day across the platforms.${buildContextBlock(clientCtx)}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Plan a ${input.duration}-day campaign.\nObjective: ${input.objective}\nPlatforms: ${input.platforms.join(", ")}\n${input.budget ? `Budget: $${input.budget}` : ""}\n${input.notes ? `Notes: ${input.notes}` : ""}` },
    ],
    max_tokens: 4000,
    temperature: 0.7,
  });

  const raw = response.choices[0]?.message?.content?.trim() || "{}";
  const parsed = parseJsonObject(raw);
  if (parsed) {
    return {
      name: String(parsed.name || "Campaign"),
      strategy: String(parsed.strategy || ""),
      posts: Array.isArray(parsed.posts) ? parsed.posts.map((p: any) => ({
        day: Number(p.day) || 1,
        date: String(p.date || ""),
        platform: String(p.platform || ""),
        contentAngle: String(p.contentAngle || ""),
        suggestedCopy: String(p.suggestedCopy || ""),
        visualDirection: String(p.visualDirection || ""),
        time: String(p.time || "12:00"),
      })) : [],
      budgetSplit: typeof parsed.budgetSplit === "object" ? parsed.budgetSplit : {},
      kpis: Array.isArray(parsed.kpis) ? parsed.kpis.map(String) : [],
    };
  }
  return { name: "Campaign", strategy: raw, posts: [], budgetSplit: {}, kpis: [] };
}

// ─── Feature 8: Competitor Analysis ──────────────────────────────

export interface CompetitorInsight {
  competitor: string;
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  suggestedResponse: string;
}

export async function analyzeCompetitors(
  competitors: string[],
  industry: string,
  clientCtx?: ClientContext,
): Promise<CompetitorInsight[]> {
  const openai = getClient();

  const systemPrompt = `You are a competitive intelligence analyst for a digital marketing agency. For each competitor, provide a brief SWOT-style analysis focused on their likely social media and digital marketing approach. Suggest how the client can differentiate.

Return ONLY a JSON array with objects having "competitor", "strengths" (array), "weaknesses" (array), "opportunities" (array), and "suggestedResponse" (actionable strategy).${buildContextBlock(clientCtx)}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Industry: ${industry}\nCompetitors to analyze: ${competitors.join(", ")}` },
    ],
    max_tokens: 2500,
    temperature: 0.6,
  });

  const raw = response.choices[0]?.message?.content?.trim() || "[]";
  const parsed = parseJsonArray(raw);
  if (parsed) {
    return parsed.map((v: any) => ({
      competitor: String(v.competitor || ""),
      strengths: Array.isArray(v.strengths) ? v.strengths.map(String) : [],
      weaknesses: Array.isArray(v.weaknesses) ? v.weaknesses.map(String) : [],
      opportunities: Array.isArray(v.opportunities) ? v.opportunities.map(String) : [],
      suggestedResponse: String(v.suggestedResponse || ""),
    }));
  }
  return [];
}

// ─── Feature 11: Brand Voice Consistency Checker ─────────────────

export interface BrandCheckResult {
  score: number; // 0-100
  issues: Array<{ type: string; detail: string; suggestion: string }>;
  overallFeedback: string;
  approved: boolean;
}

export async function checkBrandConsistency(
  content: string,
  clientCtx: ClientContext,
): Promise<BrandCheckResult> {
  const openai = getClient();

  const systemPrompt = `You are a brand compliance reviewer. Check if the given content matches the client's brand voice and guidelines. Flag any violations: wrong tone, forbidden words, off-brand messaging, missing elements, or platform policy concerns.

Return ONLY a JSON object with:
- "score": 0-100 (100 = perfectly on-brand)
- "issues": array of {"type" (e.g. "tone", "forbidden_word", "guideline_violation"), "detail", "suggestion"}
- "overallFeedback": one-sentence summary
- "approved": boolean (true if score >= 70 and no critical issues)${buildContextBlock(clientCtx)}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Check this content:\n\n${content}` },
    ],
    max_tokens: 1000,
    temperature: 0.3,
  });

  const raw = response.choices[0]?.message?.content?.trim() || "{}";
  const parsed = parseJsonObject(raw);
  if (parsed) {
    return {
      score: Math.min(100, Math.max(0, Number(parsed.score) || 0)),
      issues: Array.isArray(parsed.issues) ? parsed.issues.map((i: any) => ({
        type: String(i.type || ""),
        detail: String(i.detail || ""),
        suggestion: String(i.suggestion || ""),
      })) : [],
      overallFeedback: String(parsed.overallFeedback || ""),
      approved: Boolean(parsed.approved),
    };
  }
  return { score: 0, issues: [], overallFeedback: raw, approved: false };
}
