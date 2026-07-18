import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNovelState, useNovelDispatch } from '../../NovelContext';
import { ContextMenu } from './ContextMenu';
import type { EditorSettings, LockedChestItem } from '../../types';
import { Modal } from '../manuscript/modals/Modal';
import { TrashIcon, ArchiveIcon, CheckCircleIcon, XIcon } from './Icons';
import { getContrastColor } from '../../utils/colorUtils';
import AutosizeTextarea from './AutosizeTextarea';

interface LockedChestProps {
    modalId: string;
    settings: EditorSettings;
}

export const LockedChestTab: React.FC<LockedChestProps> = ({ modalId, settings }) => {
    const { lockedChest = [] } = useNovelState();
    const dispatch = useNovelDispatch();
    const items = lockedChest.filter(item => item.modalId === modalId);

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editContent, setEditContent] = useState('');
    const [editTag, setEditTag] = useState('');

    const handleDelete = (id: string) => {
        dispatch({ type: 'DELETE_LOCKED_CHEST_ITEM', payload: id });
    };

    const startEditing = (item: LockedChestItem) => {
        setEditingId(item.id);
        setEditContent(item.content);
        setEditTag(item.tag);
    };

    const cancelEditing = () => {
        setEditingId(null);
    };

    const saveEdit = (id: string) => {
        dispatch({
            type: 'UPDATE_LOCKED_CHEST_ITEM',
            payload: {
                id,
                updates: {
                    content: editContent,
                    tag: editTag
                }
            }
        });
        setEditingId(null);
    };

    if (items.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-center opacity-50">
                <ArchiveIcon className="w-12 h-12 mb-4" />
                <p className="text-lg">Your Locked Chest is empty.</p>
                <p className="text-sm">Select text and right-click to send snippets here for safekeeping.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {items.map(item => (
                <div 
                    key={item.id} 
                    className="p-4 rounded-lg border flex flex-col gap-2 relative group"
                    style={{ 
                        backgroundColor: settings.backgroundColor, 
                        borderColor: settings.toolbarInputBorderColor,
                        color: settings.textColor 
                    }}
                >
                    <div className="flex justify-between items-start">
                        {editingId === item.id ? (
                            <input 
                                autoFocus
                                className="px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider outline-none border"
                                style={{ 
                                    backgroundColor: settings.accentColor,
                                    color: getContrastColor(settings.accentColor),
                                    borderColor: settings.toolbarInputBorderColor
                                }}
                                value={editTag}
                                onChange={e => setEditTag(e.target.value)}
                                placeholder="Tag..."
                            />
                        ) : (
                            <span 
                                className="px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider cursor-pointer hover:brightness-110 transition-all"
                                onClick={() => startEditing(item)}
                                style={{ 
                                    backgroundColor: settings.accentColor,
                                    color: getContrastColor(settings.accentColor)
                                }}
                                title="Click to edit tag"
                            >
                                {item.tag}
                            </span>
                        )}
                        
                        <div className="flex gap-1">
                            {editingId === item.id ? (
                                <>
                                    <button 
                                        onClick={() => saveEdit(item.id)}
                                        className="p-1.5 rounded transition-colors hover:bg-black/10"
                                        style={{ color: settings.successColor }}
                                        title="Save changes"
                                    >
                                        <CheckCircleIcon className="h-4 w-4" />
                                    </button>
                                    <button 
                                        onClick={cancelEditing}
                                        className="p-1.5 rounded transition-colors hover:bg-black/10"
                                        style={{ color: settings.textColor }}
                                        title="Cancel"
                                    >
                                        <XIcon className="h-4 w-4" />
                                    </button>
                                </>
                            ) : (
                                <button 
                                    onClick={() => handleDelete(item.id)}
                                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded transition-opacity"
                                    style={{ color: settings.dangerColor }}
                                    onMouseEnter={e => e.currentTarget.style.backgroundColor = settings.toolbarButtonHoverBg || ''}
                                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                >
                                    <TrashIcon className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                    </div>

                    {editingId === item.id ? (
                        <AutosizeTextarea 
                            className="text-sm whitespace-pre-wrap leading-relaxed w-full bg-transparent outline-none border-none resize-none p-0 focus:ring-0"
                            style={{ color: settings.textColor }}
                            value={editContent}
                            onChange={e => setEditContent(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                                    saveEdit(item.id);
                                }
                                if (e.key === 'Escape') {
                                    cancelEditing();
                                }
                            }}
                        />
                    ) : (
                        <div 
                            className="text-sm whitespace-pre-wrap leading-relaxed cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => startEditing(item)}
                            title="Click to edit content"
                        >
                            {item.content}
                        </div>
                    )}
                    
                    <div className="text-[10px] opacity-40 mt-1">
                        {editingId === item.id ? 'Press Ctrl+Enter to save, Esc to cancel' : `Added ${new Date(item.timestamp).toLocaleString()}`}
                    </div>
                </div>
            ))}
        </div>
    );
};

