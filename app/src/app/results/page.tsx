"use client";

import { useMemo, Suspense } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BarChart3,
  ShieldCheck,
  Zap,
  CheckCircle2,
  XCircle,
  AlertCircle,
  TrendingUp,
  Target,
  Star,
  FileText,
  Briefcase,
  Award,
  ChevronRight,
  Loader2,
} from "lucide-react";

// ─── Type Definitions ─────────────────────────────────────────────────────────

type AnalyzeData = {
  overallScore?: number;
  summary?: string;
  strengths?: string[];
  weaknesses?: string[];
  suggestions?: string[];
  skills?: ({ name: string; level?: string } | string)[];
  experience?: string;
  education?: string;
};

type ATSData = {
  atsScore?: number;
  matchedKeywords?: string[];
  missingKeywords?: string[];
  formatScore?: number;
  keywordScore?: number;
  recommendations?: string[];
  verdict?: string;
};

type FullAnalysisData = {
  overallScore?: number;
  atsScore?: number;
  summary?: string;
  strengths?: string[];
  weaknesses?: string[];
  matchedKeywords?: string[];
  missingKeywords?: string[];
  suggestions?: string[];
  fitScore?: number;
  verdict?: string;
};

type ResultData = AnalyzeData | ATSData | FullAnalysisData;

// ─── Score Ring ───────────────────────────────────────────────────────────────

function ScoreRing({
  score,
  size = 100,
  label,
}: {
  score: number;
  size?: number;
  label?: string;
}) {
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 75 ? "#22d3ee" : score >= 50 ? "#facc15" : "#f87171";

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#27272a"
          strokeWidth={6}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={6}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1s ease" }}
        />
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dominantBaseline="central"
          fill="white"
          fontSize={size * 0.22}
          fontWeight="700"
          style={{ transform: "rotate(90deg)", transformOrigin: "center" }}
        >
          {score}
        </text>
      </svg>
      {label && (
        <span className="text-xs text-zinc-500 uppercase tracking-widest">
          {label}
        </span>
      )}
    </div>
  );
}

// ─── Badge ────────────────────────────────────────────────────────────────────

function Badge({
  text,
  variant = "default",
}: {
  text: string;
  variant?: "success" | "danger" | "default";
}) {
  const styles: Record<string, string> = {
    success: "bg-emerald-950 text-emerald-400 border border-emerald-900",
    danger: "bg-red-950 text-red-400 border border-red-900",
    default: "bg-zinc-900 text-zinc-400 border border-zinc-800",
  };
  return (
    <span
      className={`inline-block px-2.5 py-1 rounded-lg text-xs font-medium ${styles[variant]}`}
    >
      {text}
    </span>
  );
}

// ─── Section Card ─────────────────────────────────────────────────────────────

function SectionCard({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="w-full p-5 rounded-2xl bg-zinc-900/40 border border-zinc-800/60">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-1.5 rounded-lg bg-zinc-800">
          <Icon className="w-4 h-4 text-zinc-400" />
        </div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
          {title}
        </h3>
      </div>
      {children}
    </div>
  );
}

// ─── List Item ────────────────────────────────────────────────────────────────

function ListItem({
  text,
  type,
}: {
  text: string;
  type: "success" | "warning" | "info";
}) {
  const icons = {
    success: (
      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
    ),
    warning: <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />,
    info: <ChevronRight className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />,
  };
  return (
    <li className="flex items-start gap-2.5 text-sm text-zinc-300 leading-relaxed py-1">
      {icons[type]}
      <span>{text}</span>
    </li>
  );
}

// ─── View: Analyze ────────────────────────────────────────────────────────────

