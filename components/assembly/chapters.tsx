
import React, { useState, useRef, useCallback, useLayoutEffect, useEffect, useMemo } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import type { EditorSettings, ICharacter, IChapter, ISnippet, TileBackgroundStyle, ChapterPacingInfo } from '../../types';
import { useNovelDispatch, useNovelState } from '../../NovelContext';
import { useAssemblyAI } from './AssemblyAIContext';
import MarkdownRenderer from '../common/MarkdownRenderer';
import { ChevronDownIcon, BookOpenIcon, CameraIcon, LockClosedIconOutline, LockOpenIconOutline, RevertIcon, SparklesIconOutline, TrashIconOutline, StarIcon, XIcon, LinkIcon, ViewGridIcon, ChevronUpIcon, BrushIcon, SpinnerIcon, CheckCircleIcon, PaperAirplaneIcon, UserCircleIcon, FocusIcon, SaveIcon, DocumentTextIcon, ImportIcon, ListBulletIcon, ArchiveIcon, TableIcon } from '../common/Icons';
import { isColorLight, shadeColor, getImageColor, harmonizeColor, getContrastColor } from '../../utils/colorUtils';
import { generateBriefingHtml, generateSpreadsheetCSV } from '../../utils/manuscriptUtils';
import { exportChaptersToMarkdown, importChaptersFromMarkdown } from '../../utils/markdownUtils';
import JSZip from 'jszip';
import { useDialog } from '../common/DialogProvider';
import { AIError } from '../common/AIError';
import { CharactersPanel } from './characters';
import { LockedChestTab, useLockedChestSelection } from '../common/LockedChest';
import { ChapterSpreadsheet } from './ChapterSpreadsheet';

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
    ghost.style.color = 'var(--app-text)';
    ghost.style.fontFamily = 'Inter, sans-serif';
    ghost.style.fontSize = '12px';
    ghost.style.fontWeight = 'bold';
    ghost.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.4)';
    ghost.style.zIndex = '9999';
    ghost.textContent = count > 1 ? `Moving ${count} Chapters` : 'Moving Chapter';
    return ghost;
};

const EditableActHeader: React.FC<{ 
    actNum: number; 
    settings: EditorSettings; 
    isContinuous?: boolean;
}> = ({ actNum, settings, isContinuous }) => {
    const { actNames } = useNovelState();
    const dispatch = useNovelDispatch();
    const [isEditing, setIsEditing] = useState(false);
    const [localName, setLocalName] = useState(actNames?.[actNum] || `Act ${actNum}`);

    useEffect(() => {
        setLocalName(actNames?.[actNum] || `Act ${actNum}`);
    }, [actNames, actNum]);

    const handleSave = () => {
        setIsEditing(false);
        const nameToSave = localName.trim() || `Act ${actNum}`;
        dispatch({ type: 'UPDATE_ACT_NAME', payload: { actNum, name: nameToSave } });
    };

    if (actNum === 0) {
        if (isContinuous) {
            return (
                <h2 className="text-xl font-black uppercase tracking-[0.2em]" style={{ color: settings.accentColor }}>
                    Chapter Pool
                </h2>
            );
        }
        return (
            <h3 className="text-lg font-bold flex items-center gap-3 opacity-80" style={{ color: settings.textColor }}>
                <BookOpenIcon className="h-5 w-5" />
                Chapter Pool
            </h3>
        );
    }

    if (isEditing) {
        return (
            <input
                autoFocus
                value={localName}
                onChange={e => setLocalName(e.target.value)}
                onBlur={handleSave}
                onKeyDown={e => e.key === 'Enter' && handleSave()}
                className={`bg-transparent border-none focus:ring-0 p-0 font-black uppercase tracking-[0.2em] outline-none ${isContinuous ? 'text-xl' : 'text-lg font-bold flex items-center gap-3'}`}
                style={{ color: isContinuous ? settings.accentColor : settings.textColor }}
            />
        );
    }

    if (isContinuous) {
        return (
            <h2 
                onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
                className="text-xl font-black uppercase tracking-[0.2em] cursor-pointer hover:opacity-80 transition-opacity" 
                style={{ color: settings.accentColor }}
            >
                {localName}
            </h2>
        );
    }

    return (
        <h3 
            onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
            className="text-lg font-bold flex items-center gap-3 opacity-80 cursor-pointer hover:opacity-100 transition-opacity uppercase tracking-[0.2em]" 
            style={{ color: settings.textColor }}
        >
            <ViewGridIcon className="h-5 w-5" />
            {localName}
        </h3>
    );
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
                <SparklesIconOutline className="h-6 w-6" style={{ color: settings.accentColor }} />
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
    zoomLevel: number;
}

