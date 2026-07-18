
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import type { EditorSettings } from '../../types';
import { motion, AnimatePresence } from 'framer-motion';

interface DialogOptions {
    title?: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    type?: 'alert' | 'confirm' | 'error';
}

interface DialogContextType {
    alert: (message: string, title?: string) => Promise<void>;
    confirm: (message: string, title?: string) => Promise<boolean>;
    error: (message: string, title?: string) => Promise<void>;
}

const DialogContext = createContext<DialogContextType | undefined>(undefined);

export const useDialog = () => {
    const context = useContext(DialogContext);
    if (!context) {
        throw new Error('useDialog must be used within a DialogProvider');
    }
    return context;
};

export const DialogProvider: React.FC<{ children: ReactNode; settings: EditorSettings }> = ({ children, settings }) => {
    const [dialog, setDialog] = useState<(DialogOptions & { resolve: (val: any) => void }) | null>(null);

    const showDialog = useCallback((options: DialogOptions) => {
        return new Promise<any>((resolve) => {
            setDialog({ ...options, resolve });
        });
    }, []);

    const handleAlert = useCallback((message: string, title: string = 'Notice') => {
        return showDialog({ message, title, type: 'alert', confirmLabel: 'OK' });
    }, [showDialog]);

    const handleConfirm = useCallback((message: string, title: string = 'Confirm') => {
        return showDialog({ message, title, type: 'confirm', confirmLabel: 'Confirm', cancelLabel: 'Cancel' });
    }, [showDialog]);

    const handleError = useCallback((message: string, title: string = 'Error') => {
        return showDialog({ message, title, type: 'error', confirmLabel: 'Dismiss' });
    }, [showDialog]);

    const handleClose = (value: any) => {
        if (dialog) {
            dialog.resolve(value);
            setDialog(null);
        }
    };

    // Attach to window for non-component usage
    React.useEffect(() => {
        (window as any).novelis = {
            alert: handleAlert,
            confirm: handleConfirm,
            error: handleError
        };
    }, [handleAlert, handleConfirm, handleError]);

    return (
        <DialogContext.Provider value={{ alert: handleAlert, confirm: handleConfirm, error: handleError }}>
            {children}
            <AnimatePresence>
                {dialog && (
                    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                            onClick={() => dialog.type === 'alert' || dialog.type === 'error' ? handleClose(true) : null}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-md p-8 rounded-2xl shadow-2xl border flex flex-col items-center text-center space-y-6"
                            style={{
                                backgroundColor: settings.toolbarBg || '#1F2937',
                                borderColor: `${dialog.type === 'error' ? (settings.dangerColor || '#be123c') : settings.accentColor}40`,
                                color: settings.toolbarText || '#FFFFFF'
                            }}
                        >
                            <div 
                                className="w-16 h-16 rounded-full flex items-center justify-center mb-2"
                                style={{ 
                                    backgroundColor: `${dialog.type === 'error' ? (settings.dangerColor || '#be123c') : settings.accentColor}20` 
                                }}
                            >
                                {dialog.type === 'error' ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke={settings.dangerColor || '#be123c'} strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                ) : dialog.type === 'confirm' ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke={settings.accentColor} strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke={settings.accentColor} strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                )}
                            </div>

                            <h2 className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'Lora, serif' }}>
                                {dialog.title}
                            </h2>

                            <p className="text-sm opacity-80 leading-relaxed whitespace-pre-wrap">
                                {dialog.message}
                            </p>

                            <div className="w-full space-y-3 pt-4">
                                <button
                                    onClick={() => handleClose(true)}
                                    className="w-full py-3 px-4 rounded-xl font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
                                    style={{
                                        backgroundColor: dialog.type === 'error' ? (settings.dangerColor || '#be123c') : settings.accentColor,
                                        color: '#FFFFFF'
                                    }}
                                >
                                    {dialog.confirmLabel}
                                </button>
                                {dialog.type === 'confirm' && (
                                    <button
                                        onClick={() => handleClose(false)}
                                        className="w-full py-3 px-4 rounded-xl font-medium opacity-60 hover:opacity-100 transition-all"
                                    >
                                        {dialog.cancelLabel}
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </DialogContext.Provider>
    );
};
