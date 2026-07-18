import React from 'react';
import { API_KEY_ERROR } from '../../utils/ai';

interface AIErrorProps {
    message: string | null;
    className?: string;
    onDismiss?: () => void;
}

export const AIError: React.FC<AIErrorProps> = ({ message, className = "text-app-danger text-sm mt-2", onDismiss }) => {
    if (!message) return null;

    const isKeyError = message === API_KEY_ERROR || 
                       message.includes("API Key");
    
    const isQuotaError = message.includes("Quota Exceeded") || message.includes("429");

    return (
        <div className={`${className} bg-app-danger/20 border border-app-danger/30 rounded p-2`}>
            {isKeyError ? (
                <div className="flex flex-col items-center gap-1 text-center">
                    <p>AI features require a Google API Key.</p>
                    <p className="text-xs opacity-80">(Google's Free Tier is usually sufficient.)</p>
                    <a 
                        href="https://aistudio.google.com/app/apikey" 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="underline font-bold hover:text-app-danger-hover mt-1"
                    >
                        Get one here
                    </a>
                </div>
            ) : isQuotaError ? (
                <div className="flex flex-col items-center gap-1 text-center">
                    <p className="font-bold uppercase tracking-wider text-xs">Quota Exceeded</p>
                    <p className="text-sm">{message}</p>
                    <p className="text-xs opacity-80 mt-1 italic">Free tier limits are typically 15-20 requests per minute.</p>
                </div>
            ) : (
                <p className="text-center">{message}</p>
            )}
            {onDismiss && (
                <button onClick={onDismiss} className="text-xs underline mt-2 opacity-80 hover:opacity-100 block mx-auto">
                    Dismiss
                </button>
            )}
        </div>
    );
};