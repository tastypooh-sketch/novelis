import React, { useState } from 'react';
import { Modal } from '../manuscript/modals/Modal';
import type { EditorSettings } from '../../types';
import { CheckCircleIcon, XIcon, PlusIcon } from './Icons';
import { getContrastColor } from '../../utils/colorUtils';

interface SpellingSuggestion {
    word: string;
    correction: string;
}

interface AutoCorrectReviewModalProps {
    settings: EditorSettings;
    suggestions: SpellingSuggestion[];
    onAccept: (word: string, correction: string) => void;
    onIgnore: (word: string) => void;
    onClose: () => void;
}

export const AutoCorrectReviewModal: React.FC<AutoCorrectReviewModalProps> = ({ settings, suggestions, onAccept, onIgnore, onClose }) => {
    const [reviewedWords, setReviewedWords] = useState<Set<string>>(new Set());

    const handleAccept = (word: string, correction: string) => {
        onAccept(word, correction);
        setReviewedWords(prev => new Set(prev).add(word));
    };

    const handleIgnore = (word: string) => {
        onIgnore(word);
        setReviewedWords(prev => new Set(prev).add(word));
    };

    const remainingSuggestions = suggestions.filter(s => !reviewedWords.has(s.word));

    return (
        <Modal onClose={onClose} settings={settings} title="Review Spelling Suggestions" className="max-w-lg">
            <div className="p-1">
                <p className="text-sm opacity-70 mb-6 leading-relaxed">
                    We've noticed some recurring patterns in your writing this session. Would you like to add these to your auto-correct dictionary?
                </p>

                {remainingSuggestions.length > 0 ? (
                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                        {remainingSuggestions.map((suggestion, index) => (
                            <div 
                                key={index} 
                                className="flex items-center justify-between p-3 rounded-lg border border-black/5"
                                style={{ backgroundColor: settings.toolbarButtonBg, color: getContrastColor(settings.toolbarButtonBg || '#000000') }}
                            >
                                <div className="flex flex-col">
                                    <span className="text-[10px] uppercase tracking-wider opacity-50 font-bold">You typed</span>
                                    <span className="text-sm font-medium line-through opacity-60">"{suggestion.word}"</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="flex flex-col items-end">
                                        <span className="text-[10px] uppercase tracking-wider opacity-50 font-bold">Suggested</span>
                                        <span className="text-sm font-bold text-app-success">"{suggestion.correction}"</span>
                                    </div>
                                    <div className="flex gap-1 ml-2">
                                        <button 
                                            onClick={() => handleAccept(suggestion.word, suggestion.correction)}
                                            className="p-1.5 rounded-md hover:bg-app-success/20 text-app-success transition-colors"
                                            title="Add to Auto-Correct"
                                        >
                                            <PlusIcon className="h-5 w-5" />
                                        </button>
                                        <button 
                                            onClick={() => handleIgnore(suggestion.word)}
                                            className="p-1.5 rounded-md hover:bg-app-danger/20 text-app-danger transition-colors"
                                            title="Ignore"
                                        >
                                            <XIcon className="h-5 w-5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="py-12 text-center">
                        <CheckCircleIcon className="h-12 w-12 mx-auto text-app-success mb-3 opacity-20" />
                        <p className="text-sm opacity-50">All suggestions reviewed.</p>
                        <button 
                            onClick={onClose}
                            className="mt-6 px-6 py-2 rounded-md text-sm font-medium transition-colors"
                            style={{ backgroundColor: settings.accentColor, color: getContrastColor(settings.accentColor || '#000000') }}
                        >
                            Close
                        </button>
                    </div>
                )}

                {remainingSuggestions.length > 0 && (
                    <div className="mt-8 flex justify-end">
                        <button 
                            onClick={onClose}
                            className="text-xs opacity-60 hover:opacity-100 transition-opacity uppercase tracking-widest font-bold"
                        >
                            Done for now
                        </button>
                    </div>
                )}
            </div>
        </Modal>
    );
};
