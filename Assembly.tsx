import React, { useState, useRef, useCallback, useEffect, useMemo, useContext } from 'react';
import { produce } from 'immer';
import { Type } from "@google/genai";
import type { EditorSettings, ICharacter, IChapter, TileBackgroundStyle, ISnippet, AssemblyPanel, Excerpt, SocialPost, AssemblyViewState, PlotBrainstormState, SynopsisState, IWorldItem, ChapterPacingInfo, Theme, RelationshipDataPoint, PlotPoint, ChekhovsGun, ICharacterRelationship, IMapLocation } from './types';
import { useNovelDispatch, useNovelState } from './NovelContext';
import { AssemblyAIContext, AssemblyAIState, SnippetSuggestion } from './components/assembly/AssemblyAIContext';
import { getAI, hasAPIKey, API_KEY_ERROR } from './utils/ai';

import { CharactersPanel } from './components/assembly/characters';
import { ChaptersPanel } from './components/assembly/chapters';
import { SnippetsPanel } from './components/assembly/snippets';
import { SocialMediaPanel } from './components/assembly/social';
import { PlotBrainstormPanel } from './components/assembly/plot';
import { SynopsisPanel } from './components/assembly/synopsis';
import { WorldPanel } from './components/assembly/world';
import { PlusIcon, DocumentTextIcon, TileBackgroundIcon, ImportIcon, SparklesIconOutline } from './components/common/Icons';
import { generateId, extractJson } from './utils/common';
import { generateInitialChapterRtf } from './utils/manuscriptUtils';
import { getContrastColor } from './utils/colorUtils';
import { Modal } from './components/manuscript/modals/Modal';
import { ImportNovelModal } from './components/assembly/modals/ImportNovelModal';
import { NarrativeArchitectModal } from './components/assembly/modals/NarrativeArchitectModal';

interface DeleteCharacterModalProps {
    character: ICharacter;
    onConfirm: () => void;
    onCancel: () => void;
    settings: EditorSettings;
}

const DeleteCharacterModal: React.FC<DeleteCharacterModalProps> = React.memo(({ character, onConfirm, onCancel, settings }) => {
    const footerContent = (
        <>
            <button 
                onClick={onCancel} 
                className="rounded px-4 py-2" 
                style={{ 
                    backgroundColor: settings.toolbarButtonBg,
                    color: getContrastColor(settings.toolbarButtonBg)
                }}
            >
                Cancel
            </button>
            <button 
                onClick={onConfirm} 
                className="rounded px-4 py-2" 
                style={{ 
                    backgroundColor: settings.dangerColor, 
                    color: getContrastColor(settings.dangerColor)
                }}
            >
                Delete Character
            </button>
        </>
    );

    return (
        <Modal onClose={onCancel} settings={settings} title="Confirm Deletion" className="max-w-md" footer={footerContent}>
            <p>Are you sure you want to permanently delete the character "{character.name}"? This action cannot be undone.</p>
        </Modal>
    );
});

interface DeleteChapterModalProps {
    chapter: IChapter;
    onConfirm: () => void;
    onCancel: () => void;
    settings: EditorSettings;
}

const DeleteChapterModal: React.FC<DeleteChapterModalProps> = React.memo(({ chapter, onConfirm, onCancel, settings }) => {
    const footerContent = (
         <>
            <button 
                onClick={onCancel} 
                className="rounded px-4 py-2" 
                style={{ 
                    backgroundColor: settings.toolbarButtonBg,
                    color: getContrastColor(settings.toolbarButtonBg)
                }}
            >
                Cancel
            </button>
            <button 
                onClick={onConfirm} 
                className="rounded px-4 py-2" 
                style={{ 
                    backgroundColor: settings.dangerColor, 
                    color: getContrastColor(settings.dangerColor)
                }}
            >
                Delete Chapter
            </button>
        </>
    );
    
    return (
        <Modal onClose={onCancel} settings={settings} title="Confirm Deletion" className="max-w-md" footer={footerContent}>
            <p>Are you sure you want to permanently delete "{chapter.chapterNumber}. {chapter.title}"? This action cannot be undone.</p>
        </Modal>
    );
});

interface AssemblyHeaderProps {
    settings: EditorSettings;
    activePanel: AssemblyPanel;
    onPanelChange: (panel: AssemblyPanel) => void;
    onAdd: () => void;
    onSettingsChange: (newSettings: Partial<EditorSettings>) => void;
    onExport: () => void;
    onImport: () => void;
}

