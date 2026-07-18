
import React from 'react';
import type { EditorSettings } from '../../types';

interface ExitModalProps {
    settings: EditorSettings;
    onCancel: () => void;
    onExitWithoutSaving: () => void;
    onSaveAndExit: () => void;
}

export const ExitModal: React.FC<ExitModalProps> = ({ 
    settings, 
    onCancel, 
    onExitWithoutSaving, 
    onSaveAndExit 
}) => {
    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 animate-in fade-in duration-300">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onCancel}
            />
            
            {/* Modal Content */}
            <div 
                className="relative w-full max-w-md p-8 rounded-2xl shadow-2xl border animate-in zoom-in-95 duration-300"
                style={{ 
                    backgroundColor: settings.toolbarBg || '#1F2937',
                    borderColor: `${settings.accentColor}40`,
                    color: settings.toolbarText || '#FFFFFF'
                }}
            >
                <div className="flex flex-col items-center text-center space-y-6">
                    {/* Icon/Decoration */}
                    <div 
                        className="w-16 h-16 rounded-full flex items-center justify-center mb-2"
                        style={{ backgroundColor: `${settings.accentColor}20` }}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke={settings.accentColor} strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>

                    <h2 className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'Lora, serif' }}>
                        Unsaved Changes
                    </h2>
                    
                    <p className="text-sm opacity-80 leading-relaxed">
                        You have changes that haven't been saved yet. <br/>
                        Would you like to save before exiting Novelis?
                    </p>

                    <div className="w-full space-y-3 pt-4">
                        <button
                            onClick={onSaveAndExit}
                            className="w-full py-3 px-4 rounded-xl font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
                            style={{ 
                                backgroundColor: settings.accentColor,
                                color: '#FFFFFF'
                            }}
                        >
                            Save and Exit
                        </button>
                        
                        <button
                            onClick={onExitWithoutSaving}
                            className="w-full py-3 px-4 rounded-xl font-semibold transition-all hover:bg-black/20"
                            style={{ 
                                border: `1px solid ${settings.dangerColor || '#be123c'}40`,
                                color: settings.dangerColor || '#be123c'
                            }}
                        >
                            Exit Without Saving
                        </button>
                        
                        <button
                            onClick={onCancel}
                            className="w-full py-3 px-4 rounded-xl font-medium opacity-60 hover:opacity-100 transition-all"
                        >
                            Back to Writing
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
