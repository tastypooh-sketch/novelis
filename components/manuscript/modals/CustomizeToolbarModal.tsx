import React, { useState, useEffect } from 'react';
import { produce } from 'immer';
import { Modal } from './Modal';
import { useDialog } from '../../common/DialogProvider';
import type { EditorSettings, ToolbarVisibility, AppUpdate } from '../../../types';
import { RefreshIcon, SpinnerIcon, SparklesIconOutline } from '../../common/Icons';
import MarkdownRenderer from '../../common/MarkdownRenderer';

interface CustomizeToolbarModalProps {
    settings: EditorSettings;
    currentVisibility: Partial<ToolbarVisibility>;
    onSave: (visibility: ToolbarVisibility, geminiApiKey?: string, bookTitle?: string) => void;
    onClose: () => void;
    onSaveProject: () => Promise<boolean>;
    hasContent: boolean;
    appUpdate?: AppUpdate | null;
}

const ALL_TOOLBAR_ITEMS: { key: keyof ToolbarVisibility; label: string }[] = [
    { key: 'stats', label: 'Stats Dashboard' },
    { key: 'notes', label: 'Notes Panel' },
    { key: 'findReplace', label: 'Find & Replace' },
    { key: 'shortcuts', label: 'Shortcuts' },
    { key: 'spellcheck', label: 'Spellcheck & Proofreader' },
    { key: 'sound', label: 'Typing Sound Toggle' },
    { key: 'fullscreen', label: 'Fullscreen Toggle' },
    { key: 'focus', label: 'Focus Mode Toggle' },
    { key: 'pageTransition', label: 'Page Transition Style' },
    { key: 'readAloud', label: 'Read Aloud (TTS)'},
    { key: 'designGallery', label: 'Design Gallery' },
    { key: 'history', label: 'Version History' },
    { key: 'alignment', label: 'Text Alignment' },
    { key: 'lineHeight', label: 'Line Spacing' },
    { key: 'userGuide', label: 'User Guide' },
];