const AssemblyHeader: React.FC<AssemblyHeaderProps> = ({ settings, activePanel, onPanelChange, onAdd, onSettingsChange, onExport, onImport }) => {
    const handleCycleBackground = () => {
        const styles: TileBackgroundStyle[] = ['solid', 'diagonal', 'horizontal'];
        const currentStyle = settings.assemblyTileStyle || 'solid';
        const currentIndex = styles.indexOf(currentStyle);
        const nextStyle = styles[(currentIndex + 1) % styles.length];
        onSettingsChange({ assemblyTileStyle: nextStyle });
    };

    const handleToggleColorSource = () => {
        const nextSource = settings.tileColorSource === 'image' ? 'palette' : 'image';
        onSettingsChange({ tileColorSource: nextSource });
    };

    const tabBaseClasses = "px-4 py-2 text-sm font-medium transition-colors focus:outline-none border-t border-l border-r rounded-t-lg";
    const inactiveTabHoverStyle = { backgroundColor: settings.toolbarButtonHoverBg || '' };
    const sansSerifFonts = ['Inter', 'Roboto', 'Open Sans', 'Arial'];

    const tabLabels: Record<AssemblyPanel, string> = {
        chapters: 'Chapters',
        characters: 'Characters',
        snippets: 'Snippets',
        world: 'World',
        plot: 'Plot Brainstorm',
        synopsis: 'Synopsis',
        social: 'Social Media',
    };
    const tabs: AssemblyPanel[] = ['chapters', 'characters', 'snippets', 'social', 'world', 'plot', 'synopsis'];
    const canAdd = ['characters', 'chapters', 'snippets', 'world'].includes(activePanel);

    const getAddItemLabel = () => {
        switch(activePanel) {
            case 'characters': return 'Character';
            case 'chapters': return 'Chapter';
            case 'snippets': return 'Snippet';
            case 'world': return 'World Item';
            default: return '';
        }
    };

    const showTileControls = ['characters', 'chapters'].includes(activePanel);

    return (
        <div className="px-4 pt-14 pb-3 border-b flex flex-col lg:flex-row justify-between items-start lg:items-end gap-4" style={{ backgroundColor: settings.toolbarBg, borderColor: settings.toolbarInputBorderColor }}>
            <div className="flex items-end gap-1 flex-wrap w-full lg:w-auto">
                {tabs.map(panel => (
                     <button
                        key={panel}
                        onClick={() => onPanelChange(panel)}
                        className={`${tabBaseClasses} whitespace-nowrap`}
                        style={{
                            backgroundColor: activePanel === panel ? 'transparent' : settings.toolbarButtonBg,
                            borderColor: settings.toolbarInputBorderColor,
                            borderBottomColor: activePanel === panel ? 'transparent' : settings.toolbarInputBorderColor,
                            marginBottom: activePanel === panel ? '-1px' : '0px',
                            color: settings.toolbarText
                        }}
                        onMouseEnter={e => { if (activePanel !== panel) e.currentTarget.style.backgroundColor = inactiveTabHoverStyle.backgroundColor }}
                        onMouseLeave={e => { if (activePanel !== panel) e.currentTarget.style.backgroundColor = settings.toolbarButtonBg || '' }}
                    >
                        {tabLabels[panel]}
                    </button>
                ))}
            </div>

            <div className="flex items-center gap-2 pb-1 flex-wrap w-full lg:w-auto justify-end">
                 <select
                    id="assemblyFontSelect"
                    aria-label="Assembly View Font"
                    value={settings.assemblyFontFamily || 'Inter'}
                    onChange={(e) => onSettingsChange({ assemblyFontFamily: e.target.value })}
                    className="px-2 py-1.5 rounded-md text-sm border-0 focus:ring-2 focus:ring-offset-2 min-w-[100px]"
                    style={{ 
                        backgroundColor: settings.toolbarButtonBg, 
                        color: settings.toolbarText,
                        borderColor: settings.toolbarInputBorderColor,
                        outline: 'none'
                     } as any}
                 >
                    {sansSerifFonts.map(font => <option key={font} value={font} style={{fontFamily: font}}>{font}</option>)}
                 </select>
                 {showTileControls && (
                    <div className="flex items-center gap-1">
                        <button
                            onClick={handleCycleBackground}
                            className="p-1.5 rounded-md flex-shrink-0"
                            style={{ backgroundColor: settings.toolbarButtonBg }}
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = settings.toolbarButtonHoverBg || ''}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = settings.toolbarButtonBg || ''}
                            title="Cycle tile background style"
                        >
                            <TileBackgroundIcon style={{ color: settings.toolbarText }} />
                        </button>
                        <button
                            onClick={handleToggleColorSource}
                            className="p-1.5 rounded-md flex-shrink-0 transition-all"
                            style={{ 
                                backgroundColor: settings.tileColorSource === 'image' ? settings.accentColor : settings.toolbarButtonBg,
                                boxShadow: settings.tileColorSource === 'image' ? `0 0 10px ${settings.accentColor}40` : 'none'
                            }}
                            onMouseEnter={e => {
                                if (settings.tileColorSource !== 'image') e.currentTarget.style.backgroundColor = settings.toolbarButtonHoverBg || '';
                            }}
                            onMouseLeave={e => {
                                if (settings.tileColorSource !== 'image') e.currentTarget.style.backgroundColor = settings.toolbarButtonBg || '';
                            }}
                            title={settings.tileColorSource === 'image' ? "Using Image/Headshot Colors" : "Using Global Palette Colors"}
                        >
                            <SparklesIconOutline style={{ color: settings.tileColorSource === 'image' ? '#FFFFFF' : settings.toolbarText }} className="h-5 w-5" />
                        </button>
                    </div>
                 )}
                 <div className="w-px h-6 bg-gray-600 opacity-30 mx-1 hidden sm:block"></div>
                 {activePanel === 'chapters' && (
                    <button
                        onClick={onImport}
                        className="px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 whitespace-nowrap flex-shrink-0"
                        style={{ backgroundColor: settings.toolbarButtonBg, color: settings.toolbarText }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = settings.toolbarButtonHoverBg || ''}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = settings.toolbarButtonBg || ''}
                    >
                        <ImportIcon className="h-4 w-4" />
                        Import Manuscript
                    </button>
                 )}
                 {canAdd && (
                    <button
                        onClick={onAdd}
                        className="px-4 py-1.5 rounded-md text-sm font-bold flex items-center gap-2 whitespace-nowrap flex-shrink-0"
                        style={{ backgroundColor: settings.accentColor, color: getContrastColor(settings.accentColor) }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = settings.accentColorHover || ''}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = settings.accentColor || ''}
                    >
                        <PlusIcon className="h-4 w-4" />
                        Add {getAddItemLabel()}
                    </button>
                 )}
            </div>
        </div>
    );
};

// --- SCHEMAS ---
const characterProfileSchema = {
    type: Type.OBJECT,
    properties: {
        summary: { type: Type.STRING, description: "A brief 1-2 sentence summary of the character." },
        tagline: { type: Type.STRING, description: "A short, catchy hook or tagline for the character." },
        profile: { type: Type.STRING, description: "A full, detailed character profile in Markdown format." },
        keywords: { type: Type.ARRAY, items: { type: Type.STRING }, description: "3-5 descriptive keywords for the character." },
        relationships: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    characterId: { type: Type.STRING },
                    description: { type: Type.STRING }
                },
                required: ["characterId", "description"]
            }
        }
    },
    required: ["summary", "tagline", "profile", "keywords"]
};

const chapterDetailsSchema = {
    type: Type.OBJECT,
    properties: {
        summary: { type: Type.STRING, description: "A 1-2 sentence summary of the chapter's plot." },
        outline: { type: Type.STRING, description: "A markdown beat-by-beat outline of the chapter." },
        analysis: { type: Type.STRING, description: "A markdown analysis of conflict, stakes, and emotional resonance." },
        keywords: { type: Type.ARRAY, items: { type: Type.STRING }, description: "3-5 thematic keywords for the chapter." },
        // Spreadsheet fields
        storyEvent: { type: Type.STRING, description: "Essential tactic and micro-action." },
        storyEventSummary: { type: Type.STRING },
        quadrant: { type: Type.STRING, description: "Section of story structure." },
        convention: { type: Type.STRING, description: "Genre requirements satisfied." },
        incitingIncident: { type: Type.STRING },
        progressiveComplication: { type: Type.STRING },
        crisis: { type: Type.STRING },
        climax: { type: Type.STRING },
        resolution: { type: Type.STRING },
        valueLevels: { type: Type.STRING, description: "Value at stake shift." },
        tropeSceneType: { type: Type.STRING },
        polarity: { type: Type.STRING, description: "Emotional state shift (+/-)." },
        turningPointCategory: { type: Type.STRING },
        turningPointSummary: { type: Type.STRING },
        pov: { type: Type.STRING, description: "Point of view character." },
        periodTime: { type: Type.STRING, description: "When and how long." },
        location: { type: Type.STRING, description: "Physical setting." }
    },
    required: ["summary", "outline", "analysis", "keywords"]
};

