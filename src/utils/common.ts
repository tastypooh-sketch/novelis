export const generateId = (): string => `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

/**
 * Safely extracts a JSON object or array from a string that might contain
 * Markdown code blocks or conversational text.
 */
export const extractJson = <T>(text: string): T | null => {
    if (!text) return null;
    
    // 1. Try direct parsing first (fastest)
    try {
        return JSON.parse(text) as T;
    } catch (e) {
        // Continue to extraction logic
    }

    // 2. Remove Markdown code blocks (e.g., ```json ... ```)
    const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/;
    const codeBlockMatch = text.match(codeBlockRegex);
    if (codeBlockMatch && codeBlockMatch[1]) {
        try {
            return JSON.parse(codeBlockMatch[1]) as T;
        } catch (e) {
            // content inside code blocks might still be dirty, continue
        }
    }

    // 3. Find the first '{' or '[' and the last '}' or ']'
    const firstOpenBrace = text.indexOf('{');
    const firstOpenBracket = text.indexOf('[');
    
    let startIndex = -1;
    let endIndex = -1;

    // Determine if we are looking for an object or an array
    if (firstOpenBrace !== -1 && (firstOpenBracket === -1 || firstOpenBrace < firstOpenBracket)) {
        startIndex = firstOpenBrace;
        endIndex = text.lastIndexOf('}');
    } else if (firstOpenBracket !== -1) {
        startIndex = firstOpenBracket;
        endIndex = text.lastIndexOf(']');
    }

    if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
        const jsonString = text.substring(startIndex, endIndex + 1);
        try {
            return JSON.parse(jsonString) as T;
        } catch (e) {
            console.error("Failed to parse extracted JSON string:", jsonString);
            return null;
        }
    }

    console.error("Could not extract valid JSON from response:", text);
    return null;
};