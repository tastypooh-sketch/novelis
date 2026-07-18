
import React, { useState, useCallback, useMemo, useContext, useEffect, useRef } from 'react';
import type { EditorSettings, IWorldItem, IMapLocation } from '../../types';
import { useNovelDispatch, useNovelState } from '../../NovelContext';
import { useAssemblyAI } from './AssemblyAIContext';
import { SparklesIconOutline, SpinnerIcon, TrashIconOutline, ChevronDownIcon, ChevronUpIcon, MapIcon, MapPinIcon, PlusIcon, WorldIcon, ArchiveIcon } from '../common/Icons';
import MarkdownRenderer from '../common/MarkdownRenderer';
import { generateId } from '../../utils/common';
import { getContrastColor } from '../../utils/colorUtils';
import { LockedChestTab, useLockedChestSelection } from '../common/LockedChest';

// --- Pin Editor ---
const PinEditor: React.FC<{
    pin: IMapLocation;
    onSave: (id: string, updates: Partial<IMapLocation>) => void;
    onDelete: (id: string) => void;
    onClose: () => void;
    settings: EditorSettings;
}> = ({ pin, onSave, onDelete, onClose, settings }) => {
    const [name, setName] = useState(pin.name);
    const [description, setDescription] = useState(pin.description);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    const handleSave = () => {
        onSave(pin.id, { name, description });
        onClose();
    };

    return (
        <div ref={ref} className="absolute z-20 w-64 p-3 rounded-lg shadow-xl" style={{ backgroundColor: settings.toolbarBg, color: getContrastColor(settings.toolbarBg || '#000000'), transform: 'translate(20px, -50%)' }}>
            <div className="space-y-3">
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Location Name"
                    className="w-full px-2 py-1.5 rounded-md border text-sm"
                    style={{ backgroundColor: settings.backgroundColor, color: settings.textColor, borderColor: settings.toolbarInputBorderColor }}
                />
                <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Description..."
                    rows={3}
                    className="w-full px-2 py-1.5 rounded-md border text-sm resize-none"
                    style={{ backgroundColor: settings.backgroundColor, color: settings.textColor, borderColor: settings.toolbarInputBorderColor }}
                />
            </div>
            <div className="flex justify-between items-center mt-3">
                <button onClick={() => onDelete(pin.id)} className="p-2 rounded-md" style={{ backgroundColor: settings.dangerColor, color: getContrastColor(settings.dangerColor || '#000000') }}><TrashIconOutline /></button>
                <button onClick={handleSave} className="px-4 py-1.5 text-sm rounded-md" style={{ backgroundColor: settings.accentColor, color: getContrastColor(settings.accentColor || '#000000') }}>Save</button>
            </div>
        </div>
    );
};


