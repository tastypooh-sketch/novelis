
import React, { useCallback, useContext, useEffect, useState, useRef } from 'react';
import type { EditorSettings, IChapter, ICharacter, Excerpt, SocialPost } from '../../types';
import { useNovelState, useNovelDispatch } from '../../NovelContext';
import { useAssemblyAI } from './AssemblyAIContext';
import { SpinnerIcon, SparklesIconOutline, RefreshIcon, ShareIcon, CameraIcon, UserCircleIcon, ArchiveIcon, TrashIcon } from '../common/Icons';
import AutosizeTextarea from '../common/AutosizeTextarea';
import { PostDisplay } from '../social/PostDisplay';
import { PostVariationsModal } from '../social/PostVariationsModal';
import { useDebouncedCallback } from 'use-debounce';
import { AIError } from '../common/AIError';
import { isColorLight, shadeColor, harmonizeColor, getContrastColor } from '../../utils/colorUtils';
import { LockedChestTab, useLockedChestSelection } from '../common/LockedChest';


const ExcerptItem: React.FC<{ 
    excerpt: Excerpt,
    chapter: IChapter | undefined,
    characters: (ICharacter | undefined)[],
    isSelected: boolean,
    onSelect: () => void,
    onUpdate: (text: string) => void,
    onDelete: (id: string, e: React.MouseEvent) => void,
    settings: EditorSettings 
}> = ({ excerpt, chapter, characters, isSelected, onSelect, onUpdate, onDelete, settings }) => {
    const novelTitle = settings.bookTitle || 'Novelis';
    
    const isDarkMode = !isColorLight(settings.textColor);
    
    return (
        <div 
            onClick={onSelect} 
            className="p-3 rounded-lg border-2 cursor-pointer transition-colors relative group" 
            style={{ 
                backgroundColor: settings.toolbarButtonBg, 
                color: settings.textColor,
                borderColor: isSelected ? settings.accentColor : settings.toolbarInputBorderColor,
                borderStyle: 'solid'
            }}
        >
            <div className="text-sm italic">
                <div className="flex justify-between items-start">
                    <div className="flex-grow">
                        {isSelected ? (
                            <AutosizeTextarea
                                value={excerpt.text}
                                onChange={(e) => onUpdate(e.target.value)}
                                className="w-full bg-transparent border-none outline-none text-sm italic resize-none leading-relaxed p-0 m-0"
                                style={{ color: settings.textColor }}
                            />
                        ) : (
                            <p>
                                {excerpt.text}
                            </p>
                        )}
                        <span className="opacity-70 mt-1 block text-[10px]">
                            &mdash;&nbsp;{novelTitle}, Ch {chapter?.chapterNumber || '?'}.
                        </span>
                    </div>
                    <button 
                        onClick={(e) => onDelete(excerpt.id, e)}
                        className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400 opacity-40 hover:opacity-100 transition-all active:scale-90 ml-2"
                        title="Delete Excerpt"
                    >
                        <TrashIcon className="h-3.5 w-3.5" />
                    </button>
                </div>
            </div>
            <div className="text-xs opacity-60 mt-2 flex items-center gap-2">
                <div className="flex items-center gap-1">
                    {characters.map(c => c && (
                        <div key={c.id} className="h-4 w-4 rounded-full bg-cover bg-center" style={{backgroundImage: c.photo ? `url(${c.photo})` : undefined, backgroundColor: c.imageColor ? harmonizeColor(c.imageColor, settings.backgroundColor, isDarkMode) : undefined}} title={c.name} />
                    ))}
                </div>
                 <span>{characters.map(c => c?.name).join(', ')}</span>
            </div>
            
            {isSelected && (
                <div className="absolute top-1 right-1 opacity-20 text-[8px] uppercase font-bold tracking-tighter">
                    Editable
                </div>
            )}
        </div>
    );
};