export const CustomizeToolbarModal: React.FC<CustomizeToolbarModalProps> = ({ settings, currentVisibility, onSave, onClose, onSaveProject, hasContent, appUpdate: initialUpdate }) => {
    const dialog = useDialog();
    const [visibility, setVisibility] = useState(currentVisibility);
    const [geminiApiKey, setGeminiApiKey] = useState(settings.geminiApiKey || '');
    const [bookTitle, setBookTitle] = useState(settings.bookTitle || '');
    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<string | null>(null);
    const [checkingUpdate, setCheckingUpdate] = useState(false);
    const [activeUpdate, setActiveUpdate] = useState<AppUpdate | null>(initialUpdate || null);

    const handleToggle = (key: keyof ToolbarVisibility) => {
        setVisibility(produce(draft => {
            draft[key] = !draft[key];
        }));
    };

    const handleCheckUpdate = async () => {
        // @ts-ignore
        if (window.electronAPI && window.electronAPI.checkForUpdates) {
            setCheckingUpdate(true);
            try {
                // @ts-ignore
                const result = await window.electronAPI.checkForUpdates();
                setActiveUpdate(result && result.isNewer ? result : null);
                if (result && !result.isNewer) {
                    dialog.alert("You are on the latest version of Novelis!", "Up to Date");
                }
            } catch (e) {
                console.error(e);
            } finally {
                setCheckingUpdate(false);
            }
        }
    };

    const handleSaveAndReload = async () => {
        onSave(visibility as ToolbarVisibility, geminiApiKey, bookTitle);
        
        if (hasContent) {
            setIsSaving(true);
            setSaveStatus("Saving Project...");
            try {
                const success = await onSaveProject();
                
                if (success) {
                    setSaveStatus("Saved! Reloading...");
                    setTimeout(() => window.location.reload(), 1500);
                } else {
                    setSaveStatus(null);
                    setIsSaving(false);
                    dialog.confirm("Project could not be saved automatically. Reload anyway? Any unsaved changes will be lost.", "Save Failed").then(confirmed => {
                        if (confirmed) {
                            window.location.reload();
                        }
                    });
                }
            } catch (e) {
                console.error("Save error during reload:", e);
                setIsSaving(false);
                setSaveStatus("Error saving.");
                dialog.error("An error occurred while saving.", "Save Error");
            }
        } else {
            setSaveStatus("Reloading...");
            setTimeout(() => window.location.reload(), 500);
        }
    };

    const handleFactoryReset = () => {
        dialog.confirm("Factory Reset: This will reset all visual settings, toolbar preferences, and the design gallery to their defaults. Your written content (chapters/characters) will NOT be deleted.\n\nThis is useful for applying updates to default assets.\n\nAre you sure?", "Factory Reset").then(confirmed => {
            if (confirmed) {
                localStorage.removeItem('architextSettingsV1');
                localStorage.removeItem('novelisDesignGalleryV1');
                window.location.reload();
            }
        });
    };

    const footerContent = (
        <button
            onClick={handleSaveAndReload}
            disabled={isSaving}
            className="px-6 py-2 rounded-md flex items-center justify-center gap-2 font-medium min-w-[160px]"
            style={{ backgroundColor: settings.successColor, color: 'var(--app-text)' }}
            onMouseEnter={e => { if(!isSaving) e.currentTarget.style.backgroundColor = settings.successColorHover || '' }}
            onMouseLeave={e => { if(!isSaving) e.currentTarget.style.backgroundColor = settings.successColor || '' }}
        >
            {isSaving ? (
                <>
                    <SpinnerIcon className="h-4 w-4" style={{ color: 'var(--app-text)' }} />
                    {saveStatus}
                </>
            ) : (
                "Save & Reload"
            )}
        </button>
    );

    return (
        <Modal onClose={onClose} settings={settings} title="Settings & Toolbar" className="max-w-xl" footer={footerContent}>
            <div className="space-y-8">
                
                {/* App Update Section */}
                {activeUpdate ? (
                    <div className="p-4 rounded-lg border-2 animate-in slide-in-from-top duration-500" style={{ backgroundColor: `${settings.accentColor}15`, borderColor: settings.accentColor }}>
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <SparklesIconOutline className="h-5 w-5" style={{ color: settings.accentColor }} />
                                <h3 className="font-bold text-lg">Update Recommended</h3>
                            </div>
                            <span className="text-xs font-mono px-2 py-1 rounded bg-black/20">{activeUpdate.currentVersion} → {activeUpdate.latestVersion}</span>
                        </div>
                        
                        <div className="text-sm space-y-2 mb-4 opacity-90 max-h-40 overflow-y-auto pr-2 bg-black/10 p-3 rounded border border-white/5">
                            <h4 className="font-bold text-xs uppercase opacity-50 mb-1">Release Notes</h4>
                            <MarkdownRenderer source={activeUpdate.releaseNotes} settings={settings} />
                        </div>

                        <a 
                            href={activeUpdate.updateUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block w-full text-center py-2.5 rounded-md font-bold shadow-lg transition-transform active:scale-95 hover:opacity-90"
                            style={{ backgroundColor: settings.accentColor, color: 'var(--app-text)' }}
                        >
                            Download Update
                        </a>
                    </div>
                ) : (
                    <div className="p-4 rounded-lg bg-black/10 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <RefreshIcon className="h-5 w-5 opacity-50" />
                            <div>
                                <h3 className="font-bold text-sm">Software Updates</h3>
                                <p className="text-xs opacity-50">Latest Version: Checking...</p>
                            </div>
                        </div>
                        <button 
                            onClick={handleCheckUpdate} 
                            disabled={checkingUpdate}
                            className="px-4 py-1.5 rounded-md text-xs font-medium bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
                        >
                            {checkingUpdate ? <SpinnerIcon className="h-4 w-4" /> : "Check for Updates"}
                        </button>
                    </div>
                )}

                {/* Project Details Section */}
                <div>
                    <h3 className="font-bold text-sm uppercase tracking-widest opacity-50 mb-4">Project Details</h3>
                    <div className="p-4 rounded-lg bg-black/10 space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold opacity-70 uppercase tracking-tighter">Project Title</label>
                            <input 
                                type="text"
                                value={bookTitle}
                                onChange={(e) => setBookTitle(e.target.value)}
                                placeholder="Enter your project/book title..."
                                className="w-full px-3 py-2 rounded border text-sm transition-colors"
                                style={{ 
                                    backgroundColor: 'rgba(255,255,255,0.05)', 
                                    borderColor: settings.toolbarInputBorderColor,
                                    color: settings.textColor
                                }}
                            />
                            <p className="text-[10px] opacity-40 leading-relaxed">This title will be used as a prefix for your exported project files.</p>
                        </div>
                    </div>
                </div>

                {/* API Configuration Section */}
                <div>
                    <h3 className="font-bold text-sm uppercase tracking-widest opacity-50 mb-4">API Configuration</h3>
                    <div className="p-4 rounded-lg bg-black/10 space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold opacity-70 uppercase tracking-tighter">Gemini API Key</label>
                            <input 
                                type="password"
                                value={geminiApiKey}
                                onChange={(e) => setGeminiApiKey(e.target.value)}
                                placeholder="Enter your Gemini API key..."
                                className="w-full px-3 py-2 rounded border text-sm font-mono transition-colors"
                                style={{ 
                                    backgroundColor: 'rgba(255,255,255,0.05)', 
                                    borderColor: settings.toolbarInputBorderColor,
                                    color: settings.textColor
                                }}
                            />
                            <p className="text-[10px] opacity-40 leading-relaxed">Your API key is stored locally in your browser settings and used for AI features like the world builder and character brainstormer.</p>
                        </div>
                    </div>
                </div>

                {/* Toolbar Visibility Section */}
                <div>
                    <h3 className="font-bold text-sm uppercase tracking-widest opacity-50 mb-4">Visible Toolbar Items</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
                        {ALL_TOOLBAR_ITEMS.map((item) => (
                            <label key={item.key} className="flex items-center gap-3 cursor-pointer group">
                                <div className="relative flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={visibility[item.key] !== false}
                                        onChange={() => handleToggle(item.key)}
                                        className="sr-only"
                                    />
                                    <div 
                                        className={`w-10 h-5 rounded-full transition-colors duration-200 ${visibility[item.key] !== false ? '' : 'bg-gray-600'}`}
                                        style={{ backgroundColor: visibility[item.key] !== false ? settings.accentColor : undefined }}
                                    ></div>
                                    <div className={`absolute left-1 top-1 bg-white w-3 h-3 rounded-full transition-transform duration-200 ${visibility[item.key] !== false ? 'translate-x-5' : 'translate-x-0'}`}></div>
                                </div>
                                <span className="text-sm font-medium opacity-80 group-hover:opacity-100 transition-opacity">{item.label}</span>
                            </label>
                        ))}
                    </div>
                </div>

                {/* Maintenance Section */}
                <div className="pt-6 border-t" style={{ borderColor: settings.toolbarInputBorderColor }}>
                    <div className="flex flex-col gap-6">
                        <div className="flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-sm text-red-400">Factory Reset</h3>
                                <p className="text-xs opacity-50 max-w-xs">Reset all UI settings and themes. Your manuscript data remains safe.</p>
                            </div>
                            <button 
                                onClick={handleFactoryReset}
                                className="px-4 py-2 rounded-md text-xs font-bold bg-red-900/20 text-red-400 hover:bg-red-900/40 border border-red-500/20 transition-colors"
                            >
                                Reset UI
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </Modal>
    );
};
