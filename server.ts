import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import cors from "cors";

const app = express();
const PORT = 3000;

app.use(cors({
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow any origin, including null (common for file:// or local scripts)
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-gemini-api-key', 'Origin', 'Accept']
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Shared Gemini Client
const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || "";
const genAI = new GoogleGenAI({
  apiKey: apiKey,
  httpOptions: {
    apiVersion: 'v1beta',
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// API Routes
app.get("/api/health", (req, res) => {
  console.log("Health check requested");
  res.json({ status: "ok" });
});

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - Origin: ${req.headers.origin || 'none'}`);
  next();
});

app.post("/api/gemini/generate", async (req, res) => {
  console.log("Gemini generation requested", { 
    model: req.body.model,
    hasHeaderKey: !!req.headers["x-gemini-api-key"],
    hasBodyContents: !!req.body.contents
  });
  try {
    const headerKey = req.headers["x-gemini-api-key"] as string;
    // Check if the key is explicitly the string "undefined" (can happen if passed from Vite)
    const validHeaderKey = (headerKey && headerKey !== "undefined" && headerKey.length > 5) ? headerKey : null;
    const requestApiKey = validHeaderKey || apiKey;

    console.log("Using API Key (partial):", requestApiKey ? `${requestApiKey.substring(0, 8)}...` : "NONE");

    if (!requestApiKey) {
      return res.status(401).json({ 
        error: "Gemini API key is missing. Please add your API key in the Settings > Secrets panel of AI Studio." 
      });
    }

    // Use a specific genAI instance if a header key is provided, otherwise use the global one
    const activeGenAI = validHeaderKey ? new GoogleGenAI({
      apiKey: validHeaderKey,
      httpOptions: {
        apiVersion: 'v1beta',
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    }) : genAI;

    const { model: modelName, contents, generationConfig, config } = req.body;
    const finalConfig = config || generationConfig;
    
    if (!modelName || !contents) {
      return res.status(400).json({ error: "Model and contents are required" });
    }

    // Map legacy/fake models to valid ones
    const modelMap: Record<string, string> = {
      'gemini-2.0-flash': 'gemini-3.5-flash',
      'gemini-1.5-flash': 'gemini-3.5-flash',
      'gemini-1.5-pro': 'gemini-3.1-pro-preview'
    };
    
    const mappedModel = modelMap[modelName] || 'gemini-3.5-flash';
    
    console.log("Mapped Model:", mappedModel);

    // Ensure contents is an array of Content objects
    let formattedContents = contents;
    if (typeof contents === 'string') {
      formattedContents = [{ role: 'user', parts: [{ text: contents }] }];
    } else if (!Array.isArray(contents)) {
      if (contents && contents.parts) {
        formattedContents = [contents];
      }
    }

    const response = await activeGenAI.models.generateContent({ 
      model: mappedModel,
      contents: formattedContents,
      config: finalConfig 
    });

    res.json({ 
      text: response.text || "", 
      candidates: response.candidates 
    });
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    
    // Check for quota exceeded (429) errors
    const isQuotaExceeded = 
      error.message?.includes("429") || 
      error.message?.includes("RESOURCE_EXHAUSTED") ||
      (error.status === 429);

    if (isQuotaExceeded) {
      return res.status(429).json({ 
        error: "Quota Exceeded: You've reached the limit for the free Gemini API tier. Please wait a minute before trying again, or provide your own Gemini API key in Settings for higher limits." 
      });
    }

    res.status(500).json({ error: error.message || "Internal Server Error" });
  }
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
