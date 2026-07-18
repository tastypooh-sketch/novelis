
import React, { useCallback, useContext, useState } from 'react';
import type { EditorSettings, SynopsisState } from '../../types';
import { useAssemblyAI } from './AssemblyAIContext';
import MarkdownRenderer from '../common/MarkdownRenderer';
import { SparklesIconOutline, SpinnerIcon, DocumentTextIcon, RefreshIcon, ArchiveIcon } from '../common/Icons';
import { getContrastColor } from '../../utils/colorUtils';
import { LockedChestTab, useLockedChestSelection } from '../common/LockedChest';

interface SynopsisSectionProps {
    title: string;
    description: string;
    content: string | null;
    isLoading: boolean;
    onRegenerate: () => void;
    settings: EditorSettings;
}

const SynopsisSection: React.FC<SynopsisSectionProps> = ({ title, description, content, isLoading, onRegenerate, settings }) => {
    return (
        <div className="p-5 rounded-xl flex flex-col bg-black/10 border border-white/5 shadow-sm" style={{ backgroundColor: settings.toolbarButtonBg, color: settings.textColor }}>
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h3 className="text-lg font-bold" style={{ color: settings.textColor }}>{title}</h3>
                    <p className="text-xs opacity-50 font-medium" style={{ color: settings.textColor }}>{description}</p>
                </div>
                {content && (
                    <button 
                        onClick={onRegenerate} 
                        disabled={isLoading}
                        className="p-2 rounded-lg flex items-center gap-2 text-xs disabled:opacity-50 transition-colors bg-black/20 hover:bg-black/40"
                        style={{ color: settings.toolbarText }}
                    >
                        {isLoading ? <SpinnerIcon className="h-4 w-4" /> : <RefreshIcon className="h-4 w-4" />}
                        Regenerate
                    </button>
                )}
            </div>
            <div 
                className="flex-grow p-5 rounded-xl min-h-[12rem] overflow-y-auto"
                style={{ backgroundColor: settings.backgroundColor, color: getContrastColor(settings.backgroundColor || '#ffffff') }}
            >
                {isLoading ? (
                    <div className="flex items-center justify-center h-full">
                        <SpinnerIcon className="h-8 w-8" />
                    </div>
                ) : content ? (
                    <MarkdownRenderer source={content} settings={settings} />
                ) : (
                    <div className="flex items-center justify-center h-full text-center text-sm opacity-30">
                        Section content will appear here...
                    </div>
                )}
            </div>
        </div>
    );
};


interface SynopsisPanelProps {
    settings: EditorSettings;
    synopsisState: SynopsisState;
}

export const SynopsisPanel: React.FC<SynopsisPanelProps> = ({ settings, synopsisState }) => {
    const [activeTab, setActiveTab] = useState<'content' | 'chest'>('content');
    const { renderContextMenu, renderTaggingModal } = useLockedChestSelection('synopsis', settings);

    const { 
        onGenerateFullSynopsis,
        onRegenerateMarketAnalysis,
        onRegeneratePromotionalContent,
        onRegenerateSynopsis,
    } = useAssemblyAI();

    const { 
        marketAnalysis, promotionalContent, synopsis,
        isGeneratingMarketAnalysis, isGeneratingPromotionalContent, isGeneratingSynopsis, error 
    } = synopsisState;
    
    const hasGeneratedAnything = marketAnalysis || promotionalContent || synopsis;
    const isGeneratingAnything = isGeneratingMarketAnalysis || isGeneratingPromotionalContent || isGeneratingSynopsis;

    const handleGenerate = useCallback(() => {
        if (isGeneratingAnything) return;
        onGenerateFullSynopsis();
    }, [isGeneratingAnything, onGenerateFullSynopsis]);
    
    return (
        <div className="w-full h-full flex flex-col p-4 gap-6" style={{ backgroundColor: `${settings.toolbarButtonBg}60`}}>
            {renderContextMenu()}
            {renderTaggingModal()}
            <div className="flex-shrink-0 flex items-center justify-between gap-2">
                 <div className="flex items-center gap-3">
                    <DocumentTextIcon className="h-6 w-6" style={{ color: settings.accentColor }} />
                    <h2 className="text-xl font-bold" style={{ color: settings.textColor }}>Synopsis & Marketing</h2>
                 </div>

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

                    {!hasGeneratedAnything && !isGeneratingAnything && activeTab === 'content' && (
                        <button
                            onClick={handleGenerate}
                            className="px-6 py-2 rounded-lg text-sm font-bold flex items-center transition-all active:scale-95 shadow-lg"
                            style={{ backgroundColor: settings.accentColor, color: getContrastColor(settings.accentColor || '#000000') }}
                        >
                            <SparklesIconOutline className="h-4 w-4 mr-2" />
                            Generate Professional Suite
                        </button>
                    )}
                 </div>
            </div>
            
            <div className="flex-grow min-h-0 overflow-y-auto pr-2 space-y-6">
                {activeTab === 'chest' ? (
                    <LockedChestTab modalId="synopsis" settings={settings} />
                ) : !hasGeneratedAnything && !isGeneratingAnything ? (
                     <div className="w-full h-full flex flex-col items-center justify-center text-center p-8 opacity-40" style={{ color: settings.textColor }}>
                        <DocumentTextIcon className="h-16 w-16 mb-6 opacity-20" />
                        <h3 className="text-2xl font-bold mb-2">Distill Your Story's Essence</h3>
                        <p className="text-base max-w-lg">
                           The AI will analyze your entire novel structure to produce professional-grade marketing materials and a complete synopsis for your query package.
                        </p>
                    </div>
                ) : (
                    <>
                        <SynopsisSection
                            title="Market Analysis"
                            description="BISAC codes, target keywords, tropes, and comp titles for professional positioning."
                            content={marketAnalysis}
                            isLoading={isGeneratingMarketAnalysis}
                            onRegenerate={onRegenerateMarketAnalysis}
                            settings={settings}
                        />
                         <SynopsisSection
                            title="Promotional Content"
                            description="Catchy taglines, a gripping logline, and a deep-dive reader profile."
                            content={promotionalContent}
                            isLoading={isGeneratingPromotionalContent}
                            onRegenerate={onRegeneratePromotionalContent}
                            settings={settings}
                        />
                         <SynopsisSection
                            title="Synopsis Generation"
                            description="A short, query-ready teaser and a detailed long-form narrative synopsis."
                            content={synopsis}
                            isLoading={isGeneratingSynopsis}
                            onRegenerate={onRegenerateSynopsis}
                            settings={settings}
                        />
                    </>
                )}
                 {error && <p className="text-red-400 text-sm text-center mt-4">{error}</p>}
            </div>
        </div>
    );
};

