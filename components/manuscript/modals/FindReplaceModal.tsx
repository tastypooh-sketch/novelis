
import React, { useState, useEffect, useRef } from 'react';
import { useDialog } from '../../common/DialogProvider';
import type { EditorSettings, IChapter, SearchResult } from '../../../types';
import { generateId } from '../../../utils/common';
import { ChevronDownIcon, ChevronUpIcon, SearchIcon, XIcon, CheckCircleIcon } from '../../common/Icons';

interface FindReplaceModalProps {
    onClose: () => void;
    chapters: IChapter[];
    activeChapterId: string;
    onNavigateMatch: (result: SearchResult) => void;
    onReplace: (result: SearchResult, newText: string) => void;
    onReplaceAll: (find: string, replace: string, scope: 'chapter' | 'manuscript') => void;
    settings: EditorSettings;
}

export const FindReplaceModal: React.FC<FindReplaceModalProps> = ({ 
    onClose, chapters, activeChapterId, onNavigateMatch, onReplace, onReplaceAll, settings 
}) => {
    const dialog = useDialog();
    const [scope, setScope] = useState<'chapter' | 'manuscript'>('chapter');
    const [findText, setFindText] = useState('');
    const [replaceText, setReplaceText] = useState('');
    const [caseSensitive, setCaseSensitive] = useState(false);
    const [results, setResults] = useState<SearchResult[]>([]);
    const [selectedResultId, setSelectedResultId] = useState<string | null>(null);
    const [isSearching, setIsSearching] = useState(false);

    // Draggable State
    const [position, setPosition] = useState({ x: window.innerWidth - 340, y: 80 });
    const [isDragging, setIsDragging] = useState(false);
    const dragOffset = useRef({ x: 0, y: 0 });
    const panelRef = useRef<HTMLDivElement>(null);

    // --- Search Logic ---
    const performSearch = () => {
        if (!findText) {
            setResults([]);
            return;
        }

        setIsSearching(true);
        const newResults: SearchResult[] = [];
        const flags = caseSensitive ? 'g' : 'gi';
        
        try {
            // Escape regex characters
            const escapedFind = findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(escapedFind, flags);

            const chaptersToSearch = scope === 'chapter' 
                ? chapters.filter(c => c.id === activeChapterId)
                : chapters.sort((a,b) => a.chapterNumber - b.chapterNumber);

            chaptersToSearch.forEach(chapter => {
                // Parse HTML to text for indexing
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = chapter.content;
                const textContent = tempDiv.innerText; // Use innerText for visual indices
                
                let match;
                while ((match = regex.exec(textContent)) !== null) {
                    const index = match.index;
                    const length = match[0].length;
                    
                    // Generate context
                    const start = Math.max(0, index - 20);
                    const end = Math.min(textContent.length, index + length + 20);
                    let context = textContent.substring(start, end);
                    if(start > 0) context = "..." + context;
                    if(end < textContent.length) context = context + "...";

                    newResults.push({
                        id: generateId(),
                        chapterId: chapter.id,
                        chapterName: `${chapter.chapterNumber}. ${chapter.title}`,
                        index: index,
                        length: length,
                        context: context
                    });
                }
            });

            setResults(newResults);
            if (newResults.length > 0) {
                // Auto-select first if none selected
                if (!selectedResultId) {
                    setSelectedResultId(newResults[0].id);
                    onNavigateMatch(newResults[0]);
                }
            } else {
                setSelectedResultId(null);
            }
        } catch (e) {
            console.error("Search failed", e);
        } finally {
            setIsSearching(false);
        }
    };

    // Auto-search on enter or delay
    useEffect(() => {
        const timer = setTimeout(() => {
            if(findText) performSearch();
        }, 600);
        return () => clearTimeout(timer);
    }, [findText, scope, caseSensitive]);

    const handleResultClick = (result: SearchResult) => {
        setSelectedResultId(result.id);
        onNavigateMatch(result);
    };

    const handleReplaceCurrent = () => {
        const currentResult = results.find(r => r.id === selectedResultId);
        if (currentResult) {
            onReplace(currentResult, replaceText);
            // Re-run search after short delay to update indices
            setTimeout(performSearch, 100);
        }
    };

    const handleReplaceAllClick = async () => {
        if(await dialog.confirm(`Replace all occurrences of "${findText}" with "${replaceText}" in ${scope === 'chapter' ? 'current chapter' : 'entire manuscript'}?`, "Replace All")){
            onReplaceAll(findText, replaceText, scope);
            setTimeout(performSearch, 500);
        }
    }

    // --- Drag Logic ---
    const handleMouseDown = (e: React.MouseEvent) => {
        if (panelRef.current && (e.target as HTMLElement).closest('.drag-handle')) {
            setIsDragging(true);
            const rect = panelRef.current.getBoundingClientRect();
            dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        }
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDragging) {
                const newX = e.clientX - dragOffset.current.x;
                const newY = e.clientY - dragOffset.current.y;
                setPosition({ x: newX, y: newY });
            }
        };
        const handleMouseUp = () => setIsDragging(false);

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging]);

    // Keyboard Nav
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'F3' || (e.ctrlKey && e.key === 'g') || (e.metaKey && e.key === 'g')) {
                e.preventDefault();
                // Next match
                const idx = results.findIndex(r => r.id === selectedResultId);
                const next = results[idx + 1] || results[0];
                if (next) handleResultClick(next);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [results, selectedResultId]);


    return (
        <div 
            ref={panelRef}
            className="fixed z-[100] w-80 rounded-lg shadow-2xl flex flex-col border overflow-hidden"
            style={{ 
                top: position.y, 
                left: position.x,
                backgroundColor: settings.toolbarBg, 
                color: settings.toolbarText,
                borderColor: settings.toolbarInputBorderColor,
                maxHeight: '80vh'
            }}
            onMouseDown={handleMouseDown}
        >
            {/* Header */}
            <div className="flex justify-between items-center p-3 border-b drag-handle cursor-move select-none" style={{ borderColor: settings.toolbarInputBorderColor, backgroundColor: settings.toolbarButtonBg }}>
                <h3 className="font-bold text-sm flex items-center gap-2">
                    <SearchIcon className="h-4 w-4"/> Find & Replace
                </h3>
                <button onClick={onClose} className="p-1 rounded hover:bg-black/10"><XIcon /></button>
            </div>

            {/* Controls */}
            <div className="p-3 space-y-3 flex-shrink-0" style={{ backgroundColor: settings.backgroundColor }}>
                <div className="flex p-1 rounded bg-black/10">
                    <button 
                        onClick={() => { setScope('chapter'); performSearch(); }}
                        className={`flex-1 text-xs py-1 rounded ${scope === 'chapter' ? 'shadow-sm' : 'opacity-50'}`}
                        style={{ backgroundColor: scope === 'chapter' ? settings.toolbarButtonBg : 'transparent' }}
                    >
                        Current Chapter
                    </button>
                    <button 
                        onClick={() => { setScope('manuscript'); performSearch(); }}
                        className={`flex-1 text-xs py-1 rounded ${scope === 'manuscript' ? 'shadow-sm' : 'opacity-50'}`}
                        style={{ backgroundColor: scope === 'manuscript' ? settings.toolbarButtonBg : 'transparent' }}
                    >
                        Manuscript
                    </button>
                </div>

                <div className="space-y-2">
                    <input 
                        value={findText} 
                        onChange={e => setFindText(e.target.value)}
                        placeholder="Find..."
                        className="w-full p-2 rounded text-sm border bg-transparent"
                        style={{ borderColor: settings.toolbarInputBorderColor, color: settings.textColor }}
                        autoFocus
                    />
                    <input 
                        value={replaceText} 
                        onChange={e => setReplaceText(e.target.value)}
                        placeholder="Replace..."
                        className="w-full p-2 rounded text-sm border bg-transparent"
                        style={{ borderColor: settings.toolbarInputBorderColor, color: settings.textColor }}
                    />
                </div>

                <div className="flex justify-between items-center">
                    <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
                        <input type="checkbox" checked={caseSensitive} onChange={e => setCaseSensitive(e.target.checked)} className="rounded text-blue-500" />
                        Match Case
                    </label>
                    <div className="flex gap-2">
                        <button onClick={performSearch} className="px-3 py-1 text-xs rounded border hover:bg-white/5" style={{borderColor: settings.toolbarInputBorderColor}}>Find All</button>
                    </div>
                </div>
                
                <div className="flex gap-2 pt-2 border-t" style={{borderColor: settings.toolbarInputBorderColor}}>
                    <button 
                        onClick={handleReplaceCurrent} 
                        disabled={!selectedResultId}
                        className="flex-1 py-1.5 text-xs rounded border hover:bg-white/5 disabled:opacity-50"
                        style={{borderColor: settings.toolbarInputBorderColor}}
                    >
                        Replace
                    </button>
                    <button 
                        onClick={handleReplaceAllClick} 
                        disabled={results.length === 0}
                        className="flex-1 py-1.5 text-xs rounded font-bold hover:opacity-90 disabled:opacity-50"
                        style={{backgroundColor: settings.accentColor, color: 'var(--app-text)'}}
                    >
                        Replace All
                    </button>
                </div>
            </div>

            {/* Results List */}
            <div className="flex-grow overflow-y-auto min-h-[150px] border-t" style={{ borderColor: settings.toolbarInputBorderColor, backgroundColor: settings.toolbarBg }}>
                <div className="p-2">
                    <div className="text-xs opacity-50 mb-2 px-2">{results.length} result{results.length !== 1 ? 's' : ''}</div>
                    {results.map((result, idx) => (
                        <div 
                            key={result.id}
                            onClick={() => handleResultClick(result)}
                            className={`p-2 rounded cursor-pointer mb-1 text-sm border border-transparent ${selectedResultId === result.id ? 'ring-1' : 'hover:bg-black/5'}`}
                            style={{ 
                                backgroundColor: selectedResultId === result.id ? settings.toolbarButtonBg : 'transparent',
                                // FIX: 'ringColor' is not a standard CSS property. Using '--tw-ring-color' as a custom property cast to any.
                                ['--tw-ring-color' as any]: settings.accentColor
                            }}
                        >
                            {scope === 'manuscript' && (
                                <div className="text-[10px] opacity-60 font-bold mb-0.5 uppercase tracking-wider">{result.chapterName}</div>
                            )}
                            <div className="line-clamp-2 leading-snug opacity-90" dangerouslySetInnerHTML={{
                                __html: result.context.replace(findText, `<span style="background-color:${settings.accentColor}40; font-weight:bold; color:${settings.textColor}">${findText}</span>`)
                            }} />
                        </div>
                    ))}
                    {results.length === 0 && !isSearching && (
                        <div className="text-center p-8 text-xs opacity-50">No matches found.</div>
                    )}
                </div>
            </div>
        </div>
    );
};
