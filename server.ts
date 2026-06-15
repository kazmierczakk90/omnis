import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// API Routes
app.post("/api/gemini/process-knowledge", async (req, res) => {
  try {
    const { input, context } = req.body;
    
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `You are Omnis, a personal knowledge agent. 
      Analyze the following input and extract key facts, insights, or information to be stored in a "knowledge base".
      Provide the output in JSON format with title, category, content, and importance (1-5).
      
      User Input: "${input}"
      Previous Context: ${JSON.stringify(context || [])}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            category: { type: Type.STRING, description: "e.g., Personal, Work, Learning, Idea, etc." },
            content: { type: Type.STRING },
            importance: { type: Type.INTEGER },
            tags: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["title", "category", "content", "importance", "tags"]
        }
      }
    });

    res.json(JSON.parse(response.text || "{}"));
  } catch (error: any) {
    console.error("Gemini Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/gemini/query", async (req, res) => {
  try {
    const { query, knowledgeBase } = req.body;
    
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `You are Omnis. Using the following knowledge base, answer the user's query.
      If the information is not in the knowledge base, say you don't know yet but will remember if they tell you.
      
      Knowledge Base: ${JSON.stringify(knowledgeBase)}
      Query: "${query}"`,
      config: {
        systemInstruction: "Answer concisely and helpfully as a personal assistant."
      }
    });

    res.json({ text: response.text });
  } catch (error: any) {
    console.error("Gemini Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Vite middleware for development
async function setupVite() {
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

setupVite();
