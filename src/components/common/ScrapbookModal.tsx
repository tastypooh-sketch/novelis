
import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Modal } from '../manuscript/modals/Modal';
import { useNovelDispatch, useNovelState } from '../../NovelContext';
import type { EditorSettings, IScrapbookEntry } from '../../types';
import { PlusIcon, TrashIconOutline, SparklesIconOutline, CameraIcon, XIcon, CheckCircleIcon, DocumentDuplicateIcon, PinIcon } from './Icons';
import { generateId } from '../../utils/common';
import { getContrastColor } from '../../utils/colorUtils';

interface ScrapbookModalProps {
    settings: EditorSettings;
    onClose: () => void;
}

const STICKY_COLORS = [
    '#fef08a', // Yellow
    '#bbf7d0', // Green
    '#bfdbfe', // Blue
    '#fbcfe8', // Pink
    '#e9d5ff', // Purple
    '#fed7aa', // Orange
    '#fecaca', // Red
];

export const ScrapbookModal: React.FC<ScrapbookModalProps> = ({ settings, onClose }) => {
    const { scrapbookState } = useNovelState();
    const dispatch = useNovelDispatch();
    const [filter, setFilter] = useState<'all' | 'text' | 'image'>('all');
    const [isAdding, setIsAdding] = useState(false);
    const [newEntryType, setNewEntryType] = useState<'text' | 'image'>('text');
    const [newEntryContent, setNewEntryContent] = useState('');
    const [newEntryTitle, setNewEntryTitle] = useState('');
    const [newEntryColor, setNewEntryColor] = useState(STICKY_COLORS[0]);

    const entries = scrapbookState.entries.filter(e => {
        if (filter === 'all') return true;
        return e.type === filter;
    });

    const handleAddEntry = () => {
        if (!newEntryContent.trim() && newEntryType === 'text') return;
        
        dispatch({
            type: 'ADD_SCRAPBOOK_ENTRY',
            payload: {
                type: newEntryType,
                content: newEntryContent,
                title: newEntryTitle || (newEntryType === 'text' ? 'Untitled Note' : 'Untitled Image'),
                color: newEntryColor,
                isPinned: false,
            }
        });
        
        setIsAdding(false);
        setNewEntryContent('');
        setNewEntryTitle('');
    };

    const handleDeleteEntry = (id: string) => {
        dispatch({ type: 'DELETE_SCRAPBOOK_ENTRY', payload: id });
    };

    const handleTogglePin = (id: string, isPinned: boolean) => {
        dispatch({ type: 'UPDATE_SCRAPBOOK_ENTRY', payload: { id, updates: { isPinned: !isPinned } } });
    };

    const sortedEntries = [...entries].sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return b.timestamp - a.timestamp;
    });

    return (
        <Modal onClose={onClose} settings={settings} title="Scrapbook" className="max-w-6xl w-[95vw] h-[85vh]">
            <div className="flex flex-col h-full gap-4">
                {/* Header Controls */}
                <div className="flex justify-between items-center bg-black/20 p-3 rounded-xl border border-white/5">
                    <div className="flex gap-2">
                        <button 
                            onClick={() => setFilter('all')}
                            className={`px-3 py-1.5 rounded-lg text-sm transition-all ${filter === 'all' ? 'bg-white/10 opacity-100' : 'opacity-40 hover:opacity-60'}`}
                        >
                            All
                        </button>
                        <button 
                            onClick={() => setFilter('text')}
                            className={`px-3 py-1.5 rounded-lg text-sm transition-all ${filter === 'text' ? 'bg-white/10 opacity-100' : 'opacity-40 hover:opacity-60'}`}
                        >
                            Notes
                        </button>
                        <button 
                            onClick={() => setFilter('image')}
                            className={`px-3 py-1.5 rounded-lg text-sm transition-all ${filter === 'image' ? 'bg-white/10 opacity-100' : 'opacity-40 hover:opacity-60'}`}
                        >
                            Images
                        </button>
                    </div>

                    <div className="flex gap-3">
                        <button 
                            onClick={() => { setNewEntryType('text'); setIsAdding(true); }}
                            className="btn-nuanced-lg-primary px-4 py-2 text-sm"
                        >
                            <PlusIcon className="w-4 h-4" />
                            Add Note
                        </button>
                        <button 
                            onClick={() => { setNewEntryType('image'); setIsAdding(true); }}
                            className="btn-nuanced-lg px-4 py-2 text-sm border border-white/10"
                            style={{ backgroundColor: settings.toolbarButtonBg }}
                        >
                            <CameraIcon className="w-4 h-4" />
                            Add Image
                        </button>
                    </div>
                </div>

                {/* Entry Grid */}
                <div className="flex-grow overflow-y-auto pr-2 custom-scrollbar">
                    {sortedEntries.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center opacity-30 text-center">
                            <DocumentDuplicateIcon className="w-16 h-16 mb-4" />
                            <p className="text-xl font-medium">Your scrapbook is empty</p>
                            <p className="text-sm">Click the buttons above to start collecting ideas.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-8">
                            <AnimatePresence>
                                {sortedEntries.map((entry) => (
                                    <ScrapbookItem 
                                        key={entry.id} 
                                        entry={entry} 
                                        settings={settings}
                                        onDelete={() => handleDeleteEntry(entry.id)}
                                        onTogglePin={() => handleTogglePin(entry.id, !!entry.isPinned)}
                                        onUpdate={(updates) => dispatch({ type: 'UPDATE_SCRAPBOOK_ENTRY', payload: { id: entry.id, updates } })}
                                    />
                                ))}
                            </AnimatePresence>
                        </div>
                    )}
                </div>
            </div>

            {/* Add Entry Modal Overlay */}
            <AnimatePresence>
                {isAdding && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                    >
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="max-w-md w-full rounded-2xl p-6 shadow-2xl border overflow-hidden" 
                            style={{ backgroundColor: settings.toolbarBg, borderColor: settings.toolbarInputBorderColor, color: settings.textColor }}
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold">Add {newEntryType === 'text' ? 'Note' : 'Image'}</h3>
                                <button onClick={() => setIsAdding(false)} className="opacity-40 hover:opacity-100">
                                    <XIcon className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase opacity-40 mb-1.5">Title (Optional)</label>
                                    <input 
                                        type="text"
                                        value={newEntryTitle}
                                        onChange={(e) => setNewEntryTitle(e.target.value)}
                                        placeholder={newEntryType === 'text' ? 'Quick thought...' : 'Image description...'}
                                        className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500/50"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold uppercase opacity-40 mb-1.5">
                                        {newEntryType === 'text' ? 'Content' : 'Image URL'}
                                    </label>
                                    <textarea 
                                        value={newEntryContent}
                                        onChange={(e) => setNewEntryContent(e.target.value)}
                                        placeholder={newEntryType === 'text' ? 'Type your ideas here...' : 'https://example.com/image.jpg'}
                                        className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500/50 min-h-[120px]"
                                    />
                                    {newEntryType === 'image' && newEntryContent && (
                                        <div className="mt-2 rounded-lg overflow-hidden border border-white/10 aspect-video bg-black/40">
                                            <img src={newEntryContent} alt="Preview" className="w-full h-full object-contain" onError={(e) => (e.currentTarget.style.display = 'none')} />
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-xs font-bold uppercase opacity-40 mb-2">Accent Color</label>
                                    <div className="flex gap-2">
                                        {STICKY_COLORS.map(color => (
                                            <button 
                                                key={color}
                                                onClick={() => setNewEntryColor(color)}
                                                className={`w-8 h-8 rounded-full border-2 transition-transform active:scale-90 ${newEntryColor === color ? 'border-white scale-110' : 'border-transparent'}`}
                                                style={{ backgroundColor: color }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 flex justify-end gap-3">
                                <button 
                                    onClick={() => setIsAdding(false)}
                                    className="px-6 py-2 rounded-xl opacity-40 hover:opacity-100 text-sm font-medium"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={handleAddEntry}
                                    disabled={!newEntryContent.trim() && newEntryType === 'text'}
                                    className="btn-nuanced-lg-primary px-8 py-2 text-sm disabled:opacity-30"
                                >
                                    <CheckCircleIcon className="w-4 h-4" />
                                    Save to Scrapbook
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </Modal>
    );
};

const ScrapbookItem: React.FC<{ entry: IScrapbookEntry, settings: EditorSettings, onDelete: () => void, onTogglePin: () => void, onUpdate: (updates: Partial<IScrapbookEntry>) => void }> = ({ entry, settings, onDelete, onTogglePin, onUpdate }) => {
    const isImage = entry.type === 'image';
    const contrastColor = getContrastColor(entry.color || '#fef08a');
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(entry.content);
    const [editTitle, setEditTitle] = useState(entry.title || '');
    
    // Stable random rotation based on ID
    const rotation = React.useMemo(() => {
        const hash = entry.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        return (hash % 6) - 3; // -3 to 3 degrees
    }, [entry.id]);

    const handleSaveEdit = () => {
        onUpdate({ content: editContent, title: editTitle });
        setIsEditing(false);
    };

    return (
        <motion.div 
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ 
                opacity: 1, 
                scale: 1,
                rotate: entry.isPinned ? 0 : rotation 
            }}
            exit={{ opacity: 0, scale: 0.9 }}
            className={`group relative rounded-xl overflow-hidden shadow-lg border border-white/5 flex flex-col transition-all hover:shadow-2xl hover:-translate-y-1 hover:rotate-0 hover:z-10 ${entry.isPinned ? 'ring-2 ring-blue-500/50 z-10' : ''}`}
            style={{ backgroundColor: entry.color || '#fef08a', color: contrastColor }}
        >
            {/* Toolbar */}
            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                <button 
                    onClick={onTogglePin}
                    className={`p-1.5 rounded-lg backdrop-blur-md bg-black/10 hover:bg-black/20 transition-colors ${entry.isPinned ? 'text-blue-600' : ''}`}
                    title={entry.isPinned ? 'Unpin' : 'Pin'}
                >
                    <PinIcon className="w-4 h-4" />
                </button>
                <button 
                    onClick={onDelete}
                    className="p-1.5 rounded-lg backdrop-blur-md bg-black/10 hover:bg-red-500/30 text-red-600 transition-colors"
                    title="Delete"
                >
                    <TrashIconOutline className="w-4 h-4" />
                </button>
            </div>

            {isImage ? (
                <>
                    <div className="aspect-square w-full overflow-hidden bg-black/5">
                        <img src={entry.content} alt={entry.title} className="w-full h-full object-cover" />
                    </div>
                    {entry.title && (
                        <div className="p-3">
                            <h4 className="font-bold text-sm truncate opacity-80">{entry.title}</h4>
                        </div>
                    )}
                </>
            ) : (
                <div className="p-4 flex flex-col h-full min-h-[160px]">
                    {isEditing ? (
                        <div className="flex flex-col h-full gap-2">
                            <input 
                                value={editTitle}
                                onChange={e => setEditTitle(e.target.value)}
                                className="bg-black/10 border-none outline-none font-bold text-sm w-full p-1 rounded"
                                placeholder="Title..."
                                autoFocus
                            />
                            <textarea 
                                value={editContent}
                                onChange={e => setEditContent(e.target.value)}
                                className="bg-black/10 border-none outline-none text-sm w-full p-1 rounded flex-grow min-h-[100px] resize-none"
                                placeholder="Note content..."
                            />
                            <div className="flex justify-end gap-2 mt-2">
                                <button onClick={() => { setIsEditing(false); setEditContent(entry.content); }} className="text-[10px] uppercase font-bold opacity-40 hover:opacity-100">Cancel</button>
                                <button onClick={handleSaveEdit} className="text-[10px] uppercase font-bold text-blue-600 hover:underline">Save</button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col h-full cursor-text" onClick={() => setIsEditing(true)}>
                            {entry.title && (
                                <h4 className="font-bold text-sm mb-2 opacity-60 uppercase tracking-wider">{entry.title}</h4>
                            )}
                            <p className="text-sm line-clamp-[8] flex-grow leading-relaxed whitespace-pre-wrap">
                                {entry.content}
                            </p>
                        </div>
                    )}
                    {!isEditing && (
                        <div className="mt-4 flex justify-between items-center opacity-40 text-[10px] font-bold uppercase tracking-widest">
                            <span>{new Date(entry.timestamp).toLocaleDateString()}</span>
                            {entry.isPinned && <span className="text-blue-600">Pinned</span>}
                        </div>
                    )}
                </div>
            )}
        </motion.div>
    );
};
