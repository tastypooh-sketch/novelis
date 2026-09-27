
export const API_KEY_ERROR = "AI features require a configured API Key. Please check your settings.";

export const hasAPIKey = (settingsKey?: string) => {
    // Check if key is provided in settings or if we're in an environment that might have it
    return !!settingsKey || true; // Still return true as fallback for server-side env vars
};

export const translateAIError = (error: any): string => {
    const message = typeof error === 'string' ? error : (error.message || '');
    
    if (message.includes("503") || message.includes("Service Unavailable") || message.includes("high demand")) {
        return "The AI is currently experiencing high demand. Please try again in a few moments.";
    }
    
    if (message.includes("429") || message.includes("RESOURCE_EXHAUSTED") || message.includes("Quota Exceeded")) {
        return "You've reached the free tier limit. Please wait about 30-60 seconds, or add your own API key in Settings for higher limits.";
    }
    
    if (message.includes("504") || message.includes("408") || message.includes("deadline exceeded") || message.includes("Timeout")) {
        return "The request timed out. The manuscript segment might be too long, or the connection is unstable.";
    }
    
    if (message.includes("SAFETY") || message.includes("blocked by safety settings")) {
        return "The AI declined this request due to safety filters. Try rephrasing your notes or content.";
    }
    
    if (message.includes("API_KEY_INVALID") || message.includes("invalid API key") || message.includes("401") || message.includes("Unauthorized")) {
        return "The provided API Key is invalid or unauthorized. Please check your settings.";
    }
    
    if (message.includes("Failed to fetch") || message.includes("Network Error") || message.includes("Connection Failed")) {
        return "Connection failed. Please ensure the Novelis server is running and you have internet access.";
    }

    return message || "An unexpected AI error occurred.";
};

// Fix: Proxy Gemini calls to the server and pass the user's API key if available
export const getAI = (settingsKey?: string) => {
    return {
        models: {
            generateContent: async (params: any) => {
                const headers: Record<string, string> = {
                    "Content-Type": "application/json",
                };
                
                // Only pass if it's a real-looking key (not "undefined" string from Vite)
                if (settingsKey && settingsKey !== 'undefined') {
                    headers["x-gemini-api-key"] = settingsKey;
                } else {
                    // Try to get it from process.env if Vite defined it
                    const envKey = (process as any).env?.API_KEY;
                    if (envKey && envKey !== 'undefined') {
                        headers["x-gemini-api-key"] = envKey;
                    }
                }

                // --- ELECTRON BRIDGE CHECK ---
                if ((window as any).electronAPI?.callAI) {
                    console.log("Using Electron IPC Bridge for AI request");
                    try {
                        return await (window as any).electronAPI.callAI(params, headers);
                    } catch (bridgeErr: any) {
                        console.error("Electron Bridge AI Request Failed:", bridgeErr);
                        throw new Error(translateAIError(bridgeErr));
                    }
                }

                try {
                    // Determine the best base URL for the API
                    let baseUrl = "";
                    
                    const isLocalFile = window.location.protocol === 'file:' || !window.location.origin || window.location.origin === 'null';
                    
                    if (isLocalFile) {
                        // Use 127.0.0.1 directly as it is more robust than 'localhost' on many systems
                        baseUrl = "http://127.0.0.1:3000";
                    } else {
                        baseUrl = window.location.origin;
                    }
                    
                    const url = `${baseUrl}/api/gemini/generate`;
                    console.log(`AI Requesting: ${url} (Protocol: ${window.location.protocol}, Origin: ${window.location.origin})`);
                    
                    let response: Response | null = null;
                    let lastError: any = null;
                    const maxRetries = 3;

                    for (let i = 0; i < maxRetries; i++) {
                        try {
                            response = await fetch(url, {
                                method: "POST",
                                headers,
                                body: JSON.stringify(params),
                            });
                            if (response.ok) break;
                            
                            console.warn(`AI attempt ${i + 1} returned status ${response.status}. Retrying...`);
                            await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
                        } catch (fetchErr: any) {
                            lastError = fetchErr;
                            console.warn(`AI attempt ${i + 1} fetch failed: ${fetchErr.message}. Retrying...`);
                            await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
                        }
                    }
                    
                    if (!response || !response.ok) {
                        let errorMessage = "Failed to generate content";
                        if (response) {
                            try {
                                const err = await response.json();
                                errorMessage = err.error || errorMessage;
                            } catch (parseError) {
                                errorMessage = `Server Error: ${response.status} ${response.statusText}`;
                            }
                        } else if (lastError) {
                            errorMessage = `Network Error: ${lastError.message}`;
                        }
                        
                        throw new Error(translateAIError(errorMessage));
                    }
                    
                    return await response.json();
                } catch (e: any) {
                    console.error("AI Request Failed Details:", e);
                    throw new Error(translateAIError(e));
                }
            }
        }
    } as any;
};