// --- Map Builder ---
const MapBuilder: React.FC<{ settings: EditorSettings }> = ({ settings }) => {
    const { mapLocations, assemblyState: { mapState } } = useNovelState();
    const dispatch = useNovelDispatch();
    const { onSuggestLocations, isGeneratingMap } = useAssemblyAI();
    const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
    const mapRef = useRef<HTMLDivElement>(null);
    const isPanning = useRef(false);
    const lastPos = useRef({ x: 0, y: 0 });

    const setMapState = (updates: Partial<typeof mapState>) => {
        dispatch({ type: 'UPDATE_MAP_STATE', payload: updates });
    };

    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        const map = mapRef.current;
        if (!map) return;

        const rect = map.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const zoomFactor = 1.1;
        const newZoom = e.deltaY < 0 ? mapState.zoom * zoomFactor : mapState.zoom / zoomFactor;
        const clampedZoom = Math.max(0.2, Math.min(5, newZoom));

        const newPanX = mouseX - (mouseX - mapState.pan.x) * (clampedZoom / mapState.zoom);
        const newPanY = mouseY - (mouseY - mapState.pan.y) * (clampedZoom / mapState.zoom);

        setMapState({ zoom: clampedZoom, pan: { x: newPanX, y: newPanY } });
    };
    
    const handleMouseDown = (e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('.pin-editor') || (e.target as HTMLElement).closest('.map-pin')) {
            return;
        }
        isPanning.current = true;
        lastPos.current = { x: e.clientX, y: e.clientY };
        if (mapRef.current) mapRef.current.style.cursor = 'grabbing';
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isPanning.current) return;
        const dx = e.clientX - lastPos.current.x;
        const dy = e.clientY - lastPos.current.y;
        lastPos.current = { x: e.clientX, y: e.clientY };
        setMapState({ pan: { x: mapState.pan.x + dx, y: mapState.pan.y + dy } });
    };

    const handleMouseUp = () => {
        isPanning.current = false;
        if (mapRef.current) mapRef.current.style.cursor = 'grab';
    };

    const handleDoubleClick = (e: React.MouseEvent) => {
        if (!mapRef.current || (e.target as HTMLElement).closest('.map-pin')) return;

        const rect = mapRef.current.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        const mapX = (clickX - mapState.pan.x) / mapState.zoom;
        const mapY = (clickY - mapState.pan.y) / mapState.zoom;

        const newPin: IMapLocation = {
            id: generateId(),
            name: 'New Location',
            description: '',
            x: (mapX / (3000)) * 100, // Assuming map width of 3000px
            y: (mapY / (2000)) * 100, // Assuming map height of 2000px
        };
        dispatch({ type: 'ADD_MAP_LOCATION', payload: newPin });
        setSelectedPinId(newPin.id);
    };

    const selectedPin = mapLocations.find(p => p.id === selectedPinId);

    return (
        <div className="h-full flex flex-col relative">
            <div
                ref={mapRef}
                className="w-full h-full bg-gray-700 overflow-hidden cursor-grab"
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onDoubleClick={handleDoubleClick}
                style={{
                    backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)',
                    backgroundSize: '20px 20px',
                    backgroundColor: settings.backgroundColor,
                }}
            >
                <div
                    className="absolute top-0 left-0"
                    style={{
                        width: '3000px',
                        height: '2000px',
                        transform: `translate(${mapState.pan.x}px, ${mapState.pan.y}px) scale(${mapState.zoom})`,
                        transformOrigin: '0 0',
                    }}
                >
                    {mapLocations.map(pin => {
                        const pinX = (pin.x / 100) * 3000;
                        const pinY = (pin.y / 100) * 2000;
                        return(
                            <div
                                key={pin.id}
                                className="absolute map-pin cursor-pointer"
                                style={{
                                    left: `${pinX}px`,
                                    top: `${pinY}px`,
                                    transform: `translate(-50%, -100%) scale(${1 / mapState.zoom})`,
                                    transformOrigin: 'bottom center'
                                }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedPinId(pin.id);
                                }}
                            >
                                <MapPinIcon className="h-8 w-8 drop-shadow-lg" style={{ color: settings.accentColor }} />
                                <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[130%] bg-black/50 text-xs px-1.5 py-0.5 rounded whitespace-nowrap" style={{ color: '#FFFFFF' }}>{pin.name}</span>
                                {selectedPin?.id === pin.id && (
                                    <PinEditor
                                        pin={selectedPin}
                                        settings={settings}
                                        onSave={(id, updates) => dispatch({ type: 'UPDATE_MAP_LOCATION', payload: { id, updates } })}
                                        onDelete={(id) => {
                                            dispatch({ type: 'DELETE_MAP_LOCATION', payload: id });
                                            setSelectedPinId(null);
                                        }}
                                        onClose={() => setSelectedPinId(null)}
                                    />
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>
             <div className="absolute top-4 left-4 flex flex-col gap-2">
                <button onClick={() => setMapState({ zoom: Math.min(5, mapState.zoom * 1.2) })} className="p-2 rounded-md" style={{backgroundColor: settings.toolbarButtonBg, color: settings.toolbarText}}><PlusIcon/></button>
                <button onClick={() => setMapState({ zoom: Math.max(0.2, mapState.zoom / 1.2) })} className="p-2 rounded-md" style={{backgroundColor: settings.toolbarButtonBg, color: settings.toolbarText}}><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" /></svg></button>
            </div>
             <div className="absolute top-4 right-4">
                <button
                    onClick={onSuggestLocations}
                    disabled={isGeneratingMap}
                    className="px-3 py-1.5 text-sm rounded-md flex items-center gap-2 disabled:opacity-50"
                    style={{ backgroundColor: settings.accentColor, color: getContrastColor(settings.accentColor || '#000000') }}
                    title="AI will analyze your story and suggest locations"
                >
                    {isGeneratingMap ? <SpinnerIcon className="h-4 w-4" /> : <SparklesIconOutline className="h-4 w-4" />}
                    {isGeneratingMap ? 'Generating...' : 'Suggest Locations'}
                </button>
            </div>
             <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs opacity-70 bg-black/50 px-3 py-1 rounded-full" style={{ color: '#ffffff' }}>
                Double-click to add a location. Use mouse wheel to zoom, drag to pan.
            </div>
        </div>
    );
};


// --- World Item Card ---
const WorldItemCard: React.FC<{
    item: IWorldItem;
    settings: EditorSettings;
    isExpanded: boolean;
    onToggleExpand: () => void;
}> = ({ item, settings, isExpanded, onToggleExpand }) => {
    const dispatch = useNovelDispatch();
    const { onRefineWorldItem, isGeneratingWorldItem, onSetError } = useAssemblyAI();
    const isGenerating = isGeneratingWorldItem === item.id;
    
    const [localName, setLocalName] = useState(item.name);
    const [rawNotes, setRawNotes] = useState(item.rawNotes);
    const [description, setDescription] = useState(item.description);

    const debouncedUpdate = useCallback(
        (updates: Partial<IWorldItem>) => {
            dispatch({ type: 'UPDATE_WORLD_ITEM', payload: { id: item.id, updates } });
        },
        [dispatch, item.id]
    );

    useEffect(() => {
        setLocalName(item.name);
        setRawNotes(item.rawNotes);
        setDescription(item.description);
    }, [item]);

    const handleRefine = () => {
        if (isGenerating || !item.rawNotes.trim()) return;
        onRefineWorldItem(item);
    };
    
    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        dispatch({ type: 'DELETE_WORLD_ITEM', payload: item.id });
    }

    return (
        <div 
            onClick={(e) => {
                e.stopPropagation();
                if (!isExpanded) onToggleExpand();
            }}
            className={`p-4 rounded-lg shadow-sm w-full transition-all duration-300 ${isExpanded ? '' : 'cursor-pointer hover:shadow-md'}`}
            style={{backgroundColor: settings.toolbarButtonBg, color: settings.textColor}}
        >
            <div className="flex justify-between items-start">
                 <input
                    type="text"
                    value={localName}
                    onChange={e => setLocalName(e.target.value)}
                    onBlur={() => localName.trim() && debouncedUpdate({ name: localName.trim() })}
                    className="font-semibold bg-transparent border-none p-0 focus:ring-0 w-full"
                    style={{ color: settings.textColor }}
                    onClick={e => e.stopPropagation()}
                />
                <button onClick={(e) => {
                    e.stopPropagation();
                    onToggleExpand();
                }} className="p-1 rounded-full hover:bg-white/10" style={{ color: settings.toolbarText }}>
                    {isExpanded ? <ChevronUpIcon className="h-5 w-5" /> : <ChevronDownIcon className="h-5 w-5" />}
                </button>
            </div>
            <p className="text-xs opacity-70 summary-clamped-2line mt-1">{item.summary}</p>
            
            {isExpanded && (
                <div className="mt-4 space-y-4 border-t pt-4" style={{borderColor: settings.toolbarInputBorderColor}}>
                    <div>
                        <label className="text-xs font-semibold opacity-80 block mb-1">Rough Notes</label>
                        <textarea
                            value={rawNotes}
                            onChange={e => { setRawNotes(e.target.value); debouncedUpdate({ rawNotes: e.target.value }); }}
                            rows={4}
                            className="w-full p-2 rounded border resize-none text-sm"
                            style={{ borderColor: settings.toolbarInputBorderColor, color: settings.textColor, backgroundColor: settings.backgroundColor }}
                            onClick={e => e.stopPropagation()}
                        />
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={handleRefine} 
                            disabled={isGenerating || !rawNotes.trim()} 
                            className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-md disabled:opacity-60" 
                            style={{
                                backgroundColor: settings.accentColor, 
                                color: getContrastColor(settings.accentColor || '#000000')
                            }}
                        >
                            {isGenerating ? <SpinnerIcon /> : <SparklesIconOutline />}
                            Refine
                        </button>
                    </div>

                    <div>
                        <label className="text-xs font-semibold opacity-80 block mb-1">Codex Entry</label>
                        <div className="w-full p-3 rounded border" style={{ borderColor: settings.toolbarInputBorderColor, backgroundColor: settings.backgroundColor }}>
                           {isGenerating && !item.description ? (
                                <div className="flex items-center justify-center p-4"> <SpinnerIcon /> </div>
                           ) : (
                                <MarkdownRenderer source={item.description} settings={settings} />
                           )}
                        </div>
                    </div>
                    
                     <div className="flex justify-end">
                        <button 
                            onClick={handleDelete} 
                            className="p-2 rounded-md" 
                            style={{
                                backgroundColor: settings.dangerColor, 
                                color: getContrastColor(settings.dangerColor || '#000000')
                            }} 
                            title="Delete world item"
                        >
                            <TrashIconOutline />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- Main Panel ---
export const WorldPanel: React.FC<{ settings: EditorSettings }> = ({ settings }) => {
    const { worldItems, assemblyState } = useNovelState();
    const dispatch = useNovelDispatch();
    const { onDistillWorldNotes, isDistillingWorld, errorMessage, errorId, onSetError } = useAssemblyAI();
    const { renderContextMenu, renderTaggingModal } = useLockedChestSelection('world', settings);

    const { worldPanelView = 'repository', worldCrucibleText = '', expandedWorldItemId } = assemblyState;

    const setView = (view: 'crucible' | 'repository' | 'map' | 'chest') => {
        dispatch({ type: 'UPDATE_ASSEMBLY_VIEW_STATE', payload: { worldPanelView: view } });
    };

    const setCrucibleText = (text: string) => {
        dispatch({ type: 'UPDATE_ASSEMBLY_VIEW_STATE', payload: { worldCrucibleText: text } });
    };

    const setExpandedItemId = (id: string | null) => {
        dispatch({ type: 'UPDATE_ASSEMBLY_VIEW_STATE', payload: { expandedWorldItemId: id } });
    };
    
    const handleDistill = () => {
        if (isDistillingWorld || !worldCrucibleText.trim()) return;
        onDistillWorldNotes(worldCrucibleText);
    };

    const groupedItems = useMemo(() => {
        const groups: { [key in IWorldItem['type']]?: IWorldItem[] } = {};
        worldItems.forEach(item => {
            if (!groups[item.type]) {
                groups[item.type] = [];
            }
            groups[item.type]!.push(item);
        });
        return groups;
    }, [worldItems]);

    const itemTypes: IWorldItem['type'][] = ['Location', 'Lore', 'Object', 'Organization', 'Concept'];

    return (
        <div className="h-full flex flex-col" style={{ backgroundColor: `${settings.toolbarButtonBg}60`}}>
            {renderContextMenu()}
            {renderTaggingModal()}
            <div className="flex-shrink-0 p-3 border-b flex items-center justify-center" style={{ backgroundColor: settings.toolbarBg, borderColor: settings.toolbarInputBorderColor }}>
                <div className="flex items-center gap-1 p-0.5 rounded-md" style={{backgroundColor: settings.toolbarButtonBg}}>
                    <button onClick={() => setView('crucible')} className="px-4 py-1.5 rounded-md text-sm" style={{backgroundColor: worldPanelView === 'crucible' ? settings.accentColor : 'transparent', color: worldPanelView === 'crucible' ? getContrastColor(settings.accentColor || '#000000') : settings.toolbarText }}>Crucible</button>
                    <button onClick={() => setView('repository')} className="px-4 py-1.5 rounded-md text-sm" style={{backgroundColor: worldPanelView === 'repository' ? settings.accentColor : 'transparent', color: worldPanelView === 'repository' ? getContrastColor(settings.accentColor || '#000000') : settings.toolbarText }}>Repository</button>
                    <button onClick={() => setView('map')} className="px-4 py-1.5 rounded-md text-sm flex items-center gap-2" style={{backgroundColor: worldPanelView === 'map' ? settings.accentColor : 'transparent', color: worldPanelView === 'map' ? getContrastColor(settings.accentColor || '#000000') : settings.toolbarText }}>
                        <MapIcon /> Map Builder
                    </button>
                    <button onClick={() => setView('chest')} className="px-4 py-1.5 rounded-md text-sm flex items-center gap-2" style={{backgroundColor: worldPanelView === 'chest' ? settings.accentColor : 'transparent', color: worldPanelView === 'chest' ? getContrastColor(settings.accentColor || '#000000') : settings.toolbarText }}>
                        <ArchiveIcon className="w-4 h-4" /> Locked Chest
                    </button>
                </div>
            </div>

            {worldPanelView === 'chest' ? (
                <div className="flex-grow min-h-0 overflow-y-auto p-4">
                    <LockedChestTab modalId="world" settings={settings} />
                </div>
            ) : worldPanelView === 'crucible' ? (
                <div className="flex-grow min-h-0 p-4 flex flex-col gap-6">
                    <div className="flex-shrink-0 flex flex-col gap-4">
                        <h2 className="text-xl font-bold flex items-center gap-3" style={{ color: settings.textColor }}>
                            <WorldIcon className="h-6 w-6" style={{ color: settings.accentColor }} />
                            The Alchemist's Crucible
                        </h2>
                        <div
                            className="p-1 border border-white/10 rounded-xl shadow-inner transition-all duration-300"
                            style={{
                                backgroundColor: 'rgba(0,0,0,0.2)'
                            }}
                        >
                            <textarea
                                value={worldCrucibleText}
                                onChange={e => setCrucibleText(e.target.value)}
                                placeholder="This is your world-building braindump. Add any and all notes, ideas, and snippets about your world here. When you're ready, the AI will distill them into organized entries."
                                className="w-full p-4 rounded-xl border-0 resize-none bg-transparent focus:ring-0"
                                style={{
                                    color: settings.textColor,
                                }}
                                rows={10}
                            />
                        </div>
                        <button
                            onClick={handleDistill}
                            disabled={isDistillingWorld || !worldCrucibleText.trim()}
                            className="self-end px-6 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-all active:scale-95"
                            style={{ backgroundColor: settings.accentColor, color: getContrastColor(settings.accentColor || '#000000') }}
                        >
                            {isDistillingWorld ? <SpinnerIcon /> : <SparklesIconOutline />}
                            {isDistillingWorld ? 'Distilling...' : 'Distill Notes'}
                        </button>
                         {errorId === 'distill' && (
                            <div className="text-red-400 text-sm text-center mt-2">
                                <p>{errorMessage || "Sorry, something went wrong while distilling your notes. Please check the content and try again."}</p>
                                <button onClick={() => onSetError(null)} className="underline ml-2">Dismiss</button>
                            </div>
                        )}
                    </div>
                </div>
            ) : worldPanelView === 'map' ? (
                <MapBuilder settings={settings} />
            ) : (
                <div className="flex-grow min-h-0 overflow-x-auto p-4">
                    <div className="flex gap-4 h-full">
                        {itemTypes.map(type => (
                            <div key={type} className="w-80 h-full flex-shrink-0 flex flex-col gap-3 p-3 rounded-lg" style={{backgroundColor: settings.toolbarBg, color: settings.textColor}}>
                                <h3 className="font-bold uppercase tracking-widest text-[10px] text-center opacity-40 mb-2" style={{ color: settings.textColor }}>{type}s</h3>
                                <div className="flex-grow overflow-y-auto space-y-3 pr-2 -mr-2">
                                    {(groupedItems[type] || []).map(item => (
                                        <WorldItemCard
                                            key={item.id}
                                            item={item}
                                            settings={settings}
                                            isExpanded={expandedWorldItemId === item.id}
                                            onToggleExpand={() => setExpandedItemId(expandedWorldItemId === item.id ? null : item.id)}
                                        />
                                    ))}
                                    {(!groupedItems[type] || groupedItems[type]?.length === 0) && (
                                        <div className="text-center text-xs opacity-50 pt-4" style={{ color: settings.textColor }}>No items of this type yet.</div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
