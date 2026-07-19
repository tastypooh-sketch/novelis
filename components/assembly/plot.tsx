
import React, { useCallback, useContext, useState, useMemo } from 'react';
import type { EditorSettings, PlotBrainstormState, RelationshipDataPoint, ChekhovsGun, Theme, ThemeMention, PlotPoint, IChapter, ICharacter } from '../../types';
import { useAssemblyAI } from './AssemblyAIContext';
import MarkdownRenderer from '../common/MarkdownRenderer';
import { SparklesIconOutline, SpinnerIcon, LightbulbIcon, RefreshIcon, PlusIcon, TrashIconOutline, LinkIcon, ArchiveIcon } from '../common/Icons';
import { useNovelDispatch, useNovelState } from '../../NovelContext';
import { AIError } from '../common/AIError';
import { getContrastColor } from '../../utils/colorUtils';
import { LockedChestTab, useLockedChestSelection } from '../common/LockedChest';

const PlotTimeline: React.FC<{
    plotPoints: PlotPoint[];
    chapters: IChapter[];
    settings: EditorSettings;
}> = ({ plotPoints, chapters, settings }) => {
    const [tooltip, setTooltip] = useState<{ content: string; x: number; y: number } | null>(null);
    const containerRef = React.useRef<HTMLDivElement>(null);

    const maxChapter = useMemo(() => Math.max(...chapters.map(c => c.chapterNumber), 0), [chapters]);
    
    const typeInfo: { [key in PlotPoint['type']]: { color: string; shape: 'circle' | 'diamond' } } = {
        'Inciting Incident': { color: '#facc15', shape: 'diamond' }, // yellow-400
        'Climax': { color: '#f43f5e', shape: 'diamond' },           // rose-500
        'Resolution': { color: '#4ade80', shape: 'diamond' },      // green-400
        'Rising Action': { color: '#38bdf8', shape: 'circle' },   // sky-400
        'Falling Action': { color: '#6366f1', shape: 'circle' },  // indigo-500
        'Key Scene': { color: '#a1a1aa', shape: 'circle' },       // zinc-400
        'Subplot': { color: '#a855f7', shape: 'circle' },         // purple-500
    };

    const pointsByChapter = useMemo(() => {
        return plotPoints.reduce((acc, point) => {
            if (!acc[point.chapterNumber]) {
                acc[point.chapterNumber] = [];
            }
            acc[point.chapterNumber].push(point);
            return acc;
        }, {} as Record<number, PlotPoint[]>);
    }, [plotPoints]);

    const handleMouseMove = (e: React.MouseEvent, point: PlotPoint) => {
        const content = `<strong>${point.title}</strong> (${point.type})<br/>${point.description}`;
        setTooltip({ content, x: e.clientX, y: e.clientY });
    };

    return (
        <div className="w-full">
            <div ref={containerRef} className="relative w-full h-40 overflow-x-auto overflow-y-hidden" onMouseLeave={() => setTooltip(null)}>
                <svg width={Math.max(800, maxChapter * 60 + 80)} height="160" className="min-w-full">
                    {/* Timeline Axis */}
                    <line x1="40" y1="80" x2={Math.max(760, maxChapter * 60 + 40)} y2="80" stroke={settings.toolbarInputBorderColor} strokeWidth="2" />

                    {/* Chapter Ticks */}
                    {Array.from({ length: maxChapter }, (_, i) => i + 1).map(chapNum => (
                        <g key={`chap-${chapNum}`}>
                            <line x1={40 + (chapNum - 1) * 60} y1="75" x2={40 + (chapNum - 1) * 60} y2="85" stroke={settings.toolbarInputBorderColor} strokeWidth="1" />
                            <text x={40 + (chapNum - 1) * 60} y="100" textAnchor="middle" fill={settings.textColor} opacity="0.7" fontSize="10">{chapNum}</text>
                        </g>
                    ))}

                    {/* Plot Points */}
                    {plotPoints.map(point => {
                        const chapterPoints = pointsByChapter[point.chapterNumber] || [];
                        const indexInChapter = chapterPoints.findIndex(p => p.id === point.id);
                        const info = typeInfo[point.type] || { color: 'var(--app-text)', shape: 'circle' };
                        
                        // Stack points if multiple in same chapter
                        const x = 40 + (point.chapterNumber - 1) * 60;
                        const y = 80 - 20 - (indexInChapter * 15);

                        return (
                            <g 
                                key={point.id} 
                                onMouseMove={(e) => handleMouseMove(e, point)}
                                className="cursor-pointer hover:opacity-80 transition-opacity"
                            >
                                <line x1={x} y1={80} x2={x} y2={y} stroke={info.color} strokeWidth="1" strokeDasharray="2,2" opacity="0.6" />
                                {info.shape === 'diamond' ? (
                                    <rect x={x - 6} y={y - 6} width="12" height="12" fill={info.color} transform={`rotate(45 ${x} ${y})`} />
                                ) : (
                                    <circle cx={x} cy={y} r="6" fill={info.color} />
                                )}
                            </g>
                        );
                    })}
                </svg>
            </div>
            {tooltip && (
                <div
                    className="fixed z-50 p-2 rounded-md shadow-lg text-xs"
                        style={{
                            top: tooltip.y + 15,
                            left: tooltip.x + 15,
                            backgroundColor: settings.toolbarBg,
                            color: getContrastColor(settings.toolbarBg || '#000000'),
                            maxWidth: '250px',
                            pointerEvents: 'none',
                            border: `1px solid ${settings.toolbarInputBorderColor}`
                        }}
                    dangerouslySetInnerHTML={{ __html: tooltip.content }}
                />
            )}
        </div>
    );
};

