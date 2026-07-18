
import React, { useState, useEffect, useRef } from 'react';
import { produce } from 'immer';
import { useDebouncedCallback } from 'use-debounce';
import type { EditorSettings, IChapter, ICharacter, INoteItem } from '../../types';
import { useNovelDispatch, useNovelState } from '../../NovelContext';
import { SparklesIconOutline, PlusIcon, TrashIcon, SpinnerIcon, PaperAirplaneIcon, ChatBubbleIcon } from '../common/Icons';
import MarkdownRenderer from '../common/MarkdownRenderer';
import AutosizeTextarea from '../common/AutosizeTextarea';
import { getAI, hasAPIKey, API_KEY_ERROR } from '../../utils/ai';
import { AIError } from '../common/AIError';



const AI_ASSIST_PROMPTS = [
  { id: 'flow', label: 'Flow & Pacing Check', prompt: "This passage feels clunky. Help me improve its flow and readability. Should any sentences be split up or combined for better pacing?" },
  { id: 'show', label: "Show, Don't Tell", prompt: "I'm worried this section is telling, not showing. Give me three concrete ways to transform this summary into a vivid scene using sensory details and action." },
  { id: 'dialogue', label: 'Dialogue & Voice Review', prompt: "I'm writing dialogue for [Character Name]. Do these lines sound authentic to their established personality and voice? Suggest a punchier alternative for the final line.", needsCharacter: true },
  { id: 'tension', label: 'Increase Stakes/Tension', prompt: "I need to raise the tension here. Suggest how I can add a layer of immediate stakes or internal conflict to this paragraph to make the reader feel more suspense." },
  { id: 'description', label: 'Descriptive Focus', prompt: "I feel like I rushed the description of this location/action. Expand this paragraph with more descriptive language and imagery that matches the novel's current tone and mood." }
];

const BETA_READER_PERSONAS = {
  'Neutral Editor': "You are a helpful and objective professional editor. Your feedback is constructive, balanced, and focused on improving the craft of writing.",
  'Cynical Critic': "You are a cynical literary critic who is hard to please. Your feedback is direct, blunt, and focuses on pointing out flaws and weaknesses in the writing. You use a slightly sarcastic tone.",
  'Supportive Friend': "You are an encouraging and supportive friend reading this for the first time. You focus on what you love about the passage and offer gentle, positive suggestions for improvement.",
  'Teen Fantasy Lover': "You are a 16-year-old who loves reading YA fantasy. Your feedback is enthusiastic and focuses on what's cool, exciting, or romantic. You use informal language and slang.",
  'Pacing Expert': "You are an editor who specializes in narrative pacing. Your feedback should focus exclusively on the rhythm, flow, and tension of the passage, ignoring other elements unless they directly impact pacing.",
  'Character Analyst': "You are a beta reader who is obsessed with character development. Your feedback should analyze the character's voice, motivations, and consistency within this passage. Does it feel true to them?",
  'Hard Sci-Fi Fan': "You are a detail-oriented hard sci-fi fan. Your feedback should focus on technical plausibility, scientific consistency, and the logic of the world-building presented in this passage.",
  'Romance Reader': "You are an avid romance reader. Your feedback should focus on the emotional connection, romantic tension, and chemistry between characters in this passage.",
};

type PersonaKey = keyof typeof BETA_READER_PERSONAS;

interface NotesPanelProps {
    settings: EditorSettings;
    activeChapter: IChapter;
    onChapterDetailsChange: (id: string, updates: Partial<IChapter>) => void;
    initialWidth: number;
    onWidthChange: (width: number) => void;
    allChapters: IChapter[];
    allCharacters: ICharacter[];
    generateId: () => string;
}


