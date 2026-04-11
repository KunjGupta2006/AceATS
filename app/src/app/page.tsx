"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileText, BarChart3, ShieldCheck, X, Briefcase, Loader2, Zap } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const removeFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleAction = async (actionEndpoint: "/analyze" | "/checkats" | "/full-analysis") => {
    if (!file) return;

    setIsLoading(actionEndpoint);

    try {
      // STEP 1: Parse the Resume
      const formData = new FormData();
      formData.append("resume", file);

      const parseRes = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/userresume`, {
        method: "POST",
        body: formData,
      });

      if (!parseRes.ok) throw new Error("Failed to parse resume file");
      const parseData = await parseRes.json();
      const cleanedText = parseData.data.cleanedText;

      // STEP 2: Send to AI Endpoint
      const aiRes = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}${actionEndpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeText: cleanedText,
          jobDescription: jobDescription || "General Analysis",
        }),
      });

      if (!aiRes.ok) throw new Error(`AI Analysis failed at ${actionEndpoint}`);

      const finalData = await aiRes.json();

      // STEP 3: Navigate to results page with data in query params
const raw = finalData.data;

let normalized: Record<string, unknown> = {};

if (actionEndpoint === "/analyze") {
  const analysis = raw.analysis ?? raw; // fallback to raw itself
  normalized = {
    overallScore: analysis.score,
    summary: analysis.summary,
    skills: analysis.skills ?? [],
    strengths: Array.isArray(analysis.experience) ? analysis.experience : [],
    weaknesses: analysis.improvements ? [analysis.improvements] : [],
    suggestions: analysis["suggested jobs"]
      ? [`Suggested roles: ${analysis["suggested jobs"]}`]
      : [],
    education: Array.isArray(analysis.education)
      ? analysis.education.join(", ")
      : analysis.education,
    experience: Array.isArray(analysis.experience)
      ? analysis.experience.join(", ")
      : analysis.experience,
  };
} else if (actionEndpoint === "/checkats") {
  const ats = raw.ats ?? raw; // fallback to raw itself if no .ats wrapper
  normalized = {
    atsScore: ats.score,
    matchedKeywords: ats.matchedKeywords ?? [],
    missingKeywords: ats.missingKeywords ?? [],
    recommendations: ats.feedback ? [ats.feedback] : [],
    verdict: ats.feedback,
  };
} else if (actionEndpoint === "/full-analysis") {
  normalized = {
    overallScore: raw.analysis?.score,
    atsScore: raw.ats?.score,
    summary: raw.analysis?.summary,
    strengths: Array.isArray(raw.analysis?.experience)
      ? raw.analysis.experience
      : [],
    weaknesses: raw.analysis?.improvements
      ? [raw.analysis.improvements]
      : [],
    matchedKeywords: raw.ats?.matchedKeywords ?? [],
    missingKeywords: raw.ats?.missingKeywords ?? [],
    suggestions: raw.analysis?.["suggested jobs"]
      ? [`Suggested roles: ${raw.analysis["suggested jobs"]}`]
      : [],
    verdict: raw.ats?.feedback,
  };
}

sessionStorage.setItem("aceats_result", JSON.stringify(normalized));
sessionStorage.setItem("aceats_action", actionEndpoint);
router.push("/results");
    } catch (error) {
      console.error("Action Error:", error);
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <div className="flex flex-col min-h-screen items-center bg-white dark:bg-[#000000] font-sans text-zinc-900 dark:text-zinc-100 transition-colors duration-300">
      <header className="w-full max-w-5xl py-8 px-6 flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tighter hover:opacity-80 cursor-pointer">
          AceATS
        </h1>
        <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse"></div>
      </header>

      <main className="flex flex-col items-center justify-center flex-1 w-full max-w-3xl px-6 pb-20 gap-8">
        <div className="text-center">
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 bg-clip-text text-transparent bg-gradient-to-b from-zinc-100 to-zinc-500">
            Optimize Your Career.
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400 text-lg">
            Compare your resume against specific job requirements.
          </p>
        </div>

        <div className="w-full space-y-8">
          <div className="w-full space-y-2">
            <div className="flex items-center gap-2 mb-2 text-zinc-400">
              <Briefcase className="w-4 h-4" />
              <label className="text-sm font-medium uppercase tracking-wider">Job Description</label>
            </div>
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the job description here to check for keyword matching..."
              className="w-full h-32 p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 outline-none transition-all resize-none text-sm leading-relaxed"
            />
          </div>

          <div className="w-full group">
            <div className={`relative border-2 border-dashed rounded-2xl p-10 transition-all duration-200 flex flex-col items-center justify-center
              ${file
                ? "border-blue-500/40 bg-blue-400/5"
                : "border-zinc-800 hover:border-zinc-600 hover:bg-zinc-700/30"}`}>

              <input
                ref={fileInputRef}
                type="file"
                name="resume"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                accept=".pdf,.doc,.docx"
              />

              {!file ? (
                <>
                  <div className="p-4 rounded-full bg-zinc-900 mb-4 group-hover:scale-110 transition-transform">
                    <Upload className="w-6 h-6 text-zinc-400" />
                  </div>
                  <p className="text-sm font-medium">Click or drag to upload resume</p>
                  <p className="text-xs text-zinc-500 mt-2">PDF, DOCX up to 10MB</p>
                </>
              ) : (
                <div className="flex items-center gap-4 w-full max-w-sm bg-zinc-900 p-4 rounded-xl border border-zinc-800 relative z-20">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <FileText className="w-6 h-6 text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-zinc-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  <button
                    type="button"
                    onClick={removeFile}
                    className="p-1.5 hover:bg-zinc-800 rounded-md transition-colors cursor-pointer group/btn"
                  >
                    <X className="w-4 h-4 text-zinc-500 group-hover/btn:text-red-400" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
            <button
              onClick={() => handleAction("/analyze")}
              disabled={!file || isLoading !== null}
              className="flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 border border-zinc-800 text-zinc-100 font-bold rounded-xl hover:bg-sky-500 transition-all disabled:opacity-80">
              {isLoading === "/analyze" ? <Loader2 className="w-4 h-4 animate-spin" /> : <BarChart3 className="w-4 h-4" />}
              Analyze
            </button>

            <button
              onClick={() => handleAction("/checkats")}
              disabled={!file || !jobDescription || isLoading !== null}
              className="flex items-center justify-center gap-2 py-3 px-4 bg-zinc-800 border border-zinc-800 text-zinc-100 font-bold rounded-xl hover:bg-zinc-600 transition-all disabled:opacity-80">
              {isLoading === "/checkats" ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              Check ATS
            </button>

            <button
              onClick={() => handleAction("/full-analysis")}
              disabled={!file || !jobDescription || isLoading !== null}
              className="flex items-center justify-center gap-2 py-3 px-4 bg-zinc-200 text-black font-bold rounded-xl hover:bg-zinc-50 transition-all shadow-lg disabled:opacity-80">
              {isLoading === "/full-analysis" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              Full Analysis
            </button>
          </div>
        </div>
      </main>

      <footer className="w-full py-6 border-t border-zinc-900 flex justify-center">
        <p className="text-xs text-zinc-600 tracking-widest uppercase">© 2026 AceATS</p>
      </footer>
    </div>
  );
}