function AnalyzeView({ data }: { data: AnalyzeData }) {
  return (
    <div className="space-y-5 w-full">
      <div className="flex flex-col md:flex-row gap-4 items-start">
        {data.overallScore !== undefined && (
          <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/60 min-w-[160px]">
            <ScoreRing score={data.overallScore} size={110} label="Overall" />
          </div>
        )}
        {data.summary && (
          <div className="flex-1 p-5 rounded-2xl bg-zinc-900/40 border border-zinc-800/60">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">
              Summary
            </h3>
            <p className="text-sm text-zinc-300 leading-relaxed">{data.summary}</p>
            <div className="flex flex-wrap gap-3 mt-4">
              {data.experience && (
                <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                  <Briefcase className="w-3.5 h-3.5" />
                  {data.experience}
                </div>
              )}
              {data.education && (
                <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                  <Award className="w-3.5 h-3.5" />
                  {data.education}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {data.skills && data.skills.length > 0 && (
        <SectionCard icon={Star} title="Skills Detected">
          <div className="flex flex-wrap gap-2">
            {data.skills.map((skill, i) => (
              <Badge
                key={i}
                text={typeof skill === "string" ? skill : skill.name}
                variant="default"
              />
            ))}
          </div>
        </SectionCard>
      )}

      {data.strengths && data.strengths.length > 0 && (
        <SectionCard icon={TrendingUp} title="Strengths">
          <ul className="space-y-0.5">
            {data.strengths.map((s, i) => (
              <ListItem key={i} text={s} type="success" />
            ))}
          </ul>
        </SectionCard>
      )}

      {data.weaknesses && data.weaknesses.length > 0 && (
        <SectionCard icon={AlertCircle} title="Areas to Improve">
          <ul className="space-y-0.5">
            {data.weaknesses.map((w, i) => (
              <ListItem key={i} text={w} type="warning" />
            ))}
          </ul>
        </SectionCard>
      )}

      {data.suggestions && data.suggestions.length > 0 && (
        <SectionCard icon={Target} title="Suggestions">
          <ul className="space-y-0.5">
            {data.suggestions.map((s, i) => (
              <ListItem key={i} text={s} type="info" />
            ))}
          </ul>
        </SectionCard>
      )}
    </div>
  );
}

// ─── View: ATS ────────────────────────────────────────────────────────────────

function ATSView({ data }: { data: ATSData }) {
  return (
    <div className="space-y-5 w-full">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {data.atsScore !== undefined && (
          <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/60">
            <ScoreRing score={data.atsScore} size={100} label="ATS Score" />
          </div>
        )}
        {data.keywordScore !== undefined && (
          <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/60">
            <ScoreRing score={data.keywordScore} size={100} label="Keywords" />
          </div>
        )}
        {data.formatScore !== undefined && (
          <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/60">
            <ScoreRing score={data.formatScore} size={100} label="Format" />
          </div>
        )}
      </div>

      {data.verdict && (
        <div className="p-5 rounded-2xl bg-zinc-900/40 border border-zinc-800/60">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">
            Verdict
          </h3>
          <p className="text-sm text-zinc-300 leading-relaxed">{data.verdict}</p>
        </div>
      )}

      {data.matchedKeywords && data.matchedKeywords.length > 0 && (
        <SectionCard icon={CheckCircle2} title="Matched Keywords">
          <div className="flex flex-wrap gap-2">
            {data.matchedKeywords.map((kw, i) => (
              <Badge key={i} text={kw} variant="success" />
            ))}
          </div>
        </SectionCard>
      )}

      {data.missingKeywords && data.missingKeywords.length > 0 && (
        <SectionCard icon={XCircle} title="Missing Keywords">
          <div className="flex flex-wrap gap-2">
            {data.missingKeywords.map((kw, i) => (
              <Badge key={i} text={kw} variant="danger" />
            ))}
          </div>
        </SectionCard>
      )}

      {data.recommendations && data.recommendations.length > 0 && (
        <SectionCard icon={Target} title="Recommendations">
          <ul className="space-y-0.5">
            {data.recommendations.map((r, i) => (
              <ListItem key={i} text={r} type="info" />
            ))}
          </ul>
        </SectionCard>
      )}
    </div>
  );
}

// ─── View: Full Analysis ──────────────────────────────────────────────────────

function FullAnalysisView({ data }: { data: FullAnalysisData }) {
  return (
    <div className="space-y-5 w-full">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {data.overallScore !== undefined && (
          <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/60">
            <ScoreRing score={data.overallScore} size={100} label="Overall" />
          </div>
        )}
        {data.atsScore !== undefined && (
          <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/60">
            <ScoreRing score={data.atsScore} size={100} label="ATS" />
          </div>
        )}
        {data.fitScore !== undefined && (
          <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/60">
            <ScoreRing score={data.fitScore} size={100} label="Job Fit" />
          </div>
        )}
      </div>

      {(data.summary || data.verdict) && (
        <div className="p-5 rounded-2xl bg-zinc-900/40 border border-zinc-800/60 space-y-3">
          {data.summary && (
            <>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Summary
              </h3>
              <p className="text-sm text-zinc-300 leading-relaxed">{data.summary}</p>
            </>
          )}
          {data.verdict && (
            <>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mt-3">
                Verdict
              </h3>
              <p className="text-sm text-zinc-300 leading-relaxed">{data.verdict}</p>
            </>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data.strengths && data.strengths.length > 0 && (
          <SectionCard icon={TrendingUp} title="Strengths">
            <ul className="space-y-0.5">
              {data.strengths.map((s, i) => (
                <ListItem key={i} text={s} type="success" />
              ))}
            </ul>
          </SectionCard>
        )}
        {data.weaknesses && data.weaknesses.length > 0 && (
          <SectionCard icon={AlertCircle} title="Weaknesses">
            <ul className="space-y-0.5">
              {data.weaknesses.map((w, i) => (
                <ListItem key={i} text={w} type="warning" />
              ))}
            </ul>
          </SectionCard>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data.matchedKeywords && data.matchedKeywords.length > 0 && (
          <SectionCard icon={CheckCircle2} title="Matched Keywords">
            <div className="flex flex-wrap gap-2">
              {data.matchedKeywords.map((kw, i) => (
                <Badge key={i} text={kw} variant="success" />
              ))}
            </div>
          </SectionCard>
        )}
        {data.missingKeywords && data.missingKeywords.length > 0 && (
          <SectionCard icon={XCircle} title="Missing Keywords">
            <div className="flex flex-wrap gap-2">
              {data.missingKeywords.map((kw, i) => (
                <Badge key={i} text={kw} variant="danger" />
              ))}
            </div>
          </SectionCard>
        )}
      </div>

      {data.suggestions && data.suggestions.length > 0 && (
        <SectionCard icon={Target} title="Action Items">
          <ul className="space-y-0.5">
            {data.suggestions.map((s, i) => (
              <ListItem key={i} text={s} type="info" />
            ))}
          </ul>
        </SectionCard>
      )}
    </div>
  );
}

// ─── Action Meta ──────────────────────────────────────────────────────────────

const ACTION_META = {
  "/analyze": {
    icon: BarChart3,
    label: "Resume Analysis",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
  },
  "/checkats": {
    icon: ShieldCheck,
    label: "ATS Check",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
  },
  "/full-analysis": {
    icon: Zap,
    label: "Full Analysis",
    color: "text-yellow-400",
    bg: "bg-yellow-500/10",
  },
};

type ActionKey = keyof typeof ACTION_META;

// ─── Main Content ─────────────────────────────────────────────────────────────

function ResultsContent() {
  const router = useRouter();

  const { resultData, actionType } = useMemo<{
    resultData: ResultData | null;
    actionType: ActionKey;
  }>(() => {
    try {
      const raw = sessionStorage.getItem("aceats_result");
      const action = sessionStorage.getItem("aceats_action") as ActionKey | null;
      return {
        resultData: raw ? (JSON.parse(raw) as ResultData) : null,
        actionType: action && action in ACTION_META ? action : "/analyze",
      };
    } catch {
      return { resultData: null, actionType: "/analyze" };
    }
  }, []);

  const meta = ACTION_META[actionType];
  const Icon = meta.icon;

  const renderResult = () => {
    if (!resultData) return null;
    if (actionType === "/analyze") return <AnalyzeView data={resultData as AnalyzeData} />;
    if (actionType === "/checkats") return <ATSView data={resultData as ATSData} />;
    if (actionType === "/full-analysis") return <FullAnalysisView data={resultData as FullAnalysisData} />;
    // Fallback inference
    if ("atsScore" in resultData && "overallScore" in resultData)
      return <FullAnalysisView data={resultData as FullAnalysisData} />;
    if ("atsScore" in resultData) return <ATSView data={resultData as ATSData} />;
    return <AnalyzeView data={resultData as AnalyzeData} />;
  };

  return (
    <div className="flex flex-col min-h-screen items-center bg-white dark:bg-[#000000] font-sans text-zinc-900 dark:text-zinc-100 transition-colors duration-300">
      <header className="w-full max-w-5xl py-8 px-6 flex justify-between items-center">
        <h1
          className="text-3xl font-bold tracking-tighter hover:opacity-80 cursor-pointer"
          onClick={() => router.push("/")}
        >
          AceATS
        </h1>
        <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
      </header>

      <main className="flex flex-col items-start w-full max-w-3xl px-6 pb-20 gap-6">
        {/* Back + Title */}
        <div className="flex items-center gap-4 w-full">
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div className="flex items-center gap-2 ml-auto">
            <div className={`p-1.5 rounded-lg ${meta.bg}`}>
              <Icon className={`w-4 h-4 ${meta.color}`} />
            </div>
            <span className="text-sm font-semibold text-zinc-300">{meta.label}</span>
          </div>
        </div>

        {/* Divider */}
        <div className="w-full h-px bg-zinc-800" />

        {/* Result or empty state */}
        {resultData ? (
          renderResult()
        ) : (
          <div className="w-full flex flex-col items-center justify-center py-24 gap-4">
            <FileText className="w-10 h-10 text-zinc-700" />
            <p className="text-zinc-500 text-sm">
              No result data found. Go back and run an analysis.
            </p>
            <button
              onClick={() => router.push("/")}
              className="mt-2 px-5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-zinc-200 hover:bg-zinc-800 transition-all"
            >
              Back to Home
            </button>
          </div>
        )}
      </main>

      <footer className="w-full py-6 border-t border-zinc-900 flex justify-center">
        <p className="text-xs text-zinc-600 tracking-widest uppercase">© 2026 AceATS</p>
      </footer>
    </div>
  );
}

// ─── Page Export ──────────────────────────────────────────────────────────────

export default function ResultsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#000000]">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      }
    >
      <ResultsContent />
    </Suspense>
  );
}