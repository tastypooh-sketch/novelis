
export const API_KEY_ERROR = "AI features require a configured API Key. Please check your settings.";

export const hasAPIKey = (settingsKey?: string) => {
    // Check if key is provided in settings or if we're in an environment that might have it
    return !!settingsKey || true; // Still return true as fallback for server-side env vars
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
                        throw bridgeErr;
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
                        
                        const errToThrow = new Error(errorMessage);
                        (errToThrow as any).originalError = lastError;
                        throw errToThrow;
                    }
                    
                    return await response.json();
                } catch (e: any) {
                    console.error("AI Request Failed Details:", e);

                    // Final catch-all for Quota errors if they aren't already formatted
                    if (e.message?.includes("429") || e.message?.includes("RESOURCE_EXHAUSTED")) {
                        throw new Error("Quota Exceeded: You've reached the free Gemini API tier limit. Please wait about 30-60 seconds before trying again, or use your own API key in Settings for higher limits.");
                    }

                    const isFetchError = e.message === 'Failed to fetch' || e.name === 'TypeError' || (e.originalError && (e.originalError.message === 'Failed to fetch' || e.originalError.name === 'TypeError'));
                    
                    if (isFetchError) {
                        const isLocalFile = window.location.protocol === 'file:' || !window.location.origin || window.location.origin === 'null';
                        const targetUrl = isLocalFile ? "http://127.0.0.1:3000/api/gemini/generate" : `${window.location.origin}/api/gemini/generate`;
                        throw new Error(`Connection Failed: Unable to reach the backend at ${targetUrl}.\n\nDebug Info:\n- Origin: ${window.location.origin}\n- Protocol: ${window.location.protocol}\n- Error: ${e.message}\n\nPlease ensure the Novelis server is running.`);
                    }
                    throw e;
                }
            }
        }
    } as any;
};
