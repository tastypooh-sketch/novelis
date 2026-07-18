import React, { useState } from 'react';
import type { EditorSettings, SocialPost } from '../../types';
import { RefreshIcon, SpinnerIcon, ClipboardIcon, CheckCircleIcon, DocumentDuplicateIcon } from '../common/Icons';
import AutosizeTextarea from '../common/AutosizeTextarea';

interface PostDisplayProps {
    platform: 'Instagram' | 'TikTok';
    post: SocialPost | null;
    onTextChange: (text: string) => void;
    onHashtagsChange: (hashtags: string[]) => void;
    onRegenerate: () => void;
    onRepurpose: () => void;
    isLoading: boolean;
    settings: EditorSettings;
}

export const PostDisplay: React.FC<PostDisplayProps> = ({ platform, post, onTextChange, onHashtagsChange, onRegenerate, onRepurpose, isLoading, settings }) => {
    const [isCopied, setIsCopied] = useState(false);

    if (!post) return null;

    const handleCopy = () => {
        if (isLoading) return;
        const fullPost = `${post.text}\n\n${post.hashtags.join(' ')}`;
        navigator.clipboard.writeText(fullPost).then(() => {
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        }).catch(err => {
            console.error('Failed to copy text: ', err);
        });
    };
    
    const handleHashtagChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const rawTags = e.target.value;
        const newHashtags = rawTags
            .split(/\s+/)
            .filter(tag => tag.trim().length > 0)
            .map(tag => tag.startsWith('#') ? tag : `#${tag}`);
        onHashtagsChange(newHashtags);
    };

    return (
        <div className="p-4 rounded-lg flex-grow flex flex-col" style={{backgroundColor: settings.toolbarButtonBg}}>
            <div className="flex justify-between items-center mb-2">
                 <h4 className="font-semibold text-sm">{platform} Post</h4>
                 <div className="flex items-center gap-2">
                    {isCopied ? (
                        <span className="text-xs flex items-center gap-1" style={{ color: settings.successColor }}>
                            <CheckCircleIcon className="h-4 w-4" />
                            Copied!
                        </span>
                    ) : (
                        <button onClick={handleCopy} disabled={isLoading} title="Copy to clipboard" className="text-xs px-2 py-1 rounded flex items-center justify-center gap-1 disabled:opacity-50" style={{ backgroundColor: settings.toolbarBg }}>
                            <ClipboardIcon className="h-3 w-3" /> Copy
                        </button>
                    )}
                    <button onClick={onRepurpose} disabled={isLoading} title="Generate post variations" className="text-xs px-2 py-1 rounded flex items-center justify-center gap-1 disabled:opacity-50" style={{ backgroundColor: settings.toolbarBg }}>
                        <DocumentDuplicateIcon className="h-3 w-3" /> Repurpose
                    </button>
                    <button onClick={onRegenerate} disabled={isLoading} title="Regenerate this post" className="text-xs px-2 py-1 rounded flex items-center justify-center gap-1" style={{ backgroundColor: settings.toolbarBg }}>
                        {isLoading ? <SpinnerIcon className="h-3 w-3" /> : <RefreshIcon className="h-3 w-3"/>} Regenerate
                    </button>
                 </div>
            </div>
            <div className="space-y-3 flex-grow overflow-y-auto relative group">
                <AutosizeTextarea
                    value={post.text}
                    onChange={e => onTextChange(e.target.value)}
                    className="w-full bg-transparent border-none resize-none outline-none text-sm"
                    style={{ color: settings.toolbarText }}
                    placeholder="Post text..."
                />
                <div className="relative">
                    <AutosizeTextarea
                        value={post.hashtags.join(' ')}
                        onChange={handleHashtagChange}
                        placeholder="Add hashtags here, separated by spaces..."
                        className="w-full bg-transparent border-none resize-none outline-none text-xs"
                        style={{ color: `${settings.toolbarText}B3` }}
                    />
                </div>
                <div className="absolute bottom-0 right-0 opacity-20 text-[8px] uppercase font-bold tracking-tighter pointer-events-none">
                    Editable
                </div>
            </div>
        </div>
    );
};