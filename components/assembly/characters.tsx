
import React, { useState, useRef, useCallback, useLayoutEffect, useEffect, useMemo, useContext } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import type { EditorSettings, ICharacter, TileBackgroundStyle, ICharacterGroup } from '../../types';
import { useNovelState, useNovelDispatch } from '../../NovelContext';
import { useAssemblyAI } from './AssemblyAIContext';
import MarkdownRenderer from '../common/MarkdownRenderer';
import { ChevronDownIcon, SparklesIconOutline, RevertIcon, TrashIconOutline, StarIcon, StarIconOutline, CameraIcon, UserCircleIcon, BrushIcon, LockClosedIconOutline, LockOpenIconOutline, ChevronUpIcon, UserGroupIcon, ViewGridIcon, PlusIcon, ArchiveIcon, DownloadIcon } from '../common/Icons';
import { isColorLight, shadeColor, getImageColor, harmonizeColor, getContrastColor } from '../../utils/colorUtils';
import { AIError } from '../common/AIError';
import { LockedChestTab, useLockedChestSelection } from '../common/LockedChest';

// --- UTILS & HOOKS ---
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

    if (!isEnabled) {
      if (textArea && textArea.style.height !== '') {
        textArea.style.height = '';
      }
      previousIsEnabledRef.current = false;
      return;
    }
    
    if (!textArea || !scrollContainer) {
        previousIsEnabledRef.current = isEnabled;
        return;
    }
    
    const performResize = () => {
        if (textArea.offsetParent === null) return;
        
        const scrollContainerRect = scrollContainer.getBoundingClientRect();
        const textAreaRect = textArea.getBoundingClientRect();

        const isTextAreaTopOutOfView = textAreaRect.top < scrollContainerRect.top;
        
        let scrollPositionBeforeResize: number | null = null;
        let oldTextAreaHeight: number | null = null;
        
        if (isTextAreaTopOutOfView) {
            scrollPositionBeforeResize = scrollContainer.scrollTop;
            oldTextAreaHeight = textArea.scrollHeight;
        }

        textArea.style.height = 'auto';
        const originalOverflow = textArea.style.overflow;
        textArea.style.overflow = 'hidden';
        textArea.style.height = `${textArea.scrollHeight}px`;
        textArea.style.overflow = originalOverflow;
        
        if (isTextAreaTopOutOfView && scrollPositionBeforeResize !== null && oldTextAreaHeight !== null) {
            const newTextAreaHeight = textArea.scrollHeight;
            const heightDifference = newTextAreaHeight - oldTextAreaHeight;
            scrollContainer.scrollTop = scrollPositionBeforeResize + heightDifference;
        }
    };
    
    const isJustExpanded = isEnabled && !previousIsEnabledRef.current;

    if (isJustExpanded && isAnimated) {
      const timeoutId = setTimeout(performResize, 700);
      return () => clearTimeout(timeoutId);
    } else {
      performResize();
    }
    
    previousIsEnabledRef.current = true;

  }, [value, isEnabled, textAreaRef, scrollContainerRef, isAnimated]);
};

const createDragGhost = (count: number, settings: EditorSettings, character?: ICharacter): HTMLElement => {
    const ghost = document.createElement('div');
    ghost.style.position = 'absolute';
    ghost.style.top = '-1000px'; 
    ghost.style.width = '200px';
    ghost.style.height = '250px';
    ghost.style.borderRadius = '12px';
    ghost.style.backgroundColor = settings.toolbarBg || '#1F2937';
    ghost.style.border = `2px solid ${settings.accentColor || '#2563eb'}`;
    ghost.style.overflow = 'hidden';
    ghost.style.display = 'flex';
    ghost.style.flexDirection = 'column';
    ghost.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.4)';
    ghost.style.zIndex = '9999';
    ghost.style.opacity = '0.9';

    if (character && character.photo) {
        const img = document.createElement('img');
        img.src = character.photo;
        img.style.width = '100%';
        img.style.height = '140px';
        img.style.objectFit = 'cover';
        ghost.appendChild(img);
    } else {
        const placeholder = document.createElement('div');
        placeholder.style.width = '100%';
        placeholder.style.height = '140px';
        placeholder.style.backgroundColor = 'rgba(0,0,0,0.2)';
        placeholder.style.display = 'flex';
        placeholder.style.alignItems = 'center';
        placeholder.style.justifyContent = 'center';
        placeholder.innerHTML = `<svg style="width:48px;height:48px;opacity:0.3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>`;
        ghost.appendChild(placeholder);
    }

    const info = document.createElement('div');
    info.style.padding = '12px';
    info.style.color = settings.textColor || '#FFFFFF';
    info.style.fontFamily = 'Inter, sans-serif';
    
    const name = document.createElement('div');
    name.style.fontWeight = '700';
    name.style.fontSize = '14px';
    name.textContent = character?.name || 'Character';
    info.appendChild(name);

    if (count > 1) {
        const badge = document.createElement('div');
        badge.style.position = 'absolute';
        badge.style.bottom = '8px';
        badge.style.right = '8px';
        badge.style.backgroundColor = settings.accentColor || '#2563eb';
        badge.style.color = getContrastColor(settings.accentColor || '#2563eb');
        badge.style.borderRadius = '99px';
        badge.style.padding = '2px 8px';
        badge.style.fontSize = '10px';
        badge.style.fontWeight = '800';
        badge.textContent = `+${count - 1} more`;
        ghost.appendChild(badge);
    }

    ghost.appendChild(info);
    return ghost;
};

// --- COMPONENTS ---