const RelationshipMapper: React.FC<{
    characters: ICharacter[];
    settings: EditorSettings;
}> = ({ characters, settings }) => {
    const { plotBrainstormState } = useNovelState();
    const dispatch = useNovelDispatch();
    const { onGenerateRelationshipAnalysis } = useAssemblyAI();
    
    const { selectedCharacter1IdForRelationship, selectedCharacter2IdForRelationship, relationshipAnalysis, isGeneratingRelationshipAnalysis, error } = plotBrainstormState;

    const handleGenerate = () => {
        if (selectedCharacter1IdForRelationship && selectedCharacter2IdForRelationship) {
            onGenerateRelationshipAnalysis(selectedCharacter1IdForRelationship, selectedCharacter2IdForRelationship);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs font-semibold mb-1 opacity-70" style={{ color: settings.textColor }}>Character A</label>
                    <select 
                        className="w-full p-2 rounded border"
                        style={{ backgroundColor: settings.backgroundColor, borderColor: settings.toolbarInputBorderColor, color: settings.textColor }}
                        value={selectedCharacter1IdForRelationship || ''}
                        onChange={(e) => dispatch({ type: 'SET_PLOT_BRAINSTORM_STATE', payload: { selectedCharacter1IdForRelationship: e.target.value } })}
                    >
                        <option value="">Select Character</option>
                        {characters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
                <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs font-semibold mb-1 opacity-70" style={{ color: settings.textColor }}>Character B</label>
                    <select 
                        className="w-full p-2 rounded border"
                        style={{ backgroundColor: settings.backgroundColor, borderColor: settings.toolbarInputBorderColor, color: settings.textColor }}
                        value={selectedCharacter2IdForRelationship || ''}
                        onChange={(e) => dispatch({ type: 'SET_PLOT_BRAINSTORM_STATE', payload: { selectedCharacter2IdForRelationship: e.target.value } })}
                    >
                        <option value="">Select Character</option>
                        {characters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
                <button
                    onClick={handleGenerate}
                    disabled={!selectedCharacter1IdForRelationship || !selectedCharacter2IdForRelationship || isGeneratingRelationshipAnalysis}
                    className="px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 disabled:opacity-50"
                    style={{ backgroundColor: settings.accentColor, color: getContrastColor(settings.accentColor || '#000000') }}
                >
                    {isGeneratingRelationshipAnalysis ? <SpinnerIcon className="h-4 w-4" /> : <SparklesIconOutline className="h-4 w-4" />}
                    Analyze Dynamics
                </button>
            </div>

            {relationshipAnalysis && (
                <div className="mt-6 p-4 rounded-lg space-y-4" style={{ backgroundColor: settings.backgroundColor }}>
                    <h4 className="font-semibold text-lg" style={{ color: settings.textColor }}>Relationship Arc</h4>
                    
                    {/* Simple Graph Visualization */}
                    <div className="h-40 w-full relative border-l border-b" style={{ borderColor: settings.toolbarInputBorderColor }}>
                        {/* Zero Line */}
                        <div className="absolute w-full border-t border-dashed opacity-30" style={{ top: '50%', borderColor: settings.textColor }}></div>
                        
                        <div className="absolute top-2 right-2 text-xs opacity-50 flex flex-col items-end">
                            <span className="text-green-400">Allied (+1)</span>
                            <span className="mt-14 text-red-400">Hostile (-1)</span>
                        </div>

                        {/* Points */}
                        {relationshipAnalysis.dataPoints.map((point, i) => {
                            // Normalize sentiment -1 to 1 into 0% (bottom) to 100% (top)
                            const yPercent = ((point.sentiment + 1) / 2) * 100;
                            const xPercent = (i / (relationshipAnalysis.dataPoints.length - 1 || 1)) * 100;
                            
                            return (
                                <div 
                                    key={i}
                                    className="absolute w-3 h-3 rounded-full border-2 transform -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
                                    style={{ 
                                        left: `${xPercent}%`, 
                                        bottom: `${yPercent}%`,
                                        backgroundColor: point.sentiment > 0 ? settings.successColor : point.sentiment < 0 ? settings.dangerColor : settings.toolbarText,
                                        borderColor: settings.backgroundColor
                                    }}
                                >
                                    <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 rounded text-xs shadow-lg z-10" style={{ backgroundColor: settings.toolbarBg, color: getContrastColor(settings.toolbarBg || '#000000'), border: `1px solid ${settings.toolbarInputBorderColor}` }}>
                                        <strong>Ch {point.chapterNumber}</strong>
                                        <p>{point.summary}</p>
                                    </div>
                                </div>
                            );
                        })}
                        {/* Connecting Line (Simple Polyline) */}
                        <svg className="absolute inset-0 w-full h-full pointer-events-none">
                            <polyline
                                fill="none"
                                stroke={settings.textColor}
                                strokeWidth="2"
                                opacity="0.3"
                                points={relationshipAnalysis.dataPoints.map((p, i) => {
                                    const x = (i / (relationshipAnalysis.dataPoints.length - 1 || 1)) * 100;
                                    const y = 100 - (((p.sentiment + 1) / 2) * 100);
                                    return `${x}%,${y}%`;
                                }).join(' ')}
                            />
                        </svg>
                    </div>

                    <div className="mt-4 pt-4 border-t" style={{ borderColor: settings.toolbarInputBorderColor }}>
                        <MarkdownRenderer source={relationshipAnalysis.analysisText} settings={settings} />
                    </div>
                </div>
            )}
        </div>
    );
};

export const PlotBrainstormPanel: React.FC<{
    settings: EditorSettings;
    plotState: PlotBrainstormState;
}> = ({ settings, plotState }) => {
    const { chapters, characters } = useNovelState();
    const dispatch = useNovelDispatch();
    const [activeTab, setActiveTab] = useState<'content' | 'chest'>('content');
    const { renderContextMenu, renderTaggingModal } = useLockedChestSelection('plot', settings);
    const { 
        onRegeneratePacingAndStructure, 
        onRegenerateCharacters, 
        onRegenerateOpportunities, 
        onGenerateFullAnalysis 
    } = useAssemblyAI();

    const { 
        pacingAndStructureAnalysis, characterAnalysis, opportunityAnalysis, 
        isGeneratingPacingAndStructure, isGeneratingCharacters, isGeneratingOpportunities, error 
    } = plotState;

    const hasAnyAnalysis = pacingAndStructureAnalysis || characterAnalysis || opportunityAnalysis;
    const isGeneratingAny = isGeneratingPacingAndStructure || isGeneratingCharacters || isGeneratingOpportunities;

    return (
        <div className="w-full h-full flex flex-col p-4" style={{ backgroundColor: `${settings.toolbarButtonBg}60` }}>
            {renderContextMenu()}
            {renderTaggingModal()}
            <div className="flex-shrink-0 flex items-center justify-between gap-2 mb-6">
                <h2 className="text-xl font-bold flex items-center gap-3" style={{ color: settings.textColor }}>
                    <LinkIcon className="h-6 w-6" style={{ color: settings.accentColor }} />
                    Plot Engineering
                </h2>
                
                <div className="flex items-center gap-4">
                    <div className="flex bg-black/20 p-1 rounded-lg">
                        <button 
                            onClick={() => setActiveTab('content')}
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'content' ? 'shadow-sm' : 'opacity-50'}`}
                            style={{ 
                                backgroundColor: activeTab === 'content' ? settings.toolbarButtonBg : 'transparent',
                                color: settings.textColor
                            }}
                        >
                            Content
                        </button>
                        <button 
                            onClick={() => setActiveTab('chest')}
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'chest' ? 'shadow-sm' : 'opacity-50'}`}
                            style={{ 
                                backgroundColor: activeTab === 'chest' ? settings.toolbarButtonBg : 'transparent',
                                color: settings.textColor
                            }}
                        >
                            <ArchiveIcon className="w-4 h-4" />
                            Locked Chest
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        {!hasAnyAnalysis && !isGeneratingAny && activeTab === 'content' && (
                            <button
                                onClick={onGenerateFullAnalysis}
                                className="px-6 py-2 rounded-lg text-sm font-bold flex items-center transition-all active:scale-95 shadow-lg"
                                style={{ backgroundColor: settings.accentColor, color: getContrastColor(settings.accentColor || '#000000') }}
                            >
                                <SparklesIconOutline className="h-4 w-4 mr-2" />
                                Run Full Analysis
                            </button>
                        )}
                        <button
                            onClick={() => dispatch({ type: 'SET_PLOT_BRAINSTORM_STATE', payload: { narrativeArchitect: { ...(plotState.narrativeArchitect || {}), isOpen: true } } })}
                            className="px-4 py-2 rounded-lg text-sm font-bold flex items-center transition-all active:scale-95 border border-white/10 hover:bg-white/5 shadow-md"
                            style={{ color: settings.accentColor, borderColor: `${settings.accentColor}40` }}
                        >
                            <SparklesIconOutline className="h-4 w-4 mr-2" />
                            Narrative Architect
                        </button>
                    </div>
                </div>
            </div>

            <div className={`flex-grow min-h-0 pr-2 space-y-6 ${hasAnyAnalysis || activeTab === 'chest' ? 'overflow-y-auto' : ''}`}>
                {activeTab === 'chest' ? (
                    <LockedChestTab modalId="plot" settings={settings} />
                ) : (
                    <>
                        {!hasAnyAnalysis && !isGeneratingAny && (
                            <div className="w-full h-full flex flex-col items-center justify-center text-center p-8 opacity-60" style={{ color: settings.textColor }}>
                                <LightbulbIcon className="h-16 w-16 mb-4 opacity-20" />
                                <p className="max-w-md">No analysis generated yet. Click "Run Full Analysis" to brainstorm structure, character arcs, and plot opportunities.</p>
                            </div>
                        )}

                        {/* Section 1: Pacing & Structure */}
                        <div className="p-5 rounded-xl shadow-sm border border-white/5 bg-black/10" style={{ backgroundColor: settings.toolbarButtonBg, color: settings.textColor }}>
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold" style={{ color: settings.textColor }}>Pacing & Structure</h3>
                        {pacingAndStructureAnalysis && (
                            <button onClick={onRegeneratePacingAndStructure} disabled={isGeneratingPacingAndStructure} className="p-1.5 rounded hover:bg-black/20 transition-colors" style={{ color: settings.toolbarText }}>
                                {isGeneratingPacingAndStructure ? <SpinnerIcon className="h-4 w-4" /> : <RefreshIcon className="h-4 w-4" />}
                            </button>
                        )}
                    </div>
                    {isGeneratingPacingAndStructure && !pacingAndStructureAnalysis ? (
                        <div className="flex justify-center p-8"><SpinnerIcon /></div>
                    ) : pacingAndStructureAnalysis ? (
                        <div className="space-y-6">
                            <PlotTimeline plotPoints={pacingAndStructureAnalysis.plotPoints} chapters={chapters} settings={settings} />
                            <div className="p-4 rounded-xl" style={{ backgroundColor: settings.backgroundColor }}>
                                <MarkdownRenderer source={pacingAndStructureAnalysis.summary} settings={settings} />
                            </div>
                        </div>
                    ) : null}
                </div>

                {/* Section 2: Character Arcs & Consistency */}
                <div className="p-5 rounded-xl shadow-sm border border-white/5 bg-black/10" style={{ backgroundColor: settings.toolbarButtonBg, color: settings.textColor }}>
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold" style={{ color: settings.textColor }}>Character Arcs & Consistency</h3>
                        {characterAnalysis && (
                            <button onClick={onRegenerateCharacters} disabled={isGeneratingCharacters} className="p-1.5 rounded hover:bg-black/20 transition-colors" style={{ color: settings.toolbarText }}>
                                {isGeneratingCharacters ? <SpinnerIcon className="h-4 w-4" /> : <RefreshIcon className="h-4 w-4" />}
                            </button>
                        )}
                    </div>
                    {isGeneratingCharacters && !characterAnalysis ? (
                        <div className="flex justify-center p-8"><SpinnerIcon /></div>
                    ) : characterAnalysis ? (
                        <div className="p-4 rounded-xl" style={{ backgroundColor: settings.backgroundColor }}>
                            <MarkdownRenderer source={characterAnalysis} settings={settings} />
                        </div>
                    ) : null}
                </div>

                {/* Section 3: Relationship Mapper */}
                <div className="p-5 rounded-xl shadow-sm border border-white/5 bg-black/10" style={{ backgroundColor: settings.toolbarButtonBg, color: settings.textColor }}>
                    <h3 className="text-lg font-bold mb-6" style={{ color: settings.textColor }}>Relationship Mapper</h3>
                    <RelationshipMapper characters={characters} settings={settings} />
                </div>

                {/* Section 4: Opportunity Detector */}
                <div className="p-5 rounded-xl shadow-sm border border-white/5 bg-black/10" style={{ backgroundColor: settings.toolbarButtonBg, color: settings.textColor }}>
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold" style={{ color: settings.textColor }}>Opportunity Detector (Plot Holes & Twists)</h3>
                        {opportunityAnalysis && (
                            <button onClick={onRegenerateOpportunities} disabled={isGeneratingOpportunities} className="p-1.5 rounded hover:bg-black/20 transition-colors" style={{ color: settings.toolbarText }}>
                                {isGeneratingOpportunities ? <SpinnerIcon className="h-4 w-4" /> : <RefreshIcon className="h-4 w-4" />}
                            </button>
                        )}
                    </div>
                    {isGeneratingOpportunities && !opportunityAnalysis ? (
                        <div className="flex justify-center p-8"><SpinnerIcon /></div>
                    ) : opportunityAnalysis ? (
                        <div className="p-4 rounded-xl" style={{ backgroundColor: settings.backgroundColor }}>
                            <MarkdownRenderer source={opportunityAnalysis} settings={settings} />
                        </div>
                    ) : null}
                </div>

                {error && <AIError message={error} onDismiss={() => dispatch({ type: 'SET_PLOT_BRAINSTORM_STATE', payload: { error: null } })} />}
                    </>
                )}
            </div>
        </div>
    );
};
