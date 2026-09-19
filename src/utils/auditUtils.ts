import { Type } from "@google/genai";
import { getAI } from "./ai";
import { IChapter, ICharacter, IWorldItem, ConsistencyIssue } from "../types";
import { generateId } from "./common";

const auditSchema = {
  type: Type.OBJECT,
  properties: {
    issues: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          type: { type: Type.STRING, description: "One of: Character, World, Plot, Timeline" },
          severity: { type: Type.STRING, description: "One of: High, Medium, Low" },
          description: { type: Type.STRING, description: "Detailed description of the narrative contradiction." },
          suggestion: { type: Type.STRING, description: "How the author might fix this consistency error." },
          relatedEntityIds: { type: Type.ARRAY, items: { type: Type.STRING }, description: "IDs of entities involved (Character IDs, Chapter IDs, etc.)" }
        },
        required: ["type", "severity", "description", "suggestion", "relatedEntityIds"]
      }
    }
  },
  required: ["issues"]
};

export const runNarrativeAudit = async (
  apiKey: string,
  chapters: IChapter[],
  characters: ICharacter[],
  worldItems: IWorldItem[]
): Promise<ConsistencyIssue[]> => {
  if (!apiKey) throw new Error("API Key required for narrative audit.");

  // Prepare context - using summaries to keep it within token limits for a broad audit
  const chapterContext = chapters.map(c => `Chapter ${c.chapterNumber} ("${c.title}"): ${c.summary}`).join("\n");
  const characterContext = characters.map(c => `Character "${c.name}": ${c.summary}\nFull Profile: ${c.profile}`).join("\n---\n");
  const worldContext = worldItems.map(i => `${i.type} "${i.name}": ${i.summary}`).join("\n");

  const prompt = `You are a professional narrative editor. Analyze the following novel data for continuity errors, character contradictions, or world-building inconsistencies.
  
  CHAPTER SUMMARIES:
  ${chapterContext}
  
  CHARACTER PROFILES:
  ${characterContext}
  
  WORLD BUILDING:
  ${worldContext}
  
  Search for:
  1. Character contradictions (e.g., changes in eye color, personality shifts that aren't justified, historical facts about the character that change).
  2. World-building errors (e.g., a city being in the north in Ch 1 and south in Ch 5).
  3. Plot holes (e.g., a character being in two places at once).
  4. Timeline errors.
  
  Return a list of specific issues found. If no issues are found, return an empty array for 'issues'.`;

  try {
    const response = await getAI(apiKey).models.generateContent({
      model: "gemini-1.5-pro",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: auditSchema
      }
    });

    const data = JSON.parse(response.text || '{"issues": []}');
    return (data.issues || []).map((issue: any) => ({
      ...issue,
      id: generateId()
    }));
  } catch (error: any) {
    console.error("Narrative Audit Failed:", error);
    throw error;
  }
};