interface CharacterTileProps {
    character: ICharacter;
    isExpanded: boolean;
    isDragging: boolean;
    isSelected: boolean;
    onToggleExpand: (id: string) => void;
    onUpdate: (id: string, updates: Partial<ICharacter>) => void;
    onDeleteRequest: (character: ICharacter) => void;
    onSelect: (id: string, e: React.MouseEvent) => void;
    settings: EditorSettings;
    draggableProps: any;
    scrollContainerRef: React.RefObject<HTMLDivElement>;
    tileBackgroundStyle: TileBackgroundStyle;
    variant?: 'default' | 'link-panel';
    allCharacters: ICharacter[];
    zoomLevel: number;
}

interface GroupHeaderProps {
    group: ICharacterGroup;
    settings: EditorSettings;
    onUpdateGroup: (id: number, name: string) => void;
    onDeleteGroup?: (id: number) => void;
    characterCount: number;
}

const GroupHeader: React.FC<GroupHeaderProps> = ({ group, settings, onUpdateGroup, onDeleteGroup, characterCount }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState(group.name);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    const handleBlur = () => {
        setIsEditing(false);
        if (name.trim() && name !== group.name) {
            onUpdateGroup(group.id, name.trim());
        } else {
            setName(group.name);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleBlur();
        if (e.key === 'Escape') {
            setName(group.name);
            setIsEditing(false);
        }
    };

    return (
        <div className="flex items-center justify-between group/header">
            <h3 className="text-lg font-bold flex items-center gap-3 opacity-80" style={{ color: settings.textColor }}>
                {group.id === 0 ? <UserCircleIcon className="h-5 w-5" /> : group.id === 1 ? <StarIcon className="h-5 w-5" /> : <UserGroupIcon className="h-5 w-5" />}
                {isEditing ? (
                    <input
                        ref={inputRef}
                        value={name}
                        onChange={e => setName(e.target.value)}
                        onBlur={handleBlur}
                        onKeyDown={handleKeyDown}
                        className="bg-black/20 border-none outline-none px-2 py-0.5 rounded text-lg font-bold"
                        style={{ color: settings.textColor, width: `${Math.max(name.length + 2, 10)}ch` }}
                    />
                ) : (
                    <span 
                        onClick={() => group.id !== 0 && setIsEditing(true)} 
                        className={group.id !== 0 ? "cursor-pointer hover:underline decoration-dotted underline-offset-4" : ""}
                    >
                        {group.name}
                    </span>
                )}
                <span className="text-xs font-normal opacity-40 ml-2">({characterCount})</span>
            </h3>
            {group.id > 3 && onDeleteGroup && (
                <button 
                    onClick={() => onDeleteGroup(group.id)}
                    className="p-1.5 rounded opacity-0 group-hover/header:opacity-100 transition-opacity"
                    style={{ backgroundColor: settings.toolbarButtonBg, color: settings.toolbarText }}
                    title="Delete category"
                >
                    <TrashIconOutline className="h-4 w-4" />
                </button>
            )}
        </div>
    );
};

const CharacterTile: React.FC<CharacterTileProps> = React.memo(({ 
    character, isExpanded, isDragging, isSelected, onToggleExpand, onUpdate, onDeleteRequest, onSelect, settings,
    draggableProps, scrollContainerRef, tileBackgroundStyle, variant = 'default', allCharacters, zoomLevel
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { chapters } = useNovelState();
    const { isGeneratingProfile, errorId, errorMessage, onGenerateProfile, onUpdateProfile, onSetError } = useAssemblyAI();
    const isGenerating = isGeneratingProfile === character.id;

    const [summary, setSummary] = useState(character.summary);
    const [rawNotes, setRawNotes] = useState(character.rawNotes);
    const [profile, setProfile] = useState(character.profile);
    const [isEditingProfile, setIsEditingProfile] = useState(() => !character.profile.trim());
    
    const [isEditingName, setIsEditingName] = useState(false);
    const [localName, setLocalName] = useState(character.name);
    const nameInputRef = useRef<HTMLTextAreaElement>(null);

    const summaryRef = useRef<HTMLTextAreaElement>(null);
    const rawNotesRef = useRef<HTMLTextAreaElement>(null);
    const profileRef = useRef<HTMLTextAreaElement>(null);
    const [showUpdateConfirm, setShowUpdateConfirm] = useState(false);

    const isLinkPanel = variant === 'link-panel';

    useAutosizeTextArea(summaryRef, summary, isExpanded, scrollContainerRef, { isAnimated: true });
    useAutosizeTextArea(rawNotesRef, rawNotes, isExpanded, scrollContainerRef, { isAnimated: true });
    useAutosizeTextArea(profileRef, profile, isExpanded, scrollContainerRef, { isAnimated: true });
    useAutosizeTextArea(nameInputRef, localName, isEditingName, scrollContainerRef, { isAnimated: false });

    const debouncedUpdate = useDebouncedCallback((updates: Partial<ICharacter>) => {
        const isEditingProfileField = 'summary' in updates || 'profile' in updates;
        if (character.previousProfile && isEditingProfileField) {
            onUpdate(character.id, { ...updates, previousProfile: undefined });
        } else {
            onUpdate(character.id, updates);
        }
    }, 500);

    useEffect(() => {
        setSummary(character.summary);
        setRawNotes(character.rawNotes);
        setProfile(character.profile);
        setLocalName(character.name);
        if (!character.profile.trim()) {
            setIsEditingProfile(true);
        }
    }, [character]);
    
    useEffect(() => {
        if (isEditingName && nameInputRef.current) {
            nameInputRef.current.focus();
            nameInputRef.current.select();
        }
    }, [isEditingName]);

    const handleNameUpdate = () => {
        setIsEditingName(false);
        const trimmedName = localName.trim();
        if (trimmedName && trimmedName !== character.name) {
            onUpdate(character.id, { name: trimmedName });
        } else if (!trimmedName) {
            setLocalName(character.name);
        }
    };
    
    const handleNameKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            e.currentTarget.blur();
        }
        if (e.key === 'Escape') {
            e.preventDefault();
            setLocalName(character.name);
            setIsEditingName(false);
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
                    onUpdate(character.id, { photo: photoUrl, imageColor: imageColor, isPhotoLocked: true });
                } catch(err) {
                    onUpdate(character.id, { photo: photoUrl, isPhotoLocked: true });
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const handleGenerateProfile = () => {
        if (!rawNotes.trim()) {
            onSetError("Please add some notes before generating a profile.", character.id);
            return;
        }
        onGenerateProfile(character, rawNotes);
        setIsEditingProfile(false);
    }
    
    const handleUpdateProfile = () => {
        const manuscriptContent = chapters.map(c => {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = c.content;
            return `Chapter ${c.chapterNumber}:\n${tempDiv.innerText}\n\n`;
        }).join('---\n\n');
        
        onUpdateProfile(character, manuscriptContent);
        setShowUpdateConfirm(false);
    };
    
    const handleRevertProfile = () => {
        if (character.previousProfile) {
            onUpdate(character.id, { ...character.previousProfile, previousProfile: undefined });
        }
    };

    const handleToggleLock = (e: React.MouseEvent) => {
        e.stopPropagation();
        onUpdate(character.id, { isPhotoLocked: !character.isPhotoLocked });
    };

    const handleExportPhoto = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!character.photo) return;
        
        const fileName = `${character.name.replace(/\s+/g, '_')}_headshot.jpg`;
        
        try {
            // Create an image element to load the photo
            const img = new Image();
            img.crossOrigin = "anonymous"; // Try to handle CORS for external URLs
            
            const imageLoadPromise = new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
            });
            
            img.src = character.photo;
            await imageLoadPromise;
            
            // Use canvas to convert to JPEG
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error("Canvas context not available");
            
            // Fill with white background (JPEG doesn't support transparency)
            ctx.fillStyle = "white";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
            
            const jpegUrl = canvas.toDataURL("image/jpeg", 0.95);
            
            const link = document.createElement('a');
            link.href = jpegUrl;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error("Export to JPEG failed, trying direct download:", error);
            // Fallback for cases where canvas might fail (e.g. CORS)
            const link = document.createElement('a');
            link.href = character.photo;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };
    
    const handleTogglePrimary = (e: React.MouseEvent) => {
        e.stopPropagation();
        onUpdate(character.id, { isPrimary: !character.isPrimary });
    }

    const handleCycleAccentStyle = (e: React.MouseEvent) => {
        e.stopPropagation();
        const styles: ('left-top-ingress' | 'outline' | 'corner-diagonal')[] = ['left-top-ingress', 'outline', 'corner-diagonal'];
        const currentStyle = character.accentStyle || 'left-top-ingress';
        const currentIndex = styles.indexOf(currentStyle);
        const nextStyle = styles[(currentIndex + 1) % styles.length];
        onUpdate(character.id, { accentStyle: nextStyle });
    };

    const useImageColor = settings.tileColorSource === 'image' && !!character.imageColor;
    const tileBorderColor = useImageColor ? character.imageColor! : settings.toolbarInputBorderColor;
    const isDarkMode = !isColorLight(settings.textColor);

    const backgroundStyle = useMemo(() => {
        const hasDominantColor = settings.tileColorSource === 'image' && !!character.imageColor;
        
        // Harmonize image color with global theme background
        const baseColor = hasDominantColor 
            ? harmonizeColor(character.imageColor!, settings.backgroundColor, isDarkMode)
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
    }, [tileBackgroundStyle, settings.backgroundColor, settings.toolbarButtonBg, isDarkMode, character.imageColor]);
    
    const tileBaseColor = backgroundStyle.baseColor;
    const tileTextColor = getContrastColor(tileBaseColor);
    
    const secondaryButtonBg = shadeColor(tileBaseColor, isDarkMode ? 10 : -10);
    const secondaryButtonHoverBg = shadeColor(tileBaseColor, isDarkMode ? 20 : -20);
    const inputBg = shadeColor(tileBaseColor, isDarkMode ? -8 : 8);
    const inputText = getContrastColor(inputBg);
    const actionButtonBg = shadeColor(tileBaseColor, isDarkMode ? 15 : -15);
    const actionButtonText = getContrastColor(actionButtonBg);
    
    const accentColor = useImageColor ? character.imageColor! : settings.accentColor;

    if (isLinkPanel) {
        return (
            <div
                className="relative w-full cursor-grab active:cursor-grabbing"
                {...draggableProps}
            >
                <div
                    className="relative rounded-lg p-3"
                    style={{ backgroundColor: settings.toolbarButtonBg }}
                >
                     <div className="absolute top-3 right-3 h-14 w-14 z-10">
                        <div 
                            className="border-2 h-full w-full rounded-lg overflow-hidden"
                            style={{
                                backgroundColor: settings.toolbarButtonBg,
                                borderColor: (settings.tileColorSource === 'image' && character.imageColor) ? character.imageColor : (settings.toolbarInputBorderColor || 'transparent')
                            }}
                        >
                            {character.photo ? (
                                <img src={character.photo} alt={character.name} className="w-full h-full object-cover" />
                            ) : (
                                <UserCircleIcon className="h-full w-full opacity-60" style={{ color: settings.toolbarText }} />
                            )}
                        </div>
                        {character.isPrimary && <StarIcon className="absolute -top-2 -right-2 h-5 w-5 text-yellow-400" style={{ filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.5))'}}/>}
                     </div>
                    <div className="pr-20">
                        <h4 className="font-bold text-sm truncate">{character.name}</h4>
                        <p className="text-xs opacity-70 mt-1 summary-clamped-2line">{character.summary || character.tagline}</p>
                    </div>
                </div>
            </div>
        )
    }

    if (isExpanded) {
        return (
             <div 
                {...draggableProps}
                className={`relative transition-all duration-500 ease-[cubic-bezier(0.2,0,0,1)] ${isDragging ? 'opacity-20 grayscale scale-95 blur-[1px]' : 'opacity-100 scale-100'}`}
             >
                <input type="file" accept="image/png, image/jpeg" ref={fileInputRef} onChange={handlePhotoUpload} className="hidden" />
                <div
                    onClick={(e) => onSelect(character.id, e)}
                    className={`relative rounded-lg shadow-md transition-shadow duration-300 ease-in-out z-10 flex flex-col border-4`}
                    style={{
                        ...backgroundStyle,
                        color: tileTextColor,
                        borderColor: isSelected ? settings.accentColor : (character.accentStyle === 'outline' ? accentColor : 'transparent'),
                    }}
                >
                    {(character.accentStyle === 'left-top-ingress' || !character.accentStyle) && (
                        <div className="absolute top-0 left-0 w-[6px] h-1/3" style={{backgroundColor: accentColor}}></div>
                    )}
                    {character.accentStyle === 'corner-diagonal' && (
                        <div className="absolute bottom-0 right-0" style={{
                            width: 0,
                            height: 0,
                            borderBottom: `48px solid ${accentColor}`,
                            borderLeft: '48px solid transparent',
                        }}></div>
                    )}
                     {/* Header */}
                    <div className="flex w-full items-start gap-6 p-6">
                        <div className="min-w-0 flex-grow">
                            {character.isPrimary && <StarIcon className="h-14 w-14 mb-2 text-yellow-400" />}
                            {isEditingName ? (
                                <textarea
                                    ref={nameInputRef} value={localName} onChange={e => setLocalName(e.target.value)}
                                    onBlur={handleNameUpdate} onKeyDown={handleNameKeyDown} onClick={e => e.stopPropagation()}
                                    className="font-bold text-3xl w-full p-0 border-none resize-none outline-none block bg-transparent"
                                    style={{ color: settings.textColor, lineHeight: '1.2' }} rows={1}
                                />
                            ) : (
                                <h3 onClick={(e) => { e.stopPropagation(); setIsEditingName(true); }} className="font-bold text-3xl cursor-pointer" title={character.name}>
                                    <span className="truncate">{character.name}</span>
                                </h3>
                            )}
                            {character.tagline && <p className="text-lg mt-1 italic opacity-90">"{character.tagline}"</p>}
                             {character.keywords && character.keywords.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-3">
                                    {character.keywords.map(kw => (
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
                                     {character.photo ? (
                                        <img src={character.photo} alt={character.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-black/10">
                                            <UserCircleIcon className="h-1/2 w-1/2 opacity-30"/>
                                        </div>
                                    )}
                                </div>

                                {/* Lock Icon */}
                                <div 
                                    className="absolute top-2 right-2 p-1.5 rounded-full transition-all duration-200 z-20 shadow-md"
                                    style={{ backgroundColor: character.isPhotoLocked ? settings.accentColor : secondaryButtonBg, color: character.isPhotoLocked ? getContrastColor(settings.accentColor) : getContrastColor(secondaryButtonBg) }}
                                    onClick={handleToggleLock}
                                    title={character.isPhotoLocked ? "Unlock photo" : "Lock photo"}
                                >
                                    {character.isPhotoLocked ? <LockClosedIconOutline className="h-3 w-3" /> : <LockOpenIconOutline className="h-3 w-3" />}
                                </div>

                                {/* Export Icon */}
                                {character.photo && (
                                    <div 
                                        className="absolute top-10 right-2 p-1.5 rounded-full transition-all duration-200 z-20 shadow-md"
                                        style={{ backgroundColor: secondaryButtonBg, color: getContrastColor(secondaryButtonBg) }}
                                        onClick={handleExportPhoto}
                                        title="Export headshot"
                                    >
                                        <DownloadIcon className="h-3 w-3" />
                                    </div>
                                )}

                                {/* Upload Icon (Visible on hover) */}
                                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-2 pt-6 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-b-xl">
                                     <div className="flex items-center gap-1 text-[10px] font-medium" style={{ color: '#FFFFFF' }}>
                                        <CameraIcon className="h-3 w-3"/>
                                        <span>Update</span>
                                     </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Form Body */}
                    <div className="p-6 border-t" style={{ borderColor: `${tileBorderColor}80`}}>
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-semibold mb-2 opacity-80 uppercase tracking-wider">Summary</label>
                                <textarea
                                    ref={summaryRef} value={summary}
                                    onChange={e => { setSummary(e.target.value); debouncedUpdate({ summary: e.target.value }); }}
                                    className="w-full p-3 rounded-lg border resize-none overflow-hidden transition-colors"
                                    style={{ borderColor: `${tileTextColor}33`, color: inputText, backgroundColor: inputBg }}
                                    rows={4}
                                />
                            </div>
                             <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="block text-sm font-semibold opacity-80 uppercase tracking-wider">Detailed Profile</label>
                                    <button
                                        onClick={() => setIsEditingProfile(p => !p)}
                                        className="text-[10px] px-2 py-1 rounded-md uppercase font-bold tracking-tighter transition-colors"
                                        style={{ backgroundColor: actionButtonBg, color: actionButtonText }}
                                    >
                                        {isEditingProfile ? 'Preview' : 'Edit'}
                                    </button>
                                </div>
                                {isEditingProfile ? (
                                    <textarea
                                        ref={profileRef} value={profile}
                                        onChange={e => { setProfile(e.target.value); debouncedUpdate({ profile: e.target.value }); }}
                                        className="w-full p-3 rounded-lg border resize-none overflow-hidden transition-colors"
                                        style={{ borderColor: `${tileTextColor}33`, color: inputText, backgroundColor: inputBg }}
                                        rows={10}
                                    />
                                ) : (
                                    <div className="w-full p-4 rounded-lg border max-h-96 overflow-y-auto transition-colors" style={{ borderColor: `${tileTextColor}33`, color: inputText, backgroundColor: inputBg }}>
                                        <MarkdownRenderer source={profile} settings={settings} />
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
                                    placeholder="Jot down personality traits, backstory, goals, relationships, etc."
                                />
                            </div>
                             <div>
                                <label className="block text-sm font-semibold mb-2 opacity-80 uppercase tracking-wider">Relationships</label>
                                {(character.relationships && character.relationships.length > 0) ? (
                                    <div className="space-y-2">
                                        {character.relationships.map(rel => {
                                            const relatedChar = allCharacters.find(c => c.id === rel.characterId);
                                            if (!relatedChar) return null;
                                            const relBg = shadeColor(inputBg, isDarkMode ? -5 : 5);
                                            return (
                                                <div key={rel.characterId} className="flex items-center gap-3 p-3 rounded-lg border border-white/5 transition-colors" style={{ backgroundColor: relBg, color: getContrastColor(relBg) }}>
                                                    <div className="h-10 w-10 rounded-full bg-cover bg-center flex-shrink-0 border-2" style={{ backgroundImage: relatedChar.photo ? `url(${relatedChar.photo})` : undefined, backgroundColor: relatedChar.imageColor || settings.accentColor, borderColor: relatedChar.imageColor || settings.accentColor }}>
                                                       {!relatedChar.photo && <UserCircleIcon className="h-full w-full opacity-50"/>}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-semibold text-sm truncate">{relatedChar.name}</p>
                                                        <p className="text-xs opacity-70 truncate">{rel.description}</p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="text-center text-xs opacity-50 p-6 rounded-lg border border-dashed transition-colors" style={{ backgroundColor: inputBg, borderColor: `${tileTextColor}33`, color: inputText }}>
                                        No relationships defined in notes. Generate the profile for the AI to infer them.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                     {/* Action Footer */}
                    <div className="p-4 border-t flex flex-wrap justify-between items-center gap-4 relative" style={{ borderColor: `${tileBorderColor}80` }}>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleGenerateProfile}
                                disabled={isGenerating}
                                className="px-4 py-2 rounded-lg text-sm font-bold flex items-center disabled:opacity-60 shadow-lg transition-transform active:scale-95"
                                style={{ backgroundColor: settings.accentColor, color: getContrastColor(settings.accentColor) }}
                            >
                                <SparklesIconOutline className="h-5 w-5 mr-2"/>
                                {isGenerating ? 'Generating...' : 'Generate Profile'}
                            </button>
                            
                            {character.previousProfile ? (
                                <button
                                    onClick={handleRevertProfile}
                                    className="px-4 py-2 rounded-lg text-sm font-bold flex items-center transition-colors"
                                    style={{ backgroundColor: actionButtonBg, color: actionButtonText }}
                                >
                                    <RevertIcon className="h-4 w-4 mr-2" />
                                    Revert
                                </button>
                            ) : (
                                <div className="relative">
                                     <button
                                        onMouseEnter={() => setShowUpdateConfirm(true)}
                                        onMouseLeave={() => setShowUpdateConfirm(false)}
                                        className="px-4 py-2 rounded-lg text-sm font-bold flex items-center transition-colors"
                                        style={{ backgroundColor: actionButtonBg, color: actionButtonText }}
                                     >
                                         <BrushIcon className="h-4 w-4 mr-2" />
                                         Update from Manuscript
                                     </button>
                                    {showUpdateConfirm && (
                                         <div onMouseEnter={() => setShowUpdateConfirm(true)} onMouseLeave={() => setShowUpdateConfirm(false)} className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 p-4 rounded-xl shadow-2xl text-xs z-50 border border-white/10" style={{backgroundColor: settings.dropdownBg, color: settings.toolbarText}}>
                                             <p className="opacity-80 leading-relaxed">This will analyze the entire manuscript to update this character's profile based on their actions and dialogue. This will overwrite existing profile data.</p>
                                             <button onClick={handleUpdateProfile} className="w-full mt-3 py-2 rounded-lg font-bold shadow-md" style={{backgroundColor: settings.accentColor, color: getContrastColor(settings.accentColor)}}>Confirm Update</button>
                                         </div>
                                     )}
                                </div>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleTogglePrimary}
                                className="p-2.5 rounded-lg transition-colors"
                                style={{ backgroundColor: character.isPrimary ? '#facc15' : actionButtonBg, color: character.isPrimary ? 'black' : actionButtonText }}
                                title={character.isPrimary ? "Unmark as primary character" : "Mark as primary character"}
                            >
                                {character.isPrimary ? <StarIcon className="h-5 w-5" /> : <StarIconOutline className="h-5 w-5" />}
                            </button>
                             <button
                                onClick={handleCycleAccentStyle}
                                className="p-2.5 rounded-lg transition-colors"
                                style={{ backgroundColor: actionButtonBg, color: actionButtonText }}
                                title="Cycle accent style"
                            >
                                <BrushIcon className="h-5 w-5" />
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); onToggleExpand(character.id); }}
                                className="p-2.5 rounded-lg transition-colors"
                                style={{ backgroundColor: actionButtonBg, color: actionButtonText }}
                                aria-label="Collapse character details"
                                title="Collapse"
                            >
                                <ChevronUpIcon className="h-5 w-5" />
                            </button>
                            <button
                                onClick={() => onDeleteRequest(character)}
                                className="p-2.5 rounded-lg transition-colors"
                                style={{ backgroundColor: settings.dangerColor, color: getContrastColor(settings.dangerColor) }}
                                title="Delete character"
                            >
                                <TrashIconOutline className="h-5 w-5" />
                            </button>
                        </div>
                    </div>
                    {errorId === character.id && <AIError message={errorMessage} className="mx-4 mb-2" />}
                </div>
            </div>
        );
    }

    // Collapsed View
    return (
        <div 
            {...draggableProps}
            className={`relative transition-all duration-500 ease-[cubic-bezier(0.2,0,0,1)] ${isDragging ? 'opacity-20 grayscale scale-95 blur-[2px] ring-2 ring-offset-4 ring-offset-transparent ring-white/10' : 'opacity-100 scale-100'}`}
        >
            <input type="file" accept="image/png, image/jpeg" ref={fileInputRef} onChange={handlePhotoUpload} className="hidden" />
            
            <div
                onClick={(e) => onSelect(character.id, e)}
                className={`relative aspect-[4/5] flex flex-col rounded-lg shadow-md transition-shadow duration-300 ease-in-out z-10 border-4 overflow-hidden ${zoomLevel >= 3 ? 'aspect-square' : ''}`}
                style={{
                    color: tileTextColor,
                    borderColor: isSelected ? settings.accentColor : (character.accentStyle === 'outline' ? accentColor : 'transparent'),
                    ...backgroundStyle,
                    cursor: 'grab'
                }}
            >
                {(character.accentStyle === 'left-top-ingress' || !character.accentStyle) && (
                    <div className="absolute top-0 left-0 w-[6px] h-1/3" style={{backgroundColor: accentColor}}></div>
                )}
                {character.accentStyle === 'corner-diagonal' && (
                    <div className="absolute bottom-0 right-0" style={{
                        width: 0,
                        height: 0,
                        borderBottom: `${zoomLevel >= 2 ? '24' : '32'}px solid ${accentColor}`,
                        borderLeft: '48px solid transparent',
                    }}></div>
                )}
                
                <div className={`p-4 flex-grow min-h-0 block ${zoomLevel >= 2 ? 'p-2' : ''} ${zoomLevel >= 3 ? 'p-0 h-full' : ''}`}>
                    {/* Headshot */}
                    <div 
                        className={`float-right ml-2 mb-1 group z-20 relative ${zoomLevel >= 3 ? 'float-none m-0 h-full w-full' : zoomLevel >= 2 ? 'h-14 w-14' : 'h-20 w-20'}`}
                        title="Click to upload portrait"
                        onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    >
                        <div className={`h-full w-full rounded-lg overflow-hidden border-4 ${zoomLevel >= 3 ? 'rounded-none border-0' : ''}`} style={{ borderColor: tileBorderColor, backgroundColor: settings.backgroundColor }}>
                            {character.photo ? (
                                <img src={character.photo} alt={character.name} className="w-full h-full object-cover" />
                            ) : (
                                <UserCircleIcon className="h-full w-full opacity-30"/>
                            )}
                             <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <CameraIcon className={`${zoomLevel >= 2 ? 'h-5 w-5' : 'h-8 w-8'}`} style={{ color: '#FFFFFF' }}/>
                            </div>
                        </div>
                        {character.isPrimary && <StarIcon className={`absolute -top-2 -right-2 text-yellow-400 z-30 ${zoomLevel >= 2 ? 'h-4 w-4' : 'h-6 w-6'}`} style={{ filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.5))'}}/>}
                        
                        {zoomLevel >= 3 && (
                            <div className="absolute inset-x-0 bottom-0 bg-black/40 p-1 flex items-center justify-center">
                                <span className="font-bold text-[10px] truncate text-center" style={{ color: '#FFFFFF' }}>{character.name}</span>
                            </div>
                        )}
                    </div>

                    {zoomLevel < 3 && (
                        <>
                            <div className="w-full">
                                {isEditingName ? (
                                    <textarea
                                        ref={nameInputRef} value={localName} onChange={e => setLocalName(e.target.value)}
                                        onBlur={handleNameUpdate} onKeyDown={handleNameKeyDown} onClick={e => e.stopPropagation()}
                                        className={`font-bold w-full p-0 border-none resize-none outline-none block bg-transparent ${zoomLevel >= 2 ? 'text-sm' : 'text-lg'}`}
                                        style={{ color: tileTextColor, lineHeight: '1.2' }} rows={1}
                                    />
                                ) : (
                                    <h3 onClick={(e) => { e.stopPropagation(); setIsEditingName(true); }} className={`font-bold cursor-pointer break-words leading-tight ${zoomLevel >= 2 ? 'text-xs' : 'text-lg'}`} title={character.name}>
                                        {character.name}
                                    </h3>
                                )}
                            </div>
                            {zoomLevel < 2 && (
                                <p className="text-xs opacity-70 summary-clamped mt-2">
                                    {character.summary || character.tagline || 'No summary provided.'}
                                </p>
                            )}
                        </>
                    )}
                </div>

                {zoomLevel < 3 && (
                    <div className={`flex-shrink-0 flex justify-end items-center relative clear-both ${zoomLevel >= 2 ? 'p-1' : 'p-3'}`}>
                        {zoomLevel < 1 && (
                            <div className="flex flex-wrap gap-1 mr-auto">
                                {(character.keywords || []).slice(0, 2).map(kw => (
                                    <span key={kw} className="px-1.5 py-0.5 rounded text-xs" style={{backgroundColor: shadeColor(tileBaseColor, isDarkMode ? 10 : -10), color: tileTextColor}}>{kw}</span>
                                ))}
                            </div>
                        )}
                        <button
                            className="cursor-pointer p-1.5 rounded-full transition-colors z-20"
                            onClick={(e) => { e.stopPropagation(); onToggleExpand(character.id); }}
                            style={{ backgroundColor: secondaryButtonBg, color: getContrastColor(secondaryButtonBg) }}
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = secondaryButtonHoverBg || ''}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = secondaryButtonBg || ''}
                            aria-label={"Expand character details"}
                        >
                            <ChevronDownIcon className={zoomLevel >= 2 ? 'h-3 w-3' : 'h-4 w-4'} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
});

interface CharactersPanelProps {
    characters: ICharacter[];
    settings: EditorSettings;
    tileBackgroundStyle: TileBackgroundStyle;
    selectedIds: Set<string>;
    onSelect: (id: string, e: React.MouseEvent) => void;
    onUpdate: (id: string, updates: Partial<ICharacter>) => void;
    onDeleteRequest: (character: ICharacter) => void;
    onSetCharacters: (characters: ICharacter[]) => void;
    expandedCharacterId: string | null;
    setExpandedCharacterId: (id: string | null) => void;
    variant?: 'default' | 'link-panel';
    zoomLevel: number;
    onZoomChange: (level: number) => void;
}

export const CharactersPanel: React.FC<CharactersPanelProps> = ({ 
    characters, settings, tileBackgroundStyle, selectedIds, onSelect, onUpdate, onDeleteRequest, onSetCharacters, expandedCharacterId, setExpandedCharacterId, variant = 'default',
    zoomLevel, onZoomChange
}) => {
    const { characterGroups = [
        { id: 0, name: 'Unassigned' },
        { id: 1, name: 'Protagonists' },
        { id: 2, name: 'Antagonists' },
        { id: 3, name: 'Secondary' },
    ] } = useNovelState();
    
    const [orderedCharacters, setOrderedCharacters] = useState(characters);
    const [dragState, setDragState] = useState<{draggedIds: string[] | null, overId: string | null}>({draggedIds: null, overId: null});
    const [overGroup, setOverGroup] = useState<number | null>(null);
    const [activeTab, setActiveTab] = useState<'content' | 'chest'>('content');
    const { renderContextMenu, renderTaggingModal } = useLockedChestSelection('characters', settings);
    const lastSortUpdate = useRef<number>(0);
    const scrollRef = useRef<HTMLDivElement>(null);
    const isLinkPanel = variant === 'link-panel';
    const dispatch = useNovelDispatch();
    const isDarkMode = !isColorLight(settings.textColor);

    useEffect(() => {
        if (!dragState.draggedIds) {
            setOrderedCharacters(characters);
        }
    }, [characters, dragState.draggedIds]);
    
    const handleToggleExpand = useCallback((id: string) => {
        const newExpandedId = expandedCharacterId === id ? null : id;
        setExpandedCharacterId(newExpandedId);

        if (newExpandedId) {
             setTimeout(() => {
                const tile = document.querySelector(`[data-character-id="${id}"]`);
                if (tile) tile.scrollIntoView({ behavior: 'smooth', block: 'start' });
             }, 100);
        }
    }, [expandedCharacterId, setExpandedCharacterId]);

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
        const id = e.currentTarget.dataset.characterId;
        if (!id) return;
        const idsToDrag = selectedIds.has(id) ? Array.from(selectedIds) : [id];
        setDragState({ draggedIds: idsToDrag, overId: id });
        
        // Pass character data to other components
        e.dataTransfer.setData('characterIds', JSON.stringify(idsToDrag));

        const firstCharacter = characters.find(c => c.id === id);
        const ghost = createDragGhost(idsToDrag.length, settings, firstCharacter);
        document.body.appendChild(ghost);
        e.dataTransfer.setDragImage(ghost, 100, 125);
        setTimeout(() => document.body.removeChild(ghost), 0);
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        
        // If we are in link-panel mode, we don't want the panel to reorder itself
        if (isLinkPanel) return;

        const characterElement = (e.target as HTMLElement).closest('[data-character-id]') as HTMLElement;
        const overId = characterElement ? characterElement.dataset.characterId : null;
        
        const groupElement = (e.target as HTMLElement).closest('[data-group]');
        const targetGroup = groupElement ? parseInt((groupElement as HTMLElement).dataset.group || '0', 10) : null;
        
        if (overGroup !== targetGroup) setOverGroup(targetGroup);

        if (!overId && targetGroup === null) return;
        
        const now = Date.now();
        // Throttle updates and avoid redundant logic if we're over the same tile
        if (now - lastSortUpdate.current < 50) return;
        lastSortUpdate.current = now;

        if (overId && overId !== dragState.overId) {
            setDragState(prev => ({ ...prev, overId }));
        } else if (!overId && targetGroup !== null) {
            setDragState(prev => ({ ...prev, overId: null }));
        }
        
        setOrderedCharacters(current => {
            const itemsToMove = current.filter(c => dragState.draggedIds?.includes(c.id));
            const remaining = current.filter(c => !dragState.draggedIds?.includes(c.id));
            
            if (overId) {
                const targetIdx = remaining.findIndex(c => c.id === overId);
                if (targetIdx !== -1) {
                    const targetChar = remaining[targetIdx];
                    const updatedItems = itemsToMove.map(item => ({ ...item, characterGroup: targetChar.characterGroup }));
                    remaining.splice(targetIdx, 0, ...updatedItems);

                    // Optimization: check if anything actually changed
                    const changed = current.some((c, i) => c.id !== remaining[i]?.id || c.characterGroup !== remaining[i]?.characterGroup);
                    if (!changed) return current;

                    return [...remaining];
                }
            } else if (targetGroup !== null) {
                const updatedItems = itemsToMove.map(item => ({ ...item, characterGroup: targetGroup === 0 ? undefined : targetGroup }));
                
                // Find the last index of a character in THIS group or previous group
                const lastInTargetGroupIdx = remaining.findLastIndex(c => (c.characterGroup || 0) <= targetGroup);
                remaining.splice(lastInTargetGroupIdx + 1, 0, ...updatedItems);
                
                // Compare with current to see if anything actually changed
                const changed = current.some((c, i) => c.id !== remaining[i]?.id || c.characterGroup !== remaining[i]?.characterGroup);
                if (!changed) return current;

                return [...remaining];
            }
            return current;
        });
    };

    const handleDragEnd = () => {
        if (dragState.draggedIds) {
            onSetCharacters(orderedCharacters);
        }
        setDragState({ draggedIds: null, overId: null });
        setOverGroup(null);
    };

    const groups = useMemo(() => {
        const map: Record<number, ICharacter[]> = {};
        characterGroups.forEach(g => map[g.id] = []);
        
        orderedCharacters.forEach(c => {
            if (!c) return;
            const groupNum = typeof c.characterGroup === 'number' && map[c.characterGroup] ? c.characterGroup : 0;
            map[groupNum].push(c);
        });
        return map;
    }, [orderedCharacters, characterGroups]);

    return (
        <div className="w-full h-full flex flex-col">
            {renderContextMenu()}
            {renderTaggingModal()}
            {!isLinkPanel && (
                <div className="p-4 border-b flex flex-wrap justify-between items-center z-30 shadow-sm gap-4" style={{ backgroundColor: settings.toolbarBg, borderColor: settings.toolbarInputBorderColor }}>
                    <div className="flex items-center gap-6">
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

                        <div className="flex bg-black/20 p-1 rounded-lg">
                            <button 
                                onClick={() => setActiveTab('content')}
                                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'content' ? 'shadow-sm' : 'opacity-50'}`}
                                style={{ 
                                    backgroundColor: activeTab === 'content' ? settings.toolbarButtonBg : 'transparent',
                                    color: settings.textColor
                                }}
                            >
                                Characters
                            </button>
                            <button 
                                onClick={() => setActiveTab('chest')}
                                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'chest' ? 'shadow-sm' : 'opacity-50'}`}
                                style={{ 
                                    backgroundColor: activeTab === 'chest' ? settings.toolbarButtonBg : 'transparent',
                                    color: settings.textColor
                                }}
                            >
                                <ArchiveIcon className="w-4 h-4" />
                                Locked Chest
                            </button>
                        </div>
                    </div>
                    
                    <button
                        onClick={() => {
                            const name = prompt("Enter category name:");
                            if (name) dispatch({ type: 'ADD_CHARACTER_GROUP', payload: name });
                        }}
                        className="px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-2 shadow-sm transition-transform active:scale-95"
                        style={{ backgroundColor: settings.toolbarButtonBg, color: settings.toolbarText }}
                    >
                        <PlusIcon className="h-4 w-4" />
                        Add Category
                    </button>
                </div>
            )}
            
            <div ref={scrollRef} className="flex-grow h-full overflow-y-auto p-4 scroll-smooth" onDrop={handleDragEnd} onDragOver={handleDragOver}>
                {activeTab === 'chest' ? (
                    <LockedChestTab modalId="characters" settings={settings} />
                ) : expandedCharacterId ? (
                    (() => {
                        const char = characters.find(c => c.id === expandedCharacterId);
                        if (!char) {
                            setExpandedCharacterId(null);
                            return null;
                        }
                        return (
                            <CharacterTile
                                character={char}
                                isExpanded={true}
                                isDragging={false}
                                isSelected={selectedIds.has(char.id)}
                                onToggleExpand={handleToggleExpand}
                                onUpdate={onUpdate}
                                onDeleteRequest={onDeleteRequest}
                                onSelect={onSelect}
                                settings={settings}
                                draggableProps={{ 'data-character-id': char.id }}
                                scrollContainerRef={scrollRef}
                                tileBackgroundStyle={tileBackgroundStyle}
                                allCharacters={characters}
                                zoomLevel={zoomLevel}
                            />
                        );
                    })()
                ) : (
                    <div className="flex flex-col gap-12 w-full">
                        {characterGroups.map(group => (
                            <div key={group.id} data-group={group.id} className="space-y-4">
                                <GroupHeader 
                                    group={group} 
                                    settings={settings} 
                                    onUpdateGroup={(id, name) => dispatch({ type: 'UPDATE_CHARACTER_GROUP', payload: { id, name } })}
                                    onDeleteGroup={(id) => dispatch({ type: 'DELETE_CHARACTER_GROUP', payload: id })}
                                    characterCount={groups[group.id]?.length || 0}
                                />
                                <div 
                                    className={`rounded-xl grid gap-6 p-6 transition-all duration-300 ${overGroup === group.id ? 'ring-2' : 'bg-black/10'}`} 
                                    style={{ 
                                        ['--tw-ring-color' as any]: settings.accentColor,
                                        backgroundColor: overGroup === group.id ? `${settings.accentColor}10` : 'rgba(0,0,0,0.15)',
                                        gridTemplateColumns: isLinkPanel ? '1fr' : `repeat(auto-fill, minmax(${zoomLevel === 0 ? '16rem' : zoomLevel === 1 ? '12rem' : zoomLevel === 2 ? '8rem' : '5rem'}, 1fr))`
                                    }}
                                >
                                    {groups[group.id]?.map(character => (
                                        <CharacterTile 
                                            key={character.id} 
                                            character={character} 
                                            isExpanded={false}
                                            isDragging={dragState.draggedIds?.includes(character.id) ?? false}
                                            isSelected={selectedIds.has(character.id)}
                                            onToggleExpand={handleToggleExpand}
                                            onUpdate={onUpdate}
                                            onDeleteRequest={onDeleteRequest}
                                            onSelect={onSelect}
                                            settings={settings}
                                            draggableProps={{ 
                                                draggable: true, 
                                                onDragStart: handleDragStart,
                                                'data-character-id': character.id 
                                            }}
                                            scrollContainerRef={scrollRef}
                                            tileBackgroundStyle={tileBackgroundStyle}
                                            variant={variant}
                                            allCharacters={characters}
                                            zoomLevel={zoomLevel}
                                        />
                                    ))}
                                    {groups[group.id]?.length === 0 && (
                                        <div className="col-span-full h-32 flex items-center justify-center border-2 border-dashed border-white/5 rounded-lg opacity-30 italic text-sm">
                                            Empty {group.name}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
