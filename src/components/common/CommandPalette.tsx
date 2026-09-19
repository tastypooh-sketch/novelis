import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { EditorSettings } from '../../types';
import { useNovelState } from '../../NovelContext';
import { SearchIcon, BookIcon, UserCircleIcon, WorldIcon, CogIcon } from './Icons';

interface CommandPaletteProps {
    isOpen: boolean;
    onClose: () => void;
    settings: EditorSettings;
    onNavigate: (view: 'manuscript' | 'assembly', subView?: string, id?: string) => void;
    onToggleFocus: () => void;
    onToggleFullscreen: () => void;
}

interface SearchResult {
    id: string;
    label: string;
    subLabel?: string;
    type: 'chapter' | 'character' | 'world' | 'action';
    icon: React.ReactNode;
    action: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, settings, onNavigate, onToggleFocus, onToggleFullscreen }) => {
    const { chapters, characters, worldItems } = useNovelState();
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLUListElement>(null);

    // Auto-focus input when opened
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 50);
            setQuery('');
            setSelectedIndex(0);
        }
    }, [isOpen]);

    const results: SearchResult[] = useMemo(() => {
        if (!query.trim()) return [];
        const lowerQuery = query.toLowerCase();
        
        const list: SearchResult[] = [];

        // Actions
        if ('focus mode'.includes(lowerQuery) || 'distraction free'.includes(lowerQuery)) {
            list.push({
                id: 'action-focus',
                label: 'Toggle Focus Mode',
                subLabel: 'Action',
                type: 'action',
                icon: <CogIcon className="h-4 w-4" />,
                action: onToggleFocus
            });
        }
        if ('fullscreen'.includes(lowerQuery)) {
            list.push({
                id: 'action-fullscreen',
                label: 'Toggle Fullscreen',
                subLabel: 'Action',
                type: 'action',
                icon: <CogIcon className="h-4 w-4" />,
                action: onToggleFullscreen
            });
        }

        // Chapters
        chapters.forEach(ch => {
            if (ch.title.toLowerCase().includes(lowerQuery) || `chapter ${ch.chapterNumber}`.includes(lowerQuery)) {
                list.push({
                    id: `ch-${ch.id}`,
                    label: `${ch.chapterNumber}. ${ch.title}`,
                    subLabel: ch.summary ? ch.summary.substring(0, 60) + '...' : 'Manuscript Chapter',
                    type: 'chapter',
                    icon: <BookIcon className="h-4 w-4" />,
                    action: () => onNavigate('manuscript', undefined, ch.id)
                });
            }
        });

        // Characters
        characters.forEach(char => {
            if (char.name.toLowerCase().includes(lowerQuery)) {
                list.push({
                    id: `char-${char.id}`,
                    label: char.name,
                    subLabel: char.tagline || 'Character Profile',
                    type: 'character',
                    icon: <UserCircleIcon className="h-4 w-4" />,
                    action: () => onNavigate('assembly', 'characters', char.id)
                });
            }
        });

        // World Items
        worldItems.forEach(item => {
            if (item.name.toLowerCase().includes(lowerQuery)) {
                list.push({
                    id: `world-${item.id}`,
                    label: item.name,
                    subLabel: item.type,
                    type: 'world',
                    icon: <WorldIcon className="h-4 w-4" />,
                    action: () => onNavigate('assembly', 'world', item.id)
                });
            }
        });

        return list.slice(0, 10); // Limit results
    }, [query, chapters, characters, worldItems]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => (prev + 1) % results.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => (prev - 1 + results.length) % results.length);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (results[selectedIndex]) {
                results[selectedIndex].action();
                onClose();
            }
        } else if (e.key === 'Escape') {
            onClose();
        }
    };

    // Scroll selected item into view
    useEffect(() => {
        if (listRef.current) {
            const selectedElement = listRef.current.children[selectedIndex] as HTMLElement;
            if (selectedElement) {
                selectedElement.scrollIntoView({ block: 'nearest' });
            }
        }
    }, [selectedIndex]);

    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] bg-black/60 backdrop-blur-sm transition-all animate-in fade-in duration-200"
            onMouseDown={onClose}
        >
            <div 
                className="w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden flex flex-col border border-toolbar-border ring-1 ring-toolbar-border"
                style={{ backgroundColor: settings.toolbarBg, color: settings.textColor }}
                onMouseDown={e => e.stopPropagation()}
            >
                <div className="flex items-center px-4 py-4 border-b" style={{ borderColor: settings.toolbarInputBorderColor }}>
                    <SearchIcon className="h-5 w-5 opacity-50 mr-3" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={e => { setQuery(e.target.value); setSelectedIndex(0); }}
                        onKeyDown={handleKeyDown}
                        placeholder="Go to chapter, character, setting..."
                        className="flex-grow bg-transparent border-none outline-none text-lg placeholder-opacity-40"
                        style={{ color: settings.textColor }}
                    />
                    <div className="text-xs opacity-40 border px-1.5 py-0.5 rounded font-mono">ESC</div>
                </div>
                
                {results.length > 0 ? (
                    <ul ref={listRef} className="max-h-[400px] overflow-y-auto py-2">
                        {results.map((result, index) => (
                            <li
                                key={result.id}
                                onClick={() => { result.action(); onClose(); }}
                                className={`px-4 py-3 flex items-center cursor-pointer transition-colors border-l-4 ${index === selectedIndex ? 'bg-toolbar-button-hover' : 'border-transparent'}`}
                                style={{ borderColor: index === selectedIndex ? settings.accentColor : 'transparent' }}
                                onMouseEnter={() => setSelectedIndex(index)}
                            >
                                <div className={`p-2 rounded-md mr-4 ${index === selectedIndex ? 'text-app-text' : 'opacity-70'}`} style={{ backgroundColor: index === selectedIndex ? settings.accentColor : settings.toolbarButtonBg }}>
                                    {result.icon}
                                </div>
                                <div className="flex-grow min-w-0">
                                    <div className="font-medium truncate">{result.label}</div>
                                    {result.subLabel && <div className="text-xs opacity-50 truncate">{result.subLabel}</div>}
                                </div>
                                {index === selectedIndex && (
                                    <div className="text-xs opacity-50 flex items-center font-mono">
                                        Jump <span className="ml-2 text-xs border border-current px-1 rounded">↵</span>
                                    </div>
                                )}
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className="p-12 text-center opacity-50 text-sm">
                        {query ? 'No matching results.' : 'Type to search across your entire novel...'}
                    </div>
                )}
                
                <div className="px-4 py-2 border-t text-[10px] opacity-40 flex justify-end gap-4 bg-black/10" style={{ borderColor: settings.toolbarInputBorderColor }}>
                    <span><strong className="font-mono">↑↓</strong> to navigate</span>
                    <span><strong className="font-mono">↵</strong> to select</span>
                </div>
            </div>
        </div>
    );
};