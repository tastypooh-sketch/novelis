
import React, { useState, useRef, useCallback, useLayoutEffect, useEffect, useMemo, useContext } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import type { EditorSettings, ICharacter, TileBackgroundStyle } from '../../types';
import { useNovelState } from '../../NovelContext';
import { useAssemblyAI } from './AssemblyAIContext';
import MarkdownRenderer from '../common/MarkdownRenderer';
import { ChevronDownIcon, SparklesIconOutline, RevertIcon, TrashIconOutline, StarIcon, StarIconOutline, CameraIcon, UserCircleIcon, BrushIcon, LockClosedIconOutline, LockOpenIconOutline, ChevronUpIcon } from '../common/Icons';
import { isColorLight, shadeColor, getImageColor } from '../../utils/colorUtils';
import { AIError } from '../common/AIError';

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
        badge.style.color = '#FFFFFF';
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
}

const CharacterTile: React.FC<CharacterTileProps> = React.memo(({ 
    character, isExpanded, isDragging, isSelected, onToggleExpand, onUpdate, onDeleteRequest, onSelect, settings,
    draggableProps, scrollContainerRef, tileBackgroundStyle, variant = 'default', allCharacters
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

    const tileBorderColor = character.imageColor || settings.toolbarInputBorderColor;
    const isDarkMode = !isColorLight(settings.textColor);
    
    const secondaryButtonBg = shadeColor(settings.toolbarButtonBg || '#374151', isDarkMode ? 10 : -10);
    const secondaryButtonHoverBg = shadeColor(settings.toolbarButtonBg || '#374151', isDarkMode ? 20 : -10);

    const backgroundStyle = useMemo(() => {
        const baseColor = settings.toolbarButtonBg || '#374151';
        const secondaryColor = shadeColor(baseColor, isDarkMode ? 7 : -7);
        
        switch (tileBackgroundStyle) {
            case 'diagonal': return { background: `linear-gradient(to top left, ${baseColor} 49.9%, ${secondaryColor} 50.1%)` };
            case 'horizontal': return { background: `linear-gradient(to bottom, ${isDarkMode ? secondaryColor : baseColor} 33.3%, ${isDarkMode ? baseColor : secondaryColor} 33.3%)` };
            default: return { backgroundColor: baseColor };
        }
    }, [tileBackgroundStyle, settings.toolbarButtonBg, isDarkMode]);
    
    const accentColor = character.imageColor || settings.accentColor;

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
                                borderColor: character.imageColor || settings.toolbarInputBorderColor || 'transparent'
                            }}
                        >
                            {character.photo ? (
                                <img src={character.photo} alt={character.name} className="w-full h-full object-cover" />
                            ) : (
                                <UserCircleIcon className="h-full w-full text-gray-400 opacity-60" />
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
                        color: settings.textColor,
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
                                    style={{ backgroundColor: character.isPhotoLocked ? settings.accentColor : secondaryButtonBg, color: character.isPhotoLocked ? 'white' : settings.toolbarText }}
                                    onClick={handleToggleLock}
                                    title={character.isPhotoLocked ? "Unlock photo" : "Lock photo"}
                                >
                                    {character.isPhotoLocked ? <LockClosedIconOutline className="h-3 w-3" /> : <LockOpenIconOutline className="h-3 w-3" />}
                                </div>

                                {/* Upload Icon (Visible on hover) */}
                                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-2 pt-6 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-b-xl">
                                     <div className="flex items-center gap-1 text-white text-[10px] font-medium">
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
                                <label className="block text-sm font-semibold mb-2 opacity-80">Summary</label>
                                <textarea
                                    ref={summaryRef} value={summary}
                                    onChange={e => { setSummary(e.target.value); debouncedUpdate({ summary: e.target.value }); }}
                                    className="w-full p-2 rounded border resize-none overflow-hidden"
                                    style={{ borderColor: tileBorderColor, color: settings.textColor, backgroundColor: settings.backgroundColor }}
                                    rows={4}
                                />
                            </div>
                             <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="block text-sm font-semibold opacity-80">Detailed Profile</label>
                                    <button
                                        onClick={() => setIsEditingProfile(p => !p)}
                                        className="text-xs px-2 py-0.5 rounded"
                                        style={{ backgroundColor: settings.toolbarButtonBg, color: settings.toolbarText }}
                                        onMouseEnter={e => e.currentTarget.style.backgroundColor = settings.toolbarButtonHoverBg || ''}
                                        onMouseLeave={e => e.currentTarget.style.backgroundColor = settings.toolbarButtonBg || ''}
                                    >
                                        {isEditingProfile ? 'Preview' : 'Edit'}
                                    </button>
                                </div>
                                {isEditingProfile ? (
                                    <textarea
                                        ref={profileRef} value={profile}
                                        onChange={e => { setProfile(e.target.value); debouncedUpdate({ profile: e.target.value }); }}
                                        className="w-full p-2 rounded border resize-none overflow-hidden"
                                        style={{ borderColor: tileBorderColor, color: settings.textColor, backgroundColor: settings.backgroundColor }}
                                        rows={10}
                                    />
                                ) : (
                                    <div className="w-full p-2 rounded border max-h-96 overflow-y-auto" style={{ borderColor: tileBorderColor, color: settings.textColor, backgroundColor: settings.backgroundColor }}>
                                        <MarkdownRenderer source={profile} settings={settings} />
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-semibold mb-2 opacity-80">Rough Notes</label>
                                <textarea
                                    ref={rawNotesRef} value={rawNotes}
                                    onChange={e => { setRawNotes(e.target.value); debouncedUpdate({ rawNotes: e.target.value }); }}
                                    className="w-full p-2 rounded border resize-none overflow-hidden"
                                    style={{ borderColor: tileBorderColor, color: settings.textColor, backgroundColor: settings.backgroundColor }}
                                    rows={6}
                                    placeholder="Jot down personality traits, backstory, goals, relationships, etc."
                                />
                            </div>
                             <div>
                                <label className="block text-sm font-semibold mb-2 opacity-80">Relationships</label>
                                {(character.relationships && character.relationships.length > 0) ? (
                                    <div className="space-y-2">
                                        {character.relationships.map(rel => {
                                            const relatedChar = allCharacters.find(c => c.id === rel.characterId);
                                            if (!relatedChar) return null;
                                            return (
                                                <div key={rel.characterId} className="flex items-center gap-3 p-2 rounded" style={{ backgroundColor: settings.backgroundColor }}>
                                                    <div className="h-10 w-10 rounded-full bg-cover bg-center flex-shrink-0 border-2" style={{ backgroundImage: relatedChar.photo ? `url(${relatedChar.photo})` : undefined, backgroundColor: relatedChar.imageColor, borderColor: relatedChar.imageColor || 'transparent' }}>
                                                       {!relatedChar.photo && <UserCircleIcon className="h-full w-full opacity-50"/>}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-semibold text-sm truncate">{relatedChar.name}</p>
                                                        <p className="text-xs opacity-80 truncate">{rel.description}</p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="text-center text-xs opacity-60 p-4 rounded" style={{ backgroundColor: settings.backgroundColor }}>
                                        No relationships defined in notes. Generate the profile for the AI to infer them.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                     {/* Action Footer */}
                    <div className="p-4 border-t flex justify-between items-center relative" style={{ borderColor: `${tileBorderColor}80` }}>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleGenerateProfile}
                                disabled={isGenerating}
                                className="px-3 py-1.5 rounded-md text-sm font-medium flex items-center text-white disabled:opacity-60"
                                style={{ backgroundColor: settings.accentColor }}
                                onMouseEnter={e => e.currentTarget.style.backgroundColor = settings.accentColorHover || ''}
                                onMouseLeave={e => e.currentTarget.style.backgroundColor = settings.accentColor || ''}
                            >
                                <SparklesIconOutline className="h-5 w-5 mr-2"/>
                                {isGenerating ? 'Generating...' : 'Generate Profile'}
                            </button>
                            
                            {character.previousProfile ? (
                                <button
                                    onClick={handleRevertProfile}
                                    className="px-3 py-1.5 rounded-md text-sm font-medium flex items-center"
                                    style={{ backgroundColor: secondaryButtonBg }}
                                >
                                    <RevertIcon className="h-4 w-4 mr-2" />
                                    Revert
                                </button>
                            ) : (
                                <div className="relative">
                                     <button
                                        onMouseEnter={() => setShowUpdateConfirm(true)}
                                        onMouseLeave={() => setShowUpdateConfirm(false)}
                                        className="px-3 py-1.5 rounded-md text-sm font-medium flex items-center"
                                        style={{ backgroundColor: secondaryButtonBg }}
                                     >
                                         <BrushIcon className="h-4 w-4 mr-2" />
                                         Update from Manuscript
                                     </button>
                                    {showUpdateConfirm && (
                                         <div onMouseEnter={() => setShowUpdateConfirm(true)} onMouseLeave={() => setShowUpdateConfirm(false)} className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 rounded-md shadow-lg text-xs" style={{backgroundColor: settings.dropdownBg}}>
                                             <p>This will analyze the entire manuscript to update this character's profile based on their actions and dialogue. This will overwrite existing profile data.</p>
                                             <button onClick={handleUpdateProfile} className="w-full mt-2 py-1.5 rounded-md text-white font-semibold" style={{backgroundColor: settings.accentColor}}>Confirm Update</button>
                                         </div>
                                     )}
                                </div>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleTogglePrimary}
                                className="p-2 rounded-md"
                                style={{ backgroundColor: character.isPrimary ? '#facc15' : secondaryButtonBg, color: character.isPrimary ? 'black' : settings.toolbarText }}
                                onMouseEnter={e => e.currentTarget.style.backgroundColor = character.isPrimary ? '#eab308' : (secondaryButtonHoverBg || '')}
                                onMouseLeave={e => e.currentTarget.style.backgroundColor = character.isPrimary ? '#facc15' : (secondaryButtonBg || '')}
                                title={character.isPrimary ? "Unmark as primary character" : "Mark as primary character"}
                            >
                                {character.isPrimary ? <StarIcon className="h-5 w-5" /> : <StarIconOutline className="h-5 w-5" />}
                            </button>
                            <button
                                onClick={handleCycleAccentStyle}
                                className="p-2 rounded-md"
                                style={{ backgroundColor: secondaryButtonBg, color: settings.toolbarText }}
                                onMouseEnter={e => e.currentTarget.style.backgroundColor = secondaryButtonHoverBg}
                                onMouseLeave={e => e.currentTarget.style.backgroundColor = secondaryButtonBg}
                                title="Cycle accent style"
                            >
                                <BrushIcon className="h-5 w-5" />
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); onToggleExpand(character.id); }}
                                className="p-2 rounded-md"
                                style={{ backgroundColor: secondaryButtonBg, color: settings.toolbarText }}
                                onMouseEnter={e => e.currentTarget.style.backgroundColor = secondaryButtonHoverBg}
                                onMouseLeave={e => e.currentTarget.style.backgroundColor = secondaryButtonBg}
                                aria-label="Collapse character details"
                                title="Collapse"
                            >
                                <ChevronUpIcon />
                            </button>
                            <button
                                onClick={() => onDeleteRequest(character)}
                                className="p-2 rounded-md text-white"
                                style={{ backgroundColor: settings.dangerColor }}
                                onMouseEnter={e => e.currentTarget.style.backgroundColor = settings.dangerColorHover || ''}
                                onMouseLeave={e => e.currentTarget.style.backgroundColor = settings.dangerColor || ''}
                                title="Delete character"
                            >
                                <TrashIconOutline />
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
            
            {/* The main tile body */}
            <div
                onClick={(e) => onSelect(character.id, e)}
                className="relative aspect-[4/5] flex flex-col rounded-lg shadow-md transition-shadow duration-300 ease-in-out z-10 border-4 overflow-hidden"
                style={{
                    color: settings.textColor,
                    borderColor: isSelected ? settings.accentColor : (character.accentStyle === 'outline' ? accentColor : 'transparent'),
                    ...backgroundStyle,
                }}
            >
                
                {(character.accentStyle === 'left-top-ingress' || !character.accentStyle) && (
                    <div className="absolute top-0 left-0 w-[6px] h-1/3" style={{backgroundColor: accentColor}}></div>
                )}
                {character.accentStyle === 'corner-diagonal' && (
                    <div className="absolute bottom-0 right-0" style={{
                        width: 0,
                        height: 0,
                        borderBottom: `32px solid ${accentColor}`,
                        borderLeft: '48px solid transparent',
                    }}></div>
                )}
                
                <div className="p-4 pt-4 flex-grow min-h-0 block">
                    {/* Headshot, floated right */}
                    <div 
                        className="float-right ml-2 mb-1 h-20 w-20 group z-20 relative"
                        title="Click to upload portrait"
                        onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    >
                        <div className="h-full w-full rounded-lg overflow-hidden border-4" style={{ borderColor: tileBorderColor, backgroundColor: settings.backgroundColor }}>
                            {character.photo ? (
                                <img src={character.photo} alt={character.name} className="w-full h-full object-cover" />
                            ) : (
                                <UserCircleIcon className="h-full w-full opacity-30"/>
                            )}
                             <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <CameraIcon className="h-8 w-8 text-white"/>
                            </div>
                        </div>
                        {character.isPrimary && <StarIcon className="absolute -top-2 -right-2 h-6 w-6 text-yellow-400 z-30" style={{ filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.5))'}}/>}
                    </div>

                    <div className="w-full">
                        {isEditingName ? (
                            <textarea
                                ref={nameInputRef} value={localName} onChange={e => setLocalName(e.target.value)}
                                onBlur={handleNameUpdate} onKeyDown={handleNameKeyDown} onClick={e => e.stopPropagation()}
                                className="font-bold text-lg w-full p-0 border-none resize-none outline-none block bg-transparent"
                                style={{ color: settings.textColor, lineHeight: '1.2' }} rows={1}
                            />
                        ) : (
                            <h3 onClick={(e) => { e.stopPropagation(); setIsEditingName(true); }} className="font-bold text-lg cursor-pointer break-words leading-tight" title={character.name}>
                                {character.name}
                            </h3>
                        )}
                    </div>
                    <p className="text-xs opacity-70 summary-clamped mt-2">
                        {character.summary || character.tagline || 'No summary provided.'}
                    </p>
                </div>

                <div className="flex-shrink-0 p-3 flex justify-end items-center relative clear-both">
                    <div className="flex flex-wrap gap-1 mr-auto">
                        {(character.keywords || []).slice(0, 2).map(kw => (
                            <span key={kw} className="px-1.5 py-0.5 rounded text-xs" style={{backgroundColor: shadeColor(settings.toolbarButtonBg || '#374151', 10), color: `${settings.textColor}B3`}}>{kw}</span>
                        ))}
                    </div>
                    <button
                        className="cursor-pointer p-1.5 rounded-full transition-colors z-20"
                        onClick={(e) => { e.stopPropagation(); onToggleExpand(character.id); }}
                        style={{ backgroundColor: settings.toolbarButtonBg, color: settings.toolbarText }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = settings.toolbarButtonHoverBg || ''}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = settings.toolbarButtonBg || ''}
                        aria-label={"Expand character details"}
                    >
                        <ChevronDownIcon />
                    </button>
                </div>
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
}

export const CharactersPanel: React.FC<CharactersPanelProps> = ({ 
    characters, settings, tileBackgroundStyle, selectedIds, onSelect, onUpdate, onDeleteRequest, onSetCharacters, expandedCharacterId, setExpandedCharacterId, variant = 'default'
}) => {
    const [orderedCharacters, setOrderedCharacters] = useState(characters);
    const [dragState, setDragState] = useState<{draggedIds: string[] | null, overId: string | null}>({draggedIds: null, overId: null});
    const lastSortUpdate = useRef<number>(0);
    const scrollRef = useRef<HTMLDivElement>(null);
    const isLinkPanel = variant === 'link-panel';

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
        const characterElement = (e.target as HTMLElement).closest('[data-character-id]') as HTMLElement;
        const overId = characterElement ? characterElement.dataset.characterId : null;
        
        if (!overId || dragState.draggedIds?.includes(overId)) return;

        // Stability check: Midpoint threshold to prevent flickering
        const rect = characterElement.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        // Determine if mouse has crossed the 50% threshold of the target element
        const crossedThreshold = Math.abs(e.clientX - centerX) < rect.width * 0.4 && 
                               Math.abs(e.clientY - centerY) < rect.height * 0.4;
        
        // Cooldown and ID check
        const now = Date.now();
        if (overId === dragState.overId || now - lastSortUpdate.current < 100) return;

        lastSortUpdate.current = now;
        setDragState(prev => ({ ...prev, overId }));
        
        setOrderedCharacters(current => {
            const itemsToMove = current.filter(c => dragState.draggedIds?.includes(c.id));
            const filtered = current.filter(c => !dragState.draggedIds?.includes(c.id));
            const index = filtered.findIndex(c => c.id === overId);
            if (index === -1) return current;

            const next = [...filtered];
            next.splice(index, 0, ...itemsToMove);
            return next;
        });
    };

    const handleDragEnd = () => {
        if (dragState.draggedIds) {
            onSetCharacters(orderedCharacters);
        }
        setDragState({ draggedIds: null, overId: null });
    };

    return (
        <div ref={scrollRef} className="h-full overflow-y-auto p-4">
            {expandedCharacterId ? (
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
                        />
                    );
                })()
            ) : (
                <div className={`grid gap-6 ${isLinkPanel ? 'grid-cols-1' : 'character-grid'}`}>
                    {orderedCharacters.map(char => (
                        <CharacterTile
                            key={char.id}
                            character={char}
                            isExpanded={false}
                            isDragging={dragState.draggedIds?.includes(char.id) ?? false}
                            isSelected={selectedIds.has(char.id)}
                            onToggleExpand={handleToggleExpand}
                            onUpdate={onUpdate}
                            onDeleteRequest={onDeleteRequest}
                            onSelect={onSelect}
                            settings={settings}
                            draggableProps={{
                                draggable: true,
                                onDragStart: handleDragStart,
                                onDragOver: handleDragOver,
                                onDragEnd: handleDragEnd,
                                'data-character-id': char.id,
                            }}
                            scrollContainerRef={scrollRef}
                            tileBackgroundStyle={tileBackgroundStyle}
                            variant={variant}
                            allCharacters={characters}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};
