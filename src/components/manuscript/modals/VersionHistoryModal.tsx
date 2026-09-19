import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { EditorSettings, IChapter } from '../../../types';
import { SpinnerIcon } from '../../common/Icons';

interface VersionHistoryModalProps {
    settings: EditorSettings;
    activeChapter: IChapter;
    directoryHandle: FileSystemDirectoryHandle | null;
    projectPath?: string | null;
    onRestore: (content: string) => void;
    onClose: () => void;
}

interface VersionFile {
    name: string;
    handle?: FileSystemFileHandle;
    timestamp: Date;
    content?: string;
}

export const VersionHistoryModal: React.FC<VersionHistoryModalProps> = ({ settings, activeChapter, directoryHandle, projectPath, onRestore, onClose }) => {
    const [history, setHistory] = useState<VersionFile[]>([]);
    const [selectedVersion, setSelectedVersion] = useState<VersionFile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [onClose]);

    const fetchHistory = useCallback(async () => {
        // --- 1. Desktop (Electron) History Loading ---
        // @ts-ignore
        if (window.electronAPI && projectPath) {
            try {
                const chapterPrefix = `${activeChapter.title}-${activeChapter.chapterNumber}_`;
                // @ts-ignore
                const entries = await window.electronAPI.readHistoryList(projectPath, chapterPrefix);
                
                const versions: VersionFile[] = entries.map((entry: any) => {
                    const timestampStr = entry.name.replace(chapterPrefix, '').replace('.rtf', '');
                    const match = timestampStr.match(/^(\d{4})-(\d{2})-(\d{2})_(\d{2})-(\d{2})-(\d{2})$/);
                    let dateObj: Date;
                    
                    if (match) {
                        const [_, y, m, d, hh, min, ss] = match;
                        dateObj = new Date(Date.UTC(parseInt(y), parseInt(m) - 1, parseInt(d), parseInt(hh), parseInt(min), parseInt(ss)));
                    } else {
                        // Fallback to original parsing
                        dateObj = new Date(timestampStr.replace(/_/g, 'T').replace(/-/g, ':') + 'Z');
                        if (isNaN(dateObj.getTime())) {
                            dateObj = new Date(entry.mtimeMs || Date.now());
                        }
                    }

                    return {
                        name: entry.name,
                        timestamp: dateObj
                    };
                });

                versions.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
                setHistory(versions);
            } catch (e) {
                setError("Could not read desktop version history folder.");
                console.error(e);
            } finally {
                setIsLoading(false);
            }
            return;
        }

        // --- 2. Web (FileSystemAccess API) History Loading ---
        if (!directoryHandle) {
            setError("No project folder is open. Save your work to a folder to enable version history.");
            setIsLoading(false);
            return;
        }
        
        try {
            const historyHandle = await directoryHandle.getDirectoryHandle('Cumulative Saves');
            const chapterPrefix = `${activeChapter.title}-${activeChapter.chapterNumber}_`;
            const versions: VersionFile[] = [];

            // @ts-ignore
            for await (const entry of historyHandle.values()) {
                if (entry.kind === 'file' && entry.name.startsWith(chapterPrefix)) {
                    const timestampStr = entry.name.replace(chapterPrefix, '').replace('.rtf', '');
                    const match = timestampStr.match(/^(\d{4})-(\d{2})-(\d{2})_(\d{2})-(\d{2})-(\d{2})$/);
                    let dateObj: Date;

                    if (match) {
                        const [_, y, m, d, hh, min, ss] = match;
                        dateObj = new Date(Date.UTC(parseInt(y), parseInt(m) - 1, parseInt(d), parseInt(hh), parseInt(min), parseInt(ss)));
                    } else {
                        // Fallback to original parsing
                        dateObj = new Date(timestampStr.replace(/_/g, 'T').replace(/-/g, ':') + 'Z');
                        if (isNaN(dateObj.getTime())) {
                            dateObj = new Date();
                        }
                    }

                    versions.push({ name: entry.name, handle: entry as FileSystemFileHandle, timestamp: dateObj });
                }
            }
            versions.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
            setHistory(versions);
        } catch (e) {
             if (e instanceof DOMException && e.name === 'NotFoundError') {
                setError("No 'Cumulative Saves' folder found. Previous versions will appear here once you save changes.");
            } else {
                setError("Could not read version history.");
                console.error(e);
            }
        } finally {
            setIsLoading(false);
        }
    }, [directoryHandle, projectPath, activeChapter.title, activeChapter.chapterNumber]);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    const loadVersionContent = async (version: VersionFile) => {
        if (version.content) {
            setSelectedVersion(version);
            return;
        }
        setSelectedVersion(version); // Select immediately to show loading state in preview
        try {
            let text = '';
            // @ts-ignore
            if (window.electronAPI && projectPath) {
                // @ts-ignore
                text = await window.electronAPI.readHistoryFile(projectPath, version.name);
            } else if (version.handle) {
                const file = await version.handle.getFile();
                text = await file.text();
            } else {
                throw new Error("Missing file accessor.");
            }
            
            // Basic RTF to plain text conversion for preview
            let content = text;
            const bodyMatch = content.match(/\\pard/);
            if (bodyMatch && bodyMatch.index) {
                content = content.substring(bodyMatch.index);
            } else {
                content = content.replace(/\{\\rtf1.*?\\pard/s, '');
            }
    
            content = content.replace(/\\par\s?/g, '\n');
            content = content.replace(/\\line\s?/g, '\n');
            content = content.replace(/\{\\b\s?([^}]+)\}/g, '$1');
            content = content.replace(/\{\\i\s?([^}]+)\}/g, '$1');
            content = content.replace(/\\u(\d+)\?/g, (_, code) => String.fromCharCode(parseInt(code, 10)));
            content = content.replace(/\\'[0-9a-fA-F]{2}/g, '');
            content = content.replace(/\\([a-z]+-?)\d*\s?/g, '');
            content = content.replace(/[\{\}]/g, '');
            const plainText = content.trim();
 
            const versionWithContent = { ...version, content: plainText };
            setSelectedVersion(versionWithContent);
            setHistory(h => h.map(v => v.name === version.name ? versionWithContent : v));
        } catch (e) {
            console.error("Failed to load version content", e);
            setError("Failed to load version content.");
            setSelectedVersion(v => v ? {...v, content: 'Error loading preview.'} : null);
        }
    };
    
    const handleRestoreClick = () => {
        if (selectedVersion?.content) {
            // This is a simplified restore. For now, we convert newlines in the plain text preview back to divs.
            const htmlContent = `<div>${selectedVersion.content.replace(/\r?\n/g, '</div><div>')}</div>`.replace(/<div><\/div>/g, '<div><br></div>');
            onRestore(htmlContent);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm p-4" aria-modal="true" role="dialog">
            <div ref={modalRef} className="w-full m-4 rounded-lg shadow-2xl flex flex-col max-w-4xl" style={{ backgroundColor: settings.toolbarBg, color: settings.toolbarText, maxHeight: '90vh' }}>
                <header className="flex-shrink-0 flex items-center justify-between p-4 border-b" style={{ borderColor: settings.toolbarInputBorderColor }}>
                    <h2 className="text-lg font-semibold">{`Version History for ${activeChapter.chapterNumber}. ${activeChapter.title}`}</h2>
                    <button onClick={onClose} className="p-1 rounded-full" style={{ color: settings.toolbarText }} onMouseEnter={e => e.currentTarget.style.backgroundColor = settings.toolbarButtonHoverBg || ''} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'} aria-label="Close modal">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-5 w-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </header>
                <main className="flex-grow p-6 overflow-y-auto grid grid-cols-3 gap-6 min-h-[60vh]">
                    <div className="col-span-1 border-r pr-4 flex flex-col" style={{borderColor: settings.toolbarInputBorderColor}}>
                        <h3 className="font-semibold mb-2 flex-shrink-0">Versions</h3>
                        {isLoading && <div className="flex items-center gap-2"><SpinnerIcon /><span>Loading...</span></div>}
                        {error && <p className="text-sm text-red-400">{error}</p>}
                        <div className="overflow-y-auto flex-grow">
                            {history.map(v => (
                                <button
                                    key={v.name}
                                    onClick={() => loadVersionContent(v)}
                                    className="w-full text-left p-2 rounded text-sm"
                                    style={{backgroundColor: selectedVersion?.name === v.name ? settings.accentColor : 'transparent', color: selectedVersion?.name === v.name ? 'var(--app-text)' : settings.toolbarText}}
                                    onMouseEnter={e => {if (selectedVersion?.name !== v.name) e.currentTarget.style.backgroundColor = settings.toolbarButtonHoverBg || ''}}
                                    onMouseLeave={e => {if (selectedVersion?.name !== v.name) e.currentTarget.style.backgroundColor = 'transparent'}}
                                >
                                    {v.timestamp.toLocaleString()}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="col-span-2 flex flex-col">
                        <h3 className="font-semibold mb-2 flex-shrink-0">Preview (Plain Text)</h3>
                        <div className="h-full w-full p-2 rounded border overflow-y-auto whitespace-pre-wrap flex-grow" style={{backgroundColor: settings.backgroundColor, borderColor: settings.toolbarInputBorderColor}}>
                            {selectedVersion?.content === undefined && selectedVersion ? <div className="flex items-center gap-2"><SpinnerIcon/>Loading preview...</div> : selectedVersion?.content ?? "Select a version to preview its content."}
                        </div>
                    </div>
                </main>
                <footer className="flex-shrink-0 flex justify-end gap-4 p-4 border-t" style={{borderColor: settings.toolbarInputBorderColor}}>
                    <button onClick={onClose} className="px-4 py-2 rounded-md" style={{backgroundColor: settings.toolbarButtonBg}}>Close</button>
                    <button
                        onClick={handleRestoreClick}
                        disabled={!selectedVersion?.content}
                        className="px-4 py-2 rounded-md disabled:opacity-60"
                        style={{ backgroundColor: settings.accentColor, color: 'var(--app-text)' }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = settings.accentColorHover || ''}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = settings.accentColor || ''}
                    >
                        Restore Version
                    </button>
                </footer>
            </div>
        </div>
    );
};
