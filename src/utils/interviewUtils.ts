import { getAI } from "./ai";
import { ICharacter } from "../types";

export const getCharacterInterviewResponse = async (
  apiKey: string,
  character: ICharacter,
  userMessage: string,
  history: { role: 'user' | 'model'; parts: { text: string }[] }[]
): Promise<string> => {
  if (!apiKey) throw new Error("API Key required for character interview.");

  const systemPrompt = `You are playing the role of the character "${character.name}" for the author.
  
  CHARACTER PROFILE:
  ${character.profile}
  
  SUMMARY:
  ${character.summary}
  
  TAGLINE:
  ${character.tagline}
  
  KEYWORDS:
  ${character.keywords?.join(", ")}
  
  Your goal is to respond to the author in-character, using your unique voice, perspective, and knowledge as defined in your profile.
  If the author asks about something not defined in your profile, improvise in a way that is consistent with your character's established traits and world.
  Keep responses relatively concise but deeply characteristic.`;

  try {
    const response = await getAI(apiKey).models.generateContent({
      model: "gemini-1.5-flash",
      contents: [
        { role: 'user', parts: [{ text: systemPrompt }] },
        ...history,
        { role: 'user', parts: [{ text: userMessage }] }
      ]
    });

    return response.text || "I... I'm not sure what to say.";
  } catch (error: any) {
    console.error("Character Interview Failed:", error);
    throw error;
  }
};