const ChapterTile: React.FC<ChapterTileProps> = React.memo(({
    chapter, allCharacters, snippets, settings, isExpanded, isSelected, onSelect, onToggleExpand, onUpdate, onDeleteRequest, draggableProps, isDragging, tileBackgroundStyle, scrollContainerRef, zoomLevel
}) => {
    const dialog = useDialog();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { isGeneratingChapter, errorId, errorMessage, onGenerateChapterDetails, onUpdateChapterFromManuscript } = useAssemblyAI();
    const dispatch = useNovelDispatch();
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

    const handleSendBriefToManuscript = async () => {
        const briefingHtml = generateBriefingHtml(chapter, allCharacters, snippets);
        const existingContent = chapter.content || '<div><br></div>';
        if (existingContent.includes('[ CHAPTER BRIEFING ]')) {
             if (!await dialog.confirm("This chapter already contains a briefing. Add another one?", "Duplicate Briefing")) return;
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

    const handleCharacterDrop = (e: React.DragEvent) => {
        e.preventDefault();
        try {
            const charIdsData = e.dataTransfer.getData('characterIds');
            if (charIdsData) {
                const charIds = JSON.parse(charIdsData) as string[];
                const existingIds = chapter.characterIds || [];
                const newIds = [...new Set([...existingIds, ...charIds])];
                onUpdate(chapter.id, { characterIds: newIds });
            }
        } catch (err) {
            console.error("Failed to parse dropped characters", err);
        }
    };

    const handleCycleAccentStyle = (e: React.MouseEvent) => {
        e.stopPropagation();
        const styles: ('left-top-ingress' | 'outline' | 'corner-diagonal')[] = ['left-top-ingress', 'outline', 'corner-diagonal'];
        const currentStyle = chapter.accentStyle || 'left-top-ingress';
        const currentIndex = styles.indexOf(currentStyle);
        const nextStyle = styles[(currentIndex + 1) % styles.length];
        onUpdate(chapter.id, { accentStyle: nextStyle });
    };

    const useImageColor = settings.tileColorSource === 'image' && !!chapter.imageColor;
    const tileBorderColor = useImageColor ? chapter.imageColor! : settings.toolbarInputBorderColor;
    const isDarkMode = !isColorLight(settings.textColor);
    
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
    
    const accentColor = useImageColor ? chapter.imageColor! : settings.accentColor;

    const backgroundStyle = useMemo(() => {
        const hasDominantColor = settings.tileColorSource === 'image' && !!chapter.imageColor;
        
        // Harmonize image color with global theme background
        const baseColor = hasDominantColor 
            ? harmonizeColor(chapter.imageColor!, settings.backgroundColor, isDarkMode)
            : (settings.toolbarButtonBg || '#374151');
            
        const secondaryColor = shadeColor(baseColor, isDarkMode ? 7 : -7);
        
        const style: any = { baseColor };
        
        switch (tileBackgroundStyle) {
            case 'diagonal': 
                style.background = `linear-gradient(to top left, ${baseColor} 49.9%, ${secondaryColor} 50.1%)`;
                break;
            case 'horizontal': 
                style.background = `linear-gradient(to bottom, ${isDarkMode ? secondaryColor : baseColor} 33.3%, ${isDarkMode ? baseColor : secondaryColor} 33.3%)`;
                break;
            default: 
                style.backgroundColor = baseColor;
                break;
        }
        return style;
    }, [tileBackgroundStyle, settings.backgroundColor, settings.toolbarButtonBg, isDarkMode, chapter.imageColor]);

    const tileBaseColor = backgroundStyle.baseColor;
    const tileTextColor = getContrastColor(tileBaseColor);

    const secondaryButtonBg = shadeColor(tileBaseColor, isDarkMode ? 10 : -10);
    const secondaryButtonHoverBg = shadeColor(tileBaseColor, isDarkMode ? 20 : -20);
    const inputBg = shadeColor(tileBaseColor, isDarkMode ? -8 : 8);
    const inputText = getContrastColor(inputBg);
    const actionButtonBg = shadeColor(tileBaseColor, isDarkMode ? 15 : -15);
    const actionButtonText = getContrastColor(actionButtonBg);

    if (isExpanded) {
        return (
            <div 
                {...draggableProps}
                className={`relative transition-all duration-500 ease-[cubic-bezier(0.2,0,0,1)] col-span-full ${isDragging ? 'opacity-20 grayscale scale-95 blur-[1px]' : 'opacity-100 scale-100'}`}
            >
                <input type="file" accept="image/png, image/jpeg" ref={fileInputRef} onChange={handlePhotoUpload} className="hidden" />
                <div
                    onClick={(e) => onSelect(chapter.id, e)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleCharacterDrop}
                    className="relative rounded-lg shadow-md transition-shadow duration-300 ease-in-out z-10 flex flex-col border-4"
                    style={{
                        ...backgroundStyle,
                        color: tileTextColor,
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
                                        style={{ color: tileTextColor, lineHeight: '1.2' }} rows={1}
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
                                        <span key={kw} className="px-2 py-1 rounded text-xs" style={{backgroundColor: shadeColor(tileBaseColor, isDarkMode ? 10 : -10), color: tileTextColor}}>{kw}</span>
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
                                    style={{ backgroundColor: chapter.isPhotoLocked ? settings.accentColor : secondaryButtonBg, color: chapter.isPhotoLocked ? 'var(--app-text)' : getContrastColor(secondaryButtonBg) }}
                                    onClick={handleToggleLock}
                                    title={chapter.isPhotoLocked ? "Unlock photo" : "Lock photo"}
                                >
                                    {chapter.isPhotoLocked ? <LockClosedIconOutline className="h-3 w-3" /> : <LockOpenIconOutline className="h-3 w-3" />}
                                </div>
                                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-2 pt-6 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-b-xl">
                                     <div className="flex items-center gap-1 text-[10px] font-medium" style={{ color: '#FFFFFF' }}>
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
                                    {linkedCharacters.map(char => {
                                        const charAccent = (settings.tileColorSource === 'image' && char.imageColor) ? harmonizeColor(char.imageColor, settings.backgroundColor, isDarkMode) : settings.accentColor;
                                        return (
                                            <div key={char.id} className="flex items-center gap-3 p-2 pr-4 rounded-lg group relative" style={{ backgroundColor: secondaryButtonBg }}>
                                                <div className="h-10 w-10 rounded-full bg-cover bg-center flex-shrink-0 border-2" style={{ backgroundImage: char.photo ? `url(${char.photo})` : undefined, backgroundColor: charAccent, borderColor: charAccent }}>
                                                   {!char.photo && <UserCircleIcon className="h-full w-full opacity-50"/>}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-semibold text-sm truncate">{char.name}</p>
                                                    <p className="text-[10px] opacity-60 truncate">{char.tagline}</p>
                                                </div>
                                                <button 
                                                    onClick={(e) => { 
                                                        e.stopPropagation(); 
                                                        const currentIds = chapter.characterIds || [];
                                                        const newIds = currentIds.filter(id => id !== char.id);
                                                        onUpdate(chapter.id, { characterIds: newIds }); 
                                                    }}
                                                    className="ml-2 p-1.5 rounded-full bg-red-500/10 text-red-500 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white shadow-sm z-30"
                                                    title="Remove character from scene"
                                                >
                                                    <XIcon className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        );
                                    })}
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
                                        className="w-full p-3 rounded-lg border resize-none overflow-hidden transition-colors"
                                        style={{ borderColor: `${tileTextColor}33`, color: inputText, backgroundColor: inputBg }}
                                        rows={3}
                                    />
                                </div>
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="text-sm font-semibold opacity-80 uppercase tracking-wider flex items-center gap-2">
                                            <ListBulletIcon className="h-3 w-3" /> Beat Outline
                                        </label>
                                        <button onClick={() => setIsEditingOutline(p => !p)} className="text-[10px] px-2 py-1 rounded-md uppercase font-bold tracking-tighter transition-colors" style={{ backgroundColor: actionButtonBg, color: actionButtonText }}>
                                            {isEditingOutline ? 'Preview' : 'Edit'}
                                        </button>
                                    </div>
                                    {isEditingOutline ? (
                                        <textarea
                                            ref={outlineRef} value={outline}
                                            onChange={e => { setOutline(e.target.value); debouncedUpdate({ outline: e.target.value }); }}
                                            className="w-full p-3 rounded-lg border resize-none overflow-hidden font-mono text-sm transition-colors"
                                            style={{ borderColor: `${tileTextColor}33`, color: inputText, backgroundColor: inputBg }}
                                            rows={8}
                                        />
                                    ) : (
                                        <div className="w-full p-4 rounded-lg border max-h-96 overflow-y-auto transition-colors" style={{ borderColor: `${tileTextColor}33`, color: inputText, backgroundColor: inputBg }}>
                                            <MarkdownRenderer source={outline} settings={settings} />
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="block text-sm font-semibold opacity-80 uppercase tracking-wider">Story Analysis</label>
                                        <button onClick={() => setIsEditingAnalysis(p => !p)} className="text-[10px] px-2 py-1 rounded-md uppercase font-bold tracking-tighter transition-colors" style={{ backgroundColor: actionButtonBg, color: actionButtonText }}>
                                            {isEditingAnalysis ? 'Preview' : 'Edit'}
                                        </button>
                                    </div>
                                    {isEditingAnalysis ? (
                                        <textarea
                                            ref={analysisRef} value={analysis}
                                            onChange={e => { setAnalysis(e.target.value); debouncedUpdate({ analysis: e.target.value }); }}
                                            className="w-full p-3 rounded-lg border resize-none overflow-hidden transition-colors"
                                            style={{ borderColor: `${tileTextColor}33`, color: inputText, backgroundColor: inputBg }}
                                            rows={8}
                                            placeholder="AI-generated analysis of conflict, stakes, etc."
                                        />
                                    ) : (
                                        <div className="w-full p-4 rounded-lg border max-h-96 overflow-y-auto transition-colors" style={{ borderColor: `${tileTextColor}33`, color: inputText, backgroundColor: inputBg }}>
                                            <MarkdownRenderer source={analysis} settings={settings} />
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold mb-2 opacity-80 uppercase tracking-wider">Rough Notes</label>
                                    <textarea
                                        ref={rawNotesRef} value={rawNotes}
                                        onChange={e => { setRawNotes(e.target.value); debouncedUpdate({ rawNotes: e.target.value }); }}
                                        className="w-full p-3 rounded-lg border resize-none overflow-hidden transition-colors"
                                        style={{ borderColor: `${tileTextColor}33`, color: inputText, backgroundColor: inputBg }}
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
                                        <div key={snippet.id} className="p-4 rounded-xl flex justify-between items-start gap-4 shadow-sm border border-white/5 transition-colors" style={{ backgroundColor: inputBg, color: inputText }}>
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
                                className="px-4 py-2 rounded-lg text-sm font-bold flex items-center disabled:opacity-50 shadow-lg transition-transform active:scale-95"
                                style={{ backgroundColor: settings.accentColor, color: getContrastColor(settings.accentColor) }}
                            >
                                <SparklesIconOutline className="h-5 w-5 mr-2"/>
                                {isGenerating ? 'Generating...' : 'Generate from Notes'}
                            </button>
                            {chapter.previousDetails ? (
                                <button onClick={handleRevertDetails} className="px-4 py-2 rounded-lg text-sm font-bold flex items-center transition-colors" style={{ backgroundColor: actionButtonBg, color: actionButtonText }}>
                                    <RevertIcon className="h-4 w-4 mr-2" /> Revert
                                </button>
                            ) : (
                                <div className="flex items-center gap-2 relative">
                                    <button
                                        onMouseEnter={() => setShowUpdateConfirm(true)}
                                        onMouseLeave={() => setShowUpdateConfirm(false)}
                                        className="px-4 py-2 rounded-lg text-sm font-bold flex items-center transition-colors"
                                        style={{ backgroundColor: actionButtonBg, color: actionButtonText }}
                                    >
                                        <BrushIcon className="h-4 w-4 mr-2" /> Analyze Manuscript
                                    </button>
                                    <button
                                        onClick={handleSendBriefToManuscript}
                                        className="px-4 py-2 rounded-lg text-sm font-bold flex items-center transition-colors"
                                        style={{ backgroundColor: actionButtonBg, color: actionButtonText }}
                                        title="Sends the chapter summary, characters, and snippets to the manuscript editor as a prompt."
                                    >
                                        <PaperAirplaneIcon className="h-4 w-4 mr-2" /> Send Brief
                                    </button>
                                    {showUpdateConfirm && (
                                        <div onMouseEnter={() => setShowUpdateConfirm(true)} onMouseLeave={() => setShowUpdateConfirm(false)} className="absolute bottom-full left-0 mb-2 w-72 p-4 rounded-xl shadow-2xl text-xs z-50 border border-white/10" style={{backgroundColor: settings.dropdownBg, color: settings.toolbarText}}>
                                            <p className="opacity-80 leading-relaxed">This will analyze the written chapter text to update this chapter's outline and analysis. This will overwrite existing data.</p>
                                            <button onClick={handleUpdateFromManuscript} className="w-full mt-3 py-2 rounded-lg font-bold shadow-md" style={{backgroundColor: settings.accentColor, color: getContrastColor(settings.accentColor)}}>Confirm Update</button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                             <button onClick={handleCycleAccentStyle} className="p-2.5 rounded-lg transition-colors" style={{ backgroundColor: actionButtonBg, color: actionButtonText }} title="Cycle accent style">
                                <BrushIcon className="h-5 w-5" />
                            </button>
                             <button onClick={() => onToggleExpand(chapter.id)} className="p-2.5 rounded-lg transition-colors" style={{ backgroundColor: actionButtonBg, color: actionButtonText }} title="Collapse">
                                <ChevronUpIcon className="h-5 w-5" />
                            </button>
                            <button onClick={() => onDeleteRequest(chapter)} className="p-2.5 rounded-lg transition-colors" style={{ backgroundColor: settings.dangerColor, color: getContrastColor(settings.dangerColor) }} title="Delete chapter">
                                <TrashIconOutline className="h-5 w-5" />
                            </button>
                        </div>
                    </footer>
                    {errorId === chapter.id && <AIError message={errorMessage} onDismiss={() => onSetError(null)} className="mx-4 mb-2" />}
                </div>
            </div>
        );
    }

    // Collapsed View (Thumbnail)
    return (
        <div
            onClick={(e) => onSelect(chapter.id, e)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleCharacterDrop}
            {...draggableProps}
            className={`relative aspect-[3/4] flex flex-col rounded-lg shadow-lg transition-all duration-200 border-4 overflow-hidden ${isDragging ? 'opacity-20 scale-90' : 'opacity-100 scale-100'}`}
            style={{
                borderColor: isSelected ? settings.accentColor : (chapter.accentStyle === 'outline' ? accentColor : 'transparent'),
                color: tileTextColor,
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
            
            <div className={`mx-2 mt-2 flex-shrink-0 relative overflow-hidden rounded-md ${zoomLevel >= 3 ? 'h-full m-0 rounded-none' : 'h-1/3'}`}>
                {chapter.photo ? (
                    <img src={chapter.photo} alt="" className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-black/10">
                        <BookOpenIcon className={`${zoomLevel >= 2 ? 'h-6 w-6' : 'h-10 w-10'} opacity-20`}/>
                    </div>
                )}
                {zoomLevel >= 3 && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                         <span className="font-bold text-lg shadow-sm" style={{ color: '#FFFFFF' }}>{chapter.chapterNumber}</span>
                    </div>
                )}
            </div>

            {zoomLevel < 3 && (
                <div className={`px-3 pb-3 pt-2 flex-grow flex flex-col min-h-0 ${zoomLevel >= 2 ? 'px-2 pb-2 pt-1' : ''}`}>
                    <div className="flex items-start gap-1 min-w-0">
                        <span className={`font-bold opacity-50 flex-shrink-0 ${zoomLevel >= 2 ? 'text-[10px]' : 'text-sm'}`}>{chapter.chapterNumber}.</span>
                        {isEditingTitle ? (
                            <textarea
                                ref={titleInputRef} value={localTitle} onChange={e => setLocalTitle(e.target.value)}
                                onBlur={handleTitleUpdate} onKeyDown={handleTitleKeyDown} onClick={e => e.stopPropagation()}
                                className={`font-bold w-full p-0 border-none resize-none outline-none block bg-transparent ${zoomLevel >= 2 ? 'text-[10px]' : 'text-sm'}`}
                                style={{ color: tileTextColor, lineHeight: '1.2' }} rows={1}
                            />
                        ) : (
                            <h3 onClick={(e) => { e.stopPropagation(); setIsEditingTitle(true); }} className={`font-bold truncate opacity-90 cursor-pointer ${zoomLevel >= 2 ? 'text-[10px]' : 'text-sm'}`} title={chapter.title}>
                                {chapter.title}
                            </h3>
                        )}
                    </div>
                    {zoomLevel < 1 && (
                        <p className="text-[10px] opacity-60 mt-1 line-clamp-3 leading-tight italic">
                            {chapter.summary || "No summary provided."}
                        </p>
                    )}
                    {zoomLevel < 2 && (
                        <div className="mt-auto pt-2 flex flex-wrap gap-1">
                            {linkedCharacters.slice(0, 5).map(char => (
                                <div key={char.id} className="h-6 w-6 rounded-full border border-white/10 overflow-hidden shadow-sm" title={char.name} style={{ backgroundColor: char.imageColor ? harmonizeColor(char.imageColor, settings.backgroundColor, isDarkMode) : '#6b7280' }}>
                                    {char.photo ? <img src={char.photo} alt="" className="w-full h-full object-cover" /> : <UserCircleIcon className="w-full h-full opacity-30" />}
                                </div>
                            ))}
                            {linkedCharacters.length > 5 && <div className="h-6 w-6 rounded-full bg-black/40 flex items-center justify-center text-[8px] font-bold">+{linkedCharacters.length - 5}</div>}
                        </div>
                    )}
                </div>
            )}
            
            {zoomLevel < 3 && (
                <button
                    className="absolute bottom-2 right-2 p-1 rounded-full transition-colors z-10 shadow-sm"
                    onClick={(e) => { e.stopPropagation(); onToggleExpand(chapter.id); }}
                    style={{ backgroundColor: secondaryButtonBg, color: getContrastColor(secondaryButtonBg) }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = secondaryButtonHoverBg || ''}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = secondaryButtonBg || ''}
                >
                    <ChevronDownIcon className={zoomLevel >= 2 ? 'h-3 w-3' : 'h-4 w-4'} />
                </button>
            )}
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
    zoomLevel: number;
    onZoomChange: (level: number) => void;
    isContinuousView: boolean;
    onToggleContinuousView: () => void;
    isSpreadsheetView: boolean;
    onToggleSpreadsheetView: () => void;
}

const OutlineContinuousEditor: React.FC<{ 
    chapters: IChapter[]; 
    settings: EditorSettings; 
    onUpdate: (id: string, updates: Partial<IChapter>) => void;
    scrollContainerRef: React.RefObject<HTMLDivElement>;
}> = ({ chapters, settings, onUpdate, scrollContainerRef }) => {
    const { actNames } = useNovelState();
    const dispatch = useNovelDispatch();
    const [collapsedActs, setCollapsedActs] = useState<Record<number, boolean>>({});

    const actNums = useMemo(() => {
        const nums = Object.keys(actNames || {}).map(Number).sort((a, b) => a - b);
        return [0, ...nums];
    }, [actNames]);

    const acts = useMemo(() => {
        const map: Record<number, IChapter[]> = { 0: [] };
        actNums.forEach(n => { map[n] = []; });
        chapters.forEach(c => {
            const actNum = typeof c.act === 'number' && map[c.act] ? c.act : 0;
            map[actNum].push(c);
        });
        return map;
    }, [chapters, actNums]);

    const handleAddAct = () => {
        const nextActNum = Math.max(...actNums, 0) + 1;
        const roman = (n: number) => {
            const map: Record<number, string> = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V', 6: 'VI', 7: 'VII', 8: 'VIII', 9: 'IX', 10: 'X' };
            return map[n] || n.toString();
        };
        dispatch({ type: 'UPDATE_ACT_NAME', payload: { actNum: nextActNum, name: `Act ${roman(nextActNum)}` } });
    };

    const toggleAct = (act: number) => {
        setCollapsedActs(prev => ({ ...prev, [act]: !prev[act] }));
    };

    return (
        <div className="flex flex-col gap-12 max-w-none mx-auto w-full pb-64 px-8">
            {actNums.map(actNum => {
                const actChapters = acts[actNum];
                if (actChapters.length === 0 && actNum !== 0) return null;
                const isCollapsed = collapsedActs[actNum];

                return (
                    <div key={actNum} className="space-y-6">
                        <div 
                            className="flex items-center gap-4 py-4 sticky top-0 z-30 backdrop-blur-md cursor-pointer group"
                            style={{ backgroundColor: `${settings.backgroundColor}E6` }}
                            onClick={() => toggleAct(actNum)}
                        >
                            <div className="h-px flex-grow" style={{ backgroundColor: settings.accentColor, opacity: 0.3 }}></div>
                            <div className="flex items-center gap-2">
                                {isCollapsed ? <ChevronDownIcon className="h-5 w-5" /> : <ChevronUpIcon className="h-5 w-5" />}
                                <EditableActHeader actNum={actNum} settings={settings} isContinuous />
                                <span className="text-xs opacity-50 font-mono">({actChapters.length} chapters)</span>
                            </div>
                            <div className="h-px flex-grow" style={{ backgroundColor: settings.accentColor, opacity: 0.3 }}></div>
                        </div>

                        {!isCollapsed && (
                            <div className="space-y-16 animate-in fade-in slide-in-from-top-4 duration-500">
                                {actChapters.map((ch) => (
                                    <ChapterOutlineItem 
                                        key={ch.id} 
                                        chapter={ch} 
                                        settings={settings} 
                                        onUpdate={onUpdate} 
                                        scrollContainerRef={scrollContainerRef}
                                    />
                                ))}
                                {actChapters.length === 0 && (
                                    <div className="py-12 text-center opacity-30 italic border-2 border-dashed rounded-2xl" style={{ borderColor: settings.toolbarInputBorderColor }}>
                                        No chapters in this section
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                );
            })}
            
            <button 
                onClick={handleAddAct}
                className="group flex items-center justify-center gap-3 py-8 rounded-2xl border-2 border-dashed transition-all hover:border-solid opacity-30 hover:opacity-100"
                style={{ borderColor: settings.toolbarInputBorderColor || 'rgba(255,255,255,0.1)', color: settings.textColor }}
            >
                <div className="p-2 rounded-full bg-white/5 group-hover:bg-white/10 transition-colors">
                    <ChevronDownIcon className="h-5 w-5 rotate-[-90deg]" />
                </div>
                <span className="font-black uppercase tracking-[0.2em] text-sm">Add Act</span>
            </button>
        </div>
    );
};

const ChapterOutlineItem: React.FC<{
    chapter: IChapter;
    settings: EditorSettings;
    onUpdate: (id: string, updates: Partial<IChapter>) => void;
    scrollContainerRef: React.RefObject<HTMLDivElement>;
}> = ({ chapter, settings, onUpdate, scrollContainerRef }) => {
    // Local state for seamless editing without cursor jumps or lag
    const [localTitle, setLocalTitle] = useState(chapter.title);
    const [localSummary, setLocalSummary] = useState(chapter.summary);
    const [localOutline, setLocalOutline] = useState(chapter.outline);
    const [localRawNotes, setLocalRawNotes] = useState(chapter.rawNotes);

    // Sync local state with props only when they change from external sources
    useEffect(() => { setLocalTitle(chapter.title); }, [chapter.title]);
    useEffect(() => { setLocalSummary(chapter.summary); }, [chapter.summary]);
    useEffect(() => { setLocalOutline(chapter.outline); }, [chapter.outline]);
    useEffect(() => { setLocalRawNotes(chapter.rawNotes); }, [chapter.rawNotes]);

    const summaryRef = useRef<HTMLTextAreaElement>(null);
    const outlineRef = useRef<HTMLTextAreaElement>(null);
    const rawNotesRef = useRef<HTMLTextAreaElement>(null);
    const titleRef = useRef<HTMLTextAreaElement>(null);

    useAutosizeTextArea(summaryRef, localSummary, true, scrollContainerRef);
    useAutosizeTextArea(outlineRef, localOutline, true, scrollContainerRef);
    useAutosizeTextArea(rawNotesRef, localRawNotes, true, scrollContainerRef);
    useAutosizeTextArea(titleRef, localTitle, true, scrollContainerRef);

    const debouncedUpdate = useDebouncedCallback((updates: Partial<IChapter>) => {
        onUpdate(chapter.id, updates);
    }, 500);

    const isDarkMode = !isColorLight(settings.textColor);
    const fieldBg = shadeColor(settings.backgroundColor, isDarkMode ? 5 : -5);
    const labelColor = settings.accentColor;

    return (
        <div className="space-y-6 group/item relative w-full">
            <div className="flex items-start gap-4 w-full">
                <div className="text-5xl font-black opacity-10 select-none mt-1 shrink-0">{chapter.chapterNumber}</div>
                <div className="flex-grow min-w-0">
                    <textarea
                        ref={titleRef}
                        value={localTitle}
                        onChange={(e) => {
                            const val = e.target.value;
                            setLocalTitle(val);
                            debouncedUpdate({ title: val });
                        }}
                        className="w-full text-3xl font-bold bg-transparent border-none focus:ring-0 p-0 resize-none overflow-hidden"
                        style={{ color: settings.textColor }}
                        placeholder="Chapter Title"
                        rows={1}
                    />
                    
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mt-6 w-full">
                        {/* Summary Section */}
                        <div className="lg:col-span-1 space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest opacity-60 flex items-center gap-2" style={{ color: labelColor }}>
                                <DocumentTextIcon className="h-3 w-3" /> Summary
                            </label>
                            <textarea
                                ref={summaryRef}
                                value={localSummary}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setLocalSummary(val);
                                    debouncedUpdate({ summary: val });
                                }}
                                className="w-full p-4 rounded-xl text-sm leading-relaxed border-none focus:ring-2 resize-none overflow-hidden transition-all"
                                style={{ 
                                    backgroundColor: fieldBg, 
                                    color: settings.textColor,
                                    ['--tw-ring-color' as any]: `${settings.accentColor}40`
                                }}
                                placeholder="Write a brief summary of this chapter..."
                            />
                        </div>

                        {/* Outline Section */}
                        <div className="lg:col-span-2 space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest opacity-60 flex items-center gap-2" style={{ color: labelColor }}>
                                <ListBulletIcon className="h-3 w-3" /> Beat Outline
                            </label>
                            <textarea
                                ref={outlineRef}
                                value={localOutline}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setLocalOutline(val);
                                    debouncedUpdate({ outline: val });
                                }}
                                className="w-full p-4 rounded-xl text-sm leading-relaxed border-none focus:ring-2 resize-none overflow-hidden font-mono transition-all"
                                style={{ 
                                    backgroundColor: fieldBg, 
                                    color: settings.textColor,
                                    ['--tw-ring-color' as any]: `${settings.accentColor}40`
                                }}
                                placeholder="Break down the chapter into beats or scenes..."
                            />
                        </div>

                        {/* Raw Notes Section */}
                        <div className="lg:col-span-1 space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest opacity-60 flex items-center gap-2" style={{ color: labelColor }}>
                                <BrushIcon className="h-3 w-3" /> Rough Notes
                            </label>
                            <textarea
                                ref={rawNotesRef}
                                value={localRawNotes}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setLocalRawNotes(val);
                                    debouncedUpdate({ rawNotes: val });
                                }}
                                className="w-full p-4 rounded-xl text-xs leading-relaxed border-none focus:ring-2 resize-none overflow-hidden italic transition-all"
                                style={{ 
                                    backgroundColor: fieldBg, 
                                    color: settings.textColor,
                                    opacity: 0.8,
                                    ['--tw-ring-color' as any]: `${settings.accentColor}40`
                                }}
                                placeholder="Dialogue snippets, ideas, reminders..."
                            />
                        </div>
                    </div>
                </div>
            </div>
            <div className="h-px w-full opacity-10" style={{ backgroundColor: settings.textColor }}></div>
        </div>
    );
};

export const ChaptersPanel: React.FC<ChaptersPanelProps> = ({ 
    chapters, characters, snippets, settings, tileBackgroundStyle, selectedIds, onSelect, onUpdateChapter, onDeleteRequest, onSetChapters, directoryHandle, isLinkPanelOpen, onToggleLinkPanel, expandedChapterId, setExpandedChapterId,
    pacingAnalysis, isGeneratingPacingAnalysis, zoomLevel, onZoomChange, isContinuousView, onToggleContinuousView, isSpreadsheetView, onToggleSpreadsheetView
}) => {
    const dialog = useDialog();
    const [activeTab, setActiveTab] = useState<'tiles' | 'chest'>('tiles');
    const { renderContextMenu, renderTaggingModal } = useLockedChestSelection('chapters', settings);
    const [stagedChapters, setStagedChapters] = useState<IChapter[]>(chapters);
    const [isDirty, setIsDirty] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    
    const [dragState, setDragState] = useState<{draggedIds: string[] | null, overId: string | null}>({draggedIds: null, overId: null});
    const [overAct, setOverAct] = useState<number | null>(null);
    const lastSortUpdate = useRef<number>(0);
    const scrollRef = useRef<HTMLDivElement>(null);
    const dispatch = useNovelDispatch();
    const { onGeneratePacingAnalysis, errorMessage, onSetError } = useAssemblyAI();
    const isDarkMode = !isColorLight(settings.textColor);

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

        // Debounce sorting to avoid flicker and heavy updates
        const now = Date.now();
        if (now - lastSortUpdate.current < 50) return;
        lastSortUpdate.current = now;

        const chapterElement = (e.target as HTMLElement).closest('[data-chapter-id]');
        const overId = chapterElement ? (chapterElement as HTMLElement).dataset.chapterId : null;
        const actElement = (e.target as HTMLElement).closest('[data-act]');
        const targetAct = actElement ? parseInt((actElement as HTMLElement).dataset.act || '0', 10) : null;
        
        if (overAct !== targetAct) setOverAct(targetAct);
        if (overId && overId !== dragState.overId) setDragState(s => ({...s, overId}));

        setStagedChapters(current => {
            const itemsToMove = current.filter(ch => draggedIds.includes(ch.id));
            const remaining = current.filter(ch => !draggedIds.includes(ch.id));
            
            if (overId) {
                const targetIdx = remaining.findIndex(ch => ch.id === overId);
                if (targetIdx !== -1) {
                    const targetChapter = remaining[targetIdx];
                    const updatedItems = itemsToMove.map(item => ({ ...item, act: targetChapter.act }));
                    remaining.splice(targetIdx, 0, ...updatedItems);
                    
                    // Optimization: check if anything actually changed
                    const changed = current.some((ch, i) => ch.id !== remaining[i]?.id || ch.act !== remaining[i]?.act);
                    if (!changed) return current;

                    setIsDirty(true);
                    return [...remaining];
                }
            } else if (targetAct !== null) {
                // If we are over an act but NOT over a specific tile, move to the end of that act
                const targetActValue = targetAct === 0 ? undefined : targetAct;
                
                // Find the last index of a chapter in THIS act or the previous act
                const lastInTargetActIdx = remaining.findLastIndex(ch => (ch.act || 0) <= targetAct);
                
                const updatedItems = itemsToMove.map(item => ({ ...item, act: targetActValue }));
                remaining.splice(lastInTargetActIdx + 1, 0, ...updatedItems);
                
                // Compare with current to see if anything actually changed
                const changed = current.some((ch, i) => ch.id !== remaining[i]?.id || ch.act !== remaining[i]?.act);
                if (!changed) return current;

                setIsDirty(true);
                return [...remaining];
            }
            return current;
        });
    };

    const handleDragEnd = () => {
        setDragState({draggedIds: null, overId: null});
        setOverAct(null);
    };

    const { actNames } = useNovelState();
    const acts = useMemo(() => {
        const map: Record<number, IChapter[]> = { 0: [] };
        const nums = Object.keys(actNames || {}).map(Number).sort((a, b) => a - b);
        nums.forEach(n => { map[n] = []; });
        stagedChapters.forEach(c => {
            if (!c) return;
            const actNum = typeof c.act === 'number' && map[c.act] ? c.act : 0;
            map[actNum].push(c);
        });
        return map;
    }, [stagedChapters, actNames]);

    const actNums = useMemo(() => {
        const nums = Object.keys(actNames || {}).map(Number).sort((a, b) => a - b);
        return [0, ...nums];
    }, [actNames]);

    const handleAddAct = () => {
        const nextActNum = Math.max(...actNums, 0) + 1;
        const roman = (n: number) => {
            const map: Record<number, string> = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V', 6: 'VI', 7: 'VII', 8: 'VIII', 9: 'IX', 10: 'X' };
            return map[n] || n.toString();
        };
        dispatch({ type: 'UPDATE_ACT_NAME', payload: { actNum: nextActNum, name: `Act ${roman(nextActNum)}` } });
    };

    return (
        <div className="w-full h-full flex flex-col relative overflow-hidden">
            {renderContextMenu()}
            {renderTaggingModal()}

            <div className="flex-shrink-0 p-4 border-b flex flex-col md:flex-row justify-between items-start md:items-center z-30 shadow-sm gap-4" style={{ backgroundColor: settings.toolbarBg, borderColor: settings.toolbarInputBorderColor }}>
                 <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex bg-black/20 p-1 rounded-lg">
                        <button 
                            onClick={() => setActiveTab('tiles')}
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'tiles' ? 'shadow-sm shadow-black/20' : 'opacity-50'}`}
                            style={{ 
                                backgroundColor: activeTab === 'tiles' ? settings.toolbarButtonBg : 'transparent',
                                color: settings.textColor
                            }}
                        >
                            Chapters
                        </button>
                        <button 
                            onClick={() => setActiveTab('chest')}
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'chest' ? 'shadow-sm shadow-black/20' : 'opacity-50'}`}
                            style={{ 
                                backgroundColor: activeTab === 'chest' ? settings.toolbarButtonBg : 'transparent',
                                color: settings.textColor
                            }}
                        >
                            <ArchiveIcon className="w-4 h-4" />
                            Locked Chest
                        </button>
                    </div>

                    {activeTab === 'tiles' && (
                        <>
                        <button onClick={onToggleLinkPanel} className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-md transition-colors whitespace-nowrap" style={{ backgroundColor: isLinkPanelOpen ? settings.accentColor : settings.toolbarButtonBg, color: isLinkPanelOpen ? '#FFFFFF' : settings.toolbarText }}>
                            <LinkIcon />Link Characters
                        </button>
                        <button onClick={() => onGeneratePacingAnalysis()} disabled={isGeneratingPacingAnalysis} className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-md disabled:opacity-50 whitespace-nowrap" style={{ backgroundColor: settings.toolbarButtonBg, color: settings.toolbarText }}>
                            {isGeneratingPacingAnalysis ? <SpinnerIcon className="h-4 w-4" /> : <SparklesIconOutline className="h-4 w-4" />}Analyze Pacing
                        </button>
                        </>
                    )}
                </div>
                    
                    <div className="w-px h-6 bg-gray-600 opacity-20 mx-2 hidden md:block"></div>
                    
                    <div className="flex items-center gap-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest opacity-40 mr-1" style={{ color: settings.toolbarText }}>Zoom</label>
                        <div className="flex p-0.5 rounded-lg" style={{ backgroundColor: shadeColor(settings.toolbarBg || '#1f2937', isDarkMode ? -15 : 15) }}>
                            {[0, 1, 2, 3].map(level => (
                                <button
                                    key={level}
                                    onClick={() => onZoomChange(level)}
                                    className={`w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold transition-all ${zoomLevel === level ? 'shadow-sm scale-105' : 'opacity-40 hover:opacity-100'}`}
                                    style={{ 
                                        backgroundColor: zoomLevel === level ? settings.accentColor : 'transparent',
                                        color: zoomLevel === level ? 'white' : settings.toolbarText
                                    }}
                                >
                                    {level + 1}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="w-px h-6 bg-gray-600 opacity-20 mx-2 hidden md:block"></div>

                    <div className="flex items-center gap-1">
                        <button 
                            onClick={onToggleContinuousView} 
                            className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-md transition-all whitespace-nowrap" 
                            style={{ 
                                backgroundColor: isContinuousView ? settings.accentColor : settings.toolbarButtonBg, 
                                color: isContinuousView ? '#FFFFFF' : settings.toolbarText 
                            }}
                            title="Switch between Chapter Tiles and Continuous Focus View"
                        >
                            <FocusIcon className="h-4 w-4" />
                            {isContinuousView ? 'Tile View' : 'Focus View'}
                        </button>
                        <button 
                            onClick={onToggleSpreadsheetView} 
                            className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-md transition-all whitespace-nowrap" 
                            style={{ 
                                backgroundColor: isSpreadsheetView ? settings.accentColor : settings.toolbarButtonBg, 
                                color: isSpreadsheetView ? '#FFFFFF' : settings.toolbarText 
                            }}
                            title="Story Architecture Spreadsheet View"
                        >
                            <TableIcon className="h-4 w-4" />
                            Spreadsheet
                        </button>
                        <button 
                            onClick={async () => {
                                const zip = new JSZip();
                                const md = exportChaptersToMarkdown(chapters);
                                const csv = generateSpreadsheetCSV(chapters);
                                
                                zip.file("manuscript.md", md);
                                zip.file("story_architecture.csv", csv);
                                
                                const content = await zip.generateAsync({ type: "blob" });
                                const url = URL.createObjectURL(content);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `novel-export-${new Date().getTime()}.zip`;
                                a.click();
                                URL.revokeObjectURL(url);
                            }} 
                            className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-md transition-all whitespace-nowrap" 
                            style={{ backgroundColor: settings.toolbarButtonBg, color: settings.toolbarText }}
                            title="Export all chapters to Markdown and Spreadsheet (ZIP)"
                        >
                            <SaveIcon className="h-4 w-4" />
                            Export MD+Sheet
                        </button>
                        <button 
                            onClick={() => {
                                const input = document.createElement('input');
                                input.type = 'file';
                                input.accept = '.md,.txt';
                                input.onchange = (e) => {
                                    const file = (e.target as HTMLInputElement).files?.[0];
                                    if (file) {
                                        const reader = new FileReader();
                                        reader.onload = (re) => {
                                            const content = re.target?.result as string;
                                            const imported = importChaptersFromMarkdown(content, chapters);
                                            dialog.confirm(`This will import ${imported.length} chapters and update existing ones. Continue?`, "Import Chapters").then(confirmed => {
                                                if (confirmed) {
                                                    onSetChapters(imported);
                                                    setIsDirty(true);
                                                }
                                            });
                                        };
                                        reader.readAsText(file);
                                    }
                                };
                                input.click();
                            }} 
                            className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-md transition-all whitespace-nowrap" 
                            style={{ backgroundColor: settings.toolbarButtonBg, color: settings.toolbarText }}
                            title="Import and map chapters from a Markdown file"
                        >
                            <ImportIcon className="h-4 w-4" />
                            Import MD
                        </button>
                    </div>
                 
                 {isDirty && 
                    <div className="flex items-center gap-3 animate-in fade-in slide-in-from-right-4 duration-300">
                        <span className="text-xs font-bold uppercase tracking-tighter opacity-50" style={{ color: settings.toolbarText }}>Sort Pending</span>
                        <button 
                            onClick={() => handleCommitChanges()} 
                            disabled={isSyncing}
                            className={`flex items-center gap-2 text-xs font-bold px-4 py-1.5 rounded-full shadow-lg transition-all ${isSyncing ? 'opacity-50' : 'hover:scale-105 active:scale-95 pulse-subtle'}`}
                            style={{ backgroundColor: settings.successColor, color: getContrastColor(settings.successColor) }}
                        >
                            {isSyncing ? <SpinnerIcon className="h-3 w-3" /> : <CheckCircleIcon className="h-3 w-3" />}
                            Commit Changes
                        </button>
                    </div>
                 }
            </div>
            
            <div className="w-full h-full flex min-h-0">
                <div ref={scrollRef} className="flex-grow h-full overflow-y-auto p-4 scroll-smooth" onDrop={handleDragEnd} onDragOver={handleDragOver}>
                     {pacingAnalysis && <PacingHeatmap analysis={pacingAnalysis} settings={settings} />}
                     {errorMessage && <AIError message={errorMessage} onDismiss={() => onSetError(null)} className="mb-4" />}
                     
                     {activeTab === 'chest' ? (
                        <div className="p-4">
                            <LockedChestTab modalId="chapters" settings={settings} />
                        </div>
                     ) : isSpreadsheetView ? (
                        <ChapterSpreadsheet 
                            chapters={stagedChapters}
                            characters={characters}
                            settings={settings}
                            onUpdate={(id, updates) => {
                                onUpdateChapter(id, updates);
                                // Also update stagedChapters to keep them in sync for immediate feedback
                                setStagedChapters(prev => prev.map(ch => ch.id === id ? { ...ch, ...updates } : ch));
                            }}
                            onChaptersChange={(newChaps) => {
                                setStagedChapters(newChaps);
                                setIsDirty(true);
                            }}
                        />
                     ) : isContinuousView ? (
                        <OutlineContinuousEditor 
                            chapters={chapters} 
                            settings={settings} 
                            onUpdate={(id, updates) => onUpdateChapter(id, updates)} 
                            scrollContainerRef={scrollRef}
                        />
                     ) : (
                        <div className="flex flex-col gap-12 w-full pb-32">
                            {actNums.map(actNum => (
                                <div key={actNum} data-act={actNum} className="space-y-4">
                                    <EditableActHeader actNum={actNum} settings={settings} />
                                    <div 
                                        className={`rounded-xl grid gap-6 p-6 transition-all duration-300 ${overAct === actNum ? 'ring-2' : 'bg-black/10'}`} 
                                        style={{ 
                                            ['--tw-ring-color' as any]: settings.accentColor,
                                            backgroundColor: overAct === actNum ? `${settings.accentColor}10` : 'rgba(0,0,0,0.15)',
                                            gridTemplateColumns: `repeat(auto-fill, minmax(${zoomLevel === 0 ? '12rem' : zoomLevel === 1 ? '9rem' : zoomLevel === 2 ? '6rem' : '4rem'}, 1fr))`
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
                                                zoomLevel={zoomLevel}
                                            />
                                        ))}
                                        {acts[actNum].length === 0 && (
                                            <div className="col-span-full h-32 flex items-center justify-center border-2 border-dashed rounded-lg opacity-30 italic text-sm"
                                                style={{ color: settings.textColor, borderColor: settings.toolbarInputBorderColor || 'rgba(255,255,255,0.1)' }}>
                                                Empty {actNum === 0 ? 'Pool' : `Act ${actNum}`}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                            
                            <button 
                                onClick={handleAddAct}
                                className="group flex items-center justify-center gap-3 py-12 rounded-2xl border-2 border-dashed transition-all hover:border-solid opacity-20 hover:opacity-100 mx-auto w-full max-w-sm"
                                style={{ borderColor: settings.toolbarInputBorderColor || 'rgba(255,255,255,0.1)', color: settings.textColor }}
                            >
                                <div className="p-2 rounded-full bg-white/5 group-hover:bg-white/10 transition-colors">
                                    <ChevronDownIcon className="h-5 w-5 rotate-[-90deg]" />
                                </div>
                                <span className="font-black uppercase tracking-[0.2em] text-sm">Add Act</span>
                            </button>
                        </div>
                     )}
                </div>

                {isLinkPanelOpen && (
                    <div className="w-80 h-full flex-shrink-0 border-l animate-in slide-in-from-right duration-500 ease-[cubic-bezier(0.2,0,0,1)]" style={{ backgroundColor: settings.toolbarBg, borderColor: settings.toolbarInputBorderColor }}>
                        <div className="h-full flex flex-col">
                            <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: settings.toolbarInputBorderColor }}>
                                <h3 className="font-bold text-sm uppercase tracking-widest opacity-70" style={{ color: settings.toolbarText }}>Character Linker</h3>
                                <button onClick={onToggleLinkPanel} className="p-1 hover:bg-black/10 rounded transition-colors" style={{ color: settings.toolbarText }}>
                                    <XIcon className="h-4 w-4" />
                                </button>
                            </div>
                            <div className="flex-grow overflow-hidden">
                                {(() => {
                                    const sortedCharactersForLinking = [...characters].sort((a, b) => {
                                        const groupA = a.characterGroup || 0;
                                        const groupB = b.characterGroup || 0;
                                        return groupA - groupB;
                                    });
                                    return (
                                        <CharactersPanel 
                                            variant="link-panel"
                                            characters={sortedCharactersForLinking}
                                            settings={settings}
                                            tileBackgroundStyle={tileBackgroundStyle}
                                            selectedIds={new Set()}
                                            onSelect={() => {}}
                                            onUpdate={() => {}}
                                            onDeleteRequest={() => {}}
                                            onSetCharacters={() => {}}
                                            expandedCharacterId={null}
                                            setExpandedCharacterId={() => {}}
                                            zoomLevel={1}
                                            onZoomChange={() => {}}
                                        />
                                    );
                                })()}
                            </div>
                        </div>
                    </div>
                )}
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
