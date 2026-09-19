import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNovelState, useNovelDispatch } from '../../../NovelContext';
import { XIcon, LightbulbIcon, BookIcon, NoteIcon } from '../../common/Icons';
import type { EditorSettings } from '../../../types';

interface ConceptSummaryModalProps {
    settings: EditorSettings;
    onClose: () => void;
}

export const ConceptSummaryModal: React.FC<ConceptSummaryModalProps> = ({ settings, onClose }) => {
    const state = useNovelState();
    const dispatch = useNovelDispatch();
    const { highLevelConcept, highLevelSummary } = state;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm" onClick={onClose}>
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl flex flex-col"
                    style={{ backgroundColor: settings.backgroundColor, color: settings.textColor, border: `1px solid ${settings.accentColor}40` }}
                    onClick={(e: React.MouseEvent) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="px-6 py-4 flex justify-between items-center border-b border-white/5">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-accent/10" style={{ color: settings.accentColor }}>
                                <NoteIcon className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold tracking-tight">Core Story Assets</h2>
                                <p className="text-xs opacity-50 font-medium uppercase tracking-wider">High-Level Concept & Summary</p>
                            </div>
                        </div>
                        <button 
                            onClick={onClose}
                            className="p-2 rounded-full hover:bg-white/5 transition-colors opacity-50 hover:opacity-100"
                        >
                            <XIcon className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                        {/* High Level Concept */}
                        <section className="space-y-3">
                            <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest opacity-60">
                                <LightbulbIcon className="w-4 h-4 text-amber-400" />
                                <span>The North Star (Concept)</span>
                            </div>
                            <div className="relative">
                                <textarea
                                    value={highLevelConcept}
                                    onChange={(e) => dispatch({ type: 'UPDATE_CONCEPT', payload: e.target.value })}
                                    placeholder="Distill your story's core essence here. What is the one-sentence pitch or the fundamental 'hook' that drives everything else?"
                                    className="w-full min-h-[120px] p-4 rounded-xl bg-black/20 border border-white/5 focus:border-accent/30 focus:ring-0 transition-all text-lg font-serif leading-relaxed placeholder:opacity-20 resize-none"
                                    style={{ border: `1px solid ${settings.accentColor}10` }}
                                />
                                <div className="absolute top-0 right-0 p-3 pointer-events-none opacity-5">
                                    <LightbulbIcon className="w-16 h-16" />
                                </div>
                            </div>
                        </section>

                        {/* High Level Summary */}
                        <section className="space-y-3">
                            <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest opacity-60">
                                <BookIcon className="w-4 h-4 text-sky-400" />
                                <span>The Executive Summary</span>
                            </div>
                            <div className="relative">
                                <textarea
                                    value={highLevelSummary}
                                    onChange={(e) => dispatch({ type: 'UPDATE_SUMMARY', payload: e.target.value })}
                                    placeholder="Write a concise overview of the entire narrative arc. Focus on major turns, character goals, and the central conflict without getting lost in the weeds of snippets or world-building."
                                    className="w-full min-h-[300px] p-4 rounded-xl bg-black/20 border border-white/5 focus:border-accent/30 focus:ring-0 transition-all text-base leading-loose placeholder:opacity-20 resize-none"
                                    style={{ border: `1px solid ${settings.accentColor}10` }}
                                />
                                <div className="absolute top-0 right-0 p-3 pointer-events-none opacity-5">
                                    <BookIcon className="w-16 h-16" />
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 border-t border-white/5 flex justify-end">
                        <button 
                            onClick={onClose}
                            className="px-6 py-2 rounded-full font-bold transition-all hover:scale-105 active:scale-95"
                            style={{ backgroundColor: settings.accentColor, color: '#fff' }}
                        >
                            Confirm Changes
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
