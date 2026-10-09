
import React, { useState, useMemo } from 'react';
import { Type } from "@google/genai";
import { Modal } from './Modal';
import { useDialog } from '../../common/DialogProvider';
import type { EditorSettings, IChapter } from '../../../types';
import { SpinnerIcon, CheckCircleIcon, TrashIconOutline, ChevronLeftIcon, ChevronRightIcon, ProofreadIcon } from '../../common/Icons';
import { extractJson } from '../../../utils/common';
import { getAI, hasAPIKey, API_KEY_ERROR } from '../../../utils/ai';
import { AIError } from '../../common/AIError';
import { calculateWordCountFromHtml } from '../../../utils/manuscriptUtils';

interface SpellCheckModalProps {
    settings: EditorSettings;
    chapter: IChapter;
    onClose: () => void;
    onUpdateContent: (content: string) => void;
}

interface SpellCheckItem {
    original: string;
    suggestion: string;
    explanation: string;
    context: string;
    ignored?: boolean;
    accepted?: boolean;
}

export const SpellCheckModal: React.FC<SpellCheckModalProps> = ({ settings, chapter, onClose, onUpdateContent }) => {
    const dialog = useDialog();
    const [hasStarted, setHasStarted] = useState(false);
    const [items, setItems] = useState<SpellCheckItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [processedCount, setProcessedCount] = useState(0);

    const chapterWordCount = useMemo(() => {
        if (chapter.wordCount !== undefined) return chapter.wordCount;
        return calculateWordCountFromHtml(chapter.content);
    }, [chapter.content, chapter.wordCount]);

    const analyzeText = async () => {
        if (!hasAPIKey(settings.geminiApiKey)) {
            setError(API_KEY_ERROR);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError(null);
        setCurrentIndex(0);
        setProcessedCount(0);
        try {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = chapter.content;
            const textContent = tempDiv.innerText;

            if (!textContent.trim()) {
                setItems([]);
                setIsLoading(false);
                return;
            }

            const prompt = `You are a professional copyeditor. Analyze the following text for spelling, grammar, and punctuation errors. Ignore stylistic choices unless they are egregious.
            
            Return a JSON array of objects:
            [{
                "original": "string (exact text found in source)",
                "suggestion": "string (corrected text)",
                "explanation": "string (brief reason)",
                "context": "string (surrounding 5-10 words for identification)"
            }]
            
            If no errors are found, return an empty array.

            Text:
            """
            ${textContent}
            """`;

            const response = await getAI(settings.geminiApiKey).models.generateContent({
                model: 'gemini-3.8-flash',
                contents: prompt,
                config: {
                    responseMimeType: 'application/json',
                    responseSchema: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                original: { type: Type.STRING },
                                suggestion: { type: Type.STRING },
                                explanation: { type: Type.STRING },
                                context: { type: Type.STRING }
                            },
                            required: ['original', 'suggestion', 'explanation', 'context']
                        }
                    }
                }
            });

            const result = extractJson<SpellCheckItem[]>(response.text || '') || [];
            setItems(result);
        } catch (e) {
            console.error(e);
            setError("Failed to analyze text. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleStartProofreading = () => {
        setHasStarted(true);
        analyzeText();
    };

    const applyCorrection = (item: SpellCheckItem) => {
        let newContent = chapter.content;
        
        // Escape special regex characters in the original string
        const escapedOriginal = item.original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        
        try {
            const regex = new RegExp(`${escapedOriginal}(?![^<]*>)`, ''); 
            
            if (newContent.match(regex)) {
                 newContent = newContent.replace(regex, item.suggestion);
                 onUpdateContent(newContent);
                 return true;
            }
        } catch (e) {
            console.warn("Regex failed, falling back to simple replace", e);
            if (newContent.includes(item.original)) {
                newContent = newContent.replace(item.original, item.suggestion);
                onUpdateContent(newContent);
                return true;
            }
        }
        return false;
    };

    const handleAccept = () => {
        const item = items[currentIndex];
        if (!item || item.ignored || item.accepted) return;

        const success = applyCorrection(item);
        if (success) {
            const newItems = [...items];
            newItems[currentIndex] = { ...item, accepted: true };
            setItems(newItems);
            setProcessedCount(c => c + 1);
            if (currentIndex < items.length - 1) setCurrentIndex(currentIndex + 1);
        } else {
            dialog.error("Could not automatically locate the exact text to replace. Please edit manually.", "Correction Failed");
        }
    };

    const handleIgnore = () => {
        const item = items[currentIndex];
        const newItems = [...items];
        newItems[currentIndex] = { ...item, ignored: true };
        setItems(newItems);
        setProcessedCount(c => c + 1);
        if (currentIndex < items.length - 1) setCurrentIndex(currentIndex + 1);
    };

    const formatContext = (context: string, original: string) => {
        if (!context || !original) return context;
        // Case insensitive split for display highlighting
        const parts = context.split(new RegExp(`(${original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
        return parts.map((part, i) => 
            part.toLowerCase() === original.toLowerCase() 
            ? <span key={i} className="font-bold text-red-400 underline decoration-wavy">{part}</span> 
            : <span key={i}>{part}</span>
        );
    };

    const activeItems = items.filter(i => !i.accepted && !i.ignored);
    const currentItem = items[currentIndex];
    const isDone = processedCount === items.length && items.length > 0;

    return (
        <Modal onClose={onClose} settings={settings} title="AI Proofreader" className="max-w-2xl">
            <div className="min-h-[300px] flex flex-col">
                {!hasStarted ? (
                    <div className="flex-grow flex flex-col items-center justify-center text-center p-6 gap-5">
                        <div 
                            className="w-16 h-16 rounded-full flex items-center justify-center shadow-inner"
                            style={{ backgroundColor: `${settings.accentColor || '#4ade80'}20`, color: settings.accentColor || '#4ade80' }}
                        >
                            <ProofreadIcon className="h-8 w-8" />
                        </div>
                        
                        <div className="max-w-md">
                            <h3 className="text-xl font-bold mb-2">Scan Chapter for Copyediting</h3>
                            <p className="text-sm opacity-70 leading-relaxed mb-4">
                                Analyze this chapter with Gemini AI for spelling, punctuation, grammar, and typos. Review every suggestion before applying changes.
                            </p>
                            <div 
                                className="px-4 py-2.5 rounded-lg text-xs font-mono inline-flex items-center gap-3 border"
                                style={{ backgroundColor: settings.toolbarButtonBg, borderColor: settings.toolbarInputBorderColor }}
                            >
                                <span className="font-semibold text-sm">Chapter {chapter.chapterNumber}</span>
                                <span className="opacity-40">•</span>
                                <span className="truncate max-w-[180px]">{chapter.title || 'Untitled Chapter'}</span>
                                <span className="opacity-40">•</span>
                                <span>{chapterWordCount.toLocaleString()} words</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 mt-2">
                            <button
                                onClick={onClose}
                                className="px-5 py-2 rounded-lg text-sm font-medium transition-colors opacity-70 hover:opacity-100"
                                style={{ backgroundColor: settings.toolbarButtonBg, color: settings.toolbarText }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleStartProofreading}
                                disabled={chapterWordCount === 0}
                                className="px-6 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 shadow-lg transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                style={{ backgroundColor: settings.accentColor, color: 'var(--app-text)' }}
                            >
                                <ProofreadIcon className="h-4 w-4" />
                                <span>Start Proofreading</span>
                            </button>
                        </div>
                    </div>
                ) : isLoading ? (
                    <div className="flex-grow flex flex-col items-center justify-center">
                        <SpinnerIcon className="h-8 w-8 mb-4" />
                        <p>Scanning manuscript for errors...</p>
                    </div>
                ) : error ? (
                    <div className="flex-grow flex flex-col items-center justify-center gap-3">
                        <AIError message={error} onDismiss={() => setError(null)} />
                        <div className="flex gap-2 mt-2">
                            <button onClick={analyzeText} className="px-4 py-2 rounded text-xs font-semibold" style={{ backgroundColor: settings.accentColor, color: 'var(--app-text)' }}>Retry Scan</button>
                            <button onClick={onClose} className="px-4 py-2 rounded text-xs font-medium" style={{ backgroundColor: settings.toolbarButtonBg, color: settings.toolbarText }}>Cancel</button>
                        </div>
                    </div>
                ) : items.length === 0 ? (
                    <div className="flex-grow flex flex-col items-center justify-center text-center">
                        <CheckCircleIcon className="h-12 w-12 text-green-500 mb-4" />
                        <h3 className="text-xl font-bold">No Errors Found!</h3>
                        <p className="opacity-70 mt-2">Your manuscript looks clean.</p>
                        <div className="flex gap-3 mt-4">
                            <button onClick={analyzeText} className="px-4 py-2 rounded-md text-sm font-medium" style={{ backgroundColor: settings.toolbarButtonBg, color: settings.toolbarText }}>Scan Again</button>
                            <button onClick={onClose} className="px-4 py-2 rounded-md text-sm font-bold" style={{ backgroundColor: settings.accentColor, color: 'var(--app-text)' }}>Close</button>
                        </div>
                    </div>
                ) : isDone ? (
                     <div className="flex-grow flex flex-col items-center justify-center text-center">
                        <CheckCircleIcon className="h-12 w-12 text-blue-500 mb-4" />
                        <h3 className="text-xl font-bold">Proofreading Complete</h3>
                        <p className="opacity-70 mt-2">You have reviewed all suggestions.</p>
                        <div className="flex gap-3 mt-4">
                            <button onClick={analyzeText} className="px-4 py-2 rounded-md text-sm font-medium" style={{ backgroundColor: settings.toolbarButtonBg, color: settings.toolbarText }}>Scan Again</button>
                            <button onClick={onClose} className="px-4 py-2 rounded-md text-sm font-bold" style={{ backgroundColor: settings.accentColor, color: 'var(--app-text)' }}>Close</button>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col h-full">
                        <div className="flex justify-between items-center mb-4">
                            <div className="flex items-center gap-3">
                                <span className="text-sm opacity-70">Issue {currentIndex + 1} of {items.length}</span>
                                <button 
                                    onClick={analyzeText}
                                    title="Re-scan Chapter"
                                    className="text-xs px-2 py-0.5 rounded opacity-60 hover:opacity-100 transition-opacity"
                                    style={{ backgroundColor: settings.toolbarButtonBg, color: settings.toolbarText }}
                                >
                                    Re-scan
                                </button>
                            </div>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                                    disabled={currentIndex === 0}
                                    className="p-1 rounded disabled:opacity-50"
                                    style={{backgroundColor: settings.toolbarButtonBg}}
                                >
                                    <ChevronLeftIcon />
                                </button>
                                <button 
                                    onClick={() => setCurrentIndex(Math.min(items.length - 1, currentIndex + 1))}
                                    disabled={currentIndex === items.length - 1}
                                    className="p-1 rounded disabled:opacity-50"
                                    style={{backgroundColor: settings.toolbarButtonBg}}
                                >
                                    <ChevronRightIcon />
                                </button>
                            </div>
                        </div>

                        <div className="flex-grow p-6 rounded-lg flex flex-col gap-6 border" style={{ backgroundColor: settings.toolbarButtonBg, borderColor: settings.toolbarInputBorderColor }}>
                            <div>
                                <h4 className="text-xs font-bold uppercase tracking-wider opacity-60 mb-1">Context</h4>
                                <p className="text-sm italic opacity-80">"...{formatContext(currentItem.context, currentItem.original)}..."</p>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-8">
                                <div className="p-3 rounded border border-red-500/30 bg-red-500/10">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-red-400 mb-2">Original</h4>
                                    <p className="text-lg font-medium line-through decoration-red-500/50">{currentItem.original}</p>
                                </div>
                                <div className="p-3 rounded border border-green-500/30 bg-green-500/10">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-green-400 mb-2">Suggestion</h4>
                                    <p className="text-lg font-medium">{currentItem.suggestion}</p>
                                </div>
                            </div>

                            <div>
                                <h4 className="text-xs font-bold uppercase tracking-wider opacity-60 mb-1">Reason</h4>
                                <p className="text-sm">{currentItem.explanation}</p>
                            </div>
                        </div>

                        <div className="flex justify-center gap-4 mt-6">
                            <button 
                                onClick={handleIgnore}
                                className="px-6 py-2 rounded-md flex items-center gap-2"
                                style={{backgroundColor: settings.backgroundColor, color: settings.dangerColor}}
                            >
                                <TrashIconOutline className="h-4 w-4" />
                                Ignore
                            </button>
                            <button 
                                onClick={handleAccept}
                                className="px-6 py-2 rounded-md font-medium flex items-center gap-2 shadow-lg transform active:scale-95 transition-transform"
                                style={{backgroundColor: settings.successColor, color: 'var(--app-text)'}}
                            >
                                <CheckCircleIcon className="h-4 w-4" />
                                Accept Change
                            </button>
                        </div>
                        
                        {(currentItem.accepted || currentItem.ignored) && (
                            <div className="absolute inset-0 bg-black/10 flex items-center justify-center z-10 pointer-events-none">
                                <div className="bg-black/80 px-4 py-2 rounded-full text-sm font-bold" style={{ color: 'var(--app-text)' }}>
                                    {currentItem.accepted ? 'Accepted' : 'Ignored'}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </Modal>
    );
};
