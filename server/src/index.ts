import type { Request, Response, NextFunction } from "express";
import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import mammoth from "mammoth";
import Groq from "groq-sdk";
import dotenv from "dotenv";
import cors from "cors";
const pdfModule = require("pdf-parse");
const pdf = pdfModule.default || pdfModule;
dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

// ================== MIDDLEWARE ==================
app.use(cors());
app.use(express.json());

// ================== GROQ SETUP ==================
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const GROQ_MODEL = "llama-3.1-8b-instant";

// ================== UPLOAD SETUP ==================
const uploadsDir = "uploads";

const initializeApp = async () => {
  await fs.mkdir(uploadsDir, { recursive: true });
};

const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowedMimeTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];

  const allowedExtensions = [".pdf", ".doc", ".docx"];
  const ext = path.extname(file.originalname).toLowerCase();

  if (
    allowedMimeTypes.includes(file.mimetype) &&
    allowedExtensions.includes(ext)
  ) {
    cb(null, true);
  } else {
    cb(new Error("Only PDF, DOC, DOCX files are allowed"));
  }
};

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (_req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, "");
    cb(null, `${Date.now()}-${safeName}`);
  },
});

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

// ================== UTIL FUNCTIONS ==================

const extractTextFromFile = async (
  filePath: string,
  mimeType: string
): Promise<string> => {
  if (mimeType === "application/pdf") {
    const buffer = await fs.readFile(filePath);
    const data = await pdf(buffer);
    return data.text;
  }

  if (
    mimeType === "application/msword" ||
    mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  }

  throw new Error("Unsupported file type");
};

const cleanText = (text: string): string => {
  return text.replace(/\s+/g, " ").trim();
};

interface BasicResume {
  email: string | null;
  phone: string | null;
  name: string | null;
}

const extractBasicFields = (text: string): BasicResume => {
  const email =
    text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)?.[0] || null;

  const phone =
    text.match(
      /(?:\+?\d{1,3}[\s-]?)?\d{10,14}/
    )?.[0] || null;

  const name =
    text.match(/^([A-Z][a-z]+(?:\s[A-Z][a-z]+)+)/)?.[0] || null;

  return { email, phone, name };
};

// ================== AI HELPER ==================

const callGroq = async (prompt: string) => {
  const response = await groq.chat.completions.create({
    model: GROQ_MODEL,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.2,
  });

  const text = response.choices?.[0]?.message?.content;

  if (!text) {
    throw new Error("Empty AI response");
  }

  // Extract JSON block
  const jsonMatch = text.match(/\{[\s\S]*\}/);

  if (!jsonMatch) {
    console.error("RAW AI RESPONSE:", text);
    throw new Error("No JSON found in AI response");
  }

  try {
    return JSON.parse(jsonMatch[0]);
  } catch (err) {
    console.error("INVALID JSON:", jsonMatch[0]);
    throw new Error("Invalid JSON from AI");
  }
};

// ================== AI FUNCTIONS ==================

const analyzeResumeWithAI = async (
  resumeText: string,
  jobDescription?: string
) => {
  const prompt = `
You are an expert resume parser and career analyst with 15+ years of experience in technical recruiting and talent acquisition. Your task is to extract and analyze structured data from the provided resume with surgical precision.

EXTRACTION RULES:
- Extract ONLY information explicitly present in the resume text
- Do NOT infer, hallucinate, or add anything not directly stated
- Preserve exact terminology used by the candidate (e.g. "React.js" not "React")
- For links: extract ALL URLs including mailto:, linkedin.com, github.com, portfolio sites, and any hyperlinked text
- For name: look at the very first line or topmost prominent text
- For contact: scan for phone numbers, emails, LinkedIn, GitHub, location
- For experience: include role title + company + duration if present
- For skills: include programming languages, frameworks, tools, platforms, methodologies
- Return ONLY raw valid JSON. No markdown. No backticks. No explanation. No text before or after.

RESUME:
${resumeText}

${jobDescription ? `TARGET JOB DESCRIPTION:\n${jobDescription}` : ""}

OUTPUT SCHEMA:
{
  "name": string,                  // full name from top of resume, empty string if not found
  "contact": {
    "email": string,               // email address or empty string
    "phone": string,               // phone number or empty string
    "location": string             // city/country or empty string
  },
  "links": string[],               // ALL URLs, emails as mailto, LinkedIn, GitHub, portfolio
  "skills": string[],              // every explicitly listed tool, language, framework, platform
  "education": string[],           // format: "Degree, Institution, Year" — only what is stated
  "experience": string[],          // format: "Role at Company (Duration)" — only what is stated
  "certifications": string[],      // certifications or courses explicitly listed, empty array if none
  "summary": string,               // 2-3 sentence professional summary derived STRICTLY from resume content
  "improvements": string[],        // exactly 3 specific, actionable resume improvement suggestions
  "suggestedRoles": string[],      // 4-6 job titles that match the candidate's demonstrated skill set
  "experienceLevel": string        // "Fresher" | "Junior" | "Mid-Level" | "Senior" | "Lead/Principal"
}
`;

  return callGroq(prompt);
};