const snippetsSchema = {
    type: Type.ARRAY,
    items: {
        type: Type.OBJECT,
        properties: {
            cleanedText: { type: Type.STRING },
            type: { type: Type.STRING, description: "One of: Dialogue, Narrative Description, Internal Monologue, Theme Statement, General Action, World-Building Note, Uncategorized" },
            characterIds: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["cleanedText", "type", "characterIds"]
    }
};

const snippetPlacementSchema = {
    type: Type.ARRAY,
    items: {
        type: Type.OBJECT,
        properties: {
            chapterId: { type: Type.STRING },
            confidence: { type: Type.STRING, description: "One of: High, Medium, Low" },
            justification: { type: Type.STRING }
        },
        required: ["chapterId", "confidence", "justification"]
    }
};

const pacingAnalysisSchema = {
    type: Type.ARRAY,
    items: {
        type: Type.OBJECT,
        properties: {
            chapterId: { type: Type.STRING },
            chapterNumber: { type: Type.NUMBER },
            title: { type: Type.STRING },
            pacingScore: { type: Type.NUMBER, description: "Score from -1 (very slow/atmospheric) to 1 (very fast/action-packed)" },
            justification: { type: Type.STRING }
        },
        required: ["chapterId", "chapterNumber", "title", "pacingScore", "justification"]
    }
};

const socialContentSchema = {
    type: Type.OBJECT,
    properties: {
        imagePrompt: { type: Type.STRING, description: "Detailed prompt for generating a promotional image." },
        instagram: {
            type: Type.OBJECT,
            properties: {
                text: { type: Type.STRING },
                hashtags: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["text", "hashtags"]
        },
        tiktok: {
            type: Type.OBJECT,
            properties: {
                text: { type: Type.STRING },
                hashtags: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["text", "hashtags"]
        }
    },
    required: ["imagePrompt", "instagram", "tiktok"]
};

const worldDistillationSchema = {
    type: Type.ARRAY,
    items: {
        type: Type.OBJECT,
        properties: {
            name: { type: Type.STRING },
            type: { type: Type.STRING, description: "One of: Location, Lore, Object, Organization, Concept" },
            rawNotes: { type: Type.STRING },
            summary: { type: Type.STRING }
        },
        required: ["name", "type", "rawNotes", "summary"]
    }
};

const worldRefinementSchema = {
    type: Type.OBJECT,
    properties: {
        summary: { type: Type.STRING },
        description: { type: Type.STRING, description: "Detailed Markdown codex entry." }
    },
    required: ["summary", "description"]
};

const synopsisSuiteSchema = {
    type: Type.OBJECT,
    properties: {
        marketAnalysis: { type: Type.STRING },
        promotionalContent: { type: Type.STRING },
        synopsis: { type: Type.STRING }
    },
    required: ["marketAnalysis", "promotionalContent", "synopsis"]
};

const AssemblyAIProvider: React.FC<{ children: React.ReactNode, settings: EditorSettings }> = ({ children, settings }) => {
    const { chapters, characters, snippets, worldItems, socialMediaState, assemblyState, plotBrainstormState, synopsisState } = useNovelState();
    const dispatch = useNovelDispatch();
    const [aiState, setAiState] = useState<AssemblyAIState>({
        isGeneratingProfile: null,
        isGeneratingChapter: null,
        isGeneratingWorldItem: null,
        isDistillingWorld: false,
        isGeneratingSnippets: false,
        isGeneratingMap: false,
        errorId: null,
        errorMessage: null,
    });

    const onSetError = (message: string | null, id: string | null = null) => {
        setAiState(prev => ({ ...prev, errorMessage: message, errorId: id }));
    };

    // Helper: Map character IDs to names for prompt enrichment
    const getCharacterNames = useCallback((ids?: string[]) => {
        if (!ids || ids.length === 0) return "None";
        return ids.map(id => characters.find(c => c.id === id)?.name).filter(Boolean).join(", ");
    }, [characters]);

    const onGenerateProfile = async (character: ICharacter, rawNotes: string) => {
        if (!hasAPIKey(settings.geminiApiKey)) return onSetError(API_KEY_ERROR, character.id);
        setAiState(prev => ({ ...prev, isGeneratingProfile: character.id, errorMessage: null }));
        try {
            const prompt = `Based on these notes, generate a detailed character profile for "${character.name}". 
            Notes: ${rawNotes}`;
            const response = await getAI(settings.geminiApiKey).models.generateContent({ 
                model: 'gemini-1.5-flash', 
                contents: [{ role: 'user', parts: [{ text: prompt }] }], 
                config: { 
                    responseMimeType: 'application/json',
                    responseSchema: characterProfileSchema
                } 
            });
            const data = JSON.parse(response.text || '{}');
            if (data) dispatch({ type: 'UPDATE_CHARACTER', payload: { id: character.id, updates: { ...data, previousProfile: character.summary ? { summary: character.summary, profile: character.profile, tagline: character.tagline, keywords: character.keywords } : undefined } } });
        } catch (e: any) { onSetError(e.message || "Failed to generate profile.", character.id); }
        finally { setAiState(prev => ({ ...prev, isGeneratingProfile: null })); }
    };

    const onUpdateProfile = async (character: ICharacter, manuscriptContent: string) => {
        if (!hasAPIKey(settings.geminiApiKey)) return onSetError(API_KEY_ERROR, character.id);
        setAiState(prev => ({ ...prev, isGeneratingProfile: character.id, errorMessage: null }));
        try {
            const prompt = `Analyze the provided manuscript segments to update the profile for character "${character.name}". Focus on consistency and evolution.
            Manuscript Segment: ${manuscriptContent.substring(0, 30000)}`;
            const response = await getAI(settings.geminiApiKey).models.generateContent({ 
                model: 'gemini-1.5-flash', 
                contents: [{ role: 'user', parts: [{ text: prompt }] }], 
                config: { 
                    responseMimeType: 'application/json',
                    responseSchema: characterProfileSchema
                } 
            });
            const data = JSON.parse(response.text || '{}');
            if (data) dispatch({ type: 'UPDATE_CHARACTER', payload: { id: character.id, updates: { ...data, previousProfile: { summary: character.summary, profile: character.profile, tagline: character.tagline, keywords: character.keywords } } } });
        } catch (e: any) { onSetError(e.message || "Failed to update profile from manuscript.", character.id); }
        finally { setAiState(prev => ({ ...prev, isGeneratingProfile: null })); }
    };

    const onGenerateChapterDetails = async (chapter: IChapter, rawNotes: string) => {
        if (!hasAPIKey(settings.geminiApiKey)) return onSetError(API_KEY_ERROR, chapter.id);
        setAiState(prev => ({ ...prev, isGeneratingChapter: chapter.id, errorMessage: null }));
        try {
            const prompt = `Generate structural details for Chapter ${chapter.chapterNumber}: "${chapter.title}" based on these rough notes.
            Notes: ${rawNotes}`;
            const response = await getAI(settings.geminiApiKey).models.generateContent({ 
                model: 'gemini-1.5-flash', 
                contents: [{ role: 'user', parts: [{ text: prompt }] }], 
                config: { 
                    responseMimeType: 'application/json',
                    responseSchema: chapterDetailsSchema
                } 
            });
            const data = JSON.parse(response.text || '{}');
            if (data) dispatch({ type: 'UPDATE_CHAPTER', payload: { id: chapter.id, updates: { ...data, previousDetails: chapter.summary ? { summary: chapter.summary, outline: chapter.outline, analysis: chapter.analysis, keywords: chapter.keywords } : undefined } } });
        } catch (e) { onSetError("Failed to generate details.", chapter.id); }
        finally { setAiState(prev => ({ ...prev, isGeneratingChapter: null })); }
    };

    const onUpdateChapterFromManuscript = async (chapter: IChapter): Promise<Partial<IChapter> | null> => {
        if (!hasAPIKey(settings.geminiApiKey)) { onSetError(API_KEY_ERROR, chapter.id); return null; }
        setAiState(prev => ({ ...prev, isGeneratingChapter: chapter.id, errorMessage: null }));
        try {
            const tempDiv = document.createElement('div'); tempDiv.innerHTML = chapter.content;
            const prompt = `Analyze the actual text of this chapter to update the summary, outline, and analysis based on what was actually written.
            Also extract structural metadata for the story architecture spreadsheet (story event, quadrant, inciting incident, progressive complication, crisis, climax, resolution, value levels, trope scene type, polarity, turning point, POV, time/duration, and location).
            Text: ${tempDiv.innerText.substring(0, 15000)}`;
            const response = await getAI(settings.geminiApiKey).models.generateContent({ 
                model: 'gemini-1.5-flash', 
                contents: [{ role: 'user', parts: [{ text: prompt }] }], 
                config: { 
                    responseMimeType: 'application/json',
                    responseSchema: chapterDetailsSchema
                } 
            });
            const data = JSON.parse(response.text || '{}');
            if (data) {
                const updates = { ...data, previousDetails: { summary: chapter.summary, outline: chapter.outline, analysis: chapter.analysis, keywords: chapter.keywords } };
                dispatch({ type: 'UPDATE_CHAPTER', payload: { id: chapter.id, updates } });
                return updates;
            }
            return null;
        } catch (e: any) { 
            onSetError(e.message || "Failed to update chapter details.", chapter.id); 
            return null;
        }
        finally { setAiState(prev => ({ ...prev, isGeneratingChapter: null })); }
    };

    const onAnalyzeSnippets = async (rawText: string, characters: ICharacter[]) => {
        if (!hasAPIKey(settings.geminiApiKey)) { onSetError(API_KEY_ERROR, 'snippets'); return false; }
        setAiState(prev => ({ ...prev, isGeneratingSnippets: true, errorMessage: null }));
        try {
            const prompt = `Process this raw block of text into individual story snippets. Identify the type and tag associated characters.
            Character Directory: ${characters.map(c => `[ID: ${c.id}] Name: ${c.name}`).join(', ')}
            Input Text: ${rawText}`;
            const response = await getAI(settings.geminiApiKey).models.generateContent({ 
                model: 'gemini-1.5-flash', 
                contents: [{ role: 'user', parts: [{ text: prompt }] }], 
                config: { 
                    responseMimeType: 'application/json',
                    responseSchema: snippetsSchema
                } 
            });
            const items = JSON.parse(response.text || '[]');
            if (items) dispatch({ type: 'ADD_SNIPPETS', payload: items.map((i: any) => ({ ...i, id: generateId(), isUsed: false })) });
            return true;
        } catch (e: any) { onSetError(e.message || "Failed to analyze snippets.", 'snippets'); return false; }
        finally { setAiState(prev => ({ ...prev, isGeneratingSnippets: false })); }
    };

    const onSuggestPlacement = async (snippet: ISnippet, chapters: IChapter[]) => {
        if (!hasAPIKey(settings.geminiApiKey)) return API_KEY_ERROR;
        try {
            const prompt = `Determine the best placement for this snippet within the existing chapter structure.
            Snippet: ${snippet.cleanedText}
            Chapter Map (including character presence):
            ${chapters.map(c => `[ID: ${c.id}] Ch ${c.chapterNumber}: ${c.summary} (Characters: ${getCharacterNames(c.characterIds)})`).join('\n')}`;
            const response = await getAI(settings.geminiApiKey).models.generateContent({ 
                model: 'gemini-1.5-flash', 
                contents: [{ role: 'user', parts: [{ text: prompt }] }], 
                config: { 
                    responseMimeType: 'application/json',
                    responseSchema: snippetPlacementSchema
                } 
            });
            return JSON.parse(response.text || '[]');
        } catch (e) { return "Error finding placement suggestions."; }
    };

    const onGenerateFullAnalysis = async () => {
        if (!hasAPIKey(settings.geminiApiKey)) return onSetError(API_KEY_ERROR, 'plot');
        dispatch({ type: 'SET_PLOT_BRAINSTORM_STATE', payload: { isGeneratingPacingAndStructure: true, isGeneratingCharacters: true, isGeneratingOpportunities: true } });
        try {
            const chapText = chapters.map(c => `Chapter ${c.chapterNumber}: ${c.summary} [Characters Present: ${getCharacterNames(c.characterIds)}]`).join('\n');
            const prompt = `Conduct a comprehensive plot and character analysis for the following novel summary:
            ${chapText}`;
            const response = await getAI(settings.geminiApiKey).models.generateContent({ 
                model: 'gemini-1.5-flash', 
                contents: [{ role: 'user', parts: [{ text: prompt }] }], 
                config: { 
                    responseMimeType: 'application/json',
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            pacing: {
                                type: Type.OBJECT,
                                properties: {
                                    summary: { type: Type.STRING },
                                    points: {
                                        type: Type.ARRAY,
                                        items: {
                                            type: Type.OBJECT,
                                            properties: {
                                                chapterNumber: { type: Type.NUMBER },
                                                title: { type: Type.STRING },
                                                description: { type: Type.STRING },
                                                type: { type: Type.STRING }
                                            },
                                            required: ["chapterNumber", "title", "description", "type"]
                                        }
                                    }
                                },
                                required: ["summary", "points"]
                            },
                            characterAnalysis: { type: Type.STRING },
                            opportunityAnalysis: { type: Type.STRING }
                        },
                        required: ["pacing", "characterAnalysis", "opportunityAnalysis"]
                    }
                } 
            });
            const data = JSON.parse(response.text || '{}');
            if (data) dispatch({ type: 'SET_PLOT_BRAINSTORM_STATE', payload: { pacingAndStructureAnalysis: { summary: data.pacing.summary, plotPoints: data.pacing.points.map((p: any) => ({ ...p, id: generateId() })) }, characterAnalysis: data.characterAnalysis, opportunityAnalysis: data.opportunityAnalysis } });
        } catch (e) { onSetError("Full analysis failed.", 'plot'); }
        finally { dispatch({ type: 'SET_PLOT_BRAINSTORM_STATE', payload: { isGeneratingPacingAndStructure: false, isGeneratingCharacters: false, isGeneratingOpportunities: false } }); }
    };

    const onGenerateSocialContent = async (excerpt: Excerpt) => {
        if (!hasAPIKey(settings.geminiApiKey)) return onSetError(API_KEY_ERROR, 'social');
        dispatch({ type: 'UPDATE_SOCIAL_MEDIA_STATE', payload: { isLoading: true } });
        try {
            const chapter = chapters.find(c => c.id === excerpt.chapterId);
            const chapterContext = chapter ? `Chapter Context: ${chapter.summary} [Characters Present: ${getCharacterNames(chapter.characterIds)}]` : '';
            const char = excerpt.characterIds[0] ? characters.find(c => c.id === excerpt.characterIds[0]) : null;
            const prompt = `Generate social media marketing content based on this manuscript excerpt: "${excerpt.text}"
            ${chapterContext}
            Associated Character Focus: ${char ? char.name + ' (' + char.summary + ')' : 'General Story Mood'}
            
            IMPORTANT: Research and include a combination of popular and niche hashtags. 
            All hashtags MUST start with the '#' symbol. 
            Ensure the image prompt is vivid and cinematic.`;

            const response = await getAI(settings.geminiApiKey).models.generateContent({ 
                model: 'gemini-1.5-flash', 
                contents: [{ role: 'user', parts: [{ text: prompt }] }], 
                config: { 
                    responseMimeType: 'application/json',
                    responseSchema: socialContentSchema
                } 
            });
            const data = JSON.parse(response.text || '{}');
            if (data) {
                dispatch({ type: 'UPDATE_SOCIAL_MEDIA_STATE', payload: { generatedImagePrompt: data.imagePrompt, generatedInstagramPost: data.instagram, generatedTiktokPost: data.tiktok } });
                
                // Use pollinations.ai for reliable runtime image generation
                const seed = Math.floor(Math.random() * 1000000);
                const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(data.imagePrompt)}?width=1024&height=1792&nologo=true&seed=${seed}`;
                dispatch({ type: 'UPDATE_SOCIAL_MEDIA_STATE', payload: { generatedImageUrl: imageUrl } });
            }
        } catch (e: any) { onSetError(e.message || "Social content generation failed.", 'social'); }
        finally { dispatch({ type: 'UPDATE_SOCIAL_MEDIA_STATE', payload: { isLoading: false } }); }
    };

    const onRegenerateImage = async (imagePrompt: string, moodOnly: boolean, character?: ICharacter) => {
        if (!hasAPIKey(settings.geminiApiKey)) return null;
        dispatch({ type: 'UPDATE_SOCIAL_MEDIA_STATE', payload: { isLoading: true } });
        try {
            const prompt = moodOnly ? `A cinematic mood painting representing: ${imagePrompt}` : imagePrompt;
            const seed = Math.floor(Math.random() * 1000000);
            const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1792&nologo=true&seed=${seed}`;
            dispatch({ type: 'UPDATE_SOCIAL_MEDIA_STATE', payload: { generatedImageUrl: url } });
            return url;
        } catch (e: any) { 
            onSetError(e.message || "Image regeneration failed."); 
            return null;
        } finally { 
            dispatch({ type: 'UPDATE_SOCIAL_MEDIA_STATE', payload: { isLoading: false } }); 
        }
    };

    const onRegenerateTextAndHashtags = async (excerpt: Excerpt, platform: 'instagram' | 'tiktok') => {
        if (!hasAPIKey(settings.geminiApiKey)) return onSetError(API_KEY_ERROR, 'social');
        dispatch({ type: 'UPDATE_SOCIAL_MEDIA_STATE', payload: { isLoading: true } });
        try {
            const prompt = `Regenerate the ${platform} post text and hashtags for this excerpt: "${excerpt.text}".
            Research and include a combination of popular and niche hashtags. 
            All hashtags MUST start with the '#' symbol.`;
            
            const response = await getAI(settings.geminiApiKey).models.generateContent({ 
                model: 'gemini-1.5-flash', 
                contents: [{ role: 'user', parts: [{ text: prompt }] }], 
                config: { 
                    responseMimeType: 'application/json',
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            text: { type: Type.STRING },
                            hashtags: { type: Type.ARRAY, items: { type: Type.STRING } }
                        },
                        required: ["text", "hashtags"]
                    }
                } 
            });
            const data = JSON.parse(response.text || '{}');
            if (data) {
                if (platform === 'instagram') dispatch({ type: 'UPDATE_SOCIAL_MEDIA_STATE', payload: { generatedInstagramPost: data } });
                else dispatch({ type: 'UPDATE_SOCIAL_MEDIA_STATE', payload: { generatedTiktokPost: data } });
            }
        } catch (e) { onSetError("Text regeneration failed."); }
        finally { dispatch({ type: 'UPDATE_SOCIAL_MEDIA_STATE', payload: { isLoading: false } }); }
    };

    const onExtractExcerpts = async (chapter: IChapter, allCharacters: ICharacter[]) => {
        if (!hasAPIKey(settings.geminiApiKey)) return onSetError(API_KEY_ERROR, 'social');
        dispatch({ type: 'UPDATE_SOCIAL_MEDIA_STATE', payload: { isLoading: true } });
        try {
            const tempDiv = document.createElement('div'); tempDiv.innerHTML = chapter.content;
            const text = tempDiv.innerText.substring(0, 20000);
            const prompt = `Extract 3-5 punchy, evocative excerpts from this chapter that would make for great social media teasers.
            Characters involved should be identified by ID.
            Chapter Text: ${text}
            Character Directory: ${allCharacters.map(c => `[ID: ${c.id}] Name: ${c.name}`).join(', ')}`;
            
            const response = await getAI(settings.geminiApiKey).models.generateContent({ 
                model: 'gemini-1.5-flash', 
                contents: [{ role: 'user', parts: [{ text: prompt }] }], 
                config: { 
                    responseMimeType: 'application/json',
                    responseSchema: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                text: { type: Type.STRING },
                                characterIds: { type: Type.ARRAY, items: { type: Type.STRING } }
                            },
                            required: ["text", "characterIds"]
                        }
                    }
                } 
            });
            const items = JSON.parse(response.text || '[]');
            if (items) {
                const newExcerpts = items.map((i: any) => ({ ...i, id: generateId(), chapterId: chapter.id, type: 'ai' }));
                dispatch({ type: 'UPDATE_SOCIAL_MEDIA_STATE', payload: { excerpts: [...socialMediaState.excerpts, ...newExcerpts] } });
            }
        } catch (e) { onSetError("Excerpt extraction failed."); }
        finally { dispatch({ type: 'UPDATE_SOCIAL_MEDIA_STATE', payload: { isLoading: false } }); }
    };

    const onGeneratePostVariations = async (post: SocialPost, excerpt: Excerpt, platform: 'instagram' | 'tiktok') => {
        if (!hasAPIKey(settings.geminiApiKey)) return onSetError(API_KEY_ERROR, 'social');
        dispatch({ type: 'UPDATE_SOCIAL_MEDIA_STATE', payload: { isLoading: true, variationPlatform: platform } });
        try {
            const prompt = `Generate 3 distinct variations of this ${platform} post. 
            Original Post: ${post.text}
            Original Excerpt: ${excerpt.text}
            Research and include a combination of popular and niche hashtags for each variation. 
            All hashtags MUST start with the '#' symbol.`;
            
            const response = await getAI(settings.geminiApiKey).models.generateContent({ 
                model: 'gemini-1.5-flash', 
                contents: [{ role: 'user', parts: [{ text: prompt }] }], 
                config: { 
                    responseMimeType: 'application/json',
                    responseSchema: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                text: { type: Type.STRING },
                                hashtags: { type: Type.ARRAY, items: { type: Type.STRING } }
                            },
                            required: ["text", "hashtags"]
                        }
                    }
                } 
            });
            const items = JSON.parse(response.text || '[]');
            if (items) dispatch({ type: 'UPDATE_SOCIAL_MEDIA_STATE', payload: { postVariations: items } });
        } catch (e) { onSetError("Variations generation failed."); }
        finally { dispatch({ type: 'UPDATE_SOCIAL_MEDIA_STATE', payload: { isLoading: false } }); }
    };

    const onRefineWorldItem = async (item: IWorldItem) => {
        if (!hasAPIKey(settings.geminiApiKey)) return onSetError(API_KEY_ERROR, item.id);
        setAiState(prev => ({ ...prev, isGeneratingWorldItem: item.id }));
        try {
            const prompt = `Refine this world-building entry: "${item.name}" (${item.type}).
            Rough Notes: ${item.rawNotes}`;
            const response = await getAI(settings.geminiApiKey).models.generateContent({ 
                model: 'gemini-1.5-flash', 
                contents: [{ role: 'user', parts: [{ text: prompt }] }], 
                config: { 
                    responseMimeType: 'application/json',
                    responseSchema: worldRefinementSchema
                } 
            });
            const data = JSON.parse(response.text || '{}');
            if (data) dispatch({ type: 'UPDATE_WORLD_ITEM', payload: { id: item.id, updates: data } });
        } catch (e) { onSetError("World item refinement failed.", item.id); }
        finally { setAiState(prev => ({ ...prev, isGeneratingWorldItem: null })); }
    };

    const onDistillWorldNotes = async (text: string) => {
        if (!hasAPIKey(settings.geminiApiKey)) return onSetError(API_KEY_ERROR, 'distill');
        setAiState(prev => ({ ...prev, isDistillingWorld: true }));
        try {
            const prompt = `Distill the following world-building notes into structured entries. Identify name, type, and summarize key facts.
            Input Notes: ${text}`;
            const response = await getAI(settings.geminiApiKey).models.generateContent({ 
                model: 'gemini-1.5-flash', 
                contents: [{ role: 'user', parts: [{ text: prompt }] }], 
                config: { 
                    responseMimeType: 'application/json',
                    responseSchema: worldDistillationSchema
                } 
            });
            const items = JSON.parse(response.text || '[]');
            if (items) dispatch({ type: 'ADD_WORLD_ITEMS', payload: items.map((i: any) => ({ ...i, id: generateId(), description: '' })) });
        } catch (e) { onSetError("World notes distillation failed.", 'distill'); }
        finally { setAiState(prev => ({ ...prev, isDistillingWorld: false })); }
    };

    const onGenerateFullSynopsis = async () => {
        if (!hasAPIKey(settings.geminiApiKey)) return onSetError(API_KEY_ERROR, 'synopsis');
        dispatch({ type: 'SET_SYNOPSIS_STATE', payload: { isGeneratingMarketAnalysis: true, isGeneratingPromotionalContent: true, isGeneratingSynopsis: true } });
        try {
            const chapText = chapters.map(c => `Chapter ${c.chapterNumber}: ${c.summary}`).join('\n');
            const prompt = `Based on the following chapter summaries, generate a professional market analysis, promotional content suite, and full synopsis.
            Chapter Summaries:
            ${chapText}`;
            
            const response = await getAI(settings.geminiApiKey).models.generateContent({ 
                model: 'gemini-1.5-flash', 
                contents: [{ role: 'user', parts: [{ text: prompt }] }], 
                config: { 
                    responseMimeType: 'application/json',
                    responseSchema: synopsisSuiteSchema
                } 
            });
            const data = JSON.parse(response.text || '{}');
            if (data) dispatch({ type: 'SET_SYNOPSIS_STATE', payload: data });
        } catch (e) { onSetError("Synopsis generation failed.", 'synopsis'); }
        finally { dispatch({ type: 'SET_SYNOPSIS_STATE', payload: { isGeneratingMarketAnalysis: false, isGeneratingPromotionalContent: false, isGeneratingSynopsis: false } }); }
    };

    const onRegenerateMarketAnalysis = async () => {
        if (!hasAPIKey(settings.geminiApiKey)) return onSetError(API_KEY_ERROR, 'synopsis');
        dispatch({ type: 'SET_SYNOPSIS_STATE', payload: { isGeneratingMarketAnalysis: true } });
        try {
            const chapText = chapters.map(c => `Chapter ${c.chapterNumber}: ${c.summary}`).join('\n');
            const prompt = `Regenerate the professional market analysis (BISAC codes, keywords, tropes, comp titles) for this novel.
            Chapter Summaries:
            ${chapText}`;
            const response = await getAI(settings.geminiApiKey).models.generateContent({ 
                model: 'gemini-1.5-flash', 
                contents: [{ role: 'user', parts: [{ text: prompt }] }] 
            });
            if (response.text) dispatch({ type: 'SET_SYNOPSIS_STATE', payload: { marketAnalysis: response.text } });
        } catch (e) { onSetError("Market analysis regeneration failed."); }
        finally { dispatch({ type: 'SET_SYNOPSIS_STATE', payload: { isGeneratingMarketAnalysis: false } }); }
    };

    const onRegeneratePromotionalContent = async () => {
        if (!hasAPIKey(settings.geminiApiKey)) return onSetError(API_KEY_ERROR, 'synopsis');
        dispatch({ type: 'SET_SYNOPSIS_STATE', payload: { isGeneratingPromotionalContent: true } });
        try {
            const chapText = chapters.map(c => `Chapter ${c.chapterNumber}: ${c.summary}`).join('\n');
            const prompt = `Regenerate the promotional content (taglines, logline, reader profile) for this novel.
            Chapter Summaries:
            ${chapText}`;
            const response = await getAI(settings.geminiApiKey).models.generateContent({ 
                model: 'gemini-1.5-flash', 
                contents: [{ role: 'user', parts: [{ text: prompt }] }] 
            });
            if (response.text) dispatch({ type: 'SET_SYNOPSIS_STATE', payload: { promotionalContent: response.text } });
        } catch (e) { onSetError("Promotional content regeneration failed."); }
        finally { dispatch({ type: 'SET_SYNOPSIS_STATE', payload: { isGeneratingPromotionalContent: false } }); }
    };

    const onRegenerateSynopsis = async () => {
        if (!hasAPIKey(settings.geminiApiKey)) return onSetError(API_KEY_ERROR, 'synopsis');
        dispatch({ type: 'SET_SYNOPSIS_STATE', payload: { isGeneratingSynopsis: true } });
        try {
            const chapText = chapters.map(c => `Chapter ${c.chapterNumber}: ${c.summary}`).join('\n');
            const prompt = `Regenerate the short and long-form synopsis for this novel.
            Chapter Summaries:
            ${chapText}`;
            const response = await getAI(settings.geminiApiKey).models.generateContent({ 
                model: 'gemini-1.5-flash', 
                contents: [{ role: 'user', parts: [{ text: prompt }] }] 
            });
            if (response.text) dispatch({ type: 'SET_SYNOPSIS_STATE', payload: { synopsis: response.text } });
        } catch (e) { onSetError("Synopsis regeneration failed."); }
        finally { dispatch({ type: 'SET_SYNOPSIS_STATE', payload: { isGeneratingSynopsis: false } }); }
    };

    const onInitiateNarrativeArchitect = async (premise: string, intent: string, genre: string, targetChapters: number) => {
        if (!hasAPIKey(settings.geminiApiKey)) return onSetError(API_KEY_ERROR, 'narrativeArchitect');
        dispatch({ type: 'SET_PLOT_BRAINSTORM_STATE', payload: { narrativeArchitect: { ...plotBrainstormState.narrativeArchitect, isGenerating: true, error: null } } });
        try {
            const existingChaptersContext = chapters
                .filter(c => c.summary || c.title !== 'Chapter')
                .map(c => `[Existing Chapter ${c.chapterNumber}] Title: ${c.title}, Summary: ${c.summary}`)
                .join('\n');
            
            const existingCharactersContext = characters
                .filter(c => c.name !== 'New Character')
                .map(c => `[Existing Character] Name: ${c.name}, Summary: ${c.summary}`)
                .join('\n');

            const prompt = `Role: Narrative Architect for Novelis.
            Goal: Help user construct a 3-act novel structure.
            
            ${existingChaptersContext ? `EXISTING CHAPTERS (Preserve or evolve these as context):\n${existingChaptersContext}\n` : ''}
            ${existingCharactersContext ? `EXISTING CHARACTERS (Use these characters in the architecture):\n${existingCharactersContext}\n` : ''}

            User-Provided Premise: ${premise}
            User-Provided Intent: ${intent}
            User-Provided Genre: ${genre}
            Target Chapter Count: ${targetChapters}
            
            Task 1 (Macro-Initiation): Propose a macro-level distribution of the three acts across the ${targetChapters} chapters.
            Provide: act1 count, act2 count, act3 count.
            Task 2 (Iterative Expansion): Generate a list of ${targetChapters} chapter placeholders, each with a single, punchy tagline and summary.
            Maintain "zoomed out" perspective on structural integrity.
            
            Response must be JSON.`;

            const response = await getAI(settings.geminiApiKey).models.generateContent({ 
                model: 'gemini-1.5-flash', 
                contents: [{ role: 'user', parts: [{ text: prompt }] }], 
                config: { 
                    responseMimeType: 'application/json',
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            distribution: {
                                type: Type.OBJECT,
                                properties: {
                                    act1: { type: Type.NUMBER },
                                    act2: { type: Type.NUMBER },
                                    act3: { type: Type.NUMBER }
                                },
                                required: ["act1", "act2", "act3"]
                            },
                            chapters: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        title: { type: Type.STRING },
                                        tagline: { type: Type.STRING },
                                        act: { type: Type.NUMBER },
                                        summary: { type: Type.STRING }
                                    },
                                    required: ["title", "tagline", "act", "summary"]
                                }
                            }
                        },
                        required: ["distribution", "chapters"]
                    }
                } 
            });
            const data = JSON.parse(response.text || '{}');
            if (data) {
                dispatch({ 
                    type: 'SET_PLOT_BRAINSTORM_STATE', 
                    payload: { 
                        narrativeArchitect: { 
                            ...plotBrainstormState.narrativeArchitect, 
                            premise, intent, genre, targetChapterCount: targetChapters,
                            proposedDistribution: data.distribution,
                            chapters: data.chapters.map((c: any) => ({ ...c, id: generateId() })),
                            isGenerating: false 
                        } 
                    } 
                });
            }
        } catch (e: any) { 
            dispatch({ type: 'SET_PLOT_BRAINSTORM_STATE', payload: { narrativeArchitect: { ...plotBrainstormState.narrativeArchitect, isGenerating: false, error: e.message } } });
        }
    };

    const onExpandNarrativeArchitect = async (feedback?: string) => {
        if (!hasAPIKey(settings.geminiApiKey)) return onSetError(API_KEY_ERROR, 'narrativeArchitect');
        const state = plotBrainstormState.narrativeArchitect;
        dispatch({ type: 'SET_PLOT_BRAINSTORM_STATE', payload: { narrativeArchitect: { ...state, isGenerating: true, error: null } } });
        try {
            const prompt = `Role: Narrative Architect for Novelis.
            Current Progress: ${JSON.stringify(state.chapters)}
            User Feedback/Refinement Request: ${feedback || "Refine the current structure for better pacing."}
            
            Adjust the chapters to reflect the feedback while maintaining the 3-act structure and overall integrity.`;

            const response = await getAI(settings.geminiApiKey).models.generateContent({ 
                model: 'gemini-1.5-flash', 
                contents: [{ role: 'user', parts: [{ text: prompt }] }], 
                config: { 
                    responseMimeType: 'application/json',
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            chapters: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        title: { type: Type.STRING },
                                        tagline: { type: Type.STRING },
                                        act: { type: Type.NUMBER },
                                        summary: { type: Type.STRING }
                                    },
                                    required: ["title", "tagline", "act", "summary"]
                                }
                            }
                        },
                        required: ["chapters"]
                    }
                } 
            });
            const data = JSON.parse(response.text || '{}');
            if (data) {
                dispatch({ 
                    type: 'SET_PLOT_BRAINSTORM_STATE', 
                    payload: { 
                        narrativeArchitect: { 
                            ...state, 
                            chapters: data.chapters.map((c: any) => ({ ...c, id: generateId() })),
                            isGenerating: false 
                        } 
                    } 
                });
            }
        } catch (e: any) { 
            dispatch({ type: 'SET_PLOT_BRAINSTORM_STATE', payload: { narrativeArchitect: { ...state, isGenerating: false, error: e.message } } });
        }
    };

    const onApplyNarrativeArchitect = () => {
        const archChapters = plotBrainstormState.narrativeArchitect.chapters;
        if (archChapters.length === 0) return;
        
        const newChapters = archChapters.map((c, index) => ({
            id: generateId(),
            chapterNumber: index + 1,
            title: c.title,
            summary: c.summary,
            tagline: c.tagline,
            act: c.act,
            content: '',
            outline: '',
            analysis: '',
            keywords: [],
            characterIds: [],
            snippetIds: [],
            notes: '',
            rawNotes: '',
            pacing: { tension: 5, speed: 5 }
        }));
        
        dispatch({ type: 'SET_CHAPTERS', payload: newChapters as any });
        dispatch({ type: 'SET_PLOT_BRAINSTORM_STATE', payload: { narrativeArchitect: { ...plotBrainstormState.narrativeArchitect, isOpen: false } } });
    };

    const contextValue: any = {
        ...aiState, 
        onGenerateProfile, 
        onUpdateProfile, 
        onGenerateChapterDetails, 
        onUpdateChapterFromManuscript, 
        onAnalyzeSnippets, 
        onSuggestPlacement, 
        onGenerateFullAnalysis,
        onGenerateFullSynopsis,
        onRegenerateMarketAnalysis,
        onRegeneratePromotionalContent,
        onRegenerateSynopsis,
        onGenerateSocialContent, 
        onRegenerateImage,
        onRegenerateTextAndHashtags,
        onExtractExcerpts,
        onGeneratePostVariations,
        onRefineWorldItem, 
        onDistillWorldNotes, 
        onInitiateNarrativeArchitect,
        onExpandNarrativeArchitect,
        onApplyNarrativeArchitect,
        onSetError,
        onGeneratePacingAnalysis: async () => {
             if (!hasAPIKey(settings.geminiApiKey)) return onSetError(API_KEY_ERROR, 'pacing');
             dispatch({ type: 'UPDATE_ASSEMBLY_VIEW_STATE', payload: { isGeneratingPacingAnalysis: true } });
             try {
                 const prompt = `Analyze the pacing of the entire novel based on chapter summaries. Score each on speed and tension.
                 Story Structure (including character presence): 
                 ${chapters.map(c => `[ID: ${c.id}] Ch ${c.chapterNumber}: ${c.summary} (Characters: ${getCharacterNames(c.characterIds)})`).join('\n')}`;
                 const res = await getAI(settings.geminiApiKey).models.generateContent({ 
                     model: 'gemini-1.5-flash', 
                     contents: [{ role: 'user', parts: [{ text: prompt }] }], 
                     config: { 
                         responseMimeType: 'application/json',
                         responseSchema: pacingAnalysisSchema
                     } 
                 });
                 const data = JSON.parse(res.text || '[]');
                 if (data) dispatch({ type: 'UPDATE_ASSEMBLY_VIEW_STATE', payload: { pacingAnalysis: data } });
             } catch (e) { onSetError("Pacing analysis failed."); }
             finally { dispatch({ type: 'UPDATE_ASSEMBLY_VIEW_STATE', payload: { isGeneratingPacingAnalysis: false } }); }
        }
    };

    return <AssemblyAIContext.Provider value={contextValue}>{children}</AssemblyAIContext.Provider>;
};

