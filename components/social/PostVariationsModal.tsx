import React, { useState } from 'react';
import { Modal } from '../manuscript/modals/Modal';
import type { EditorSettings } from '../../types';
import { SpinnerIcon, SparklesIconOutline, CameraIcon, ShareIcon, UserCircleIcon, RefreshIcon, TrashIcon } from '../common/Icons';
import { useNovelState, useNovelDispatch } from '../../NovelContext';
import { useAssemblyAI } from '../assembly/AssemblyAIContext';
import AutosizeTextarea from '../common/AutosizeTextarea';
import { getContrastColor, isColorLight } from '../../utils/colorUtils';
import { PostDisplay } from './PostDisplay';

interface PostVariationsModalProps {
    isOpen: boolean;
    onClose: () => void;
    settings: EditorSettings;
}

export const PostVariationsModal: React.FC<PostVariationsModalProps> = ({
    isOpen,
    onClose,
    settings,
}) => {
    const { socialMediaState, characters, chapters } = useNovelState();
    const { 
        excerpts, selectedExcerptId, isLoading, 
        generatedInstagramPost, generatedTiktokPost, generatedImageUrl,
        generatedImagePrompt
    } = socialMediaState;
    const dispatch = useNovelDispatch();
    const { onGenerateSocialContent, onRegenerateImage, onRegenerateTextAndHashtags } = useAssemblyAI();
    
    const [isRegeneratingImage, setIsRegeneratingImage] = useState(false);

    if (!isOpen) return null;

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

    const handleGenerate = () => {
        const excerpt = excerpts.find(e => e.id === selectedExcerptId);
        if (excerpt) {
            onGenerateSocialContent(excerpt);
        }
    };

    const handleRegenImage = async (moodOnly: boolean) => {
        if (generatedImagePrompt) {
            setIsRegeneratingImage(true);
            const selectedExcerpt = excerpts.find(e => e.id === selectedExcerptId);
            const mainCharacter = selectedExcerpt ? characters.find(c => c.id === selectedExcerpt.characterIds[0]) : undefined;
            const newUrl = await onRegenerateImage(generatedImagePrompt, moodOnly, mainCharacter);
            if (newUrl) {
                dispatch({ type: 'UPDATE_SOCIAL_MEDIA_STATE', payload: { generatedImageUrl: newUrl } });
            }
            setIsRegeneratingImage(false);
        }
    };

    const handleSelectExcerpt = (id: string) => {
        if (isLoading) return;
        dispatch({ type: 'UPDATE_SOCIAL_MEDIA_STATE', payload: { 
            selectedExcerptId: id,
        } });
    };

    const selectedExcerpt = excerpts.find(e => e.id === selectedExcerptId);
    const isDark = !isColorLight(settings.backgroundColor);

    return (
        <Modal
            onClose={onClose}
            settings={settings}
            title="Social Media Studio"
            className="max-w-7xl w-[95vw] h-[90vh]"
        >
            <div className="flex h-full gap-6 overflow-hidden p-1">
                {/* LHS: Excerpts */}
                <div className="w-[350px] flex flex-col gap-4 border-r pr-6" style={{ borderColor: settings.toolbarInputBorderColor }}>
                    <div className="flex justify-between items-center">
                        <div>
                            <h3 className="font-bold text-lg">Excerpts</h3>
                            <p className="text-[10px] opacity-50">Select and edit before generating.</p>
                        </div>
                        <button 
                            onClick={handleGenerate}
                            disabled={!selectedExcerptId || isLoading}
                            className="px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 disabled:opacity-50 transition-all active:scale-95 shadow-lg"
                            style={{ backgroundColor: settings.accentColor, color: getContrastColor(settings.accentColor || '#000000') }}
                        >
                            {isLoading ? <SpinnerIcon className="h-4 w-4" /> : <SparklesIconOutline className="h-4 w-4" />}
                            Generate
                        </button>
                    </div>
                    
                    <div className="flex-grow overflow-y-auto space-y-3 pr-2">
                        {excerpts.length === 0 ? (
                            <div className="text-center opacity-40 mt-20 px-4">
                                <ShareIcon className="h-12 w-12 mx-auto mb-4 opacity-20" />
                                <p className="text-sm italic">Your excerpts will appear here after you send them from the manuscript or generate them via AI.</p>
                            </div>
                        ) : (
                            excerpts.map(excerpt => {
                                const chapter = chapters.find(c => c.id === excerpt.chapterId);
                                const isSelected = selectedExcerptId === excerpt.id;
                                
                                return (
                                    <div 
                                        key={excerpt.id}
                                        onClick={() => handleSelectExcerpt(excerpt.id)}
                                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all relative group ${isSelected ? 'ring-2 ring-offset-2 ring-offset-transparent' : 'opacity-80 hover:opacity-100'}`}
                                        style={{ 
                                            backgroundColor: settings.toolbarButtonBg,
                                            borderColor: isSelected ? settings.accentColor : 'transparent',
                                        }}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <span className={`text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded ${excerpt.type === 'user' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'}`}>
                                                {excerpt.type}
                                            </span>
                                            <div className="flex gap-2 items-center">
                                                <span className="text-[10px] opacity-40 font-mono">{settings.bookTitle || 'Novelis'}, Ch {chapter?.chapterNumber || '?'}</span>
                                                <button 
                                                    onClick={(e) => handleDeleteExcerpt(excerpt.id, e)}
                                                    className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400 opacity-40 hover:opacity-100 transition-all active:scale-90"
                                                    title="Delete Excerpt"
                                                >
                                                    <TrashIcon className="h-3 w-3" />
                                                </button>
                                            </div>
                                        </div>

                                        <AutosizeTextarea 
                                            value={excerpt.text}
                                            onChange={(e) => handleExcerptUpdate(excerpt.id, e.target.value)}
                                            onClick={(e) => {
                                                if (!isSelected) {
                                                    e.stopPropagation();
                                                    handleSelectExcerpt(excerpt.id);
                                                }
                                            }}
                                            className={`w-full bg-transparent border-none outline-none text-sm italic resize-none leading-relaxed p-0 m-0 ${isSelected ? 'cursor-text' : 'cursor-pointer'}`}
                                            style={{ color: settings.textColor }}
                                            placeholder="Excerpt text..."
                                        />
                                        
                                        {isSelected && (
                                            <div className="absolute top-2 right-2 opacity-20 text-[8px] uppercase font-bold tracking-tighter">
                                                Editable
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* RHS: Preview & Results */}
                <div className="flex-grow flex flex-col gap-6 overflow-hidden">
                    {selectedExcerptId ? (
                         <div className="flex flex-col xl:flex-row gap-6 h-full overflow-hidden">
                            {/* Visual Preview */}
                            <div className="flex flex-col gap-4 flex-[5] min-w-[300px]">
                                <div className="flex justify-between items-end">
                                    <div>
                                        <h4 className="text-xs font-bold uppercase tracking-widest opacity-40">Poster Studio</h4>
                                        <p className="text-[10px] opacity-30 italic mt-1">Generated visuals for your marketing campaign.</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => handleRegenImage(false)}
                                            disabled={isLoading || isRegeneratingImage}
                                            className="text-[10px] px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-all flex items-center gap-2 border border-white/5 disabled:opacity-30"
                                        >
                                            <UserCircleIcon className="h-3.5 w-3.5" /> Character
                                        </button>
                                        <button 
                                            onClick={() => handleRegenImage(true)}
                                            disabled={isLoading || isRegeneratingImage}
                                            className="text-[10px] px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-all flex items-center gap-2 border border-white/5 disabled:opacity-30"
                                        >
                                            <RefreshIcon className="h-3.5 w-3.5" /> Mood
                                        </button>
                                    </div>
                                </div>

                                <div className="p-8 rounded-2xl flex-grow flex flex-col bg-gradient-to-b from-black/40 to-black/20 border border-white/5 shadow-2xl relative overflow-hidden">
                                    {/* Glassy Overlay for Controls */}
                                    <div className="absolute top-4 right-4 z-20 flex gap-2">
                                        {generatedImageUrl && (
                                            <button 
                                                onClick={() => {
                                                    const a = document.createElement('a');
                                                    a.href = generatedImageUrl;
                                                    a.download = `novelis_social_${selectedExcerptId}.png`;
                                                    a.click();
                                                }}
                                                className="text-[10px] px-3 py-1.5 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md transition-all flex items-center gap-2 border border-white/10 text-white shadow-lg"
                                            >
                                                <ShareIcon className="h-3.5 w-3.5" /> Save
                                            </button>
                                        )}
                                    </div>
                                    
                                    <div className="flex-grow flex items-center justify-center relative">
                                        <div 
                                            className="relative w-full max-w-[320px] aspect-[9/16] border-[8px] rounded-[3.5rem] p-1.5 shadow-[0_0_80px_rgba(0,0,0,0.8)] overflow-hidden transition-all duration-500"
                                            style={{ 
                                                borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                                                backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'
                                            }}
                                        >
                                            <div className="w-full h-full rounded-[2.8rem] overflow-hidden flex items-center justify-center bg-black/60 relative">
                                                {(isLoading && !generatedImageUrl) && (
                                                    <div className="flex flex-col items-center gap-4 z-10">
                                                        <div className="relative">
                                                            <SpinnerIcon className="h-14 w-14 text-white/40" />
                                                            <SparklesIconOutline className="h-6 w-6 text-white/60 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                                                        </div>
                                                        <div className="text-center">
                                                            <span className="text-[11px] uppercase font-bold text-white/50 tracking-widest block mb-1">AI Artist at Work</span>
                                                            <span className="text-[9px] text-white/30 italic">Compositing cinematic textures...</span>
                                                        </div>
                                                    </div>
                                                )}

                                                {isRegeneratingImage && (
                                                    <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-20 backdrop-blur-md">
                                                        <div className="flex flex-col items-center gap-3">
                                                            <SpinnerIcon className="h-10 w-10 text-white/60" />
                                                            <span className="text-[10px] uppercase font-bold text-white/40 tracking-widest">Updating Vision</span>
                                                        </div>
                                                    </div>
                                                )}

                                                {generatedImageUrl ? (
                                                    <img 
                                                        src={generatedImageUrl} 
                                                        className={`w-full h-full object-cover transition-all duration-1000 ease-out ${isRegeneratingImage ? 'scale-110 blur-md opacity-40' : 'scale-100 blur-0 opacity-100'}`} 
                                                        referrerPolicy="no-referrer"
                                                        alt="AI Generated Social Media Poster"
                                                    />
                                                ) : !isLoading && (
                                                    <div className="text-center px-8 flex flex-col items-center">
                                                        <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6">
                                                            <CameraIcon className="h-10 w-10 opacity-10" />
                                                        </div>
                                                        <h5 className="text-[11px] uppercase font-bold tracking-[0.2em] opacity-30 mb-2">Canvas Empty</h5>
                                                        <p className="text-[10px] opacity-20 italic max-w-[160px] leading-relaxed">
                                                            Select an excerpt and click Generate to paint your story's essence.
                                                        </p>
                                                    </div>
                                                )}

                                                {/* Vignette effect for realism */}
                                                <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_100px_rgba(0,0,0,0.6)]" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Prompt Info */}
                                    {generatedImagePrompt && (
                                        <div className="mt-8 px-4">
                                            <div className="flex items-center gap-2 mb-2 opacity-30">
                                                <SparklesIconOutline className="h-3 w-3" />
                                                <span className="text-[9px] uppercase font-bold tracking-widest">Artist's Direction</span>
                                            </div>
                                            <p className="text-[10px] opacity-40 italic line-clamp-2 leading-relaxed hover:line-clamp-none transition-all cursor-default">
                                                "{generatedImagePrompt}"
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Column 2: Generated Posts */}
                            <div className="flex flex-col gap-4 flex-[5] min-w-[350px]">
                                <h4 className="text-xs font-bold uppercase tracking-widest opacity-40">Campaign Copy</h4>
                                <div className="flex-grow flex flex-col gap-4 overflow-y-auto pr-2">
                                    {generatedInstagramPost || generatedTiktokPost ? (
                                        <>
                                            <PostDisplay 
                                                platform="Instagram" 
                                                post={generatedInstagramPost} 
                                                isLoading={isLoading} 
                                                settings={settings}
                                                onTextChange={(text) => dispatch({ type: 'UPDATE_SOCIAL_MEDIA_STATE', payload: { generatedInstagramPost: { ...generatedInstagramPost!, text } } })}
                                                onHashtagsChange={(hashtags) => dispatch({ type: 'UPDATE_SOCIAL_MEDIA_STATE', payload: { generatedInstagramPost: { ...generatedInstagramPost!, hashtags } } })}
                                                onRegenerate={() => onRegenerateTextAndHashtags(selectedExcerpt!, 'instagram')}
                                                onRepurpose={() => {}} // Not needed in this view
                                            />
                                            <PostDisplay 
                                                platform="TikTok" 
                                                post={generatedTiktokPost} 
                                                isLoading={isLoading} 
                                                settings={settings}
                                                onTextChange={(text) => dispatch({ type: 'UPDATE_SOCIAL_MEDIA_STATE', payload: { generatedTiktokPost: { ...generatedTiktokPost!, text } } })}
                                                onHashtagsChange={(hashtags) => dispatch({ type: 'UPDATE_SOCIAL_MEDIA_STATE', payload: { generatedTiktokPost: { ...generatedTiktokPost!, hashtags } } })}
                                                onRegenerate={() => onRegenerateTextAndHashtags(selectedExcerpt!, 'tiktok')}
                                                onRepurpose={() => {}} // Not needed in this view
                                            />
                                        </>
                                    ) : !isLoading ? (
                                        <div className="flex-grow flex items-center justify-center border-2 border-dashed rounded-2xl opacity-20" style={{ borderColor: settings.toolbarInputBorderColor }}>
                                            <div className="text-center">
                                                <SparklesIconOutline className="h-12 w-12 mx-auto mb-4" />
                                                <p className="text-sm italic">Click "Generate" to create optimized captions for this excerpt.</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex-grow flex items-center justify-center">
                                            <SpinnerIcon className="h-8 w-8 opacity-20" />
                                        </div>
                                    )}
                                </div>
                            </div>
                         </div>
                    ) : (
                        <div className="flex-grow flex flex-col items-center justify-center opacity-20 p-12 text-center">
                            <div className="max-w-xs">
                                <ShareIcon className="h-24 w-24 mx-auto mb-8 opacity-10" />
                                <h3 className="text-xl font-bold mb-4 uppercase tracking-tighter">Social Media Studio</h3>
                                <p className="text-sm leading-relaxed">
                                    Refine your manuscript excerpts into visually stunning, platform-ready social media content.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
};
