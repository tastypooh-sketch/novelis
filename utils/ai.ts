
import { GoogleGenAI } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;

export const API_KEY_ERROR = "AI features require a configured API Key in the environment.";

export const hasAPIKey = () => {
    // Strictly check environment variable as per requirements
    const envKey = process.env.API_KEY; 
    return !!(envKey && envKey !== 'undefined' && envKey !== '');
};

// Fix: Explicitly return GoogleGenAI to avoid unknown/null issues in calling components
export const getAI = (): GoogleGenAI => {
    // Strictly use the environment variable
    const envKey = process.env.API_KEY; 

    if (!envKey || envKey === 'undefined' || envKey === '') {
        console.warn("Novelis: No API Key found in environment. AI features will be disabled.");
        // Return instance with dummy key to prevent crash on initialization, 
        // but actual AI calls will fail gracefully with a 400 error.
        return new GoogleGenAI({ apiKey: "MISSING_KEY" }); 
    }

    // Reuse instance if key hasn't changed (though env vars are static usually)
    if (!aiInstance) {
        aiInstance = new GoogleGenAI({ apiKey: envKey });
    }

    return aiInstance;
};
