import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAssemblyAI } from '../AssemblyAIContext';
import { useNovelState, useNovelDispatch } from '../../../NovelContext';
import { useDialog } from '../../common/DialogProvider';
import type { EditorSettings, NarrativeArchitectState, NarrativeArchitectChapter } from '../../../types';
import { getContrastColor } from '../../../utils/colorUtils';
import { SparklesIconOutline, XIcon, SpinnerIcon, CheckCircleIcon, ChevronRightIcon, ChevronLeftIcon, ArchiveIcon } from '../../common/Icons';
import { Modal } from '../../manuscript/modals/Modal';
import { LockedChestTab, useLockedChestSelection } from '../../common/LockedChest';

interface NarrativeArchitectModalProps {
    settings: EditorSettings;
    state: NarrativeArchitectState;
    onClose: () => void;
}

export const NarrativeArchitectModal: React.FC<NarrativeArchitectModalProps> = ({ settings, state, onClose }) => {
    const dispatch = useNovelDispatch();
    const dialog = useDialog();
    const { onInitiateNarrativeArchitect, onExpandNarrativeArchitect, onApplyNarrativeArchitect } = useAssemblyAI();
    const { chapters, characters } = useNovelState();
    
    const [step, setStep] = useState<'input' | 'preview'> ((state.chapters?.length || 0) > 0 ? 'preview' : 'input');
    const [activeTab, setActiveTab] = useState<'architect' | 'chest'>('architect');
    const { renderContextMenu, renderTaggingModal } = useLockedChestSelection('narrative-architect', settings);
    
    const premise = state.premise || '';
    const setPremise = (val: string) => dispatch({ type: 'UPDATE_NARRATIVE_ARCHITECT_FIELDS', payload: { premise: val } });
    const intent = state.intent || '';
    const setIntent = (val: string) => dispatch({ type: 'UPDATE_NARRATIVE_ARCHITECT_FIELDS', payload: { intent: val } });
    const genre = state.genre || '';
    const setGenre = (val: string) => dispatch({ type: 'UPDATE_NARRATIVE_ARCHITECT_FIELDS', payload: { genre: val } });
    const targetChapters = state.targetChapterCount || 20;
    const setTargetChapters = (val: number) => dispatch({ type: 'UPDATE_NARRATIVE_ARCHITECT_FIELDS', payload: { targetChapterCount: val } });
    const feedback = state.feedback || '';
    const setFeedback = (val: string) => dispatch({ type: 'UPDATE_NARRATIVE_ARCHITECT_FIELDS', payload: { feedback: val } });

    // Ingest existing content if run for the first time (empty premise)
    useEffect(() => {
        if (!state.premise && (chapters.length > 0 || characters.length > 0)) {
            const existingChapters = chapters
                .filter(c => c.summary || c.title !== 'Chapter')
                .map(c => `Chapter ${c.chapterNumber}: ${c.title}${c.summary ? ' - ' + c.summary : ''}`)
                .join('\n');
            
            const existingCharacters = characters
                .filter(c => c.name !== 'New Character')
                .map(c => `${c.name}${c.summary ? ': ' + c.summary : ''}`)
                .join(', ');

            if (existingChapters || existingCharacters) {
                let derivedPremise = '';
                if (existingChapters) derivedPremise += `Existing Chapters:\n${existingChapters}\n\n`;
                if (existingCharacters) derivedPremise += `Existing Characters: ${existingCharacters}`;
                
                setPremise(derivedPremise.trim());
            }
        }
    }, [state.premise, chapters, characters]);

    const handleInitiate = async () => {
        await onInitiateNarrativeArchitect(premise, intent, genre, targetChapters);
        setStep('preview');
    };

    const handleExpand = async () => {
        await onExpandNarrativeArchitect(feedback);
        setFeedback('');
    };

    const handleApply = async () => {
        if (await dialog.confirm("This will replace all existing chapters with the new Narrative Architect structure. Are you sure you wish to proceed?", "Apply Structure")) {
            onApplyNarrativeArchitect();
        }
    };

    const renderInputStep = () => (
        <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
        >
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium mb-1 opacity-70">Core Premise</label>
                    <textarea 
                        value={premise}
                        onChange={(e) => setPremise(e.target.value)}
                        placeholder="What is the heart of your story?"
                        className="w-full h-24 bg-black/20 rounded border border-white/10 p-3 text-sm focus:outline-none focus:border-white/30 transition-colors resize-none"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1 opacity-70">Narrative Intent & Tonal Focus</label>
                    <textarea 
                        value={intent}
                        onChange={(e) => setIntent(e.target.value)}
                        placeholder="What is the desired emotional arc or high-level intent?"
                        className="w-full h-20 bg-black/20 rounded border border-white/10 p-3 text-sm focus:outline-none focus:border-white/30 transition-colors resize-none"
                    />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1 opacity-70">Genre</label>
                        <input 
                            type="text"
                            value={genre}
                            onChange={(e) => setGenre(e.target.value)}
                            placeholder="e.g. Literary Fiction, Thriller"
                            className="w-full bg-black/20 rounded border border-white/10 p-3 text-sm focus:outline-none focus:border-white/30 transition-colors"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1 opacity-70">Target Chapter Count</label>
                        <input 
                            type="number"
                            min="1"
                            max="100"
                            value={targetChapters}
                            onChange={(e) => setTargetChapters(parseInt(e.target.value) || 20)}
                            className="w-full bg-black/20 rounded border border-white/10 p-3 text-sm focus:outline-none focus:border-white/30 transition-colors"
                        />
                    </div>
                </div>
            </div>

            <div className="flex justify-end pt-4">
                <button 
                    onClick={handleInitiate}
                    disabled={!premise || state.isGenerating}
                    className="flex items-center gap-2 px-6 py-3 rounded-full font-medium transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
                    style={{ 
                        backgroundColor: settings.accentColor,
                        color: getContrastColor(settings.accentColor)
                    }}
                >
                    {state.isGenerating ? <SpinnerIcon className="h-4 w-4" /> : <SparklesIconOutline className="h-4 w-4" />}
                    Initialise Macro Structure
                </button>
            </div>
        </motion.div>
    );

    const renderPreviewStep = () => (
        <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col h-[600px]"
        >
            <div className="flex items-center justify-between mb-4 px-1">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => setStep('input')}
                        className="p-2 rounded-full hover:bg-white/5 transition-colors"
                        title="Back to Parameters"
                    >
                        <ChevronLeftIcon className="h-5 w-5 opacity-60" />
                    </button>
                    <div>
                        <h3 className="font-medium">Proposed Chapter Framework</h3>
                        {state.proposedDistribution && (
                            <p className="text-xs opacity-50">
                                Act I: {state.proposedDistribution.act1} • Act II: {state.proposedDistribution.act2} • Act III: {state.proposedDistribution.act3}
                            </p>
                        )}
                    </div>
                </div>
                <button 
                    onClick={handleApply}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:bg-white/10 border border-white/10"
                >
                    <CheckCircleIcon className="h-4 w-4 text-green-400" />
                    Apply to Novel
                </button>
            </div>

            <div className="flex-grow overflow-y-auto pr-2 space-y-3 scrollbar-thin scrollbar-thumb-white/10">
                {state.chapters.map((chapter, idx) => (
                    <div 
                        key={chapter.id}
                        className="p-3 bg-white/5 border border-white/10 rounded-lg group hover:border-white/20 transition-all"
                    >
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] uppercase tracking-wider font-bold opacity-40">Chapter {idx + 1} — Act {chapter.act}</span>
                            <span className="text-[10px] font-mono opacity-30 group-hover:opacity-60 transition-opacity">Novelis Architect</span>
                        </div>
                        <h4 className="font-medium text-sm mb-1">{chapter.title}</h4>
                        <p className="text-xs italic opacity-60 mb-2">"{chapter.tagline}"</p>
                        <p className="text-[11px] opacity-40 leading-relaxed line-clamp-2 group-hover:line-clamp-none transition-all">
                            {chapter.summary}
                        </p>
                    </div>
                ))}
            </div>

            <div className="mt-6 pt-4 border-t border-white/10">
                <label className="block text-sm font-medium mb-2 opacity-70">Refine the Structure (Feedback)</label>
                <div className="flex gap-2">
                    <input 
                        type="text"
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        placeholder="e.g. 'Add more tension to the middle of Act II' or 'Focus more on the sub-plot in Chapter 5'..."
                        className="flex-grow bg-black/20 rounded-lg border border-white/10 p-3 text-sm focus:outline-none focus:border-white/30 transition-colors"
                        onKeyDown={(e) => e.key === 'Enter' && handleExpand()}
                    />
                    <button 
                        onClick={handleExpand}
                        disabled={!feedback || state.isGenerating}
                        className="px-4 rounded-lg flex items-center justify-center transition-all disabled:opacity-30"
                        style={{ backgroundColor: settings.accentColor }}
                    >
                        {state.isGenerating ? <SpinnerIcon className="h-4 w-4" /> : <ChevronRightIcon className="h-5 w-5" />}
                    </button>
                </div>
            </div>
        </motion.div>
    );

    return (
        <Modal 
            onClose={onClose} 
            title="Narrative Architect"
            className="max-w-3xl"
            settings={settings}
        >
            {renderContextMenu()}
            {renderTaggingModal()}
            <div className="p-1">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-3 p-4 bg-accent/5 rounded-xl border border-accent/10 flex-grow mr-4">
                        <div className="p-2 rounded-lg bg-accent/10">
                            <SparklesIconOutline className="h-5 w-5" style={{ color: settings.accentColor }} />
                        </div>
                        <div>
                            <p className="text-sm font-medium">Outside-In Structural Refinement</p>
                            <p className="text-xs opacity-50">Analytical chapter distribution across a three-act framework.</p>
                        </div>
                    </div>
                    <div className="flex bg-black/20 p-1 rounded-lg self-start">
                        <button 
                            onClick={() => setActiveTab('architect')}
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'architect' ? 'shadow-sm shadow-black/20' : 'opacity-50'}`}
                            style={{ 
                                backgroundColor: activeTab === 'architect' ? settings.toolbarButtonBg : 'transparent',
                                color: settings.textColor
                            }}
                        >
                            Architect
                        </button>
                        <button 
                            onClick={() => setActiveTab('chest')}
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'chest' ? 'shadow-sm shadow-black/20' : 'opacity-50'}`}
                            style={{ 
                                backgroundColor: activeTab === 'chest' ? settings.toolbarButtonBg : 'transparent',
                                color: settings.textColor
                            }}
                        >
                            <ArchiveIcon className="w-4 h-4" />
                            Locked Chest
                        </button>
                    </div>
                </div>

                {state.error && (
                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-xs flex items-center gap-2">
                        <XIcon className="h-4 w-4" />
                        {state.error}
                    </div>
                )}

                {activeTab === 'chest' ? (
                    <div className="h-[600px] overflow-y-auto">
                        <LockedChestTab modalId="narrative-architect" settings={settings} />
                    </div>
                ) : step === 'input' ? renderInputStep() : renderPreviewStep()}
            </div>
        </Modal>
    );
};
