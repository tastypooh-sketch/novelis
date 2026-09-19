
import React, { useState, useMemo } from 'react';
import { useNovelState, useNovelDispatch } from '../../NovelContext';
import { EditorSettings, ICharacter, PlotPoint } from '../../types';
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon, TrashIcon, WorldIcon, UserCircleIcon, BookIcon } from '../common/Icons';
import { getContrastColor, isColorLight } from '../../utils/colorUtils';
import { generateId } from '../../utils/common';

interface ChroniclePanelProps {
    settings: EditorSettings;
}

export const ChroniclePanel: React.FC<ChroniclePanelProps> = ({ settings }) => {
    const { 
        characters, 
        chronicleState, 
        plotBrainstormState 
    } = useNovelState();
    const dispatch = useNovelDispatch();
    
    const [selectedYear, setSelectedYear] = useState<number>(chronicleState?.currentYear || 0);
    const [isAddingEvent, setIsAddingEvent] = useState(false);
    const [newEvent, setNewEvent] = useState({ title: '', description: '', type: 'world' as 'world' | 'character' });

    const worldEvents = chronicleState?.worldEvents || [];
    const plotPoints = plotBrainstormState?.pacingAndStructureAnalysis?.plotPoints || [];

    // Calculate age-based events for characters
    const characterEvents = useMemo(() => {
        const events: any[] = [];
        characters.forEach(char => {
            if (char.birthYear !== undefined) {
                // Birth event
                events.push({
                    id: `birth-${char.id}`,
                    year: char.birthYear,
                    title: `${char.name} is born`,
                    description: `The beginning of ${char.name}'s journey.`,
                    type: 'character',
                    characterId: char.id
                });
            }
        });
        return events;
    }, [characters]);

    const allEvents = useMemo(() => {
        const combined = [
            ...worldEvents.map(e => ({ ...e, type: 'world' })),
            ...characterEvents.map(e => ({ ...e, type: 'character' })),
            ...plotPoints.map(p => ({ 
                id: p.id, 
                year: chronicleState?.currentYear || 0, // Plot points are usually relative to "now" unless specified
                title: p.title, 
                description: p.description, 
                type: 'plot' 
            }))
        ];
        return combined.sort((a, b) => (a.year || 0) - (b.year || 0));
    }, [worldEvents, characterEvents, plotPoints, chronicleState?.currentYear]);

    const handleAddEvent = () => {
        if (!newEvent.title) return;
        
        const event = {
            id: generateId(),
            year: selectedYear,
            title: newEvent.title,
            description: newEvent.description
        };

        dispatch({ type: 'ADD_CHRONICLE_EVENT', payload: event });
        setNewEvent({ title: '', description: '', type: 'world' });
        setIsAddingEvent(false);
    };

    const handleDeleteEvent = (id: string) => {
        dispatch({ type: 'DELETE_CHRONICLE_EVENT', payload: id });
    };

    const timelineYears = useMemo(() => {
        if (allEvents.length === 0) return [selectedYear];
        const years = allEvents.map(e => e.year).filter((y): y is number => y !== undefined);
        const min = Math.min(...years, selectedYear) - 5;
        const max = Math.max(...years, selectedYear) + 5;
        const range = [];
        for (let i = min; i <= max; i++) range.push(i);
        return range;
    }, [allEvents, selectedYear]);

    return (
        <div className="flex flex-col h-full overflow-hidden" style={{ color: settings.textColor }}>
            {/* Timeline Header/Controls */}
            <div className="p-6 border-b flex items-center justify-between" style={{ borderColor: settings.toolbarInputBorderColor }}>
                <div className="flex items-center gap-4">
                    <h2 className="text-2xl font-serif font-bold">Chronicle</h2>
                    <div className="flex items-center bg-black/10 rounded-lg p-1">
                        <button 
                            onClick={() => setSelectedYear(y => y - 1)}
                            className="p-1 hover:bg-black/10 rounded transition-colors"
                        >
                            <ChevronLeftIcon className="h-5 w-5" />
                        </button>
                        <span className="px-4 font-mono font-bold text-lg">{selectedYear}</span>
                        <button 
                            onClick={() => setSelectedYear(y => y + 1)}
                            className="p-1 hover:bg-black/10 rounded transition-colors"
                        >
                            <ChevronRightIcon className="h-5 w-5" />
                        </button>
                    </div>
                </div>
                
                <button 
                    onClick={() => setIsAddingEvent(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-transform active:scale-95 shadow-sm"
                    style={{ backgroundColor: settings.accentColor, color: getContrastColor(settings.accentColor) }}
                >
                    <PlusIcon className="h-4 w-4" />
                    Record Event
                </button>
            </div>

            <div className="flex-grow overflow-x-auto overflow-y-hidden p-8 flex items-start gap-1">
                {/* Visual Timeline Bar */}
                <div className="flex min-w-max h-full items-start gap-8">
                    {timelineYears.map(year => {
                        const yearEvents = allEvents.filter(e => e.year === year);
                        const isCurrent = year === selectedYear;

                        return (
                            <div key={year} className="flex flex-col items-center w-64 group">
                                <div className={`h-4 w-4 rounded-full mb-4 transition-all duration-300 ${isCurrent ? 'scale-150 shadow-[0_0_15px_rgba(255,255,255,0.5)]' : 'opacity-40'}`}
                                     style={{ backgroundColor: isCurrent ? settings.accentColor : settings.textColor }}>
                                </div>
                                <div className={`text-sm font-mono mb-8 transition-opacity ${isCurrent ? 'opacity-100 font-bold scale-110' : 'opacity-40'}`}>
                                    {year}
                                </div>

                                <div className="space-y-4 w-full">
                                    {yearEvents.map(event => (
                                        <div 
                                            key={event.id}
                                            className="p-4 rounded-xl border-l-4 shadow-md bg-black/10 backdrop-blur-sm transition-all hover:translate-y-[-4px] hover:shadow-lg relative group/card"
                                            style={{ borderLeftColor: event.type === 'world' ? settings.accentColor : event.type === 'character' ? '#10b981' : '#f59e0b' }}
                                        >
                                            <div className="flex items-center gap-2 mb-2">
                                                {event.type === 'world' && <WorldIcon className="h-4 w-4 opacity-60" />}
                                                {event.type === 'character' && <UserCircleIcon className="h-4 w-4 opacity-60" />}
                                                {event.type === 'plot' && <BookIcon className="h-4 w-4 opacity-60" />}
                                                <span className="text-[10px] uppercase tracking-widest opacity-40 font-bold">{event.type}</span>
                                                
                                                {event.type === 'world' && (
                                                    <button 
                                                        onClick={() => handleDeleteEvent(event.id)}
                                                        className="absolute top-2 right-2 opacity-0 group-hover/card:opacity-100 p-1 hover:bg-red-500/20 rounded transition-opacity"
                                                    >
                                                        <TrashIcon className="h-3 w-3 text-red-400" />
                                                    </button>
                                                )}
                                            </div>
                                            <h4 className="font-bold text-sm mb-1 leading-tight">{event.title}</h4>
                                            <p className="text-xs opacity-60 line-clamp-3">{event.description}</p>
                                        </div>
                                    ))}
                                    
                                    {isCurrent && yearEvents.length === 0 && (
                                        <div className="h-24 flex items-center justify-center border-2 border-dashed border-white/5 rounded-xl opacity-20 text-[10px] uppercase tracking-tighter">
                                            Quiet Year
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Add Event Modal Overlay */}
            {isAddingEvent && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-2xl p-8 shadow-2xl border" style={{ backgroundColor: settings.toolbarBg, borderColor: settings.toolbarInputBorderColor }}>
                        <h3 className="text-xl font-serif font-bold mb-6">Record Historical Event</h3>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] uppercase tracking-widest opacity-50 mb-1">Year</label>
                                <input 
                                    type="number"
                                    value={selectedYear}
                                    onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                                    className="w-full bg-black/10 rounded-lg p-3 outline-none focus:ring-2"
                                    style={{ ['--tw-ring-color' as any]: settings.accentColor }}
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] uppercase tracking-widest opacity-50 mb-1">Event Title</label>
                                <input 
                                    autoFocus
                                    type="text"
                                    placeholder="e.g. The Great Fire"
                                    value={newEvent.title}
                                    onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                                    className="w-full bg-black/10 rounded-lg p-3 outline-none focus:ring-2"
                                    style={{ ['--tw-ring-color' as any]: settings.accentColor }}
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] uppercase tracking-widest opacity-50 mb-1">Details</label>
                                <textarea 
                                    placeholder="Briefly describe what happened..."
                                    value={newEvent.description}
                                    onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                                    className="w-full bg-black/10 rounded-lg p-3 outline-none focus:ring-2 h-24 resize-none"
                                    style={{ ['--tw-ring-color' as any]: settings.accentColor }}
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-8">
                            <button 
                                onClick={() => setIsAddingEvent(false)}
                                className="px-6 py-2 rounded-lg opacity-60 hover:opacity-100 transition-opacity"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleAddEvent}
                                disabled={!newEvent.title}
                                className="px-6 py-2 rounded-lg font-bold disabled:opacity-30 transition-all"
                                style={{ backgroundColor: settings.accentColor, color: getContrastColor(settings.accentColor) }}
                            >
                                Commemorate
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
