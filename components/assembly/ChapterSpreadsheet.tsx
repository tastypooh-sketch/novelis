
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import type { IChapter, ICharacter, EditorSettings } from '../../types';
import { getContrastColor, shadeColor } from '../../utils/colorUtils';
import { XIcon, PlusIcon, MinusIcon, TrashIconOutline, ViewListIcon, CheckCircleIcon, BrushIcon, SpinnerIcon, SparklesIconOutline } from '../common/Icons';
import { generateId } from '../../utils/common';
import { useAssemblyAI } from './AssemblyAIContext';
import AutosizeTextarea from '../common/AutosizeTextarea';

interface ChapterSpreadsheetProps {
    chapters: IChapter[];
    characters: ICharacter[];
    settings: EditorSettings;
    onUpdate: (id: string, updates: Partial<IChapter>) => void;
    onChaptersChange: (chapters: IChapter[]) => void;
}

const columnTooltips: Record<string, string> = {
    drag: 'Drag to reorder chapters.',
    title: 'Tracks the location of the scene within the manuscript.',
    storyEvent: 'Defines what the characters are literally doing (micro-action) and the essential tactic they are employing (macro-behavior).',
    storyEventSummary: 'A brief description of the core action that occurs in the scene.',
    quadrant: 'Refers to the specific section of the story (often based on the four-part structure of a narrative).',
    convention: 'Checks that the scene satisfies the specific requirements of your chosen genre (e.g., a "hero at the mercy of the villain" moment in a thriller).',
    incitingIncident: 'These represent the structural heartbeat of a scene: the Inciting Incident, Progressive Complication, Crisis, Climax and Resolution.',
    progressiveComplication: 'These represent the structural heartbeat of a scene: the Inciting Incident, Progressive Complication, Crisis, Climax and Resolution.',
    crisis: 'These represent the structural heartbeat of a scene: the Inciting Incident, Progressive Complication, Crisis, Climax and Resolution.',
    climax: 'These represent the structural heartbeat of a scene: the Inciting Incident, Progressive Complication, Crisis, Climax and Resolution.',
    resolution: 'These represent the structural heartbeat of a scene: the Inciting Incident, Progressive Complication, Crisis, Climax and Resolution.',
    valueLevels: 'Tracks the "life value" at stake (e.g., Life vs. Death, Truth vs. Lies) and how it shifts by the end of the scene.',
    tropeSceneType: 'An abstract description of the scene\'s function, such as "Stranger Knocks at the Door" or "Friends Have Coffee," which helps identify repetitive patterns.',
    polarity: 'Notes whether the scene\'s emotional or value state is positive or negative, helping you track the "arc" of the story\'s movement.',
    turningPointCategory: 'Identifies the specific action or revelation that forces the protagonist to make a crisis decision.',
    turningPointSummary: 'Identifies the specific action or revelation that forces the protagonist to make a crisis decision.',
    pov: 'Records which character\'s perspective governs the scene.',
    periodTime: 'Tracks when the scene takes place and how long it lasts, which is vital for pacing analysis.',
    location: 'Where the scene physically occurs.',
    characters: 'Lists who is present and who is merely mentioned, along with the count of on-stage participants.',
    actions: 'Add or remove chapters.',
};