const calculateATSScore = async (
  resumeText: string,
  jobDescription: string
) => {
  const prompt = `
You are a senior ATS (Applicant Tracking System) engine and technical recruiter with deep expertise in resume-to-job matching. Your scoring must reflect how a real ATS system would evaluate this candidate.

SCORING METHODOLOGY:
1. First, extract ALL required and preferred skills, tools, qualifications, and keywords from the job description
2. Categorize them as: REQUIRED (must-have) vs PREFERRED (nice-to-have)
3. Scan the resume for exact matches and clearly equivalent terms (e.g. "Node" = "Node.js", "Mongo" = "MongoDB")
4. Weight required skills more heavily than preferred skills
5. Penalize for missing required qualifications
6. Be conservative — do NOT award points for vague or implied matches
7. Return ONLY raw valid JSON. No markdown. No backticks. No explanation. No text before or after.

RESUME:
${resumeText}

JOB DESCRIPTION:
${jobDescription}

OUTPUT SCHEMA:
{
  "score": number,                    // 0-100 integer. 90-100: exceptional, 70-89: strong, 50-69: moderate, below 50: weak
  "matchedKeywords": string[],        // skills/tools/qualifications found in BOTH resume and job description
  "missingKeywords": string[],        // important skills from the job description absent in the resume,do not take missing skills that are present in resume
  "requiredMissing": string[],        // subset of missingKeywords that are explicitly REQUIRED in the job
  "preferredMissing": string[],       // subset of missingKeywords that are PREFERRED but not required
  "verdict": string,                  // one of: "Strong Match" | "Good Match" | "Partial Match" | "Weak Match"
  "feedback": string,                 // 2-3 sentences: what's working, what's missing, one concrete action to improve
  "keywordDensity": number            // % of job keywords found in resume, 0-100 integer
}
`;

  return callGroq(prompt);
};

// ================== ROUTES ==================

app.get("/", (_req, res) => {
  res.send("Server working fine..");
});

// UPLOAD + PARSE
app.post("/userresume", upload.single("resume"), async (req, res) => { 
  let filePath: string | undefined;

  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    filePath = req.file.path;

    const rawText = await extractTextFromFile(
      filePath,
      req.file.mimetype
    );

    const cleanedText = cleanText(rawText);
    const basic = extractBasicFields(cleanedText);

    res.json({
      success: true,
      data: {
        fileName: req.file.originalname,
        email: basic.email,
        phone: basic.phone,
        name: basic.name,
        cleanedText,
      },
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Processing failed",
    });
  } finally {
    if (filePath) {
      await fs.unlink(filePath).catch(() => {});
    }
  }
});

// ANALYZE (Job Description is optional here)
app.post("/analyze", async (req, res) => {
  try {
    const { resumeText, jobDescription } = req.body;
    
    // Validate resumeText
    if (typeof resumeText !== "string" || !resumeText.trim()) {
      return res.status(400).json({ error: "Valid resumeText is required" });
    }

    // jobDescription is optional for basic analysis, but if provided, validate it
    const cleanJobDesc = typeof jobDescription === "string" ? jobDescription.trim() : undefined;

    const data = await analyzeResumeWithAI(resumeText, cleanJobDesc);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Analysis failed",
    });
  }
});

// CHECK ATS 
app.post("/checkats", async (req, res) => {
  try {
    const { resumeText, jobDescription } = req.body;
    
    if (typeof resumeText !== "string" || !resumeText.trim()) {
      return res.status(400).json({ error: "Valid resumeText is required" });
    }
    if (typeof jobDescription !== "string" || !jobDescription.trim()) {
      return res.status(400).json({ error: "Valid jobDescription is required for ATS Check" });
    }

    const data = await calculateATSScore(resumeText, jobDescription.trim());
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Analysis failed",
    });
  }
});

// FULL ANALYSIS
app.post("/full-analysis", async (req, res) => {
  try {
    const { resumeText, jobDescription } = req.body;

    if (typeof resumeText !== "string" || !resumeText.trim()) {
      return res.status(400).json({ error: "Valid resumeText is required" });
    }
    
    if (typeof jobDescription !== "string" || !jobDescription.trim()) {
      return res.status(400).json({ error: "Valid jobDescription is required for Full Analysis" });
    }

    const cleanResumeText = resumeText.trim();
    const cleanJobDesc = jobDescription.trim();

    const [analysis, ats] = await Promise.all([
      analyzeResumeWithAI(cleanResumeText, cleanJobDesc),
      calculateATSScore(cleanResumeText, cleanJobDesc),
    ]);

    res.json({
      success: true,
      data: { analysis, ats },
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed",
    });
  }
});

// ================== ERROR HANDLER ==================

app.use(
  (err: Error, _req: Request, res: Response, _next: NextFunction) => {
    res.status(500).json({
      error: err.message || "Internal server error",
    });
  }
);

// ================== SERVER ==================

initializeApp().then(() => {
  app.listen(PORT, () => {
    console.log(`SERVER RUNNING ON PORT: ${PORT}`);
  });
}).catch(console.error);