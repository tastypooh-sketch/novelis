import React, { useState } from 'react';
import { Modal } from '../manuscript/modals/Modal';
import type { EditorSettings, RewriteState } from '../../types';
import { SpinnerIcon, ClipboardIcon, CheckCircleIcon, ArrowPathIcon } from './Icons';
import { getContrastColor } from '../../utils/colorUtils';

interface RewriteModalProps {
    state: RewriteState;
    settings: EditorSettings;
    onClose: () => void;
    onRegenerate: () => void;
}

export const RewriteModal: React.FC<RewriteModalProps> = ({ state, settings, onClose, onRegenerate }) => {
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

    const handleCopy = (text: string, index: number) => {
        navigator.clipboard.writeText(text);
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
    };

    return (
        <Modal onClose={onClose} settings={settings} title="Rewrite Paragraphs" className="max-w-2xl">
            <div>
                <div className="mb-4">
                    <h4 className="text-sm font-semibold opacity-80 mb-2">Original Passage:</h4>
                    <div className="text-sm p-3 rounded italic line-clamp-4 overflow-y-auto max-h-32" style={{ backgroundColor: settings.backgroundColor, color: getContrastColor(settings.backgroundColor || '#ffffff') }}>
                        "{state.originalText}"
                    </div>
                </div>
                <div>
                    <div className="flex justify-between items-center mb-2">
                        <h4 className="text-sm font-semibold opacity-80">Rewritten Variations:</h4>
                        {!state.isLoading && (
                            <button 
                                onClick={onRegenerate}
                                className="flex items-center gap-1.5 text-xs px-2 py-1 rounded transition-colors hover:bg-black/10"
                                style={{ color: settings.accentColor }}
                                title="Generate alternative rewrites"
                            >
                                <ArrowPathIcon className="h-3.5 w-3.5" />
                                Alternatives
                            </button>
                        )}
                    </div>
                    {state.isLoading ? (
                        <div className="flex items-center justify-center p-12">
                            <SpinnerIcon className="h-10 w-10" />
                        </div>
                    ) : state.error ? (
                        <p className="text-app-danger p-4 text-center">{state.error}</p>
                    ) : (
                        <div className="space-y-4">
                            {state.rewrites?.map((rewrite, index) => (
                                <div key={index} className="p-4 rounded text-sm flex gap-4 items-start border border-black/5" style={{ backgroundColor: settings.toolbarButtonBg, color: getContrastColor(settings.toolbarButtonBg || '#000000') }}>
                                    <div className="flex-grow leading-relaxed">{rewrite}</div>
                                    <button 
                                        onClick={() => handleCopy(rewrite, index)}
                                        className="flex-shrink-0 p-2 rounded transition-colors hover:bg-black/10"
                                        style={{ color: getContrastColor(settings.toolbarButtonBg || '#000000') }}
                                        title="Copy to clipboard"
                                    >
                                        {copiedIndex === index ? (
                                            <CheckCircleIcon className="h-5 w-5 text-app-success" />
                                        ) : (
                                            <ClipboardIcon className="h-5 w-5 opacity-60 hover:opacity-100" />
                                        )}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
};