export const ChapterSpreadsheet: React.FC<ChapterSpreadsheetProps> = ({ 
    chapters, 
    characters, 
    settings, 
    onUpdate,
    onChaptersChange
}) => {
    const { onUpdateChapterFromManuscript, isGeneratingChapter } = useAssemblyAI();
    const [fontSize, setFontSize] = useState(11);
    const [wrapText, setWrapText] = useState(false);
    const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());
    const [showColumnSelector, setShowColumnSelector] = useState(false);
    const [hoveredColumn, setHoveredColumn] = useState<string | null>(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    
    const isDarkMode = settings.backgroundColor.includes('rgb(0,0,0)') || settings.backgroundColor === '#000000' || settings.backgroundColor.includes('gray-900'); // Simple check
    
    const tableHeaderBg = settings.toolbarBg || '#1f2937';
    const tableHeaderColor = settings.toolbarText || '#ffffff';
    const borderColor = settings.toolbarInputBorderColor || 'rgba(255,255,255,0.1)';

    const allColumns = [
        { key: 'drag', label: '', width: '40px' },
        { key: 'title', label: 'Chapter & Title', width: '200px' },
        { key: 'storyEvent', label: 'Story Event (Micro/Macro)', width: '250px' },
        { key: 'storyEventSummary', label: 'Story Event Summary', width: '300px' },
        { key: 'quadrant', label: 'Quadrant', width: '100px' },
        { key: 'convention', label: 'Convention & Obligatory', width: '250px' },
        { key: 'incitingIncident', label: 'Inciting Incident', width: '200px' },
        { key: 'progressiveComplication', label: 'Prog. Complication', width: '200px' },
        { key: 'crisis', label: 'Crisis', width: '200px' },
        { key: 'climax', label: 'Climax', width: '200px' },
        { key: 'resolution', label: 'Resolution', width: '200px' },
        { key: 'valueLevels', label: 'Value Levels', width: '150px' },
        { key: 'tropeSceneType', label: 'Trope Scene Type', width: '180px' },
        { key: 'polarity', label: 'Polarity (B/E)', width: '120px' },
        { key: 'turningPointCategory', label: 'Turning Point Cat.', width: '150px' },
        { key: 'turningPointSummary', label: 'Turning Point Summary', width: '250px' },
        { key: 'pov', label: 'POV', width: '120px' },
        { key: 'periodTime', label: 'Time & Duration', width: '150px' },
        { key: 'location', label: 'Location', width: '150px' },
        { key: 'characters', label: 'Characters', width: '200px' },
        { key: 'actions', label: 'Actions', width: '100px' },
    ];

    const visibleColumns = useMemo(() => 
        allColumns.filter(col => !hiddenColumns.has(col.key)),
    [hiddenColumns, allColumns]);

    const handleInputChange = (id: string, key: string, value: string) => {
        onUpdate(id, { [key]: value });
    };

    const toggleColumn = (key: string) => {
        const newHidden = new Set(hiddenColumns);
        if (newHidden.has(key)) {
            newHidden.delete(key);
        } else {
            if (allColumns.length - newHidden.size > 1) { // Keep at least one column
                newHidden.add(key);
            }
        }
        setHiddenColumns(newHidden);
    };

    const handleReorder = (newChapters: IChapter[]) => {
        onChaptersChange(newChapters);
    };

    const handleAddChapter = (index: number) => {
        const newChapter: IChapter = {
            id: generateId(),
            title: 'New Chapter',
            chapterNumber: index + 1,
            content: '<div><br></div>',
            notes: '',
            rawNotes: '',
            summary: '',
            outline: '',
            analysis: '',
            wordCount: 0,
            characterIds: [],
            act: 1,
            tagline: '',
            keywords: [],
            location: '',
            storyEvent: '',
            storyEventSummary: '',
            quadrant: '',
            convention: '',
            incitingIncident: '',
            progressiveComplication: '',
            crisis: '',
            climax: '',
            resolution: '',
            valueLevels: '',
            tropeSceneType: '',
            polarity: '',
            turningPointCategory: '',
            turningPointSummary: '',
            pov: '',
            periodTime: '',
            duration: '',
        };
        const newChapters = [...chapters];
        newChapters.splice(index, 0, newChapter);
        onChaptersChange(newChapters);
    };

    const handleDeleteChapter = (id: string) => {
        if (chapters.length <= 1) return;
        if (confirmDeleteId === id) {
            const newChapters = chapters.filter(ch => ch.id !== id);
            onChaptersChange(newChapters);
            setConfirmDeleteId(null);
        } else {
            setConfirmDeleteId(id);
            // Reset after 3 seconds if not confirmed
            setTimeout(() => setConfirmDeleteId(prev => prev === id ? null : prev), 3000);
        }
    };

    return (
        <div className="w-full h-full flex flex-col overflow-hidden relative" style={{ backgroundColor: settings.backgroundColor, color: settings.textColor }}>
            {/* Controls */}
            <div className="flex-shrink-0 p-2 border-b flex items-center justify-between gap-4" style={{ borderColor }}>
                <div className="flex items-center gap-4">
                    <h3 className="text-xs font-bold uppercase tracking-widest opacity-60">Story Architecture Spreadsheet</h3>
                    
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
                        title="Toggle Text Wrapping"
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
                                        <div className="px-3 py-2 border-b mb-1 flex items-center justify-between" style={{ borderColor }}>
                                            <span className="text-[10px] font-bold uppercase opacity-60">Display Columns</span>
                                            <button 
                                                onClick={() => setHiddenColumns(new Set())}
                                                className="text-[9px] hover:underline opacity-60"
                                            >
                                                Show All
                                            </button>
                                        </div>
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

                    <button 
                        onClick={async () => {
                            for (const chapter of chapters) {
                                const updates = await onUpdateChapterFromManuscript(chapter);
                                if (updates) onUpdate(chapter.id, updates);
                            }
                        }}
                        className="flex items-center gap-2 p-1.5 px-3 rounded text-[10px] uppercase font-bold tracking-wider transition-all border hover:bg-black/10"
                        style={{ borderColor, color: settings.textColor }}
                        title="Sync all chapters with the manuscript"
                    >
                        <SparklesIconOutline className="w-3.5 h-3.5" />
                        Sync All
                    </button>
                </div>
                <div className="text-[10px] opacity-40 italic">
                    The most efficient chapter outline for long books.
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
                                    className="p-2 border font-bold text-left uppercase tracking-wider overflow-visible relative group"
                                    style={{ width: col.width, borderColor }}
                                    onMouseEnter={() => setHoveredColumn(col.key)}
                                    onMouseLeave={() => setHoveredColumn(null)}
                                >
                                    <div className="truncate">{col.label}</div>
                                    
                                    {/* Tooltip */}
                                    <AnimatePresence>
                                        {hoveredColumn === col.key && columnTooltips[col.key] && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 5 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: 5 }}
                                                className="absolute top-full left-0 mt-1 w-64 p-3 rounded-lg shadow-xl z-50 pointer-events-none text-[10px] font-normal leading-relaxed tracking-normal lowercase first-letter:uppercase normal-case"
                                                style={{ backgroundColor: tableHeaderBg, color: tableHeaderColor, border: `1px solid ${borderColor}` }}
                                            >
                                                {columnTooltips[col.key]}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <Reorder.Group axis="y" values={chapters} onReorder={handleReorder} as="tbody" className="border-collapse">
                        {chapters.map((chapter, index) => (
                            <Reorder.Item 
                                key={chapter.id} 
                                value={chapter} 
                                as="tr"
                                className="hover:bg-black/5 transition-colors group/row"
                            >
                                {visibleColumns.map(col => {
                                    if (col.key === 'drag') {
                                        return (
                                            <td key={col.key} className="p-0 border text-center cursor-grab active:cursor-grabbing align-top" style={{ borderColor }}>
                                                <div className="flex items-center justify-center h-[32px] opacity-30 group-hover/row:opacity-100">
                                                    <ViewListIcon className="w-4 h-4 rotate-90" />
                                                </div>
                                            </td>
                                        );
                                    }

                                    if (col.key === 'title') {
                                        return (
                                            <td 
                                                key={col.key} 
                                                className="p-0 border align-top text-left" 
                                                style={{ borderColor }}
                                                title={!wrapText ? (chapter.chapterNumber || index + 1) + '. ' + chapter.title : undefined}
                                            >
                                                <div className="flex items-start gap-2 p-1 px-2 h-full">
                                                    <span className="font-bold opacity-30 mt-1">{chapter.chapterNumber || index + 1}.</span>
                                                    {wrapText ? (
                                                        <AutosizeTextarea 
                                                            value={chapter.title} 
                                                            onChange={(e) => handleInputChange(chapter.id, 'title', e.target.value)}
                                                            className="bg-transparent border-none focus:ring-0 p-0 w-full font-bold outline-none resize-none"
                                                            style={{ color: settings.textColor, fontSize: `${fontSize}px` }}
                                                        />
                                                    ) : (
                                                        <input 
                                                            value={chapter.title} 
                                                            onChange={(e) => handleInputChange(chapter.id, 'title', e.target.value)}
                                                            className="bg-transparent border-none focus:ring-0 p-0 w-full font-bold outline-none truncate h-[32px]"
                                                            style={{ color: settings.textColor, fontSize: `${fontSize}px` }}
                                                        />
                                                    )}
                                                </div>
                                            </td>
                                        );
                                    }

                                    if (col.key === 'characters') {
                                        return (
                                            <td 
                                                key={col.key} 
                                                className="p-0 border overflow-hidden align-top text-left" 
                                                style={{ borderColor }}
                                                title={!wrapText ? (chapter.characterIds || []).map(cid => characters.find(c => c.id === cid)?.name).filter(Boolean).join(', ') || 'None' : undefined}
                                            >
                                                <div className={`flex flex-wrap gap-1 p-2 ${!wrapText ? 'max-h-[32px] overflow-hidden flex-nowrap' : ''}`}>
                                                    {(chapter.characterIds || []).map(cid => {
                                                        const char = characters.find(c => c.id === cid);
                                                        return char ? (
                                                            <span key={cid} className="px-1 py-0.5 rounded bg-black/20 text-[9px] whitespace-nowrap" style={{ color: settings.textColor }}>
                                                                {char.name}
                                                            </span>
                                                        ) : null;
                                                    })}
                                                    {(chapter.characterIds || []).length === 0 && <span className="opacity-30">None</span>}
                                                </div>
                                            </td>
                                        );
                                    }

                                     if (col.key === 'actions') {
                                        const isSyncing = isGeneratingChapter === chapter.id;
                                        return (
                                            <td key={col.key} className="p-0 border align-top" style={{ borderColor }}>
                                                <div className="flex items-center justify-center gap-2 h-[32px] opacity-0 group-hover/row:opacity-100 transition-opacity">
                                                    <button 
                                                        onClick={async () => {
                                                            const updates = await onUpdateChapterFromManuscript(chapter);
                                                            if (updates) onUpdate(chapter.id, updates);
                                                        }}
                                                        disabled={isSyncing}
                                                        className={`p-1 rounded transition-colors ${isSyncing ? 'animate-spin' : 'hover:bg-blue-500/20 text-blue-500'}`}
                                                        title="Sync with Manuscript"
                                                    >
                                                        {isSyncing ? <SpinnerIcon className="w-3.5 h-3.5" /> : <BrushIcon className="w-3.5 h-3.5" />}
                                                    </button>
                                                    <button 
                                                        onClick={() => handleAddChapter(index + 1)}
                                                        className="p-1 rounded hover:bg-green-500/20 text-green-500 transition-colors"
                                                        title="Insert chapter below"
                                                    >
                                                        <PlusIcon className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDeleteChapter(chapter.id)}
                                                        className={`p-1 rounded transition-colors ${confirmDeleteId === chapter.id ? 'bg-red-600 text-white' : 'hover:bg-red-500/20 text-red-500'}`}
                                                        title={confirmDeleteId === chapter.id ? "Confirm Delete" : "Delete chapter"}
                                                    >
                                                        {confirmDeleteId === chapter.id ? <span className="text-[8px] font-bold px-1 whitespace-nowrap">SURE?</span> : <TrashIconOutline className="w-3.5 h-3.5" />}
                                                    </button>
                                                </div>
                                            </td>
                                        );
                                    }

                                    const isTextArea = [
                                        'storyEvent', 'storyEventSummary', 'convention', 'incitingIncident', 
                                        'progressiveComplication', 'crisis', 'climax', 'resolution', 
                                        'valueLevels', 'tropeSceneType', 'turningPointSummary'
                                    ].includes(col.key);

                                    if (isTextArea) {
                                        const cellValue = (chapter as any)[col.key] || '';
                                        return (
                                            <td 
                                                key={col.key} 
                                                className="p-0 border align-top text-left" 
                                                style={{ borderColor }}
                                                title={!wrapText ? cellValue : undefined}
                                            >
                                                {wrapText ? (
                                                    <AutosizeTextarea 
                                                        value={cellValue} 
                                                        onChange={(e) => handleInputChange(chapter.id, col.key, e.target.value)}
                                                        className="bg-transparent border-none focus:ring-0 p-2 w-full outline-none block whitespace-normal resize-none"
                                                        style={{ color: settings.textColor, fontSize: `${fontSize}px` }}
                                                        placeholder={col.label}
                                                    />
                                                ) : (
                                                    <textarea 
                                                        value={cellValue} 
                                                        onChange={(e) => handleInputChange(chapter.id, col.key, e.target.value)}
                                                        className="bg-transparent border-none focus:ring-0 p-2 w-full h-[32px] outline-none block overflow-hidden whitespace-nowrap resize-none"
                                                        style={{ color: settings.textColor, fontSize: `${fontSize}px` }}
                                                        placeholder={col.label}
                                                    />
                                                )}
                                            </td>
                                        );
                                    }

                                    const cellValue = (chapter as any)[col.key] || '';
                                    return (
                                        <td 
                                            key={col.key} 
                                            className="p-0 border align-top text-left" 
                                            style={{ borderColor }}
                                            title={!wrapText ? cellValue : undefined}
                                        >
                                            {wrapText ? (
                                                <AutosizeTextarea 
                                                    value={cellValue} 
                                                    onChange={(e) => handleInputChange(chapter.id, col.key, e.target.value)}
                                                    className="bg-transparent border-none focus:ring-0 p-2 w-full outline-none whitespace-normal resize-none"
                                                    style={{ color: settings.textColor, fontSize: `${fontSize}px` }}
                                                    placeholder={col.key === 'polarity' ? '+/-' : ''}
                                                />
                                            ) : (
                                                <input 
                                                    value={cellValue} 
                                                    onChange={(e) => handleInputChange(chapter.id, col.key, e.target.value)}
                                                    className="bg-transparent border-none focus:ring-0 p-2 w-full h-[32px] outline-none truncate"
                                                    style={{ color: settings.textColor, fontSize: `${fontSize}px` }}
                                                    placeholder={col.key === 'polarity' ? '+/-' : ''}
                                                />
                                            )}
                                        </td>
                                    );
                                })}
                            </Reorder.Item>
                        ))}
                        </Reorder.Group>
                </table>
            </div>
        </div>
    );
};
