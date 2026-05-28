
import React, { useState, useRef, useCallback, useLayoutEffect, useEffect, useMemo } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import type { EditorSettings, ICharacter, IChapter, ISnippet, TileBackgroundStyle, ChapterPacingInfo } from '../../types';
import { useNovelDispatch, useNovelState } from '../../NovelContext';
import { useAssemblyAI } from './AssemblyAIContext';
import MarkdownRenderer from '../common/MarkdownRenderer';
import { ChevronDownIcon, BookOpenIcon, CameraIcon, LockClosedIconOutline, LockOpenIconOutline, RevertIcon, SparklesIconOutline, TrashIconOutline, StarIcon, XIcon, LinkIcon, ViewGridIcon, ChevronUpIcon, BrushIcon, SpinnerIcon, CheckCircleIcon, PaperAirplaneIcon, UserCircleIcon } from '../common/Icons';
import { isColorLight, shadeColor, getImageColor } from '../../utils/colorUtils';
import { generateBriefingHtml } from '../../utils/manuscriptUtils';
import { AIError } from '../common/AIError';

// --- UTILS ---
const useAutosizeTextArea = (
  textAreaRef: React.RefObject<HTMLTextAreaElement>,
  value: string,
  isEnabled: boolean,
  scrollContainerRef: React.RefObject<HTMLDivElement>,
  options?: { isAnimated?: boolean }
) => {
  const isAnimated = options?.isAnimated ?? false;
  const previousIsEnabledRef = useRef(isEnabled);

  useLayoutEffect(() => {
    const textArea = textAreaRef.current;
    const scrollContainer = scrollContainerRef.current;
    if (!isEnabled || !textArea || !scrollContainer) {
      if (textArea && !isEnabled) textArea.style.height = '';
      previousIsEnabledRef.current = isEnabled;
      return;
    }
    const performResize = () => {
        if (textArea.offsetParent === null) return;
        const oldHeight = textArea.scrollHeight;
        textArea.style.height = 'auto';
        textArea.style.height = `${textArea.scrollHeight}px`;
        if (textArea.getBoundingClientRect().top < scrollContainer.getBoundingClientRect().top) {
            scrollContainer.scrollTop += (textArea.scrollHeight - oldHeight);
        }
    };
    if (isEnabled && !previousIsEnabledRef.current && isAnimated) {
      setTimeout(performResize, 700);
    } else {
      performResize();
    }
    previousIsEnabledRef.current = true;
  }, [value, isEnabled, textAreaRef, scrollContainerRef, isAnimated]);
};

const createDragGhost = (count: number, settings: EditorSettings): HTMLElement => {
    const ghost = document.createElement('div');
    ghost.style.position = 'absolute';
    ghost.style.top = '-1000px';
    ghost.style.padding = '8px 16px';
    ghost.style.borderRadius = '99px';
    ghost.style.backgroundColor = settings.accentColor || '#2563eb';
    ghost.style.color = '#FFFFFF';
    ghost.style.fontFamily = 'Inter, sans-serif';
    ghost.style.fontSize = '12px';
    ghost.style.fontWeight = 'bold';
    ghost.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.4)';
    ghost.style.zIndex = '9999';
    ghost.textContent = count > 1 ? `Moving ${count} Chapters` : 'Moving Chapter';
    return ghost;
};

// --- COMPONENTS ---

const PacingHeatmap: React.FC<{ analysis: ChapterPacingInfo[]; settings: EditorSettings; }> = ({ analysis, settings }) => {
    const [tooltip, setTooltip] = useState<{ content: string; x: number; y: number } | null>(null);
    const scoreToColor = (score: number) => {
        if (score < 0) {
            const saturation = Math.abs(score) * 80;
            return `hsl(220, ${saturation}%, 60%)`;
        } else {
            const saturation = score * 80;
            return `hsl(0, ${saturation}%, 60%)`;
        }
    };
    return (
        <div className="relative mb-8">
            <h4 className="text-xl font-bold flex items-center gap-3 mb-4 select-none" style={{ color: settings.textColor }}>
                <SpinnerIcon className="h-6 w-6" style={{ color: settings.accentColor }} />
                Pacing Heatmap
            </h4>
            <div className="flex w-full h-8 rounded-md overflow-hidden bg-black/20" onMouseLeave={() => setTooltip(null)}>
                {analysis.map(info => (
                    <div
                        key={info.chapterId}
                        className="flex-grow h-full transition-all duration-200 hover:scale-y-150 hover:z-10 cursor-help"
                        style={{ backgroundColor: scoreToColor(info.pacingScore) }}
                        onMouseMove={(e) => setTooltip({ 
                            content: `<strong>Ch ${info.chapterNumber}: ${info.title}</strong><br/>Score: ${info.pacingScore.toFixed(2)}<br/><em>${info.justification}</em>`, 
                            x: e.clientX, y: e.clientY 
                        })}
                    />
                ))}
            </div>
            {tooltip && (
                <div className="fixed z-50 p-3 rounded-lg shadow-2xl text-xs backdrop-blur-md border border-white/10"
                    style={{ top: tooltip.y + 20, left: tooltip.x + 20, backgroundColor: `${settings.toolbarBg}F2`, color: settings.toolbarText, maxWidth: '280px', pointerEvents: 'none' }}
                    dangerouslySetInnerHTML={{ __html: tooltip.content }}
                />
            )}
        </div>
    );
};

