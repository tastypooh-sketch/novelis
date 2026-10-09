import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HistoryIcon, ClipboardIcon, ArrowPathIcon, TrashIcon } from './Icons';

interface CrashRecoveryModalProps {
    isOpen: boolean;
    timestamp: number;
    previewText: string;
    onRestore: () => void;
    onCopyToClipboard: () => void;
    onDiscard: () => void;
}

export const CrashRecoveryModal: React.FC<CrashRecoveryModalProps> = ({
    isOpen,
    timestamp,
    previewText,
    onRestore,
    onCopyToClipboard,
    onDiscard
}) => {
    if (!isOpen) return null;

    const textOnly = previewText.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').trim();
    if (!textOnly) return null;

    const dateStr = new Date(timestamp).toLocaleString();
    
    // Clean preview text from HTML tags for better display
    const cleanPreview = textOnly.substring(0, 300) + (textOnly.length > 300 ? '...' : '');

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="w-full max-w-lg bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl overflow-hidden"
                >
                    <div className="p-6 border-b border-gray-800 bg-gray-800/50">
                        <div className="flex items-center gap-3 text-amber-400 mb-2">
                            <HistoryIcon className="w-6 h-6 animate-pulse" />
                            <h2 className="text-xl font-bold font-serif">Crash Recovery Detected</h2>
                        </div>
                        <p className="text-gray-400 text-sm">
                            Novelis detected an unsaved session from <span className="text-gray-200 font-medium">{dateStr}</span>. 
                            Would you like to recover your work?
                        </p>
                    </div>

                    <div className="p-6">
                        <div className="mb-6">
                            <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-2 block">Recovered Content Preview</label>
                            <div className="p-4 bg-black/40 border border-gray-800 rounded-xl text-gray-300 text-sm font-serif italic line-height-relaxed max-h-40 overflow-y-auto">
                                {cleanPreview}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <button 
                                onClick={onRestore}
                                className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium transition-colors shadow-lg shadow-blue-900/20"
                            >
                                <ArrowPathIcon className="w-5 h-5" />
                                Restore to Document
                            </button>
                            <button 
                                onClick={onCopyToClipboard}
                                className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-xl font-medium transition-colors border border-gray-700"
                            >
                                <ClipboardIcon className="w-5 h-5" />
                                Copy to Clipboard
                            </button>
                        </div>
                    </div>

                    <div className="p-4 bg-gray-950/50 flex justify-center">
                        <button 
                            onClick={onDiscard}
                            className="flex items-center gap-2 text-red-400 hover:text-red-300 text-xs font-medium px-4 py-2 rounded-lg hover:bg-red-500/10 transition-all"
                        >
                            <TrashIcon className="w-4 h-4" />
                            Discard Recovered Session
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