export const NotesPanel: React.FC<NotesPanelProps> = ({ settings, activeChapter, onChapterDetailsChange, initialWidth, onWidthChange, allChapters, allCharacters, generateId }) => {
    const dispatch = useNovelDispatch();
    const { socialMediaState } = useNovelState();
    const handleRef = useRef<HTMLDivElement>(null);
    const [activeTab, setActiveTab] = useState<'notes' | 'ai' | 'feedback'>('notes');
    const [isDraggingOver, setIsDraggingOver] = useState(false);

    // AI Assist State
    const [droppedText, setDroppedText] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [aiResponse, setAiResponse] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [dialogueCharName, setDialogueCharName] = useState('');
    const [selectedPersona, setSelectedPersona] = useState<PersonaKey>('Neutral Editor');

    // Beta Feedback State
    const [feedbackText, setFeedbackText] = useState(activeChapter.betaFeedback || '');
    const [isSummarizing, setIsSummarizing] = useState(false);
    const [summaryError, setSummaryError] = useState<string|null>(null);

    // --- Chapter Notes State & Handlers ---
    const [noteItems, setNoteItems] = useState<INoteItem[]>([]);
    
    const debouncedNotesChange = useDebouncedCallback((items: INoteItem[]) => {
        onChapterDetailsChange(activeChapter.id, { notes: JSON.stringify(items) });
    }, 300);

    useEffect(() => {
        if (!activeChapter.notes) {
            setNoteItems([]);
            return;
        }
        try {
            const items = JSON.parse(activeChapter.notes);
            if (Array.isArray(items)) {
                if (items.length === 0 || (items.length > 0 && 'id' in items[0])) {
                     setNoteItems(items);
                     return;
                }
            }
            setNoteItems([{ id: generateId(), type: 'text', content: activeChapter.notes }]);
        } catch (e) {
            setNoteItems([{ id: generateId(), type: 'text', content: activeChapter.notes }]);
        }
    }, [activeChapter.id, activeChapter.notes, generateId]);

    const handleUpdateNote = (id: string, newContent: string) => {
        const newItems = produce(noteItems, draft => {
            const item = draft.find(i => i.id === id);
            if (item) {
                item.content = newContent;
            }
        });
        setNoteItems(newItems);
        debouncedNotesChange(newItems);
    };

    const handleDeleteNote = (id: string) => {
        const newItems = noteItems.filter(i => i.id !== id);
        setNoteItems(newItems);
        onChapterDetailsChange(activeChapter.id, { notes: JSON.stringify(newItems) });
    };

    const handleAddNote = () => {
        const newItem: INoteItem = { id: generateId(), type: 'text', content: '' };
        const newItems = [...noteItems, newItem];
        setNoteItems(newItems);
        onChapterDetailsChange(activeChapter.id, { notes: JSON.stringify(newItems) });
    };

    const handleNoteDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        const text = e.dataTransfer.getData('text/plain');
        if (text) {
            const newItem: INoteItem = { id: generateId(), type: 'excerpt', content: text };
            const newItems = [...noteItems, newItem];
            setNoteItems(newItems);
            onChapterDetailsChange(activeChapter.id, { notes: JSON.stringify(newItems) });
        }
    };

    const handleStartOver = () => {
        setDroppedText(null);
        setAiResponse(null);
        setError(null);
        setIsLoading(false);
        setDialogueCharName('');
    };
    
    useEffect(() => {
        handleStartOver();
        setFeedbackText(activeChapter.betaFeedback || '');
        setIsSummarizing(false);
        setSummaryError(null);
    }, [activeChapter.id, activeChapter.betaFeedback]);


    const handlePromptClick = async (promptTemplate: string, needsCharacter?: boolean) => {
        if (!droppedText) return;
        if (needsCharacter && !dialogueCharName) {
            setError("Please select a character for the dialogue review.");
            return;
        }
        
        if (!hasAPIKey()) {
            setError(API_KEY_ERROR);
            return;
        }

        setIsLoading(true);
        setError(null);
        setAiResponse(null);

        try {
            const htmlToText = (html: string) => {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = html;
                return tempDiv.innerText || '';
            }
            const manuscriptText = allChapters.map(c => htmlToText(c.content) ? `Chapter ${c.chapterNumber}:\n${htmlToText(c.content)}` : '').filter(Boolean).join('\n\n---\n\n');
            const userRequest = promptTemplate.replace('[Character Name]', dialogueCharName);
            
            const systemInstruction = BETA_READER_PERSONAS[selectedPersona];

            const taskPrompt = `Your primary goal is to provide feedback that matches the author's unique voice and style.

First, carefully analyze the provided "Full Manuscript" to understand the author's style, tone, vocabulary, sentence structure, and rhythm.

Then, using that EXACT authorial voice, respond to the "User's Request" regarding the "Text Excerpt". Your feedback, suggestions, and any rewritten passages must sound as if the author wrote them for themselves.

FULL MANUSCRIPT FOR VOICE ANALYSIS:
---
${manuscriptText}
---

TEXT EXCERPT FOR FEEDBACK:
---
${droppedText}
---

USER'S REQUEST:
---
${userRequest}
---

Provide your response in Markdown format.`;

            const response = await getAI(settings.geminiApiKey).models.generateContent({ 
                model: 'gemini-1.5-flash', 
                contents: [{ role: 'user', parts: [{ text: taskPrompt }] }],
                config: {
                    systemInstruction
                }
            });
            setAiResponse(response.text || null);
        } catch (e) {
            console.error(e);
            setError("Sorry, something went wrong while generating feedback. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDraggingOver(false);
        const text = e.dataTransfer.getData('text/plain');
        if (text) {
            handleStartOver();
            setDroppedText(text);
        }
    };
    
    useEffect(() => {
        const handle = handleRef.current;
        if (!handle) return;

        const onMouseDown = (e: MouseEvent) => {
            e.preventDefault();
            const startX = e.clientX;
            const startWidth = initialWidth;

            const onMouseMove = (moveEvent: MouseEvent) => {
                const dx = startX - moveEvent.clientX;
                let newWidth = startWidth + dx;

                const screenWidth = window.innerWidth;
                const halfScreen = screenWidth / 2;
                const snapThreshold = 50;

                if (Math.abs(newWidth - halfScreen) < snapThreshold) {
                    newWidth = halfScreen;
                } else if (Math.abs(newWidth - screenWidth) < snapThreshold) {
                    newWidth = screenWidth;
                }
                
                const minWidth = 240;
                const maxWidth = screenWidth;
                newWidth = Math.max(minWidth, Math.min(newWidth, maxWidth));

                onWidthChange(newWidth);
            };

            const onMouseUp = () => {
                window.removeEventListener('mousemove', onMouseMove);
                window.removeEventListener('mouseup', onMouseUp);
            };

            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('mouseup', onMouseUp);
        };

        handle.addEventListener('mousedown', onMouseDown);

        return () => {
            handle.removeEventListener('mousedown', onMouseDown);
        };
    }, [initialWidth, onWidthChange]);
    
    const debouncedFeedbackUpdate = useDebouncedCallback((text: string) => {
        onChapterDetailsChange(activeChapter.id, { betaFeedback: text });
    }, 500);

    const handleFeedbackTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setFeedbackText(e.target.value);
        debouncedFeedbackUpdate(e.target.value);
    };

    const handleSummarize = async () => {
        if (!feedbackText.trim()) {
            setSummaryError("Please paste some feedback before summarizing.");
            return;
        }
        
        if (!hasAPIKey(settings.geminiApiKey)) {
            setSummaryError(API_KEY_ERROR);
            return;
        }

        setIsSummarizing(true);
        setSummaryError(null);

        try {
            const prompt = `You are an expert developmental editor. I have pasted a collection of unstructured comments from my beta readers for a single chapter. Your task is to analyze all of this feedback and synthesize it into a concise, actionable summary.

            Please structure your response in Markdown format with the following sections:
            - **Key Themes:** Identify the most common points of feedback, both positive and negative.
            - **Structural Criticisms:** Point out any recurring comments about pacing, plot holes, or character arcs.
            - **Positive Reactions:** Highlight what readers consistently enjoyed or praised.
            - **Actionable Suggestions:** Provide a short, bulleted list of the top 3-5 most important revisions suggested by the feedback.

            Here is the raw feedback:
            """
            ${feedbackText}
            """`;
            
            const response = await getAI(settings.geminiApiKey).models.generateContent({ 
                model: 'gemini-1.5-flash', 
                contents: [{ role: 'user', parts: [{ text: prompt }] }] 
            });
            onChapterDetailsChange(activeChapter.id, { betaFeedbackSummary: response.text });

        } catch(e) {
            console.error(e);
            setSummaryError("Failed to generate summary. Please try again.");
        } finally {
            setIsSummarizing(false);
        }
    };

    const handleClearSummary = () => {
        onChapterDetailsChange(activeChapter.id, { betaFeedbackSummary: undefined });
    };

    const tabClasses = "px-4 py-2 text-sm font-medium transition-colors focus:outline-none";

    return (
        <div className="w-full h-full flex flex-col border-l" style={{ backgroundColor: settings.toolbarBg, color: settings.toolbarText, borderColor: settings.toolbarInputBorderColor }}>
            <div ref={handleRef} className="absolute top-0 left-[-4px] w-2 h-full cursor-col-resize z-10" />
            <div className="flex-shrink-0 border-b flex" style={{ borderColor: settings.toolbarInputBorderColor }}>
                <button 
                    className={tabClasses} 
                    style={{
                        backgroundColor: activeTab === 'notes' ? settings.toolbarBg : settings.toolbarButtonBg,
                        borderBottom: activeTab === 'notes' ? `2px solid ${settings.accentColor}` : 'none'
                    }}
                    onClick={() => setActiveTab('notes')}
                >
                    Chapter Notes
                </button>
                 <button 
                    className={`${tabClasses} flex items-center gap-2`}
                    style={{
                        backgroundColor: activeTab === 'ai' ? settings.toolbarBg : settings.toolbarButtonBg,
                        borderBottom: activeTab === 'ai' ? `2px solid ${settings.accentColor}` : 'none'
                    }}
                    onClick={() => setActiveTab('ai')}
                >
                    <SparklesIconOutline className="h-4 w-4" />
                    AI Assist
                </button>
                <button 
                    className={`${tabClasses} flex items-center gap-2`}
                    style={{
                        backgroundColor: activeTab === 'feedback' ? settings.toolbarBg : settings.toolbarButtonBg,
                        borderBottom: activeTab === 'feedback' ? `2px solid ${settings.accentColor}` : 'none'
                    }}
                    onClick={() => setActiveTab('feedback')}
                >
                    <ChatBubbleIcon className="h-4 w-4" />
                    Beta Feedback
                </button>
            </div>
            {activeTab === 'notes' ? (
                 <div 
                    className="p-4 flex-grow flex flex-col min-h-0"
                    onDrop={handleNoteDrop}
                    onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'copy';
                    }}
                >
                    <div className="flex-grow overflow-y-auto space-y-3 pr-2 -mr-2">
                        {noteItems.length === 0 && (
                            <div className="text-center opacity-60 pt-10">
                                <p>No notes for this chapter yet.</p>
                                <p className="text-sm">Click "Add Note" or drag text from the manuscript here to create an excerpt.</p>
                            </div>
                        )}
                        {noteItems.map(item => {
                            const isExcerptSent = item.type === 'excerpt' && socialMediaState.excerpts.some(e => e.type === 'user' && e.text === item.content && e.chapterId === activeChapter.id);
                            return (
                                <div key={item.id} className={`p-3 rounded-md relative group ${item.type === 'excerpt' ? 'border' : ''}`} style={{ backgroundColor: settings.toolbarButtonBg, borderColor: item.type === 'excerpt' ? settings.accentColor : 'transparent' }}>
                                    {item.type === 'excerpt' && <div className="text-xs uppercase font-bold mb-2 tracking-wider" style={{ color: settings.accentColor }}>Excerpt</div>}
                                    <AutosizeTextarea
                                        value={item.content}
                                        onChange={(e) => handleUpdateNote(item.id, e.target.value)}
                                        className="w-full bg-transparent border-none resize-none outline-none text-sm"
                                        style={{ color: settings.toolbarText }}
                                        placeholder={item.type === 'text' ? "Type your note..." : "Excerpt content..."}
                                    />
                                    <div className="absolute top-2 right-2 flex gap-1.5">
                                        {item.type === 'excerpt' && !isExcerptSent && (
                                            <button
                                                onClick={() => {
                                                    dispatch({
                                                        type: 'INITIATE_SOCIAL_POST',
                                                        payload: { 
                                                            text: item.content, 
                                                            chapterId: activeChapter.id,
                                                            characterIds: activeChapter.characterIds || []
                                                        }
                                                    });
                                                }}
                                                className="p-1 rounded-full bg-black/20 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                                                style={{ color: 'var(--app-text)' }}
                                                title="Send to Social Media Panel"
                                            >
                                                <PaperAirplaneIcon className="h-4 w-4" />
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleDeleteNote(item.id)}
                                            className="p-1 rounded-full bg-black/20 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                                            style={{ color: 'var(--app-text)' }}
                                            title="Delete Note"
                                        >
                                            <TrashIcon />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <div className="flex-shrink-0 pt-3 mt-2 border-t" style={{ borderColor: settings.toolbarInputBorderColor }}>
                        <button
                            onClick={handleAddNote}
                            className="w-full text-center py-2 rounded-md text-sm font-medium flex items-center justify-center gap-2"
                            style={{ backgroundColor: settings.toolbarButtonHoverBg, color: settings.toolbarText }}
                        >
                            <PlusIcon className="h-4 w-4" /> Add Note
                        </button>
                    </div>
                </div>
            ) : activeTab === 'ai' ? (
                <div className="p-4 flex-grow flex flex-col min-h-0 overflow-y-auto">
                    {isLoading ? (
                         <div className="flex-grow flex flex-col items-center justify-center text-center">
                            <SpinnerIcon className="h-8 w-8 mb-4" />
                            <p className="font-semibold">Analyzing with your author voice...</p>
                            <p className="text-xs opacity-70 mt-1">This may take a moment.</p>
                        </div>
                    ) : error ? (
                        <div className="flex-grow flex flex-col items-center justify-center text-center">
                            <AIError message={error} className="text-center" />
                             <button onClick={handleStartOver} className="mt-4 px-3 py-1 text-sm rounded" style={{backgroundColor: settings.toolbarButtonBg}}>Start Over</button>
                        </div>
                    ) : aiResponse ? (
                         <div>
                            <div className="flex justify-between items-center mb-4">
                               <h3 className="text-lg font-semibold">Editorial Feedback</h3>
                               <button onClick={handleStartOver} className="px-3 py-1 text-sm rounded" style={{backgroundColor: settings.toolbarButtonBg}}>Start Over</button>
                            </div>
                            <div className="p-4 rounded" style={{backgroundColor: settings.backgroundColor}}>
                                <MarkdownRenderer source={aiResponse} settings={settings} />
                            </div>
                        </div>
                    ) : droppedText ? (
                        <div className="space-y-4">
                            <div>
                                <h4 className="text-sm font-semibold mb-2 opacity-80">Selected Text:</h4>
                                <p className="text-sm p-3 rounded max-h-32 overflow-y-auto" style={{backgroundColor: settings.backgroundColor, whiteSpace: 'pre-wrap'}}>{droppedText}</p>
                            </div>
                             <div>
                                <label htmlFor="persona-select" className="text-sm font-semibold mb-2 opacity-80 block">Feedback Persona:</label>
                                <select
                                    id="persona-select"
                                    value={selectedPersona}
                                    onChange={(e) => setSelectedPersona(e.target.value as PersonaKey)}
                                    className="w-full p-2 rounded border text-sm"
                                    style={{ backgroundColor: settings.backgroundColor, borderColor: settings.toolbarInputBorderColor, color: settings.textColor }}
                                >
                                    {Object.keys(BETA_READER_PERSONAS).map(key => (
                                        <option key={key} value={key}>{key}</option>
                                    ))}
                                </select>
                            </div>
                             <div>
                                <h4 className="text-sm font-semibold mb-2 opacity-80">What do you need help with?</h4>
                                <div className="space-y-2">
                                    {AI_ASSIST_PROMPTS.map(p => (
                                        <div key={p.id} className="p-2 rounded" style={{backgroundColor: settings.toolbarButtonBg}}>
                                            <div className="flex justify-between items-center">
                                                <label className="text-sm flex-grow pr-4">{p.label}</label>
                                                <button onClick={() => handlePromptClick(p.prompt, p.needsCharacter)} className="px-2 py-1 text-xs rounded font-bold" style={{backgroundColor: settings.accentColor, color: 'var(--app-text)' }}>Analyze</button>
                                            </div>
                                            {p.needsCharacter && (
                                                <div className="mt-2 pl-1">
                                                     <select 
                                                        value={dialogueCharName}
                                                        onChange={(e) => setDialogueCharName(e.target.value)}
                                                        className="w-full p-1.5 text-xs rounded border"
                                                        style={{backgroundColor: settings.backgroundColor, borderColor: settings.toolbarInputBorderColor}}
                                                     >
                                                        <option value="">Select a character...</option>
                                                        {allCharacters.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                                     </select>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div 
                            onDrop={handleDrop}
                            onDragOver={(e) => { 
                                e.preventDefault(); 
                                setIsDraggingOver(true); 
                                e.dataTransfer.dropEffect = 'copy';
                            }}
                            onDragLeave={() => setIsDraggingOver(false)}
                            className="w-full h-full flex-grow flex flex-col items-center justify-center text-center p-4 border-2 border-dashed rounded-lg transition-colors"
                            style={{
                                borderColor: isDraggingOver ? settings.accentColor : settings.toolbarInputBorderColor,
                                backgroundColor: isDraggingOver ? `${settings.accentColor}20` : 'transparent',
                            }}
                        >
                            <SparklesIconOutline className="h-8 w-8 mb-2 opacity-50" />
                            <p className="font-semibold">AI Editorial Assistant</p>
                            <p className="text-xs opacity-70 mt-1">Drag and drop a text selection here for feedback.</p>
                        </div>
                    )}
                </div>
            ) : (
                 <div className="p-4 flex-grow flex flex-col min-h-0">
                    <div className="flex-grow flex flex-col min-h-0 space-y-4">
                        <div>
                            <label className="text-sm font-semibold opacity-80 block mb-2">Beta Reader Comments</label>
                            <textarea
                                value={feedbackText}
                                onChange={handleFeedbackTextChange}
                                placeholder="Paste all unstructured comments for this chapter here..."
                                className="w-full p-2 rounded border resize-none text-sm h-40"
                                style={{ backgroundColor: settings.backgroundColor, color: settings.textColor, borderColor: settings.toolbarInputBorderColor }}
                            />
                        </div>
                        <div className="flex items-center gap-4">
                            <button 
                                onClick={handleSummarize} 
                                disabled={isSummarizing || !feedbackText.trim()}
                                className="px-3 py-1.5 rounded-md text-sm font-medium flex items-center font-bold disabled:opacity-60"
                                style={{ backgroundColor: settings.accentColor, color: 'var(--app-text)' }}
                            >
                                {isSummarizing ? <SpinnerIcon /> : <SparklesIconOutline className="h-4 w-4" />}
                                <span className="ml-2">Summarize Feedback</span>
                            </button>
                            {activeChapter.betaFeedbackSummary && (
                                <button onClick={handleClearSummary} className="px-3 py-1.5 text-sm rounded-md" style={{backgroundColor: settings.toolbarButtonBg}}>
                                    Clear Summary
                                </button>
                            )}
                        </div>
                        {summaryError && <AIError message={summaryError} />}
                        {isSummarizing ? (
                             <div className="flex-grow flex flex-col items-center justify-center text-center">
                                <SpinnerIcon className="h-8 w-8 mb-4" />
                                <p className="font-semibold">Summarizing feedback...</p>
                            </div>
                        ) : activeChapter.betaFeedbackSummary && (
                            <div className="flex-grow min-h-0 overflow-y-auto">
                                <h4 className="text-sm font-semibold opacity-80 mb-2">AI Summary</h4>
                                <div className="p-3 rounded text-sm" style={{backgroundColor: settings.backgroundColor}}>
                                    <MarkdownRenderer source={activeChapter.betaFeedbackSummary} settings={settings} />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
