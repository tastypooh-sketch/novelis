import React, { useState } from 'react';
import { Modal } from '../manuscript/modals/Modal';
import type { EditorSettings, WhatIfState } from '../../types';
import { SpinnerIcon, ClipboardIcon, CheckCircleIcon, ArrowPathIcon } from './Icons';
import { getContrastColor } from '../../utils/colorUtils';

interface WhatIfModalProps {
    state: WhatIfState;
    settings: EditorSettings;
    onClose: () => void;
    onRegenerate: () => void;
}

export const WhatIfModal: React.FC<WhatIfModalProps> = ({ state, settings, onClose, onRegenerate }) => {
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

    const handleCopy = (text: string, index: number) => {
        navigator.clipboard.writeText(text);
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
    };

    return (
        <Modal onClose={onClose} settings={settings} title="Brainstorm Alternatives" className="max-w-2xl">
            <div>
                <div className="mb-4">
                    <h4 className="text-sm font-semibold opacity-80 mb-2">Original Text:</h4>
                    <p className="text-sm p-3 rounded italic" style={{ backgroundColor: settings.backgroundColor, color: getContrastColor(settings.backgroundColor || '#ffffff') }}>
                        "{state.originalText}"
                    </p>
                </div>
                <div>
                    <div className="flex justify-between items-center mb-2">
                        <h4 className="text-sm font-semibold opacity-80">Alternative Scenarios:</h4>
                        {!state.isLoading && (
                            <button 
                                onClick={onRegenerate}
                                className="flex items-center gap-1.5 text-xs px-2 py-1 rounded transition-colors hover:bg-black/10"
                                style={{ color: settings.accentColor }}
                                title="Generate more alternatives"
                            >
                                <ArrowPathIcon className="h-3.5 w-3.5" />
                                Alternatives
                            </button>
                        )}
                    </div>
                    {state.isLoading ? (
                        <div className="flex items-center justify-center p-8">
                            <SpinnerIcon className="h-8 w-8" />
                        </div>
                    ) : state.error ? (
                        <p className="text-app-danger">{state.error}</p>
                    ) : (
                        <div className="space-y-3">
                            {state.suggestions?.map((suggestion, index) => (
                                <div key={index} className="p-3 rounded text-sm flex gap-3 items-start" style={{ backgroundColor: settings.toolbarButtonBg, color: getContrastColor(settings.toolbarButtonBg || '#000000') }}>
                                    <div className="flex-grow">{suggestion}</div>
                                    <button 
                                        onClick={() => handleCopy(suggestion, index)}
                                        className="flex-shrink-0 p-1.5 rounded transition-colors hover:bg-black/10"
                                        style={{ color: getContrastColor(settings.toolbarButtonBg || '#000000') }}
                                        title="Copy to clipboard"
                                    >
                                        {copiedIndex === index ? (
                                            <CheckCircleIcon className="h-4 w-4 text-app-success" />
                                        ) : (
                                            <ClipboardIcon className="h-4 w-4 opacity-60 hover:opacity-100" />
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