const ConfirmNewExcerptModal: React.FC<{
    onConfirm: () => void;
    onCancel: () => void;
    settings: EditorSettings;
}> = ({ onConfirm, onCancel, settings }) => {
    const modalRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
                onCancel();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onCancel]);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div ref={modalRef} className="p-6 rounded-lg shadow-xl w-full max-w-md" style={{ backgroundColor: settings.toolbarBg, color: settings.toolbarText }}>
                <h2 className="text-xl font-bold mb-4">Generate New Content?</h2>
                <p className="mb-6">
                    You have already generated content for an excerpt. Starting a new one will replace the current image and posts. Are you sure you want to continue?
                </p>
                <div className="mt-6 flex justify-end gap-4">
                    <button 
                        onClick={onCancel} 
                        className="rounded px-4 py-2" 
                        style={{ 
                            backgroundColor: settings.toolbarButtonBg,
                            color: getContrastColor(settings.toolbarButtonBg || '#000000')
                        }} 
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = settings.toolbarButtonHoverBg || ''} 
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = settings.toolbarButtonBg || ''}
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={onConfirm} 
                        className="rounded px-4 py-2" 
                        style={{ 
                            backgroundColor: settings.dangerColor, 
                            color: getContrastColor(settings.dangerColor || '#000000')
                        }} 
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = settings.dangerColorHover || ''} 
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = settings.dangerColor || ''}
                    >
                        Continue & Replace
                    </button>
                </div>
            </div>
        </div>
    );
};


