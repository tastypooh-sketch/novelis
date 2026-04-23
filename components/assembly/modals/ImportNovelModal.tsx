
import React, { useState, useRef, useEffect } from 'react';
import { Type } from "@google/genai";
import { Modal } from '../../manuscript/modals/Modal';
import type { EditorSettings, IChapter, ICharacter, IWorldItem } from '../../../types';
import { generateId, extractJson } from '../../../utils/common';
import { SpinnerIcon, SparklesIconOutline, TrashIconOutline, CheckCircleIcon, ImportIcon } from '../../common/Icons';
import { useNovelDispatch, useNovelState } from '../../../NovelContext';
import { generateInitialChapterRtf, smartQuotes, parseNoveSync } from '../../../utils/manuscriptUtils';
import { getAI, hasAPIKey, API_KEY_ERROR } from '../../../utils/ai';
import { AIError } from '../../common/AIError';

interface ImportNovelModalProps {
    settings: EditorSettings;
    onClose: () => void;
    directoryHandle: FileSystemDirectoryHandle | null;
}

interface DetectedChapter {
    id: string;
    title: string;
    content: string;
}

export const ImportNovelModal: React.FC<ImportNovelModalProps> = ({ settings, onClose, directoryHandle }) => {
    const dispatch = useNovelDispatch();
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [importType, setImportType] = useState<'text' | 'zip' | null>(null);
    const [text, setText] = useState('');
    const [splitRegex, setSplitRegex] = useState<string>(`(?:^|\\n)(?:CHAPTER|Chapter|PROLOGUE|Prologue|EPILOGUE|Epilogue)\\s*(?:\\d+|[A-Z]+)?(?:[^\\n]*)(?=\\n|$)`);
    const [detectedChapters, setDetectedChapters] = useState<DetectedChapter[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const zipInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const content = event.target?.result as string;
                if (content) {
                    // Convert straight quotes to smart quotes immediately upon import
                    const formattedContent = smartQuotes(content);
                    setText(formattedContent);
                    setImportType('text');
                }
            };
            reader.readAsText(file);
        }
    };

    const handleZipUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setIsProcessing(true);
            setError(null);
            setProgress('Parsing project data...');
            try {
                const parsed = await parseNoveSync(file);
                if (parsed && parsed.state) {
                    dispatch({ type: 'LOAD_PROJECT', payload: parsed.state });
                    // If settings are present in the zip, we could apply them too, 
                    // but the modal doesn't have access to setSettings. 
                    // For now, loading the project state is the priority.
                    setStep(3);
                } else {
                    setError("Could not find valid project data in this ZIP file.");
                }
            } catch (err) {
                console.error(err);
                setError("Failed to parse ZIP file. Ensure it is a valid Nové export.");
            } finally {
                setIsProcessing(false);
            }
        }
    };

    const handleDetectChapters = () => {
        if (!text.trim()) return;
        try {
            const regex = new RegExp(splitRegex, 'gim');
            // Explicitly cast to avoid TS errors with optional index on RegExpMatchArray
            const matches = Array.from(text.matchAll(regex)) as RegExpMatchArray[];
            
            const chapters: DetectedChapter[] = [];
            
            if (matches.length === 0) {
                // If no chapters found, treat as one big chapter or fail?
                // Let's just add the whole text as "Chapter 1"
                chapters.push({
                    id: generateId(),
                    title: "Imported Manuscript",
                    content: text
                });
            } else {
                let lastIndex = 0;
                matches.forEach((match, index) => {
                    if (match.index === undefined) return; // Safety check
                    
                    const startIndex = match.index;
                    const title = match[0].trim();
                    
                    // Capture text from this match until next match or end of string
                    const nextMatch = matches[index + 1];
                    const nextMatchIndex = (nextMatch && nextMatch.index !== undefined) ? nextMatch.index : text.length;
                    const content = text.substring(startIndex + match[0].length, nextMatchIndex).trim();
                    
                    if (content.length > 0) {
                        chapters.push({
                            id: generateId(),
                            title: title.length > 50 ? "Chapter " + (index + 1) : title, // Safety for weird regex matches
                            content: `<div>${content.replace(/\r?\n/g, '</div><div>')}</div>` // Basic HTML conversion
                        });
                    }
                });
            }
            
            setDetectedChapters(chapters);
            setStep(2);
        } catch (e) {
            setError("Invalid Regular Expression.");
        }
    };

    const handleAIProcessing = async () => {
        if (!hasAPIKey()) {
            setError(API_KEY_ERROR);
            return;
        }

        setIsProcessing(true);
        setError(null);
        
        try {
            const newChapters: IChapter[] = [];
            const allCharacters: ICharacter[] = [];
            const allWorldItems: IWorldItem[] = [];
            
            // 1. Process Chapters (Batch summaries to save tokens? Doing individually for quality)
            // Limit to first 50 chapters to prevent timeout/rate limits in this demo context if massive.
            const chaptersToProcess = detectedChapters; 
            
            const chapterSummaries: string[] = [];

            for (let i = 0; i < chaptersToProcess.length; i++) {
                const ch = chaptersToProcess[i];
                setProgress(`Analyzing Chapter ${i + 1}/${chaptersToProcess.length}...`);
                
                // Generate Summary & Metadata
                const prompt = `Analyze this chapter text. Return JSON:
                {
                    "summary": "1-2 sentence summary",
                    "outline": "Brief bulleted outline",
                    "analysis": "Conflict and tension analysis",
                    "keywords": ["keyword1", "keyword2", "keyword3"]
                }
                Text: ${ch.content.substring(0, 15000)}... (truncated)`; // Truncate for token safety

                const response = await getAI().models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: prompt,
                    config: { responseMimeType: 'application/json' }
                });
                
                const metadata = extractJson<{ summary: string, outline: string, analysis: string, keywords: string[] }>(response.text || '');
                
                // Helper to ensure string
                const ensureString = (val: any) => {
                    if (typeof val === 'string') return val;
                    if (Array.isArray(val)) return val.join('\n');
                    return val ? String(val) : '';
                };

                const newChapter: IChapter = {
                    id: ch.id,
                    chapterNumber: i + 1,
                    title: ch.title,
                    content: ch.content,
                    notes: '',
                    rawNotes: '',
                    summary: ensureString(metadata?.summary),
                    outline: ensureString(metadata?.outline),
                    analysis: ensureString(metadata?.analysis),
                    keywords: Array.isArray(metadata?.keywords) ? metadata!.keywords.map(String) : [],
                    photo: null,
                    isPhotoLocked: false,
                    tagline: '',
                    location: '',
                    conflict: '',
                    chapterGoal: '',
                    wordCount: ch.content.split(/\s+/).length,
                };
                newChapters.push(newChapter);
                chapterSummaries.push(`Chapter ${i+1}: ${ensureString(metadata?.summary)}`);
            }

            // 2. Aggregate Entities (Characters & World)
            setProgress("Synthesizing Story Bible...");
            const aggregationPrompt = `Based on these chapter summaries, identify the main characters and key world-building elements (locations, organizations, objects).
            
            Summaries:
            ${chapterSummaries.join('\n')}
            
            Return JSON:
            {
                "characters": [
                    { "name": "Name", "role": "Role in story", "summary": "Brief description" }
                ],
                "worldItems": [
                    { "name": "Name", "type": "Location/Lore/Object/Organization", "description": "Brief description" }
                ]
            }`;

            const aggResponse = await getAI().models.generateContent({
                model: 'gemini-2.5-flash',
                contents: aggregationPrompt,
                config: { responseMimeType: 'application/json' }
            });

            const aggData = extractJson<{ 
                characters: { name: string, role: string, summary: string }[], 
                worldItems: { name: string, type: string, description: string }[] 
            }>(aggResponse.text || '');

            if (aggData) {
                aggData.characters.forEach(c => {
                    allCharacters.push({
                        id: generateId(),
                        name: c.name,
                        rawNotes: `Role: ${c.role}\nSummary: ${c.summary}`,
                        summary: c.summary,
                        profile: '',
                        imageColor: '#6b7280'
                    });
                });
                
                aggData.worldItems.forEach(w => {
                    allWorldItems.push({
                        id: generateId(),
                        name: w.name,
                        type: (['Location', 'Lore', 'Object', 'Organization', 'Concept'].includes(w.type) ? w.type : 'Concept') as any,
                        rawNotes: w.description,
                        summary: w.description,
                        description: '',
                        imageColor: '#6b7280'
                    });
                });
            }

            // 3. Update State
            dispatch({ type: 'SET_CHAPTERS', payload: newChapters });
            dispatch({ type: 'SET_CHARACTERS', payload: allCharacters });
            dispatch({ type: 'SET_WORLD_ITEMS', payload: allWorldItems });

            // 4. File System Write (if available)
            if (directoryHandle) {
                setProgress("Saving files...");
                for (const ch of newChapters) {
                    const rtfContent = generateInitialChapterRtf(ch);
                    const fileName = `${ch.title}-${ch.chapterNumber}.rtf`;
                    try {
                        const fileHandle = await directoryHandle.getFileHandle(fileName, { create: true });
                        const writable = await fileHandle.createWritable();
                        await writable.write(rtfContent);
                        await writable.close();
                    } catch (e) {
                        console.error("Failed to save chapter file", e);
                    }
                }
            }

            setStep(3);
        } catch (e) {
            console.error(e);
            setError("An error occurred during processing. Please try again.");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <Modal onClose={onClose} settings={settings} title="Import Novel" className="max-w-3xl">
            <div className="space-y-6">
                {/* Progress Stepper */}
                <div className="flex items-center justify-center mb-6">
                    <div className={`flex items-center ${step >= 1 ? 'text-blue-500' : 'text-gray-500'}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step >= 1 ? 'border-blue-500 bg-blue-500 text-white' : 'border-gray-500'}`}>1</div>
                        <span className="ml-2 text-sm font-medium">Input</span>
                    </div>
                    <div className={`w-12 h-1 mx-4 ${step >= 2 ? 'bg-blue-500' : 'bg-gray-700'}`}></div>
                    <div className={`flex items-center ${step >= 2 ? 'text-blue-500' : 'text-gray-500'}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step >= 2 ? 'border-blue-500 bg-blue-500 text-white' : 'border-gray-500'}`}>2</div>
                        <span className="ml-2 text-sm font-medium">Review Split</span>
                    </div>
                    <div className={`w-12 h-1 mx-4 ${step >= 3 ? 'bg-blue-500' : 'bg-gray-700'}`}></div>
                    <div className={`flex items-center ${step >= 3 ? 'text-blue-500' : 'text-gray-500'}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step >= 3 ? 'border-blue-500 bg-blue-500 text-white' : 'border-gray-500'}`}>3</div>
                        <span className="ml-2 text-sm font-medium">Finish</span>
                    </div>
                </div>

                {step === 1 && (
                    <div className="space-y-6">
                        {/* Import Options */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <button 
                                onClick={() => zipInputRef.current?.click()}
                                className="flex flex-col items-center justify-center p-6 rounded-xl border-2 border-dashed transition-all hover:bg-white/5 group"
                                style={{ borderColor: settings.toolbarInputBorderColor }}
                            >
                                <div className="p-3 rounded-full bg-blue-500/20 text-blue-400 mb-3 group-hover:scale-110 transition-transform">
                                    <ImportIcon className="h-8 w-8" />
                                </div>
                                <h4 className="font-bold">Import from Nové (.zip)</h4>
                                <p className="text-xs opacity-60 text-center mt-1">Load a full project backup including characters and world notes.</p>
                                <input 
                                    type="file" 
                                    ref={zipInputRef} 
                                    onChange={handleZipUpload} 
                                    accept=".zip" 
                                    className="hidden" 
                                />
                            </button>

                            <button 
                                onClick={() => { setImportType('text'); fileInputRef.current?.click(); }}
                                className="flex flex-col items-center justify-center p-6 rounded-xl border-2 border-dashed transition-all hover:bg-white/5 group"
                                style={{ borderColor: settings.toolbarInputBorderColor }}
                            >
                                <div className="p-3 rounded-full bg-purple-500/20 text-purple-400 mb-3 group-hover:scale-110 transition-transform">
                                    <SparklesIconOutline className="h-8 w-8" />
                                </div>
                                <h4 className="font-bold">Import Manuscript (.txt)</h4>
                                <p className="text-xs opacity-60 text-center mt-1">Import a raw text file and use AI to reconstruct your project.</p>
                                <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    onChange={handleFileUpload} 
                                    accept=".txt,.md" 
                                    className="hidden" 
                                />
                            </button>
                        </div>

                        {isProcessing && importType === 'zip' && (
                            <div className="text-center py-4">
                                <SpinnerIcon className="h-8 w-8 mx-auto mb-2" />
                                <p className="font-semibold">{progress}</p>
                            </div>
                        )}

                        {(importType === 'text' || text.trim()) && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                <div className="flex justify-between items-center">
                                    <h4 className="text-sm font-bold uppercase tracking-wider opacity-50">Manuscript Content</h4>
                                    <button onClick={() => { setText(''); setImportType(null); }} className="text-xs text-red-400 hover:underline">Clear</button>
                                </div>
                                
                                <textarea
                                    value={text}
                                    onChange={e => { setText(e.target.value); setImportType('text'); }}
                                    placeholder="Paste manuscript text here..."
                                    className="w-full h-64 p-3 rounded-md border bg-transparent text-sm font-mono"
                                    style={{ borderColor: settings.toolbarInputBorderColor, color: settings.textColor }}
                                />

                                <div>
                                    <label className="block text-sm font-semibold mb-1 opacity-80">Chapter Detection Pattern (Regex)</label>
                                    <input 
                                        type="text" 
                                        value={splitRegex}
                                        onChange={e => setSplitRegex(e.target.value)}
                                        className="w-full p-2 rounded border bg-transparent text-sm font-mono"
                                        style={{ borderColor: settings.toolbarInputBorderColor, color: settings.textColor }}
                                    />
                                    <p className="text-xs opacity-60 mt-1">Default detects "Chapter X", "Prologue", etc. on a new line.</p>
                                </div>

                                <div className="flex justify-end">
                                    <button
                                        onClick={handleDetectChapters}
                                        disabled={!text.trim()}
                                        className="px-6 py-2 rounded-md text-white font-medium disabled:opacity-50"
                                        style={{ backgroundColor: settings.accentColor }}
                                    >
                                        Detect Chapters
                                    </button>
                                </div>
                            </div>
                        )}
                        {error && <AIError message={error} className="text-center text-sm mt-4" />}
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-4 h-[500px] flex flex-col">
                        <div className="flex justify-between items-center">
                            <h3 className="font-semibold">Review Detected Chapters ({detectedChapters.length})</h3>
                            <button onClick={() => setStep(1)} className="text-xs underline opacity-70">Back to Edit</button>
                        </div>
                        
                        {detectedChapters.length === 0 ? (
                            <div className="flex-grow flex items-center justify-center text-center opacity-60 flex-col">
                                <p>No chapters detected with current pattern.</p>
                                <button onClick={() => setStep(1)} className="mt-2 text-blue-400 underline">Adjust Settings</button>
                            </div>
                        ) : (
                            <div className="flex-grow overflow-y-auto border rounded-md p-2 space-y-2" style={{ borderColor: settings.toolbarInputBorderColor }}>
                                {detectedChapters.map((ch, idx) => (
                                    <div key={idx} className="p-3 rounded flex justify-between items-center" style={{ backgroundColor: settings.toolbarButtonBg }}>
                                        <div className="min-w-0 flex-grow pr-4">
                                            <p className="font-bold text-sm truncate">{ch.title}</p>
                                            <p className="text-xs opacity-60 truncate">{ch.content.replace(/<[^>]*>/g, '').substring(0, 60)}...</p>
                                        </div>
                                        <span className="text-xs opacity-50 whitespace-nowrap">~{(ch.content.length / 5).toFixed(0)} words</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {isProcessing ? (
                            <div className="text-center py-4">
                                <SpinnerIcon className="h-8 w-8 mx-auto mb-2" />
                                <p className="font-semibold">{progress}</p>
                            </div>
                        ) : (
                            <div className="flex justify-end pt-4">
                                <button
                                    onClick={handleAIProcessing}
                                    disabled={detectedChapters.length === 0}
                                    className="px-6 py-2 rounded-md text-white font-medium flex items-center gap-2 disabled:opacity-50"
                                    style={{ backgroundColor: settings.accentColor }}
                                >
                                    <SparklesIconOutline className="h-5 w-5" />
                                    Analyze & Import
                                </button>
                            </div>
                        )}
                        {error && <AIError message={error} className="text-center text-sm mt-4" />}
                    </div>
                )}

                {step === 3 && (
                    <div className="flex flex-col items-center justify-center text-center py-10 space-y-4">
                        <CheckCircleIcon className="h-16 w-16 text-green-500" />
                        <h3 className="text-2xl font-bold">Import Complete!</h3>
                        <p className="opacity-80 max-w-md">
                            Your manuscript has been successfully imported. Chapters, characters, and world items have been extracted and populated.
                        </p>
                        <button
                            onClick={onClose}
                            className="px-8 py-2 rounded-md text-white font-medium mt-4"
                            style={{ backgroundColor: settings.successColor }}
                        >
                            Go to Assembly
                        </button>
                    </div>
                )}
            </div>
        </Modal>
    );
};