interface AssemblyProps {
    settings: EditorSettings;
    onSettingsChange: (newSettings: Partial<EditorSettings>) => void;
    directoryHandle: FileSystemDirectoryHandle | null;
    onDirectoryHandleChange: (handle: FileSystemDirectoryHandle | null) => void;
    activePanel: AssemblyPanel;
    onPanelChange: (panel: AssemblyPanel) => void;
}

export const Assembly: React.FC<AssemblyProps> = ({ settings, onSettingsChange, directoryHandle, onDirectoryHandleChange, activePanel, onPanelChange }) => {
    const { chapters, characters, snippets, worldItems, assemblyState, plotBrainstormState, synopsisState } = useNovelState();
    const dispatch = useNovelDispatch();
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [deleteCharacterTarget, setDeleteCharacterTarget] = useState<ICharacter | null>(null);
    const [deleteChapterTarget, setDeleteChapterTarget] = useState<IChapter | null>(null);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);

    const handleSelect = useCallback((id: string, e: React.MouseEvent) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (e.ctrlKey || e.metaKey) {
                if (next.has(id)) next.delete(id);
                else next.add(id);
            } else {
                next.clear();
                next.add(id);
            }
            return next;
        });
    }, []);

    const handleAdd = () => {
        switch(activePanel) {
            case 'characters': dispatch({ type: 'ADD_CHARACTER', payload: {} }); break;
            case 'chapters': dispatch({ type: 'ADD_CHAPTER', payload: {} }); break;
            case 'snippets': dispatch({ type: 'SET_SNIPPETS', payload: [...snippets, { id: generateId(), cleanedText: '', type: 'Uncategorized', characterIds: [], isUsed: false }] }); break;
            case 'world': dispatch({ type: 'ADD_WORLD_ITEM', payload: {} }); break;
        }
    };

    return (
        <AssemblyAIProvider settings={settings}>
            <div className="h-full flex flex-col overflow-hidden" style={{ fontFamily: settings.assemblyFontFamily }}>
                <AssemblyHeader 
                    settings={settings} activePanel={activePanel} onPanelChange={onPanelChange} onAdd={handleAdd} 
                    onSettingsChange={onSettingsChange} onExport={() => {}} onImport={() => setIsImportModalOpen(true)}
                />
                <div className="flex-grow min-h-0">
                    {activePanel === 'chapters' && (
                        <ChaptersPanel 
                            chapters={chapters} characters={characters} snippets={snippets} settings={settings} 
                            tileBackgroundStyle={settings.assemblyTileStyle || 'solid'} selectedIds={selectedIds} onSelect={handleSelect} 
                            onUpdateChapter={(id, updates) => dispatch({ type: 'UPDATE_CHAPTER', payload: { id, updates } })} 
                            onDeleteRequest={setDeleteChapterTarget} onSetChapters={(c) => dispatch({ type: 'SET_CHAPTERS', payload: c })} 
                            directoryHandle={directoryHandle} isLinkPanelOpen={assemblyState.isChapterLinkPanelOpen} 
                            onToggleLinkPanel={() => dispatch({ type: 'UPDATE_ASSEMBLY_VIEW_STATE', payload: { isChapterLinkPanelOpen: !assemblyState.isChapterLinkPanelOpen } })} 
                            expandedChapterId={assemblyState.expandedChapterId} setExpandedChapterId={(id) => dispatch({ type: 'UPDATE_ASSEMBLY_VIEW_STATE', payload: { expandedChapterId: id } })} 
                            pacingAnalysis={assemblyState.pacingAnalysis} isGeneratingPacingAnalysis={assemblyState.isGeneratingPacingAnalysis}
                            zoomLevel={assemblyState.chapterZoomLevel || 0}
                            onZoomChange={(level) => dispatch({ type: 'UPDATE_ASSEMBLY_VIEW_STATE', payload: { chapterZoomLevel: level } })}
                            isContinuousView={!!assemblyState.isContinuousView}
                            onToggleContinuousView={() => dispatch({ type: 'UPDATE_ASSEMBLY_VIEW_STATE', payload: { isContinuousView: !assemblyState.isContinuousView, isSpreadsheetView: false } })}
                            isSpreadsheetView={!!assemblyState.isSpreadsheetView}
                            onToggleSpreadsheetView={() => dispatch({ type: 'UPDATE_ASSEMBLY_VIEW_STATE', payload: { isSpreadsheetView: !assemblyState.isSpreadsheetView, isContinuousView: false } })}
                        />
                    )}
                    {activePanel === 'characters' && (
                        <CharactersPanel 
                            characters={characters} settings={settings} tileBackgroundStyle={settings.assemblyTileStyle || 'solid'} 
                            selectedIds={selectedIds} onSelect={handleSelect} onUpdate={(id, updates) => dispatch({ type: 'UPDATE_CHARACTER', payload: { id, updates } })} 
                            onDeleteRequest={setDeleteCharacterTarget} onSetCharacters={(c) => dispatch({ type: 'SET_CHARACTERS', payload: c })} 
                            expandedCharacterId={assemblyState.expandedCharacterId} setExpandedCharacterId={(id) => dispatch({ type: 'UPDATE_ASSEMBLY_VIEW_STATE', payload: { expandedCharacterId: id } })}
                            zoomLevel={assemblyState.characterZoomLevel || 0}
                            onZoomChange={(level) => dispatch({ type: 'UPDATE_ASSEMBLY_VIEW_STATE', payload: { characterZoomLevel: level } })}
                        />
                    )}
                    {activePanel === 'snippets' && <SnippetsPanel settings={settings} />}
                    {activePanel === 'social' && <SocialMediaPanel settings={settings} />}
                    {activePanel === 'plot' && <PlotBrainstormPanel settings={settings} plotState={plotBrainstormState} />}
                    {activePanel === 'synopsis' && <SynopsisPanel settings={settings} synopsisState={synopsisState} />}
                    {activePanel === 'world' && <WorldPanel settings={settings} />}
                </div>

                {deleteCharacterTarget && (
                    <DeleteCharacterModal 
                        character={deleteCharacterTarget} settings={settings} onCancel={() => setDeleteCharacterTarget(null)} 
                        onConfirm={() => { dispatch({ type: 'DELETE_CHARACTER', payload: deleteCharacterTarget.id }); setDeleteCharacterTarget(null); }} 
                    />
                )}
                {deleteChapterTarget && (
                    <DeleteChapterModal 
                        chapter={deleteChapterTarget} settings={settings} onCancel={() => setDeleteChapterTarget(null)} 
                        onConfirm={() => { dispatch({ type: 'DELETE_CHAPTER', payload: deleteChapterTarget.id }); setDeleteChapterTarget(null); }} 
                    />
                )}
                {isImportModalOpen && (
                    <ImportNovelModal 
                        settings={settings} onClose={() => setIsImportModalOpen(false)} directoryHandle={directoryHandle} 
                    />
                )}
                {plotBrainstormState?.narrativeArchitect?.isOpen && (
                    <NarrativeArchitectModal 
                        settings={settings} 
                        state={plotBrainstormState.narrativeArchitect}
                        onClose={() => dispatch({ type: 'SET_PLOT_BRAINSTORM_STATE', payload: { narrativeArchitect: { ...plotBrainstormState.narrativeArchitect, isOpen: false } } })}
                    />
                )}
            </div>
        </AssemblyAIProvider>
    );
};