export const SocialMediaPanel: React.FC<{ settings: EditorSettings }> = ({ settings }) => {
    const { chapters, characters, socialMediaState } = useNovelState();
    const dispatch = useNovelDispatch();
    const [activeTab, setActiveTab] = useState<'content' | 'chest'>('content');
    const { renderContextMenu, renderTaggingModal } = useLockedChestSelection('social', settings);
    const {
        onGenerateSocialContent,
        onRegenerateImage,
        onRegenerateTextAndHashtags,
        onExtractExcerpts,
        onGeneratePostVariations,
    } = useAssemblyAI();
    const [isRegeneratingImage, setIsRegeneratingImage] = useState(false);
    const endOfExcerptsRef = useRef<HTMLDivElement>(null);

    // State for confirmation modal
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [pendingExcerptId, setPendingExcerptId] = useState<string | null>(null);


    const {
        isLoading, error, excerpts, selectedExcerptId,
        generatedImagePrompt, generatedImageUrl, generatedInstagramPost, generatedTiktokPost, selectedChapterId,
        postVariations, variationPlatform,
    } = socialMediaState;

    const [localImagePrompt, setLocalImagePrompt] = useState(generatedImagePrompt || '');
    
    useEffect(() => {
        setLocalImagePrompt(generatedImagePrompt || '');
    }, [generatedImagePrompt]);

    const debouncedUpdateImagePrompt = useDebouncedCallback((prompt: string) => {
        dispatch({ type: 'UPDATE_SOCIAL_MEDIA_STATE', payload: { generatedImagePrompt: prompt } });
    }, 300);

    const handleImagePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setLocalImagePrompt(e.target.value);
        debouncedUpdateImagePrompt(e.target.value);
    };
    
    useEffect(() => {
        endOfExcerptsRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [excerpts]);

    // This is the core logic for selecting an excerpt
    const proceedWithExcerptSelection = useCallback((excerptId: string) => {
        dispatch({ type: 'UPDATE_SOCIAL_MEDIA_STATE', payload: {
            selectedExcerptId: excerptId,
        }});
    }, [dispatch]);

    // This is the user-facing handler that checks for existing content first
    const handleExcerptSelect = useCallback((excerptId: string) => {
        if (selectedExcerptId !== excerptId) {
            proceedWithExcerptSelection(excerptId);
        }
    }, [selectedExcerptId, proceedWithExcerptSelection]);

    const handleGenerate = () => {
        const excerpt = excerpts.find(e => e.id === selectedExcerptId);
        if (excerpt) {
            onGenerateSocialContent(excerpt);
        }
    };

    // Handlers for the confirmation modal
    const handleConfirmNewExcerpt = () => {
        if (pendingExcerptId) {
            proceedWithExcerptSelection(pendingExcerptId);
        }
        setShowConfirmModal(false);
        setPendingExcerptId(null);
    };

    const handleCancelNewExcerpt = () => {
        setShowConfirmModal(false);
        setPendingExcerptId(null);
    };
    
    const handleChapterSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const chapterId = e.target.value;
        dispatch({ type: 'SET_SOCIAL_CHAPTER', payload: chapterId });
    };

    const handleGenerateAiExcerpts = () => {
        if (selectedChapterId) {
            const chapter = chapters.find(c => c.id === selectedChapterId);
            if (chapter) {
                onExtractExcerpts(chapter, characters);
            }
        }
    };

    const handleRegenImage = useCallback(async (moodOnly: boolean) => {
        if (localImagePrompt) {
            setIsRegeneratingImage(true);
            const selectedExcerpt = excerpts.find(e => e.id === selectedExcerptId);
            const mainCharacter = selectedExcerpt ? characters.find(c => c.id === selectedExcerpt.characterIds[0]) : undefined;
            const newUrl = await onRegenerateImage(localImagePrompt, moodOnly, mainCharacter);
            if (newUrl) {
                dispatch({ type: 'UPDATE_SOCIAL_MEDIA_STATE', payload: { generatedImageUrl: newUrl } });
            }
            setIsRegeneratingImage(false);
        }
    }, [localImagePrompt, onRegenerateImage, dispatch, excerpts, selectedExcerptId, characters]);

    const handleRegenText = useCallback(async (platform: 'instagram' | 'tiktok') => {
        const excerpt = excerpts.find(e => e.id === selectedExcerptId);
        if (excerpt) {
            onRegenerateTextAndHashtags(excerpt, platform);
        }
    }, [excerpts, selectedExcerptId, onRegenerateTextAndHashtags]);
    
    const handleInstaTextChange = (text: string) => {
        if(generatedInstagramPost){
            const newPost = {...generatedInstagramPost, text};
            dispatch({ type: 'UPDATE_SOCIAL_MEDIA_STATE', payload: { generatedInstagramPost: newPost } });
        }
    };
    
    const handleTiktokTextChange = (text: string) => {
        if(generatedTiktokPost){
            const newPost = {...generatedTiktokPost, text};
            dispatch({ type: 'UPDATE_SOCIAL_MEDIA_STATE', payload: { generatedTiktokPost: newPost } });
        }
    };

    const handleInstaHashtagsChange = (hashtags: string[]) => {
        if (generatedInstagramPost) {
            const newPost = { ...generatedInstagramPost, hashtags };
            dispatch({ type: 'UPDATE_SOCIAL_MEDIA_STATE', payload: { generatedInstagramPost: newPost } });
        }
    };

    const handleTiktokHashtagsChange = (hashtags: string[]) => {
        if (generatedTiktokPost) {
            const newPost = { ...generatedTiktokPost, hashtags };
            dispatch({ type: 'UPDATE_SOCIAL_MEDIA_STATE', payload: { generatedTiktokPost: newPost } });
        }
    };

    const handleExportImage = useCallback(() => {
        if (!generatedImageUrl) return;
        const excerpt = excerpts.find(e => e.id === selectedExcerptId);
        const chapter = excerpt ? chapters.find(c => c.id === excerpt.chapterId) : null;

        const a = document.createElement('a');
        a.href = generatedImageUrl;
        const fileName = `novelis_image_ch${chapter?.chapterNumber || 'X'}_${excerpt?.text.substring(0, 15).replace(/\s/g, '_') || 'export'}.png`;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }, [generatedImageUrl, selectedExcerptId, excerpts, chapters]);

    const handleRepurpose = useCallback(async (platform: 'instagram' | 'tiktok') => {
        const post = platform === 'instagram' ? generatedInstagramPost : generatedTiktokPost;
        const excerpt = excerpts.find(e => e.id === selectedExcerptId);
        if (post && excerpt) {
            await onGeneratePostVariations(post, excerpt, platform);
            dispatch({ type: 'UPDATE_SOCIAL_MEDIA_STATE', payload: { isOpen: true } });
        }
    }, [generatedInstagramPost, generatedTiktokPost, excerpts, selectedExcerptId, onGeneratePostVariations, dispatch]);

    const handleSelectVariation = (post: SocialPost) => {
        dispatch({ type: 'APPLY_POST_VARIATION', payload: post });
        dispatch({ type: 'UPDATE_SOCIAL_MEDIA_STATE', payload: { isOpen: false } });
    };

    const handleExcerptUpdate = (id: string, text: string) => {
        const newExcerpts = excerpts.map(e => e.id === id ? { ...e, text } : e);
        dispatch({ type: 'UPDATE_SOCIAL_MEDIA_STATE', payload: { excerpts: newExcerpts } });
    };

    const handleDeleteExcerpt = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const newExcerpts = excerpts.filter(excerpt => excerpt.id !== id);
        const nextSelectedId = selectedExcerptId === id ? (newExcerpts[0]?.id || null) : selectedExcerptId;
        
        dispatch({ type: 'UPDATE_SOCIAL_MEDIA_STATE', payload: { 
            excerpts: newExcerpts,
            selectedExcerptId: nextSelectedId
        } });
    };

    const userExcerpts = excerpts.filter(e => e.type === 'user');
    const aiExcerpts = excerpts.filter(e => e.type === 'ai');

    return (
        <div className="w-full h-full flex flex-col p-4 overflow-y-auto" style={{ backgroundColor: `${settings.toolbarButtonBg}60`}}>
            {renderContextMenu()}
            {renderTaggingModal()}

            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold flex items-center gap-3" style={{ color: settings.textColor }}>
                    <ShareIcon className="h-6 w-6" style={{ color: settings.accentColor }} />
                    Social Media Studio
                </h3>
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => dispatch({ type: 'UPDATE_SOCIAL_MEDIA_STATE', payload: { isOpen: true } })}
                        className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all hover:opacity-80 flex items-center gap-2 border border-white/5"
                        style={{ backgroundColor: settings.toolbarButtonBg, color: settings.textColor }}
                    >
                        <SparklesIconOutline className="h-4 w-4" /> Open Full Studio
                    </button>
                    <div className="flex bg-black/20 p-1 rounded-lg">
                        <button 
                            onClick={() => setActiveTab('content')}
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'content' ? 'shadow-sm' : 'opacity-50'}`}
                            style={{ 
                                backgroundColor: activeTab === 'content' ? settings.toolbarButtonBg : 'transparent',
                                color: settings.textColor
                            }}
                        >
                            Content
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
            </div>

            {activeTab === 'chest' ? (
                <div className="flex-grow min-h-0 overflow-y-auto">
                    <LockedChestTab modalId="social" settings={settings} />
                </div>
            ) : (
                <div className="flex-grow min-h-0 flex flex-col md:flex-row gap-4">
                    {/* Column 1: Selection */}
                    <div className="flex flex-col gap-6 min-h-0 md:flex-[5]">
                        <div className="flex-shrink-0">
                            <p className="text-xs opacity-70 mb-4" style={{ color: settings.textColor }}>Send an excerpt from the Manuscript notes panel, or use the AI to generate suggestions from a chapter below.</p>
                            <div className="space-y-3">
                                <select
                                    value={selectedChapterId || ''}
                                    onChange={handleChapterSelectChange}
                                    className="w-full p-2 rounded-lg border text-sm"
                                    style={{ backgroundColor: settings.backgroundColor, borderColor: settings.toolbarInputBorderColor, color: settings.textColor }}
                                >
                                    <option value="">Select a chapter to generate excerpts...</option>
                                    {chapters.map(chap => <option key={chap.id} value={chap.id}>{chap.chapterNumber}. {chap.title}</option>)}
                                </select>
                                <div className="flex justify-between items-center">
                                     <button
                                        onClick={handleGenerate}
                                        disabled={!selectedExcerptId || isLoading}
                                        className="px-6 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-all active:scale-95 shadow-lg"
                                        style={{ backgroundColor: settings.accentColor, color: getContrastColor(settings.accentColor || '#000000') }}
                                    >
                                        {isLoading && selectedExcerptId ? <SpinnerIcon className="h-4 w-4" /> : <SparklesIconOutline className="h-4 w-4" />}
                                        Generate Posts & Art
                                    </button>
                                    <button
                                        onClick={handleGenerateAiExcerpts}
                                        disabled={!selectedChapterId || isLoading}
                                        className="px-4 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
                                        style={{ backgroundColor: settings.toolbarButtonBg, color: settings.textColor }}
                                    >
                                        {isLoading && !selectedExcerptId ? <SpinnerIcon className="h-3 w-3" /> : <RefreshIcon className="h-3 w-3" />}
                                        Suggest Excerpts
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="flex-grow flex flex-col min-h-0">
                            <div className="flex-grow overflow-y-auto space-y-2 pr-2 -mr-2">
                                {excerpts.length === 0 && (
                                    <div className="text-center text-sm opacity-40 pt-10" style={{ color: settings.textColor }}>
                                        Your user-sent excerpts and AI-generated suggestions will appear here.
                                    </div>
                                )}
                                {userExcerpts.map(excerpt => {
                                    const chapter = chapters.find(c => c.id === excerpt.chapterId);
                                    const excerptChars = excerpt.characterIds.map(id => characters.find(c => c.id === id));
                                    const isSelected = selectedExcerptId === excerpt.id;
                                    return (
                                        <div key={excerpt.id} className="relative group">
                                            <ExcerptItem 
                                                excerpt={excerpt} 
                                                chapter={chapter} 
                                                characters={excerptChars} 
                                                isSelected={isSelected} 
                                                onSelect={() => handleExcerptSelect(excerpt.id)} 
                                                onUpdate={(text) => handleExcerptUpdate(excerpt.id, text)}
                                                onDelete={handleDeleteExcerpt}
                                                settings={settings}
                                            />
                                        </div>
                                    )
                                })}
                                {userExcerpts.length > 0 && aiExcerpts.length > 0 && (
                                    <div className="flex items-center gap-2 py-4">
                                        <div className="flex-grow border-t" style={{borderColor: settings.toolbarInputBorderColor}}></div>
                                        <span className="text-xs font-bold uppercase tracking-widest opacity-30" style={{ color: settings.textColor }}>AI Suggestions</span>
                                        <div className="flex-grow border-t" style={{borderColor: settings.toolbarInputBorderColor}}></div>
                                    </div>
                                )}
                                {aiExcerpts.map(excerpt => {
                                    const chapter = chapters.find(c => c.id === excerpt.chapterId);
                                    const excerptChars = excerpt.characterIds.map(id => characters.find(c => c.id === id));
                                    const isSelected = selectedExcerptId === excerpt.id;
                                    return (
                                        <div key={excerpt.id} className="relative group">
                                            <ExcerptItem 
                                                excerpt={excerpt} 
                                                chapter={chapter} 
                                                characters={excerptChars} 
                                                isSelected={isSelected} 
                                                onSelect={() => handleExcerptSelect(excerpt.id)} 
                                                onUpdate={(text) => handleExcerptUpdate(excerpt.id, text)}
                                                onDelete={handleDeleteExcerpt}
                                                settings={settings}
                                            />
                                        </div>
                                    )
                                })}
                                <div ref={endOfExcerptsRef} />
                            </div>
                        </div>
                    </div>
                    
                    {/* Column 2 & 3: Review */}
                    {selectedExcerptId ? (
                        <>
                            {/* Column 2: Image */}
                            <div className="flex flex-col gap-4 min-h-0 md:flex-[4]">
                                <h3 className="text-sm font-bold uppercase tracking-widest opacity-40" style={{ color: settings.textColor }}>Visual Preview</h3>
                                <div className="p-6 rounded-xl flex-grow flex flex-col bg-black/10 border border-white/5 shadow-inner relative overflow-hidden">
                                    <div className="flex justify-between items-center mb-6">
                                        <h4 className="font-bold text-[10px] uppercase tracking-wider opacity-40" style={{ color: settings.textColor }}>AI Visualization</h4>
                                        <button onClick={handleExportImage} disabled={!generatedImageUrl || isLoading || isRegeneratingImage} className="text-[10px] px-3 py-1.5 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm" style={{ backgroundColor: settings.toolbarBg, color: settings.toolbarText }}>
                                            <ShareIcon className="h-3.5 w-3.5" /> Export
                                        </button>
                                    </div>
                                    <div className="flex-grow flex items-center justify-center">
                                        <div 
                                            className="relative w-full max-w-[260px] aspect-[9/16] border-[6px] rounded-[3rem] p-1.5 shadow-2xl transition-all duration-500"
                                            style={{ borderColor: settings.toolbarInputBorderColor, backgroundColor: 'rgba(0,0,0,0.2)' }}
                                        >
                                            <div 
                                                className="w-full h-full rounded-[2.6rem] overflow-hidden relative flex items-center justify-center bg-black/40"
                                            >
                                                {(isLoading && !generatedImageUrl) && (
                                                    <div className="flex flex-col items-center gap-3">
                                                        <SpinnerIcon className="h-10 w-10" style={{ color: settings.textColor }} />
                                                        <span className="text-[10px] uppercase font-bold opacity-40 animate-pulse">Compositing...</span>
                                                    </div>
                                                )}
                                                {isRegeneratingImage && (
                                                    <div className="image-reloading-overlay absolute inset-0 flex items-center justify-center z-10 backdrop-blur-sm bg-black/40">
                                                        <SpinnerIcon className="h-8 w-8 text-white" />
                                                    </div>
                                                )}
                                                {generatedImageUrl ? (
                                                    <img 
                                                        key={generatedImageUrl}
                                                        src={generatedImageUrl} 
                                                        alt={generatedImagePrompt || ''} 
                                                        className={`w-full h-full object-cover transition-all duration-700 ${isRegeneratingImage ? 'scale-110 blur-md opacity-50' : 'scale-100 blur-0 opacity-100'}`}
                                                        referrerPolicy="no-referrer"
                                                    />
                                                ) : !isLoading && (
                                                    <div className="text-center px-6">
                                                        <CameraIcon className="h-12 w-12 mx-auto mb-4 opacity-5" style={{ color: settings.textColor }} />
                                                        <p className="text-[10px] opacity-20 uppercase font-bold tracking-tighter">Art will appear after generation</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    {generatedImagePrompt && (
                                        <div className="mt-8 flex justify-center gap-3">
                                            <button onClick={() => handleRegenImage(false)} disabled={isLoading || isRegeneratingImage} className="text-[10px] px-4 py-2 rounded-full flex items-center gap-2 disabled:opacity-50 transition-colors border border-white/5" style={{backgroundColor: settings.toolbarBg, color: settings.toolbarText}}><UserCircleIcon className="h-4 w-4" /> Character</button>
                                            <button onClick={() => handleRegenImage(true)} disabled={isLoading || isRegeneratingImage} className="text-[10px] px-4 py-2 rounded-full flex items-center gap-2 disabled:opacity-50 transition-colors border border-white/5" style={{backgroundColor: settings.toolbarBg, color: settings.toolbarText}}><RefreshIcon className="h-4 w-4"/> Mood</button>
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            {/* Column 3: Posts */}
                            <div className="flex flex-col gap-4 min-h-0 md:flex-[5]">
                                <div className="flex-grow flex flex-col min-h-0">
                                    <PostDisplay platform="Instagram" post={generatedInstagramPost} onTextChange={handleInstaTextChange} onHashtagsChange={handleInstaHashtagsChange} onRegenerate={() => handleRegenText('instagram')} onRepurpose={() => handleRepurpose('instagram')} isLoading={isLoading} settings={settings} />
                                </div>
                                <div className="flex-grow flex flex-col min-h-0">
                                    <PostDisplay platform="TikTok" post={generatedTiktokPost} onTextChange={handleTiktokTextChange} onHashtagsChange={handleTiktokHashtagsChange} onRegenerate={() => handleRegenText('tiktok')} onRepurpose={() => handleRepurpose('tiktok')} isLoading={isLoading} settings={settings} />
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex items-center justify-center text-center p-8 rounded-xl md:flex-[9] bg-black/10 border border-white/5 shadow-inner" style={{ color: `${settings.textColor}40` }}>
                            <div className="max-w-sm">
                                <SparklesIconOutline className="h-16 w-16 mx-auto mb-6 opacity-20" />
                                <h3 className="text-xl font-bold opacity-40">Ready for Marketing?</h3>
                                <p className="mt-2 text-sm">
                                    Select an excerpt from your manuscript to automatically generate promotional visuals and optimized social captions.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            )}
             {showConfirmModal && (
                <ConfirmNewExcerptModal 
                    onConfirm={handleConfirmNewExcerpt} 
                    onCancel={handleCancelNewExcerpt} 
                    settings={settings}
                />
            )}
            {error && <AIError message={error} onDismiss={() => dispatch({ type: 'UPDATE_SOCIAL_MEDIA_STATE', payload: { error: null } })} className="mt-4" />}
        </div>
    );
};
