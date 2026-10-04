
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { EditorSettings } from '../../../types';
import { ViewGridIcon, XIcon, CheckCircleIcon } from '../../common/Icons';
import { getContrastColor } from '../../../utils/colorUtils';

export interface CollageExportConfig {
    mode: 'auto' | 'fixed-file' | 'fixed-grid';
    fixedFileCount: number;
    fixedGridCount: number;
}

interface CollageExportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onExport: (config: CollageExportConfig) => void;
    settings: EditorSettings;
    itemCount: number;
    title: string;
}

export const CollageExportModal: React.FC<CollageExportModalProps> = ({
    isOpen, onClose, onExport, settings, itemCount, title
}) => {
    const [mode, setMode] = useState<'auto' | 'fixed-file' | 'fixed-grid'>('auto');
    const [fixedFileCount, setFixedFileCount] = useState(2);
    const [fixedGridCount, setFixedGridCount] = useState(12);

    const handleExport = () => {
        onExport({
            mode,
            fixedFileCount,
            fixedGridCount
        });
        onClose();
    };

    const getEstimatedFiles = () => {
        if (mode === 'auto') {
            return Math.ceil(itemCount / 12);
        }
        if (mode === 'fixed-file') {
            return fixedFileCount;
        }
        return Math.ceil(itemCount / fixedGridCount);
    };

    const estimatedFiles = getEstimatedFiles();

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/80 backdrop-blur-md"
                        onClick={onClose}
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-xl p-8 rounded-3xl shadow-2xl border flex flex-col space-y-6"
                        style={{
                            backgroundColor: settings.toolbarBg || '#1F2937',
                            borderColor: `${settings.accentColor}40`,
                            color: settings.toolbarText || '#FFFFFF'
                        }}
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-2xl" style={{ backgroundColor: `${settings.accentColor}20` }}>
                                    <ViewGridIcon className="h-8 w-8" style={{ color: settings.accentColor }} />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
                                    <p className="text-sm opacity-60">Configure your collage export</p>
                                </div>
                            </div>
                            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                                <XIcon className="h-6 w-6" />
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <button
                                    onClick={() => setMode('auto')}
                                    className={`p-4 rounded-2xl border-2 transition-all flex flex-col gap-2 text-left ${mode === 'auto' ? 'border-opacity-100 bg-white/5' : 'border-transparent bg-black/20 opacity-60 hover:opacity-100'}`}
                                    style={{ borderColor: mode === 'auto' ? settings.accentColor : 'transparent' }}
                                >
                                    <span className="font-bold">Auto</span>
                                    <span className="text-xs opacity-70">Aesthetic best fit. Optimal image sizes.</span>
                                </button>
                                <button
                                    onClick={() => setMode('fixed-file')}
                                    className={`p-4 rounded-2xl border-2 transition-all flex flex-col gap-2 text-left ${mode === 'fixed-file' ? 'border-opacity-100 bg-white/5' : 'border-transparent bg-black/20 opacity-60 hover:opacity-100'}`}
                                    style={{ borderColor: mode === 'fixed-file' ? settings.accentColor : 'transparent' }}
                                >
                                    <span className="font-bold">Fixed Files</span>
                                    <span className="text-xs opacity-70">Spread across a set number of pages.</span>
                                </button>
                                <button
                                    onClick={() => setMode('fixed-grid')}
                                    className={`p-4 rounded-2xl border-2 transition-all flex flex-col gap-2 text-left ${mode === 'fixed-grid' ? 'border-opacity-100 bg-white/5' : 'border-transparent bg-black/20 opacity-60 hover:opacity-100'}`}
                                    style={{ borderColor: mode === 'fixed-grid' ? settings.accentColor : 'transparent' }}
                                >
                                    <span className="font-bold">Fixed Grid</span>
                                    <span className="text-xs opacity-70">Max images per individual sheet.</span>
                                </button>
                            </div>

                            <div className="p-6 rounded-2xl bg-black/20 space-y-4">
                                {mode === 'fixed-file' && (
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold opacity-70 uppercase tracking-widest">Number of Files (Pages)</label>
                                        <div className="flex items-center gap-4">
                                            <input
                                                type="range"
                                                min="1"
                                                max="10"
                                                value={fixedFileCount}
                                                onChange={(e) => setFixedFileCount(parseInt(e.target.value))}
                                                className="flex-grow accent-current"
                                                style={{ color: settings.accentColor }}
                                            />
                                            <span className="font-mono text-xl font-bold w-12 text-center">{fixedFileCount}</span>
                                        </div>
                                    </div>
                                )}

                                {mode === 'fixed-grid' && (
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold opacity-70 uppercase tracking-widest">Max Images Per File</label>
                                        <div className="flex items-center gap-4">
                                            <input
                                                type="range"
                                                min="1"
                                                max={itemCount}
                                                value={fixedGridCount}
                                                onChange={(e) => setFixedGridCount(parseInt(e.target.value))}
                                                className="flex-grow accent-current"
                                                style={{ color: settings.accentColor }}
                                            />
                                            <span className="font-mono text-xl font-bold w-12 text-center">{fixedGridCount}</span>
                                        </div>
                                    </div>
                                )}

                                {mode === 'auto' && (
                                    <div className="py-2">
                                        <p className="text-sm italic opacity-70">The algorithm will balance quality and page count automatically based on {itemCount} images.</p>
                                    </div>
                                )}

                                <div className="pt-4 border-t border-white/10 flex justify-between items-center">
                                    <div className="text-xs font-bold uppercase tracking-widest opacity-50">
                                        Estimated Result
                                    </div>
                                    <div className="flex items-center gap-2 font-bold text-sm">
                                        <span style={{ color: settings.accentColor }}>{estimatedFiles}</span>
                                        <span>{estimatedFiles === 1 ? 'PNG File' : 'PNG Files'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleExport}
                            className="w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 shadow-xl transition-all active:scale-[0.98] hover:brightness-110"
                            style={{
                                backgroundColor: settings.accentColor,
                                color: getContrastColor(settings.accentColor)
                            }}
                        >
                            <CheckCircleIcon className="h-6 w-6" />
                            Generate & Export Collage
                        </button>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
