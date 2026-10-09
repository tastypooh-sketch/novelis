import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import cors from "cors";

async function startServer() {
  const app = express();
  const PORT = 3000;

  console.log(`Starting server in ${process.env.NODE_ENV} mode`);

  app.use(cors({
    origin: true,
    credentials: true,
  }));
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Shared Gemini Client
  const serverApiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || "";

  app.post("/api/gemini/generate", async (req, res) => {
    try {
      const headerKey = req.headers["x-gemini-api-key"] as string;
      const validHeaderKey = (headerKey && headerKey !== "undefined" && headerKey.length > 5) ? headerKey : null;
      const requestApiKey = validHeaderKey || serverApiKey;

      if (!requestApiKey) {
        return res.status(401).json({ error: "API key missing" });
      }

      const activeGenAI = new GoogleGenAI({ apiKey: requestApiKey });
      const { model: modelName, contents, config } = req.body;
      
      let mappedModel = 'gemini-3.8-flash';
      if (config?.responseModalities?.includes('AUDIO') || config?.speechConfig) {
        mappedModel = 'gemini-3.8-flash-tts';
      } else if (modelName === 'gemini-1.5-pro' || (typeof modelName === 'string' && modelName.includes('pro'))) {
        mappedModel = 'gemini-3.1-pro-preview';
      } else {
        mappedModel = 'gemini-3.8-flash';
      }

      const response = await activeGenAI.models.generateContent({
        model: mappedModel,
        contents,
        config,
      });

      res.json({ 
        text: response.text || "", 
        candidates: response.candidates,
      });
    } catch (error: any) {
      console.error("Gemini API Error:", error);
      res.status(500).json({ error: error.message || "Internal Server Error" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    console.log("Initializing Vite dev middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Serving static production assets...");
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