export const useLockedChestSelection = (modalId: string, settings: EditorSettings) => {
    const dispatch = useNovelDispatch();
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, text: string } | null>(null);
    const [taggingItem, setTaggingItem] = useState<string | null>(null);

    const handleContextMenu = useCallback((e: MouseEvent) => {
        const selection = window.getSelection();
        const selectedText = selection?.toString().trim();

        if (selectedText) {
            e.preventDefault();
            setContextMenu({ x: e.clientX, y: e.clientY, text: selectedText });
        }
    }, []);

    useEffect(() => {
        document.addEventListener('contextmenu', handleContextMenu);
        return () => document.removeEventListener('contextmenu', handleContextMenu);
    }, [handleContextMenu]);

    const handleSendToChest = () => {
        if (contextMenu) {
            setTaggingItem(contextMenu.text);
            setContextMenu(null);
        }
    };

    const confirmTag = (tag: string) => {
        if (taggingItem) {
            dispatch({
                type: 'ADD_LOCKED_CHEST_ITEM',
                payload: {
                    modalId,
                    content: taggingItem,
                    tag: tag || 'General'
                }
            });
            setTaggingItem(null);
        }
    };

    const renderTaggingModal = () => {
        if (!taggingItem) return null;

        return (
            <Modal 
                onClose={() => setTaggingItem(null)} 
                settings={settings} 
                title="Tag Your Chest Item"
                className="max-w-md"
            >
                <div className="space-y-4">
                    <p className="text-sm opacity-70">Give this snippet a tag to help you find it later.</p>
                    <input 
                        autoFocus
                        type="text"
                        placeholder="e.g. Plot Idea, Character Quirk, Marketing"
                        className="w-full p-2 rounded border outline-none"
                        style={{ 
                            backgroundColor: settings.backgroundColor,
                            color: settings.textColor,
                            borderColor: settings.toolbarInputBorderColor
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                confirmTag(e.currentTarget.value);
                            }
                        }}
                    />
                    <div className="flex justify-end gap-2">
                         <button 
                            onClick={() => setTaggingItem(null)}
                            className="px-4 py-2 rounded"
                            style={{ backgroundColor: settings.toolbarButtonBg, color: settings.toolbarText }}
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={(e) => {
                                const input = (e.currentTarget.parentElement?.previousElementSibling as HTMLInputElement);
                                confirmTag(input.value);
                            }}
                            className="px-4 py-2 rounded font-bold"
                            style={{ backgroundColor: settings.accentColor, color: getContrastColor(settings.accentColor) }}
                        >
                            Send to Chest
                        </button>
                    </div>
                </div>
            </Modal>
        );
    };

    const renderContextMenu = () => {
        if (!contextMenu) return null;

        return (
            <ContextMenu 
                x={contextMenu.x}
                y={contextMenu.y}
                settings={settings}
                onClose={() => setContextMenu(null)}
                actions={[
                    { label: "Send To Modal's Chest", onSelect: handleSendToChest }
                ]}
            />
        );
    };

    return { renderContextMenu, renderTaggingModal };
};
