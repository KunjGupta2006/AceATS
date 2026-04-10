import type { Request, Response, NextFunction } from "express";
import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import mammoth from "mammoth";
import Groq from "groq-sdk";
import dotenv from "dotenv";
const pdfModule = require("pdf-parse");
const pdf = pdfModule.default || pdfModule;
dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

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
    //LOGGING----------------------------------------------------------------------------------------------------------
    console.log("PDF TYPE:", typeof pdf);
    console.log("PDF VALUE:", pdf);
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
You extract structured data from resumes.

Rules:
- Use ONLY information present in the resume
- Do NOT infer or guess
- Do NOT add skills or experience not explicitly mentioned
- check for name usually in the first line,and check for contact details also.
- Return ONLY valid JSON.Do NOT wrap in markdown.Do NOT add any text before or after JSON.

Resume:
${resumeText}

${jobDescription ? `Job:
${jobDescription}` : ""}

Output:
{
  "skills": string[],        // tools, tech, languages explicitly listed
  "education": string[],     // degrees, colleges
  "experience": string[],    // roles with company names if present
  "links": string[],         // URLs only also add hidden links
  "certifications": string[],
  "summary": string          // 2-3 lines based ONLY on resume
  "improvements":string // 2-3 main points to improve the resume
}
`;

  return callGroq(prompt);
};

const calculateATSScore = async (
  resumeText: string,
  jobDescription: string
) => {
const prompt = `
You are an ATS matcher.

Rules:
- Compare resume vs job strictly
- Match ONLY exact or clearly equivalent skills
- Do NOT assume missing skills
- Be conservative in scoring
- Return ONLY valid JSON.Do NOT wrap in markdown.Do NOT add any text before or after JSON.
-Important: Extract required skills from related Job first, then compare.

Resume:
${resumeText}

Job:
${jobDescription}

Output:
{
  "score": number,                 // 0-100 strict match %
  "matchedKeywords": string[],     // exact matches and all skill based keywords used
  "missingKeywords": string[],     // important job skills not found
  "feedback": string              // short actionable improvements
}
  -do not add skills missingkeywords for a job
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

// ANALYZE
app.post("/analyze", async (req, res) => {
  try {
    
    const { resumeText, jobDescription } = req.body;
    if (typeof jobDescription !== "string") {
      return res.status(400).json({ error: "Invalid jobDescription" });
    }
    if (typeof resumeText !== "string") {
      return res.status(400).json({ error: "Invalid resumeText" });
    }

    const data = await analyzeResumeWithAI(resumeText,jobDescription);

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

    if (typeof resumeText !== "string" || typeof jobDescription !== "string")  {
      return res.status(400).json({
        error: "Resume and job description required",
      });
    }

    const [analysis, ats] = await Promise.all([
      analyzeResumeWithAI(resumeText, jobDescription),
      calculateATSScore(resumeText, jobDescription),
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