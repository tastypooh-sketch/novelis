
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import type { ISnippet, ICharacter, IChapter, EditorSettings } from '../../types';
import { useNovelDispatch } from '../../NovelContext';
import { XIcon, PlusIcon, MinusIcon, TrashIconOutline, ViewListIcon, CheckCircleIcon, UserCircleIcon, PaperAirplaneIcon, ClipboardIcon, SparklesIconOutline, SpinnerIcon } from '../common/Icons';
import AutosizeTextarea from '../common/AutosizeTextarea';
import { harmonizeColor, isColorLight } from '../../utils/colorUtils';
import { AIError } from '../common/AIError';

interface SnippetSpreadsheetProps {
    snippets: ISnippet[];
    characters: ICharacter[];
    chapters: IChapter[];
    settings: EditorSettings;
    onSuggestPlacement: (snippet: ISnippet, chapters: IChapter[]) => Promise<any[] | string>;
}

export const SnippetSpreadsheet: React.FC<SnippetSpreadsheetProps> = ({ 
    snippets, 
    characters, 
    chapters,
    settings,
    onSuggestPlacement
}) => {
    const dispatch = useNovelDispatch();
    const [fontSize, setFontSize] = useState(11);
    const [wrapText, setWrapText] = useState(true);
    const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());
    const [showColumnSelector, setShowColumnSelector] = useState(false);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    
    const [activeCharacterSelector, setActiveCharacterSelector] = useState<string | null>(null);
    const [suggestingId, setSuggestingId] = useState<string | null>(null);
    const [suggestionsMap, setSuggestionsMap] = useState<Record<string, any[]>>({});
    const [suggestionErrorMap, setSuggestionErrorMap] = useState<Record<string, string>>({});
    
    const tableHeaderBg = settings.toolbarBg || '#1f2937';
    const tableHeaderColor = settings.toolbarText || '#ffffff';
    const borderColor = settings.toolbarInputBorderColor || 'rgba(255,255,255,0.1)';

    const allColumns = [
        { key: 'status', label: 'Used', width: '60px' },
        { key: 'text', label: 'Snippet Text', width: 'auto' },
        { key: 'type', label: 'Type', width: '150px' },
        { key: 'characters', label: 'Characters', width: '200px' },
        { key: 'actions', label: 'Actions', width: '150px' },
    ];

    const visibleColumns = useMemo(() => 
        allColumns.filter(col => !hiddenColumns.has(col.key)),
    [hiddenColumns, allColumns]);

    const handleUpdate = (id: string, updates: Partial<ISnippet>) => {
        dispatch({ type: 'UPDATE_SNIPPET', payload: { id, updates } });
    };

    const handleDelete = (id: string) => {
        if (confirmDeleteId === id) {
            dispatch({ type: 'DELETE_SNIPPET', payload: id });
            setConfirmDeleteId(null);
        } else {
            setConfirmDeleteId(id);
            setTimeout(() => setConfirmDeleteId(prev => prev === id ? null : prev), 3000);
        }
    };

    const handleCopyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    const handleSuggest = async (snippet: ISnippet) => {
        setSuggestingId(snippet.id);
        setSuggestionErrorMap(prev => {
            const next = { ...prev };
            delete next[snippet.id];
            return next;
        });
        
        const result = await onSuggestPlacement(snippet, chapters);
        if (typeof result === 'string') {
            setSuggestionErrorMap(prev => ({ ...prev, [snippet.id]: result }));
        } else {
            setSuggestionsMap(prev => ({ ...prev, [snippet.id]: result }));
        }
        setSuggestingId(null);
    };

    const handleSendToChapter = (snippetId: string, chapterId: string) => {
        const targetChapter = chapters.find(c => c.id === chapterId);
        if (!targetChapter) return;

        const updatedLinkedIds = [...(targetChapter.linkedSnippetIds || []), snippetId];
        dispatch({ type: 'UPDATE_CHAPTER', payload: { id: chapterId, updates: { linkedSnippetIds: updatedLinkedIds } } });
        dispatch({ type: 'UPDATE_SNIPPET', payload: { id: snippetId, updates: { isUsed: true } } });
        
        // Remove suggestions after sending
        setSuggestionsMap(prev => {
            const next = { ...prev };
            delete next[snippetId];
            return next;
        });
    };

    const toggleColumn = (key: string) => {
        const newHidden = new Set(hiddenColumns);
        if (newHidden.has(key)) {
            newHidden.delete(key);
        } else {
            if (allColumns.length - newHidden.size > 1) {
                newHidden.add(key);
            }
        }
        setHiddenColumns(newHidden);
    };

    const snippetTypes: ISnippet['type'][] = ['Dialogue', 'Narrative Description', 'Internal Monologue', 'Theme Statement', 'General Action', 'World-Building Note', 'Uncategorized'];

    return (
        <div className="w-full h-full flex flex-col overflow-hidden relative" style={{ backgroundColor: `${settings.toolbarButtonBg}20`, color: settings.textColor }}>
            {/* Controls */}
            <div className="flex-shrink-0 p-2 border-b flex items-center justify-between gap-4" style={{ borderColor }}>
                <div className="flex items-center gap-4">
                    <h3 className="text-xs font-bold uppercase tracking-widest opacity-60">Snippet Spreadsheet</h3>
                    
                    <div className="flex items-center gap-2 border-l pl-4" style={{ borderColor }}>
                        <button 
                            onClick={() => setFontSize(s => Math.max(8, s - 1))}
                            className="p-1 rounded hover:bg-black/10 transition-colors"
                            title="Shrink Text"
                        >
                            <MinusIcon className="w-3 h-3" />
                        </button>
                        <span className="text-[10px] font-mono w-4 text-center">{fontSize}</span>
                        <button 
                            onClick={() => setFontSize(s => Math.min(24, s + 1))}
                            className="p-1 rounded hover:bg-black/10 transition-colors"
                            title="Grow Text"
                        >
                            <PlusIcon className="w-3 h-3" />
                        </button>
                    </div>

                    <button 
                        onClick={() => setWrapText(!wrapText)}
                        className={`flex items-center gap-2 p-1.5 px-3 rounded text-[10px] uppercase font-bold tracking-wider transition-all border ${wrapText ? 'bg-black/20' : 'hover:bg-black/10'}`}
                        style={{ borderColor, color: settings.textColor }}
                    >
                        Wrap Text
                    </button>

                    <div className="relative">
                        <button 
                            onClick={() => setShowColumnSelector(!showColumnSelector)}
                            className={`flex items-center gap-2 p-1.5 px-3 rounded text-[10px] uppercase font-bold tracking-wider transition-all border ${showColumnSelector ? 'bg-black/20' : 'hover:bg-black/10'}`}
                            style={{ borderColor, color: settings.textColor }}
                        >
                            <ViewListIcon className="w-3.5 h-3.5" />
                            Columns
                        </button>

                        <AnimatePresence>
                            {showColumnSelector && (
                                <>
                                    <div className="fixed inset-0 z-50" onClick={() => setShowColumnSelector(false)} />
                                    <motion.div 
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        className="absolute top-full left-0 mt-2 w-64 max-h-[70vh] overflow-y-auto z-[60] rounded-xl shadow-2xl border backdrop-blur-md p-2 flex flex-col gap-1"
                                        style={{ backgroundColor: tableHeaderBg, borderColor, color: tableHeaderColor }}
                                    >
                                        {allColumns.map(col => (
                                            <button
                                                key={col.key}
                                                onClick={() => toggleColumn(col.key)}
                                                className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-white/10 transition-colors text-left"
                                            >
                                                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${!hiddenColumns.has(col.key) ? 'bg-accent border-transparent' : 'border-white/20'}`} style={{ backgroundColor: !hiddenColumns.has(col.key) ? settings.accentColor : 'transparent' }}>
                                                    {!hiddenColumns.has(col.key) && <CheckCircleIcon className="w-3 h-3 text-white" />}
                                                </div>
                                                <span className="text-xs font-medium">{col.label}</span>
                                            </button>
                                        ))}
                                    </motion.div>
                                </>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            {/* Table Area */}
            <div className="flex-grow overflow-auto">
                <table className="border-collapse table-fixed min-w-max w-full" style={{ fontSize: `${fontSize}px` }}>
                    <thead className="sticky top-0 z-40">
                        <tr style={{ backgroundColor: tableHeaderBg, color: tableHeaderColor }}>
                            {visibleColumns.map(col => (
                                <th 
                                    key={col.key} 
                                    className="p-2 border font-bold text-left uppercase tracking-wider"
                                    style={{ width: col.width, borderColor }}
                                >
                                    {col.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {snippets.map((snippet) => (
                            <tr key={snippet.id} className="hover:bg-black/5 transition-colors group/row">
                                {visibleColumns.map(col => {
                                    if (col.key === 'status') {
                                        return (
                                            <td key={col.key} className="p-2 border text-center align-middle" style={{ borderColor }}>
                                                <input 
                                                    type="checkbox" 
                                                    checked={snippet.isUsed} 
                                                    onChange={(e) => handleUpdate(snippet.id, { isUsed: e.target.checked })}
                                                    className="h-4 w-4 rounded cursor-pointer"
                                                    style={{ accentColor: settings.accentColor }}
                                                />
                                            </td>
                                        );
                                    }

                                    if (col.key === 'text') {
                                        const suggestions = suggestionsMap[snippet.id];
                                        const error = suggestionErrorMap[snippet.id];
                                        const confidenceColors: Record<string, string> = { High: 'text-green-400', Medium: 'text-yellow-400', Low: 'text-orange-400' };

                                        return (
                                            <td key={col.key} className="p-0 border align-top text-left" style={{ borderColor }}>
                                                {wrapText ? (
                                                    <AutosizeTextarea 
                                                        value={snippet.cleanedText} 
                                                        onChange={(e) => handleUpdate(snippet.id, { cleanedText: e.target.value })}
                                                        className="bg-transparent border-none focus:ring-0 p-2 w-full outline-none block whitespace-normal resize-none"
                                                        style={{ color: settings.textColor, fontSize: `${fontSize}px` }}
                                                    />
                                                ) : (
                                                    <textarea 
                                                        value={snippet.cleanedText} 
                                                        onChange={(e) => handleUpdate(snippet.id, { cleanedText: e.target.value })}
                                                        className="bg-transparent border-none focus:ring-0 p-2 w-full h-[32px] outline-none block overflow-hidden whitespace-nowrap resize-none"
                                                        style={{ color: settings.textColor, fontSize: `${fontSize}px` }}
                                                    />
                                                )}
                                                
                                                {/* Suggestions Area */}
                                                <AnimatePresence>
                                                    {suggestions && (
                                                        <motion.div 
                                                            initial={{ height: 0, opacity: 0 }}
                                                            animate={{ height: 'auto', opacity: 1 }}
                                                            exit={{ height: 0, opacity: 0 }}
                                                            className="px-2 pb-2 overflow-hidden"
                                                        >
                                                            <div className="border-t pt-2 mt-1 space-y-2" style={{ borderColor: `${settings.toolbarInputBorderColor}40` }}>
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-[10px] font-bold uppercase tracking-wider opacity-50">Placement Suggestions</span>
                                                                    <button onClick={() => setSuggestionsMap(prev => { const n = {...prev}; delete n[snippet.id]; return n; })} className="opacity-50 hover:opacity-100"><XIcon className="w-3 h-3"/></button>
                                                                </div>
                                                                <div className="grid grid-cols-1 gap-1">
                                                                    {suggestions.map(s => {
                                                                        const chapter = chapters.find(c => c.id === s.chapterId);
                                                                        if (!chapter) return null;
                                                                        return (
                                                                            <div key={s.chapterId} className="p-1.5 rounded bg-black/20 flex items-center justify-between gap-2 border border-white/5">
                                                                                <div className="flex-grow">
                                                                                    <div className="flex items-center gap-2">
                                                                                        <span className="text-[10px] font-bold">Ch {chapter.chapterNumber}</span>
                                                                                        <span className={`text-[9px] font-bold px-1 rounded bg-black/40 ${confidenceColors[s.confidence] || 'text-white'}`}>{s.confidence}</span>
                                                                                    </div>
                                                                                    <p className="text-[9px] italic opacity-70 line-clamp-1">{s.justification}</p>
                                                                                </div>
                                                                                <button 
                                                                                    onClick={() => handleSendToChapter(snippet.id, s.chapterId)}
                                                                                    className="px-2 py-1 rounded text-[9px] font-bold flex items-center gap-1 transition-all active:scale-95"
                                                                                    style={{ backgroundColor: settings.accentColor, color: 'var(--app-text)' }}
                                                                                >
                                                                                    <PaperAirplaneIcon className="w-3 h-3" />
                                                                                    Send
                                                                                </button>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                                {error && <div className="px-2 pb-2"><AIError message={error} onDismiss={() => setSuggestionErrorMap(prev => { const n = {...prev}; delete n[snippet.id]; return n; })} /></div>}
                                            </td>
                                        );
                                    }

                                    if (col.key === 'type') {
                                        return (
                                            <td key={col.key} className="p-2 border align-top" style={{ borderColor }}>
                                                <select 
                                                    value={snippet.type} 
                                                    onChange={(e) => handleUpdate(snippet.id, { type: e.target.value as ISnippet['type'] })}
                                                    className="bg-transparent border-none focus:ring-0 p-0 w-full outline-none"
                                                    style={{ color: settings.textColor, fontSize: `${fontSize}px` }}
                                                >
                                                    {snippetTypes.map(t => <option key={t} value={t} className="bg-gray-800 text-white">{t}</option>)}
                                                </select>
                                            </td>
                                        );
                                    }

                                    if (col.key === 'characters') {
                                        const isDarkMode = !isColorLight(settings.textColor);
                                        const selectedCharacters = characters.filter(c => snippet.characterIds.includes(c.id));
                                        
                                        return (
                                            <td key={col.key} className="p-2 border align-top relative" style={{ borderColor }}>
                                                <div className={`flex flex-wrap gap-1 items-center min-h-[24px] ${!wrapText ? 'max-h-[32px] overflow-hidden flex-nowrap' : ''}`}>
                                                    {selectedCharacters.map(char => {
                                                        const charColor = char.imageColor ? harmonizeColor(char.imageColor, settings.backgroundColor, isDarkMode) : settings.accentColor;
                                                        return (
                                                            <div
                                                                key={char.id}
                                                                className="flex items-center gap-1 pl-1 pr-1 py-0.5 rounded-full text-[9px] border"
                                                                style={{ 
                                                                    backgroundColor: `${charColor}20`,
                                                                    borderColor: charColor,
                                                                    color: settings.textColor
                                                                }}
                                                            >
                                                                <div className="h-3 w-3 rounded-full bg-cover bg-center" style={{ backgroundImage: char.photo ? `url(${char.photo})` : undefined, backgroundColor: charColor }}>
                                                                    {!char.photo && <UserCircleIcon className="h-full w-full opacity-50" />}
                                                                </div>
                                                                <span className="truncate max-w-[60px]">{char.name}</span>
                                                                <button 
                                                                    onClick={() => {
                                                                        const newIds = snippet.characterIds.filter(id => id !== char.id);
                                                                        handleUpdate(snippet.id, { characterIds: newIds });
                                                                    }}
                                                                    className="btn-nuanced h-auto p-0 opacity-40 hover:text-red-500"
                                                                >
                                                                    <XIcon className="w-2.5 h-2.5" />
                                                                </button>
                                                            </div>
                                                        );
                                                    })}
                                                    <button 
                                                        onClick={() => setActiveCharacterSelector(activeCharacterSelector === snippet.id ? null : snippet.id)}
                                                        className="btn-nuanced h-5 w-5 rounded-full border border-dashed border-current opacity-40 hover:opacity-100"
                                                    >
                                                        <PlusIcon className="w-3 h-3" />
                                                    </button>
                                                </div>

                                                <AnimatePresence>
                                                    {activeCharacterSelector === snippet.id && (
                                                        <>
                                                            <div className="fixed inset-0 z-[100]" onClick={() => setActiveCharacterSelector(null)} />
                                                            <motion.div 
                                                                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                                                exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                                                className="absolute left-0 top-full mt-1 z-[110] w-48 max-h-48 overflow-y-auto rounded-lg shadow-2xl border p-1 flex flex-col gap-1"
                                                                style={{ backgroundColor: tableHeaderBg, borderColor, color: tableHeaderColor }}
                                                            >
                                                                 <div className="flex justify-between items-center p-2 border-b border-white/10 mb-1">
                                                                     <span className="text-[10px] font-bold uppercase opacity-50">Assign to</span>
                                                                     <button onClick={() => setActiveCharacterSelector(null)} className="opacity-50 hover:opacity-100 p-0.5"><XIcon className="w-3 h-3" /></button>
                                                                 </div>
                                                                {characters.map(char => {
                                                                    const isSelected = snippet.characterIds.includes(char.id);
                                                                    return (
                                                                        <button
                                                                            key={char.id}
                                                                            onClick={() => {
                                                                                const newIds = isSelected 
                                                                                    ? snippet.characterIds.filter(id => id !== char.id)
                                                                                    : [...snippet.characterIds, char.id];
                                                                                handleUpdate(snippet.id, { characterIds: newIds });
                                                                            }}
                                                                            className="flex items-center gap-2 w-full p-1.5 rounded hover:bg-white/10 transition-colors text-left"
                                                                        >
                                                                            <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${isSelected ? 'bg-accent border-transparent' : 'border-white/20'}`} style={{ backgroundColor: isSelected ? settings.accentColor : 'transparent' }}>
                                                                                {isSelected && <CheckCircleIcon className="w-2.5 h-2.5 text-white" />}
                                                                            </div>
                                                                            <div className="h-4 w-4 rounded-full bg-cover bg-center shrink-0" style={{ backgroundImage: char.photo ? `url(${char.photo})` : undefined, backgroundColor: char.imageColor || settings.accentColor }}>
                                                                                {!char.photo && <UserCircleIcon className="h-full w-full opacity-50 text-white" />}
                                                                            </div>
                                                                            <span className="text-[10px] truncate">{char.name}</span>
                                                                        </button>
                                                                    );
                                                                })}
                                                                {characters.length === 0 && <div className="text-[10px] p-2 opacity-50">No characters found</div>}
                                                            </motion.div>
                                                        </>
                                                    )}
                                                </AnimatePresence>
                                            </td>
                                        );
                                    }

                                    if (col.key === 'actions') {
                                        const isSuggesting = suggestingId === snippet.id;
                                        return (
                                            <td key={col.key} className="p-2 border text-center align-middle" style={{ borderColor }}>
                                                <div className="flex items-center justify-center gap-1">
                                                    <button 
                                                        onClick={() => handleSuggest(snippet)}
                                                        disabled={isSuggesting}
                                                        className={`btn-nuanced-primary ${isSuggesting ? 'animate-pulse opacity-50' : ''}`}
                                                        title="Suggest Placement"
                                                    >
                                                        {isSuggesting ? <SpinnerIcon className="w-4 h-4" /> : <SparklesIconOutline className="w-4 h-4" />}
                                                    </button>
                                                    <button 
                                                        onClick={() => handleCopyToClipboard(snippet.cleanedText)}
                                                        className="btn-nuanced"
                                                        title="Copy to Clipboard"
                                                        style={{ color: settings.textColor }}
                                                    >
                                                        <ClipboardIcon className="w-4 h-4" />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDelete(snippet.id)}
                                                        className={confirmDeleteId === snippet.id ? 'btn-nuanced-lg-danger px-2 py-1 h-auto text-[8px]' : 'btn-nuanced-danger'}
                                                        title={confirmDeleteId === snippet.id ? "Click again to confirm" : "Delete Snippet"}
                                                    >
                                                        {confirmDeleteId === snippet.id ? <span className="font-bold whitespace-nowrap uppercase">Sure?</span> : <TrashIconOutline className="w-4 h-4" />}
                                                    </button>
                                                </div>
                                            </td>
                                        );
                                    }

                                    return null;
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