interface ChapterTileProps {
    chapter: IChapter;
    allCharacters: ICharacter[];
    snippets: ISnippet[];
    settings: EditorSettings;
    isExpanded: boolean;
    isSelected: boolean;
    onSelect: (id: string, e: React.MouseEvent) => void;
    onToggleExpand: (id: string) => void;
    onUpdate: (id: string, updates: Partial<IChapter>) => void;
    onDeleteRequest: (chapter: IChapter) => void;
    draggableProps: any;
    isDragging: boolean;
    tileBackgroundStyle: TileBackgroundStyle;
    scrollContainerRef: React.RefObject<HTMLDivElement>;
}

const ChapterTile: React.FC<ChapterTileProps> = React.memo(({
    chapter, allCharacters, snippets, settings, isExpanded, isSelected, onSelect, onToggleExpand, onUpdate, onDeleteRequest, draggableProps, isDragging, tileBackgroundStyle, scrollContainerRef
}) => {
    const dispatch = useNovelDispatch();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { isGeneratingChapter, errorId, errorMessage, onGenerateChapterDetails, onUpdateChapterFromManuscript } = useAssemblyAI();
    const isGenerating = isGeneratingChapter === chapter.id;

    const [localTitle, setLocalTitle] = useState(chapter.title);
    const [summary, setSummary] = useState(chapter.summary);
    const [rawNotes, setRawNotes] = useState(chapter.rawNotes);
    const [outline, setOutline] = useState(chapter.outline);
    const [analysis, setAnalysis] = useState(chapter.analysis || '');

    const [isEditingOutline, setIsEditingOutline] = useState(() => !String(chapter.outline || '').trim());
    const [isEditingAnalysis, setIsEditingAnalysis] = useState(() => !String(chapter.analysis || '').trim());
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [showUpdateConfirm, setShowUpdateConfirm] = useState(false);
    const titleInputRef = useRef<HTMLTextAreaElement>(null);

    const summaryRef = useRef<HTMLTextAreaElement>(null);
    const rawNotesRef = useRef<HTMLTextAreaElement>(null);
    const outlineRef = useRef<HTMLTextAreaElement>(null);
    const analysisRef = useRef<HTMLTextAreaElement>(null);

    useAutosizeTextArea(summaryRef, summary, isExpanded, scrollContainerRef, { isAnimated: true });
    useAutosizeTextArea(rawNotesRef, rawNotes, isExpanded, scrollContainerRef, { isAnimated: true });
    useAutosizeTextArea(outlineRef, outline, isExpanded, scrollContainerRef, { isAnimated: true });
    useAutosizeTextArea(analysisRef, analysis, isExpanded, scrollContainerRef, { isAnimated: true });
    useAutosizeTextArea(titleInputRef, localTitle, isEditingTitle, scrollContainerRef, { isAnimated: false });

    const debouncedUpdate = useDebouncedCallback((updates: Partial<IChapter>) => {
        onUpdate(chapter.id, updates);
    }, 500);

    useEffect(() => {
        setLocalTitle(chapter.title);
        setSummary(chapter.summary);
        setRawNotes(chapter.rawNotes);
        setOutline(chapter.outline);
        setAnalysis(chapter.analysis || '');

        if (!String(chapter.outline || '').trim()) {
            setIsEditingOutline(true);
        }
        if (!String(chapter.analysis || '').trim()) {
            setIsEditingAnalysis(true);
        }
    }, [chapter]);

    useEffect(() => {
        if (isEditingTitle && titleInputRef.current) {
            titleInputRef.current.focus();
            titleInputRef.current.select();
        }
    }, [isEditingTitle]);

    const handleTitleUpdate = () => {
        setIsEditingTitle(false);
        const trimmedTitle = localTitle.trim();
        if (trimmedTitle && trimmedTitle !== chapter.title) {
            onUpdate(chapter.id, { title: trimmedTitle });
        } else if (!trimmedTitle) {
            setLocalTitle(chapter.title);
        }
    };

    const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            e.currentTarget.blur();
        }
        if (e.key === 'Escape') {
            e.preventDefault();
            setLocalTitle(chapter.title);
            setIsEditingTitle(false);
        }
    };

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = async (loadEvent) => {
                const photoUrl = loadEvent.target?.result as string;
                try {
                    const imageColor = await getImageColor(photoUrl);
                    onUpdate(chapter.id, { photo: photoUrl, imageColor: imageColor, isPhotoLocked: true });
                } catch (err) {
                    onUpdate(chapter.id, { photo: photoUrl, isPhotoLocked: true });
                }
            };
            reader.readAsDataURL(file);
        }
    };
    
    const handleGenerateDetails = () => {
        if (!rawNotes.trim()) return;
        onGenerateChapterDetails(chapter, rawNotes);
        setIsEditingOutline(false);
        setIsEditingAnalysis(false);
    }
    
    const handleUpdateFromManuscript = () => {
        onUpdateChapterFromManuscript(chapter);
        setShowUpdateConfirm(false);
    };

    const handleSendBriefToManuscript = () => {
        const briefingHtml = generateBriefingHtml(chapter, allCharacters, snippets);
        const existingContent = chapter.content || '<div><br></div>';
        if (existingContent.includes('[ CHAPTER BRIEFING ]')) {
             if (!confirm("This chapter already contains a briefing. Add another one?")) return;
        }
        onUpdate(chapter.id, { content: briefingHtml + existingContent });
    };

    const handleRevertDetails = () => {
        if (chapter.previousDetails) {
            onUpdate(chapter.id, { ...chapter.previousDetails, previousDetails: undefined });
        }
    };

    const handleToggleLock = (e: React.MouseEvent) => {
        e.stopPropagation();
        onUpdate(chapter.id, { isPhotoLocked: !chapter.isPhotoLocked });
    };

    const handleCycleAccentStyle = (e: React.MouseEvent) => {
        e.stopPropagation();
        const styles: ('left-top-ingress' | 'outline' | 'corner-diagonal')[] = ['left-top-ingress', 'outline', 'corner-diagonal'];
        const currentStyle = chapter.accentStyle || 'left-top-ingress';
        const currentIndex = styles.indexOf(currentStyle);
        const nextStyle = styles[(currentIndex + 1) % styles.length];
        onUpdate(chapter.id, { accentStyle: nextStyle });
    };

    const tileBorderColor = chapter.imageColor || settings.toolbarInputBorderColor;
    const isDarkMode = !isColorLight(settings.textColor);
    const secondaryButtonBg = shadeColor(settings.toolbarButtonBg || '#374151', isDarkMode ? 10 : -10);
    const secondaryButtonHoverBg = shadeColor(settings.toolbarButtonBg || '#374151', isDarkMode ? 20 : -10);
    
    const linkedCharacters = useMemo(() => {
        return (chapter.characterIds || [])
            .map(id => allCharacters.find(c => c.id === id))
            .filter((c): c is ICharacter => !!c);
    }, [chapter.characterIds, allCharacters]);

    const linkedSnippets = useMemo(() => {
        return (chapter.linkedSnippetIds || [])
            .map(id => snippets.find(s => s.id === id))
            .filter((s): s is ISnippet => !!s);
    }, [chapter.linkedSnippetIds, snippets]);
    
    const accentColor = chapter.imageColor || settings.accentColor;

    const backgroundStyle = useMemo(() => {
        const baseColor = settings.toolbarButtonBg || '#374151';
        const secondaryColor = shadeColor(baseColor, isDarkMode ? 7 : -7);
        switch (tileBackgroundStyle) {
            case 'diagonal': return { background: `linear-gradient(to top left, ${baseColor} 49.9%, ${secondaryColor} 50.1%)` };
            case 'horizontal': return { background: `linear-gradient(to bottom, ${isDarkMode ? secondaryColor : baseColor} 33.3%, ${isDarkMode ? baseColor : secondaryColor} 33.3%)` };
            default: return { backgroundColor: baseColor };
        }
    }, [tileBackgroundStyle, settings.toolbarButtonBg, isDarkMode]);

    if (isExpanded) {
        return (
            <div 
                {...draggableProps}
                className={`relative transition-all duration-500 ease-[cubic-bezier(0.2,0,0,1)] col-span-full ${isDragging ? 'opacity-20 grayscale scale-95 blur-[1px]' : 'opacity-100 scale-100'}`}
            >
                <input type="file" accept="image/png, image/jpeg" ref={fileInputRef} onChange={handlePhotoUpload} className="hidden" />
                <div
                    onClick={(e) => onSelect(chapter.id, e)}
                    className="relative rounded-lg shadow-md transition-shadow duration-300 ease-in-out z-10 flex flex-col border-4"
                    style={{
                        ...backgroundStyle,
                        color: settings.textColor,
                        borderColor: isSelected ? settings.accentColor : (chapter.accentStyle === 'outline' ? accentColor : 'transparent'),
                    }}
                >
                    {(chapter.accentStyle === 'left-top-ingress' || !chapter.accentStyle) && (
                        <div className="absolute top-0 left-0 w-[6px] h-1/3" style={{backgroundColor: accentColor}}></div>
                    )}
                    {chapter.accentStyle === 'corner-diagonal' && (
                        <div className="absolute bottom-0 right-0" style={{ width: 0, height: 0, borderBottom: `48px solid ${accentColor}`, borderLeft: '48px solid transparent', }}></div>
                    )}

                    {/* Header - Mirroring Character Aesthetics */}
                    <div className="flex w-full items-start gap-6 p-6">
                        <div className="min-w-0 flex-grow">
                            <div className="flex items-center gap-3 mb-2">
                                <span className="text-4xl font-black opacity-30">{chapter.chapterNumber}.</span>
                                {isEditingTitle ? (
                                    <textarea
                                        ref={titleInputRef} value={localTitle} onChange={e => setLocalTitle(e.target.value)}
                                        onBlur={handleTitleUpdate} onKeyDown={handleTitleKeyDown} onClick={e => e.stopPropagation()}
                                        className="font-bold text-3xl w-full p-0 border-none resize-none outline-none block bg-transparent"
                                        style={{ color: settings.textColor, lineHeight: '1.2' }} rows={1}
                                    />
                                ) : (
                                    <h3 onClick={(e) => { e.stopPropagation(); setIsEditingTitle(true); }} className="font-bold text-3xl cursor-pointer truncate" title={chapter.title}>
                                        {chapter.title}
                                    </h3>
                                )}
                            </div>
                            {chapter.summary && <p className="text-lg mt-1 italic opacity-90 line-clamp-2">"{chapter.summary}"</p>}
                            {chapter.keywords && chapter.keywords.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-3">
                                    {chapter.keywords.map(kw => (
                                        <span key={kw} className="px-2 py-1 rounded text-xs" style={{backgroundColor: shadeColor(settings.toolbarButtonBg || '#374151', 10), color: `${settings.textColor}B3`}}>{kw}</span>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="relative w-36 h-36 flex-shrink-0 z-20">
                            <div 
                                className="absolute top-0 right-0 w-36 h-36 rounded-xl shadow-sm transition-all duration-300 ease-in-out origin-top-right hover:scale-[2.0] hover:z-50 hover:shadow-2xl cursor-pointer group"
                                onClick={() => fileInputRef.current?.click()}
                                style={{ backgroundColor: shadeColor(settings.toolbarButtonBg || '#374151', -5) }}
                            >
                                <div className="w-full h-full rounded-xl overflow-hidden border-2" style={{ borderColor: tileBorderColor }}>
                                     {chapter.photo ? (
                                        <img src={chapter.photo} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-black/10">
                                            <BookOpenIcon className="h-1/2 w-1/2 opacity-30"/>
                                        </div>
                                    )}
                                </div>
                                <div 
                                    className="absolute top-2 right-2 p-1.5 rounded-full transition-all duration-200 z-20 shadow-md"
                                    style={{ backgroundColor: chapter.isPhotoLocked ? settings.accentColor : secondaryButtonBg, color: chapter.isPhotoLocked ? 'white' : settings.toolbarText }}
                                    onClick={handleToggleLock}
                                    title={chapter.isPhotoLocked ? "Unlock photo" : "Lock photo"}
                                >
                                    {chapter.isPhotoLocked ? <LockClosedIconOutline className="h-3 w-3" /> : <LockOpenIconOutline className="h-3 w-3" />}
                                </div>
                                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-2 pt-6 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-b-xl">
                                     <div className="flex items-center gap-1 text-white text-[10px] font-medium">
                                        <CameraIcon className="h-3 w-3"/>
                                        <span>Update Scene</span>
                                     </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 border-t space-y-8" style={{ borderColor: `${tileBorderColor}80`}}>
                        {linkedCharacters.length > 0 && (
                            <div>
                                <label className="block text-sm font-semibold mb-3 opacity-80 uppercase tracking-wider">Characters in Scene</label>
                                <div className="flex flex-wrap gap-3">
                                    {linkedCharacters.map(char => (
                                        <div key={char.id} className="flex items-center gap-3 p-2 pr-4 rounded-lg group" style={{ backgroundColor: settings.backgroundColor }}>
                                            <div className="h-10 w-10 rounded-full bg-cover bg-center flex-shrink-0 border-2" style={{ backgroundImage: char.photo ? `url(${char.photo})` : undefined, backgroundColor: char.imageColor, borderColor: char.imageColor || 'transparent' }}>
                                               {!char.photo && <UserCircleIcon className="h-full w-full opacity-50"/>}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-semibold text-sm truncate">{char.name}</p>
                                                <p className="text-[10px] opacity-60 truncate">{char.tagline}</p>
                                            </div>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); onUpdate(chapter.id, { characterIds: (chapter.characterIds || []).filter(id => id !== char.id) }); }}
                                                className="ml-2 p-1 rounded-full bg-red-500/20 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <XIcon className="h-3 w-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-semibold mb-2 opacity-80 uppercase tracking-wider">Summary</label>
                                    <textarea
                                        ref={summaryRef} value={summary}
                                        onChange={e => { setSummary(e.target.value); debouncedUpdate({ summary: e.target.value }); }}
                                        className="w-full p-3 rounded-lg border resize-none overflow-hidden"
                                        style={{ borderColor: tileBorderColor, color: settings.textColor, backgroundColor: settings.backgroundColor }}
                                        rows={3}
                                    />
                                </div>
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="block text-sm font-semibold opacity-80 uppercase tracking-wider">Beat Outline</label>
                                        <button onClick={() => setIsEditingOutline(p => !p)} className="text-[10px] px-2 py-1 rounded-md uppercase font-bold tracking-tighter" style={{ backgroundColor: settings.toolbarButtonBg, color: settings.toolbarText }}>
                                            {isEditingOutline ? 'Preview' : 'Edit'}
                                        </button>
                                    </div>
                                    {isEditingOutline ? (
                                        <textarea
                                            ref={outlineRef} value={outline}
                                            onChange={e => { setOutline(e.target.value); debouncedUpdate({ outline: e.target.value }); }}
                                            className="w-full p-3 rounded-lg border resize-none overflow-hidden font-mono text-sm"
                                            style={{ borderColor: tileBorderColor, color: settings.textColor, backgroundColor: settings.backgroundColor }}
                                            rows={8}
                                        />
                                    ) : (
                                        <div className="w-full p-4 rounded-lg border max-h-96 overflow-y-auto" style={{ borderColor: tileBorderColor, color: settings.textColor, backgroundColor: settings.backgroundColor }}>
                                            <MarkdownRenderer source={outline} settings={settings} />
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="block text-sm font-semibold opacity-80 uppercase tracking-wider">Story Analysis</label>
                                        <button onClick={() => setIsEditingAnalysis(p => !p)} className="text-[10px] px-2 py-1 rounded-md uppercase font-bold tracking-tighter" style={{ backgroundColor: settings.toolbarButtonBg, color: settings.toolbarText }}>
                                            {isEditingAnalysis ? 'Preview' : 'Edit'}
                                        </button>
                                    </div>
                                    {isEditingAnalysis ? (
                                        <textarea
                                            ref={analysisRef} value={analysis}
                                            onChange={e => { setAnalysis(e.target.value); debouncedUpdate({ analysis: e.target.value }); }}
                                            className="w-full p-3 rounded-lg border resize-none overflow-hidden"
                                            style={{ borderColor: tileBorderColor, color: settings.textColor, backgroundColor: settings.backgroundColor }}
                                            rows={8}
                                            placeholder="AI-generated analysis of conflict, stakes, etc."
                                        />
                                    ) : (
                                        <div className="w-full p-4 rounded-lg border max-h-96 overflow-y-auto" style={{ borderColor: tileBorderColor, color: settings.textColor, backgroundColor: settings.backgroundColor }}>
                                            <MarkdownRenderer source={analysis} settings={settings} />
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold mb-2 opacity-80 uppercase tracking-wider">Rough Notes</label>
                                    <textarea
                                        ref={rawNotesRef} value={rawNotes}
                                        onChange={e => { setRawNotes(e.target.value); debouncedUpdate({ rawNotes: e.target.value }); }}
                                        className="w-full p-3 rounded-lg border resize-none overflow-hidden"
                                        style={{ borderColor: tileBorderColor, color: settings.textColor, backgroundColor: settings.backgroundColor }}
                                        rows={6}
                                        placeholder="Jot down plot points, scene ideas, dialogue snippets, etc."
                                    />
                                </div>
                            </div>
                        </div>

                        {linkedSnippets.length > 0 && (
                            <div>
                                <label className="block text-sm font-semibold mb-3 opacity-80 uppercase tracking-wider">Linked Snippets</label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {linkedSnippets.map(snippet => (
                                        <div key={snippet.id} className="p-4 rounded-xl flex justify-between items-start gap-4 shadow-sm border border-white/5" style={{ backgroundColor: settings.backgroundColor }}>
                                            <p className="text-sm opacity-90 whitespace-pre-wrap flex-grow leading-relaxed">{snippet.cleanedText}</p>
                                            <button
                                                onClick={() => {
                                                    onUpdate(chapter.id, { linkedSnippetIds: (chapter.linkedSnippetIds || []).filter(id => id !== snippet.id) });
                                                    dispatch({ type: 'UPDATE_SNIPPET', payload: { id: snippet.id, updates: { isUsed: false } } });
                                                }}
                                                className="p-2 rounded-full hover:bg-red-500/20 text-red-500 transition-colors"
                                                title="Unlink snippet"
                                            >
                                                <RevertIcon className="h-4 w-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <footer className="p-4 border-t flex flex-wrap justify-between items-center gap-4" style={{borderColor: `${tileBorderColor}80`}}>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleGenerateDetails}
                                disabled={isGenerating}
                                className="px-4 py-2 rounded-lg text-sm font-bold flex items-center text-white disabled:opacity-50 shadow-lg transition-transform active:scale-95"
                                style={{ backgroundColor: settings.accentColor }}
                            >
                                <SparklesIconOutline className="h-5 w-5 mr-2"/>
                                {isGenerating ? 'Generating...' : 'Generate from Notes'}
                            </button>
                            {chapter.previousDetails ? (
                                <button onClick={handleRevertDetails} className="px-4 py-2 rounded-lg text-sm font-bold flex items-center" style={{ backgroundColor: secondaryButtonBg }}>
                                    <RevertIcon className="h-4 w-4 mr-2" /> Revert
                                </button>
                            ) : (
                                <div className="flex items-center gap-2 relative">
                                    <button
                                        onMouseEnter={() => setShowUpdateConfirm(true)}
                                        onMouseLeave={() => setShowUpdateConfirm(false)}
                                        className="px-4 py-2 rounded-lg text-sm font-bold flex items-center"
                                        style={{ backgroundColor: secondaryButtonBg }}
                                    >
                                        <BrushIcon className="h-4 w-4 mr-2" /> Analyze Manuscript
                                    </button>
                                    <button
                                        onClick={handleSendBriefToManuscript}
                                        className="px-4 py-2 rounded-lg text-sm font-bold flex items-center"
                                        style={{ backgroundColor: secondaryButtonBg }}
                                        title="Sends the chapter summary, characters, and snippets to the manuscript editor as a prompt."
                                    >
                                        <PaperAirplaneIcon className="h-4 w-4 mr-2" /> Send Brief
                                    </button>
                                    {showUpdateConfirm && (
                                        <div onMouseEnter={() => setShowUpdateConfirm(true)} onMouseLeave={() => setShowUpdateConfirm(false)} className="absolute bottom-full left-0 mb-2 w-72 p-4 rounded-xl shadow-2xl text-xs z-50 border border-white/10" style={{backgroundColor: settings.dropdownBg}}>
                                            <p className="opacity-80 leading-relaxed">This will analyze the written chapter text to update this chapter's outline and analysis. This will overwrite existing data.</p>
                                            <button onClick={handleUpdateFromManuscript} className="w-full mt-3 py-2 rounded-lg text-white font-bold shadow-md" style={{backgroundColor: settings.accentColor}}>Confirm Update</button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                             <button onClick={handleCycleAccentStyle} className="p-2.5 rounded-lg transition-colors" style={{ backgroundColor: secondaryButtonBg, color: settings.toolbarText }} title="Cycle accent style">
                                <BrushIcon className="h-5 w-5" />
                            </button>
                             <button onClick={() => onToggleExpand(chapter.id)} className="p-2.5 rounded-lg transition-colors" style={{ backgroundColor: secondaryButtonBg, color: settings.toolbarText }} title="Collapse">
                                <ChevronUpIcon className="h-5 w-5" />
                            </button>
                            <button onClick={() => onDeleteRequest(chapter)} className="p-2.5 rounded-lg text-white transition-colors" style={{ backgroundColor: settings.dangerColor }} title="Delete chapter">
                                <TrashIconOutline className="h-5 w-5" />
                            </button>
                        </div>
                    </footer>
                    {errorId === chapter.id && <AIError message={errorMessage} className="mx-4 mb-2" />}
                </div>
            </div>
        );
    }

    // Collapsed View (Thumbnail)
    return (
        <div
            onClick={(e) => onSelect(chapter.id, e)}
            {...draggableProps}
            className={`relative aspect-[3/4] flex flex-col rounded-lg shadow-lg transition-all duration-200 border-4 overflow-hidden ${isDragging ? 'opacity-20 scale-90' : 'opacity-100 scale-100'}`}
            style={{
                borderColor: isSelected ? settings.accentColor : (chapter.accentStyle === 'outline' ? accentColor : 'transparent'),
                color: settings.textColor,
                ...backgroundStyle,
                cursor: 'grab'
            }}
        >
             {(chapter.accentStyle === 'left-top-ingress' || !chapter.accentStyle) && (
                <div className="absolute top-0 left-0 w-[6px] h-1/3" style={{backgroundColor: accentColor}}></div>
            )}
            {chapter.accentStyle === 'corner-diagonal' && (
                <div className="absolute bottom-0 right-0" style={{ width: 0, height: 0, borderBottom: `32px solid ${accentColor}`, borderLeft: '48px solid transparent', }}></div>
            )}
            
            <div className="mx-2 mt-2 h-1/3 flex-shrink-0 relative overflow-hidden rounded-md">
                {chapter.photo ? (
                    <img src={chapter.photo} alt="" className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-black/10">
                        <BookOpenIcon className="h-10 w-10 opacity-20"/>
                    </div>
                )}
            </div>

            <div className="px-3 pb-3 pt-2 flex-grow flex flex-col min-h-0">
                <h3 className="font-bold text-sm truncate opacity-90">
                    {chapter.chapterNumber}. {chapter.title}
                </h3>
                <p className="text-[10px] opacity-60 mt-1 line-clamp-3 leading-tight italic">
                    {chapter.summary || "No summary provided."}
                </p>
                <div className="mt-auto pt-2 flex flex-wrap gap-1">
                    {linkedCharacters.slice(0, 5).map(char => (
                        <div key={char.id} className="h-5 w-5 rounded-full border border-white/10 overflow-hidden" title={char.name}>
                            {char.photo ? <img src={char.photo} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gray-500" />}
                        </div>
                    ))}
                    {linkedCharacters.length > 5 && <div className="h-5 w-5 rounded-full bg-black/40 flex items-center justify-center text-[8px] font-bold">+{linkedCharacters.length - 5}</div>}
                </div>
            </div>
            
            <button
                className="absolute bottom-2 right-2 p-1 rounded-full transition-colors z-10 shadow-sm"
                onClick={(e) => { e.stopPropagation(); onToggleExpand(chapter.id); }}
                style={{ backgroundColor: settings.toolbarButtonBg, color: settings.toolbarText }}
            >
                <ChevronDownIcon className="h-4 w-4" />
            </button>
        </div>
    );
});

interface ChaptersPanelProps {
    chapters: IChapter[];
    characters: ICharacter[];
    snippets: ISnippet[];
    settings: EditorSettings;
    tileBackgroundStyle: TileBackgroundStyle;
    selectedIds: Set<string>;
    onSelect: (id: string, e: React.MouseEvent) => void;
    onUpdateChapter: (id: string, updates: Partial<IChapter>) => void;
    onDeleteRequest: (chapter: IChapter) => void;
    onSetChapters: (chapters: IChapter[]) => void;
    directoryHandle: FileSystemDirectoryHandle | null;
    isLinkPanelOpen: boolean;
    onToggleLinkPanel: () => void;
    expandedChapterId: string | null;
    setExpandedChapterId: (id: string | null) => void;
    pacingAnalysis: ChapterPacingInfo[] | null;
    isGeneratingPacingAnalysis: boolean;
}

export const ChaptersPanel: React.FC<ChaptersPanelProps> = ({ 
    chapters, characters, snippets, settings, tileBackgroundStyle, selectedIds, onSelect, onUpdateChapter, onDeleteRequest, onSetChapters, directoryHandle, isLinkPanelOpen, onToggleLinkPanel, expandedChapterId, setExpandedChapterId,
    pacingAnalysis, isGeneratingPacingAnalysis
}) => {
    const [stagedChapters, setStagedChapters] = useState<IChapter[]>(chapters);
    const [isDirty, setIsDirty] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    
    const [dragState, setDragState] = useState<{draggedIds: string[] | null, overId: string | null}>({draggedIds: null, overId: null});
    const [overAct, setOverAct] = useState<number | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const dispatch = useNovelDispatch();
    const { onGeneratePacingAnalysis, errorMessage, onSetError } = useAssemblyAI();

    useEffect(() => {
        if (!isDirty) {
            setStagedChapters(chapters);
        }
    }, [chapters, isDirty]);

    const handleCommitChanges = useCallback(async (forcedChapters?: IChapter[]) => {
        const chaptersToCommit = forcedChapters || stagedChapters;
        if (!isDirty && !forcedChapters) return;

        setIsSyncing(true);
        const renumbered = chaptersToCommit.map((ch, i) => ({ ...ch, chapterNumber: i + 1 }));
        onSetChapters(renumbered);
        
        if (directoryHandle) {
            try {
                for (const ch of renumbered) {
                    const oldCh = chapters.find(orig => orig.id === ch.id);
                    if (oldCh && oldCh.chapterNumber !== ch.chapterNumber) {
                        const oldName = `${oldCh.title}-${oldCh.chapterNumber}.rtf`;
                        const newName = `${ch.title}-${ch.chapterNumber}.rtf`;
                        const tempName = `${newName}.tmp`;
                        try {
                            const fileHandle = await directoryHandle.getFileHandle(oldName);
                            // @ts-ignore
                            await fileHandle.move(tempName);
                            const tempHandle = await directoryHandle.getFileHandle(tempName);
                            // @ts-ignore
                            await tempHandle.move(newName);
                        } catch (e) { console.warn(`Renaming skip for ${oldName}`, e); }
                    }
                }
            } catch (err) { console.error("File sync failed", err); }
        }
        setIsDirty(false);
        setIsSyncing(false);
    }, [stagedChapters, isDirty, onSetChapters, directoryHandle, chapters]);

    const handleToggleExpand = useCallback((id: string) => {
        const newExpandedId = expandedChapterId === id ? null : id;
        setExpandedChapterId(newExpandedId);
        if (newExpandedId) {
            setTimeout(() => {
                const tile = document.querySelector(`[data-chapter-id="${id}"]`);
                if (tile) tile.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        }
    }, [expandedChapterId, setExpandedChapterId]);

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
        const id = e.currentTarget.dataset.chapterId;
        if (!id) return;
        const idsToDrag = selectedIds.has(id) ? Array.from(selectedIds) : [id];
        setDragState({ draggedIds: idsToDrag, overId: id });
        const ghost = createDragGhost(idsToDrag.length, settings); 
        document.body.appendChild(ghost); 
        e.dataTransfer.setDragImage(ghost, 20, 20); 
        setTimeout(() => ghost.remove(), 0);
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        const { draggedIds } = dragState;
        if (!draggedIds) return;

        const chapterElement = (e.target as HTMLElement).closest('[data-chapter-id]');
        const overId = chapterElement ? (chapterElement as HTMLElement).dataset.chapterId : null;
        const actElement = (e.target as HTMLElement).closest('[data-act]');
        const targetAct = actElement ? parseInt((actElement as HTMLElement).dataset.act || '0', 10) : null;
        
        if (overAct !== targetAct) setOverAct(targetAct);

        setStagedChapters(current => {
            const itemsToMove = current.filter(ch => draggedIds.includes(ch.id));
            const remaining = current.filter(ch => !draggedIds.includes(ch.id));
            
            if (overId && overId !== dragState.overId) {
                const targetIdx = remaining.findIndex(ch => ch.id === overId);
                const targetChapter = remaining[targetIdx];
                const updatedItems = itemsToMove.map(item => ({ ...item, act: targetChapter.act }));
                remaining.splice(targetIdx, 0, ...updatedItems);
                setIsDirty(true);
                return [...remaining];
            } else if (targetAct !== null && targetAct !== overAct) {
                const updatedItems = itemsToMove.map(item => ({ ...item, act: targetAct === 0 ? undefined : targetAct }));
                const lastInPrevActs = remaining.findLastIndex(ch => (ch.act || 0) < targetAct);
                remaining.splice(lastInPrevActs + 1, 0, ...updatedItems);
                setIsDirty(true);
                return [...remaining];
            }
            return current;
        });

        if (overId) setDragState(s => ({...s, overId}));
    };

    const handleDragEnd = () => {
        setDragState({draggedIds: null, overId: null});
        setOverAct(null);
    };

    const acts = useMemo(() => {
        const map: Record<number, IChapter[]> = { 0: [], 1: [], 2: [], 3: [] };
        stagedChapters.forEach(c => map[c.act || 0].push(c));
        return map;
    }, [stagedChapters]);

    return (
        <div className="w-full h-full flex flex-col">
            <div className="p-3 border-b flex justify-between items-center z-30 shadow-sm" style={{ backgroundColor: settings.toolbarBg, borderColor: settings.toolbarInputBorderColor }}>
                 <div className="flex items-center gap-2">
                    <button onClick={onToggleLinkPanel} className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-md transition-colors" style={{ backgroundColor: isLinkPanelOpen ? settings.accentColor : settings.toolbarButtonBg, color: isLinkPanelOpen ? '#FFFFFF' : settings.toolbarText }}>
                        <LinkIcon />Link Characters
                    </button>
                    <button onClick={() => onGeneratePacingAnalysis()} disabled={isGeneratingPacingAnalysis} className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-md disabled:opacity-50" style={{ backgroundColor: settings.toolbarButtonBg, color: settings.toolbarText }}>
                        {isGeneratingPacingAnalysis ? <SpinnerIcon className="h-4 w-4" /> : <SparklesIconOutline className="h-4 w-4" />}Analyze Pacing
                    </button>
                 </div>
                 
                 {isDirty && (
                    <div className="flex items-center gap-3 animate-in fade-in slide-in-from-right-4 duration-300">
                        <span className="text-xs font-bold uppercase tracking-tighter opacity-50">Sort Pending</span>
                        <button 
                            onClick={() => handleCommitChanges()} 
                            disabled={isSyncing}
                            className={`flex items-center gap-2 text-xs font-bold px-4 py-1.5 rounded-full text-white shadow-lg transition-all ${isSyncing ? 'opacity-50' : 'hover:scale-105 active:scale-95 pulse-subtle'}`}
                            style={{ backgroundColor: settings.successColor }}
                        >
                            {isSyncing ? <SpinnerIcon className="h-3 w-3" /> : <CheckCircleIcon className="h-3 w-3" />}
                            Commit Changes
                        </button>
                    </div>
                 )}
            </div>
            
            <div className="w-full h-full flex min-h-0">
                <div ref={scrollRef} className="flex-grow h-full overflow-y-auto p-4 scroll-smooth" onDrop={handleDragEnd} onDragOver={handleDragOver}>
                     {pacingAnalysis && <PacingHeatmap analysis={pacingAnalysis} settings={settings} />}
                     {errorMessage && <AIError message={errorMessage} className="mb-4" />}
                     
                     <div className="flex flex-col gap-12 w-full">
                        {[0, 1, 2, 3].map(actNum => (
                            <div key={actNum} data-act={actNum} className="space-y-4">
                                <h3 className="text-lg font-bold flex items-center gap-3 opacity-80" style={{ color: settings.textColor }}>
                                    {actNum === 0 ? <BookOpenIcon className="h-5 w-5" /> : <ViewGridIcon className="h-5 w-5" />}
                                    {actNum === 0 ? "Chapter Pool" : `Act ${actNum}`}
                                </h3>
                                <div 
                                    className={`rounded-xl grid grid-cols-[repeat(auto-fill,minmax(12rem,1fr))] gap-6 p-6 transition-all duration-300 ${overAct === actNum ? 'ring-2' : 'bg-black/10'}`} 
                                    style={{ 
                                        ['--tw-ring-color' as any]: settings.accentColor,
                                        backgroundColor: overAct === actNum ? `${settings.accentColor}10` : 'rgba(0,0,0,0.15)'
                                    }}
                                >
                                    {acts[actNum].map(ch => (
                                        <ChapterTile 
                                            key={ch.id} 
                                            chapter={ch} 
                                            allCharacters={characters} 
                                            snippets={snippets}
                                            settings={settings} 
                                            isExpanded={expandedChapterId === ch.id}
                                            isSelected={selectedIds.has(ch.id)} 
                                            onSelect={onSelect} 
                                            onToggleExpand={handleToggleExpand} 
                                            onUpdate={onUpdateChapter}
                                            onDeleteRequest={onDeleteRequest}
                                            isDragging={dragState.draggedIds?.includes(ch.id) ?? false} 
                                            draggableProps={{ draggable: true, onDragStart: handleDragStart, 'data-chapter-id': ch.id }} 
                                            tileBackgroundStyle={tileBackgroundStyle} 
                                            scrollContainerRef={scrollRef}
                                        />
                                    ))}
                                    {acts[actNum].length === 0 && (
                                        <div className="col-span-full h-32 flex items-center justify-center border-2 border-dashed border-white/5 rounded-lg opacity-30 italic text-sm">
                                            Empty {actNum === 0 ? 'Pool' : `Act ${actNum}`}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                     </div>
                </div>
            </div>
            
            <style>{`
                @keyframes pulse-subtle {
                    0% { box-shadow: 0 0 0 0px \${settings.successColor}80; }
                    70% { box-shadow: 0 0 0 10px \${settings.successColor}00; }
                    100% { box-shadow: 0 0 0 0px \${settings.successColor}00; }
                }
                .pulse-subtle { animation: pulse-subtle 2s infinite; }
            `}</style>
        </div>
    );
};
