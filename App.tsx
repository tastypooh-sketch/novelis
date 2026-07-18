import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { Manuscript } from './Manuscript';
import { Assembly } from './Assembly';
import type { EditorSettings, ToolbarVisibility, ICharacter, IChapter, Shortcut, WritingGoals, AssemblyPanel, GalleryItem } from './types';
import { useNovelState, useNovelDispatch } from './NovelContext';
import { generateId, extractJson } from './utils/common';
import { WhatIfModal } from './components/common/WhatIfModal';
import { getImageColors } from './utils/colorUtils';
import { Type } from "@google/genai";
import { getAI } from './utils/ai';
import { TitleBar } from './components/common/TitleBar';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { CommandPalette } from './components/common/CommandPalette';
import { EULAModal } from './components/common/EULAModal';
import { ExitModal } from './components/common/ExitModal';
import { DialogProvider } from './components/common/DialogProvider';
import { PostVariationsModal } from './components/social/PostVariationsModal';
import { createProjectZip, generateTimestampedName, parseTimestampFromFilename, parseNoveSync, generateInitialChapterRtf } from './utils/manuscriptUtils';

type AppMode = 'manuscript' | 'assembly';

const DEFAULT_GALLERY_ITEMS_URLS = [
    { url: 'https://static.vecteezy.com/system/resources/previews/036/215/115/non_2x/ai-generated-abstract-black-leaf-on-dark-background-elegant-design-generated-by-ai-free-photo.jpg', category: 'Backgrounds' as const },
    { url: 'https://static.vecteezy.com/system/resources/previews/036/185/896/non_2x/ai-generated-green-soft-background-free-photo.jpg', category: 'Backgrounds' as const },
    { url: 'https://static.vecteezy.com/system/resources/previews/035/598/194/non_2x/ai-generated-love-filled-background-with-gentle-lighting-hearts-and-space-for-heartfelt-messages-free-photo.jpg', category: 'Backgrounds' as const },
    { url: 'https://static.vecteezy.com/system/resources/previews/036/228/869/non_2x/ai-generated-ivory-soft-background-free-photo.jpg', category: 'Backgrounds' as const },
    { url: 'https://static.vecteezy.com/system/resources/previews/035/812/116/non_2x/ai-generated-graceful-light-elegant-background-photo.jpg', category: 'Backgrounds' as const },
    { url: 'https://static.vecteezy.com/system/resources/thumbnails/029/349/797/small/abstract-christmas-background-with-empty-space-smoke-bokeh-lights-copy-space-for-your-text-merry-xmas-happy-new-year-festive-backdrop-generative-ai-photo.jpeg', category: 'Backgrounds' as const },
    { url: 'https://static.vecteezy.com/system/resources/thumbnails/035/940/968/small/ai-generated-chic-design-elegant-background-photo.jpg', category: 'Backgrounds' as const },
    { url: 'https://static.vecteezy.com/system/resources/thumbnails/035/812/116/small/ai-generated-graceful-light-elegant-background-photo.jpg', category: 'Backgrounds' as const },
    { url: 'https://static.vecteezy.com/system/resources/thumbnails/053/748/239/small/an-old-brown-paper-with-leaves-on-it-photo.jpg', category: 'Backgrounds' as const },
    { url: 'https://static.vecteezy.com/system/resources/thumbnails/010/818/982/small/multicolor-background-modern-dark-low-poly-effect-with-abstract-gradient-for-backdrop-free-vector.jpg', category: 'Backgrounds' as const },
    { url: 'https://static.vecteezy.com/system/resources/thumbnails/007/278/150/small/dark-background-abstract-with-light-effect-vector.jpg', category: 'Backgrounds' as const },
    { url: 'https://static.vecteezy.com/system/resources/thumbnails/073/050/678/small/purple-and-pink-hexagonal-pattern-gradient-background-vector.jpg', category: 'Backgrounds' as const },
    { url: 'https://static.vecteezy.com/system/resources/thumbnails/071/443/047/small/sepia-toned-floral-background-with-beige-and-brown-flowers-photo.jpg', category: 'Backgrounds' as const },
    { url: 'https://static.vecteezy.com/system/resources/previews/020/526/952/non_2x/abstract-subtle-background-free-vector.jpg', category: 'Backgrounds' as const },
    { url: 'https://static.vecteezy.com/system/resources/previews/021/565/020/non_2x/minimalist-abstract-background-design-smooth-and-clean-subtle-background-free-vector.jpg', category: 'Backgrounds' as const },
    { url: 'https://static.vecteezy.com/system/resources/previews/068/630/930/non_2x/elegant-abstract-background-with-subtle-flowing-light-blue-curves-on-a-deep-blue-gradient-offering-a-modern-and-sophisticated-feel-for-various-digital-projects-vector.jpg', category: 'Backgrounds' as const },
    { url: 'https://static.vecteezy.com/system/resources/previews/044/792/171/non_2x/a-red-and-black-background-with-a-bright-light-gradient-art-design-idea-template-free-vector.jpg', category: 'Backgrounds' as const },
    { url: 'https://static.vecteezy.com/system/resources/thumbnails/008/014/636/small/abstract-dynamic-black-background-design-vector.jpg', category: 'Backgrounds' as const },
    { url: 'https://static.vecteezy.com/system/resources/previews/010/654/924/non_2x/wave-lights-with-black-background-and-focus-spot-light-free-vector.jpg', category: 'Backgrounds' as const },
    { url: 'https://static.vecteezy.com/system/resources/thumbnails/033/863/113/small/grunge-paper-background-with-space-for-text-or-image-old-paper-texture-old-paper-sheet-vintage-aged-original-background-or-texture-ai-generated-free-photo.jpg', category: 'Backgrounds' as const },
];


const GlobalStyles: React.FC<{ settings: EditorSettings }> = ({ settings }) => (
    <style>{`
      html, body, #root {
        height: 100%;
        width: 100%;
        margin: 0;
        padding: 0;
        overflow: hidden;
      }
      
      /* Paragraph Indentation Rules */
      .editor-content div,
      .editor-content p {
        text-indent: 1em;
        margin: 0;
        orphans: 2; 
        widows: 2;
        min-height: 1em; /* Ensure empty lines created on Enter have height */
      }
      
      /* Chapter Opening Paragraph: No Indent */
      .editor-content > div:first-child,
      .editor-content > p:first-child {
        text-indent: 0;
      }

      /* Scene Breaks (Centered): No Indent */
      .editor-content div[style*="text-align: center"],
      .editor-content p[style*="text-align: center"],
      .editor-content div[align="center"],
      .editor-content p[align="center"] {
        text-indent: 0 !important;
      }
      
      /* --- FIX for font size and line height inconsistencies --- */
      .editor-content div,
      .editor-content p,
      .editor-content span,
      .editor-content font,
      .editor-content i,
      .editor-content em,
      .editor-content b,
      .editor-content strong {
        font-size: 1em !important;
        line-height: inherit !important;
        font-family: inherit !important;
        background-color: transparent !important;
        color: inherit !important;
      }
      /* --- End of FIX --- */
      
      @keyframes flash-accent-glow {
        0% { 
            filter: drop-shadow(0 0 12px ${settings.accentColor || '#4ade80'}) brightness(1.3); 
            transform: scale(1.05);
        }
        50% {
            filter: drop-shadow(0 0 20px ${settings.accentColor || '#4ade80'}) brightness(1.5);
            transform: scale(1.1);
        }
        100% { 
            filter: none;
            transform: scale(1);
        }
      }
      .save-flash {
        animation: flash-accent-glow 0.8s ease-in-out forwards;
        z-index: 50;
      }
      
      @keyframes border-flash {
        0% { opacity: 0; }
        30% { opacity: 1; }
        100% { opacity: 0; }
      }
      .save-border-indicator {
        position: fixed;
        inset: 0;
        pointer-events: none;
        z-index: 200;
        border: 3px solid ${settings.accentColor || '#4ade80'};
        animation: border-flash 1.5s ease-in-out forwards;
      }
      
      /* --- ADDED for new Character Tile design --- */
      .character-grid {
        grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr));
      }
      .character-tagline-clamped {
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .glance-text-clamped {
        display: -webkit-box;
        -webkit-line-clamp: 3;
        -webkit-box-orient: vertical;
        overflow: hidden;
        text-overflow: ellipsis;
      }
       .summary-clamped {
        display: -webkit-box;
        -webkit-line-clamp: 4;
        -webkit-box-orient: vertical;
        overflow: hidden;
        text-overflow: ellipsis;
      }
       .summary-clamped-2line {
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      /* --- END ADDED --- */

      /* --- ADDED for image regeneration animation --- */
      @keyframes pulse-bg {
        0% { background-color: rgba(0,0,0, 0.3); }
        50% { background-color: rgba(0,0,0, 0.5); }
        100% { background-color: rgba(0,0,0, 0.3); }
      }
      .image-reloading-overlay {
        animation: pulse-bg 2s infinite;
      }
      /* --- END ADDED --- */

      /* --- ADDED for Snippets Panel --- */
      .snippet-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 1rem;
        align-items: start;
      }
      /* --- END ADDED --- */

      /* Minimalist Scrollbar Styling */
      /* For Firefox */
      * {
        scrollbar-width: thin;
        scrollbar-color: var(--scrollbar-thumb-color) var(--scrollbar-track-color);
      }

      /* For Webkit Browsers (Chrome, Safari, Edge) */
      ::-webkit-scrollbar {
        width: 12px;
        height: 12px;
      }
      ::-webkit-scrollbar-track {
        background: var(--scrollbar-track-color);
      }
      ::-webkit-scrollbar-thumb {
        background-color: var(--scrollbar-thumb-color);
        border-radius: 10px;
        border: 3px solid var(--scrollbar-track-color);
      }
      ::-webkit-scrollbar-thumb:hover {
        background-color: var(--scrollbar-thumb-hover-color);
      }

      /* --- UI Selection & Focus Styles (Minimalist/Nove-style) --- */
      ::selection {
        background-color: ${settings.textColor}40; /* 25% opacity of text color */
        color: inherit;
      }
      
      input:focus, textarea:focus, select:focus {
        outline: none !important;
        border-color: ${settings.textColor} !important;
        box-shadow: 0 0 0 1px ${settings.textColor} !important;
      }

      /* Editor content itself should not have the box outline on focus */
      .editor-content:focus {
        box-shadow: none !important;
        border-color: transparent !important;
      }
    `}</style>
);


const DEFAULT_TOOLBAR_VISIBILITY: ToolbarVisibility = {
    stats: true,
    notes: true,
    findReplace: true,
    shortcuts: true,
    spellcheck: true,
    sound: true,
    fullscreen: true,
    focus: true,
    pageTransition: true,
    readAloud: true,
    designGallery: true,
    history: true,
    alignment: true,
    lineHeight: true,
    userGuide: true,
};

const SplashScreen: React.FC<{ visible: boolean; settings: EditorSettings }> = ({ visible, settings }) => {
    const [shouldRender, setShouldRender] = useState(true);

    useEffect(() => {
        if (!visible) {
            const timer = setTimeout(() => setShouldRender(false), 1000); // Wait for fade out
            return () => clearTimeout(timer);
        }
    }, [visible]);

    if (!shouldRender) return null;

    return (
        <div 
            className={`fixed inset-0 z-[90] flex items-center justify-center transition-opacity duration-1000 ease-in-out ${visible ? 'opacity-100' : 'opacity-0'}`}
            style={{ backgroundColor: settings.backgroundColor || '#111827' }}
        >
             <div className="flex flex-col items-center animate-pulse select-none">
                <a 
                    href="https://www.thomascorfield.com" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-8xl font-bold tracking-[0.2em] hover:opacity-80 transition-opacity"
                    style={{ 
                        fontFamily: 'Lora, serif', 
                        color: settings.textColor,
                    }}
                >
                    Novel<span style={{ color: settings.accentColor }}>i</span>s<span className="text-2xl align-top ml-1 opacity-50 font-sans font-normal tracking-normal">TM</span>
                </a>
             </div>
        </div>
    );
};

const App: React.FC = () => {
    const [mode, setMode] = useState<AppMode>('manuscript');
    const [isFocusMode, setIsFocusMode] = useState(false);
    const [showSplash, setShowSplash] = useState(true);
    const [isSavingVisual, setIsSavingVisual] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(!!document.fullscreenElement);
    const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
    const [isExitModalOpen, setIsExitModalOpen] = useState(false);
    const [isNavVisible, setIsNavVisible] = useState(true);
    const [isMouseOverNav, setIsMouseOverNav] = useState(false);
    const [isMouseInZone, setIsMouseInZone] = useState(false);
    
    // Autohide Nav Logic
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            const centerX = window.innerWidth / 2;
            const thresholdX = 250; 
            const thresholdY = 40; // Trigger when mouse is near top center (covering TitleBar area)

            const inZone = e.clientY <= thresholdY && Math.abs(e.clientX - centerX) <= thresholdX;
            setIsMouseInZone(inZone);
            if (inZone) {
                setIsNavVisible(true);
            }
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    useEffect(() => {
        // Only start hide timer if we aren't currently hovering it AND not in trigger zone
        if (isNavVisible && !isMouseOverNav && !isMouseInZone) {
            const timer = setTimeout(() => {
                setIsNavVisible(false);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [isNavVisible, isMouseOverNav, isMouseInZone]);
    
    // Dirty State Tracking
    const [isDirty, setIsDirty] = useState(false);
    const isFirstStateChange = useRef(true);

    // --- EULA LOGIC ---
    const [hasAcceptedEULA, setHasAcceptedEULA] = useState(() => localStorage.getItem('novelis_eula_accepted') === 'true');

    // Access full state for save
    const novelState = useNovelState(); 
    const novelStateRef = useRef(novelState);
    useEffect(() => {
        novelStateRef.current = novelState;
    }, [novelState]);

    const { chapters, whatIfState, shortcuts, socialMediaState } = novelState;
    const dispatch = useNovelDispatch();

    const isBlankProject = useMemo(() => {
        return chapters.length === 1 && 
               (chapters[0].title === 'Chapter' || chapters[0].title === 'Chapter 1') && 
               (!chapters[0].content || chapters[0].content === '<div><br></div>' || chapters[0].content === '');
    }, [chapters]);
    const showEULA = !hasAcceptedEULA && isBlankProject;
    
    // Local App State
    const [activeChapterId, setActiveChapterId] = useState<string>(chapters[0]?.id || '');
    
    const [writingGoals, setWritingGoals] = useState<WritingGoals>({ manuscriptGoal: 110000, dailyGoal: 2500 });
    const [directoryHandle, setDirectoryHandle] = useState<FileSystemDirectoryHandle | null>(null);
    
    // PROJECT PATH AND NAME
    const [projectPath, setProjectPath] = useState<string | null>(null);
    const [projectName, setProjectName] = useState<string>('My_Novel');

    const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);

    // Global Settings
    const [settings, setSettings] = useState<EditorSettings>({
        fontFamily: 'Lora',
        fontSize: 1.4,
        lineHeight: 1.8,
        backgroundColor: '#111827',
        textColor: '#FFFFFF',
        textAlign: 'left', // Default alignment
        backgroundImage: null,
        backgroundImageOpacity: 0.5,
        toolbarBg: '#1F2937',
        toolbarText: '#FFFFFF',
        toolbarButtonBg: '#374151',
        toolbarButtonHoverBg: '#4B5563',
        toolbarInputBorderColor: '#4B5563',
        accentColor: '#2563eb',
        accentColorHover: '#1d4ed8',
        successColor: '#16a34a',
        successColorHover: '#15803d',
        dangerColor: '#be123c',
        dangerColorHover: '#9f1239',
        dropdownBg: '#374151',
        transitionStyle: 'scroll',
        toolbarVisibility: DEFAULT_TOOLBAR_VISIBILITY,
        assemblyTileStyle: 'solid',
        assemblyFontFamily: 'Inter',
        tileColorSource: 'palette',
        narratorVoice: 'Kore',
        ttsAccent: 'en-GB',
        ttsSpeed: 1.2,
        ttsVolume: 0.6,
        soundVolume: 0.75, // Default volume set to 75%
        isSoundEnabled: false, // Default audio off
        galleryStartupBehavior: 'fixed',
        showBookSpine: false,
        bookTitle: '',
    });

    const settingsRef = useRef(settings);
    useEffect(() => {
        settingsRef.current = settings;
    }, [settings]);

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    // Handle Keyboard Lock for Focus+Fullscreen to prioritize exiting Focus Mode on Escape
    useEffect(() => {
        const attemptLock = async () => {
            // Check if API is available and we are in the right state
            if (isFocusMode && isFullscreen && 'keyboard' in navigator && 'lock' in (navigator as any).keyboard) {
                try {
                    // Request to lock 'Escape' so it doesn't exit fullscreen immediately
                    await (navigator as any).keyboard.lock(['Escape']);
                } catch (e) {
                    console.warn('Keyboard lock failed (Escape key interception might not work):', e);
                }
            } else if ('keyboard' in navigator && 'unlock' in (navigator as any).keyboard) {
                // Unlock if not in the specific mode
                (navigator as any).keyboard.unlock();
            }
        };
        
        attemptLock();

        // Cleanup: unlock on unmount or state change
        return () => {
            if ('keyboard' in navigator && 'unlock' in (navigator as any).keyboard) {
                (navigator as any).keyboard.unlock();
            }
        };
    }, [isFocusMode, isFullscreen]);

    const handleToggleFocusMode = useCallback(() => {
        setIsFocusMode(prev => !prev);
    }, []);

    const handleToggleFullscreen = useCallback(() => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    }, []);

    // Handle Global Keydown (including Escape, Cmd+K)
    useEffect(() => {
        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isFocusMode) {
                e.preventDefault(); // Prevent default fullscreen exit if locked
                e.stopPropagation();
                handleToggleFocusMode();
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                setIsCommandPaletteOpen(prev => !prev);
            }
        };
        window.addEventListener('keydown', handleGlobalKeyDown, { capture: true });
        return () => window.removeEventListener('keydown', handleGlobalKeyDown, { capture: true });
    }, [isFocusMode, handleToggleFocusMode]); 

    // --- STARTUP LOGIC ---
    useEffect(() => {
        const initializeApp = async () => {
            // @ts-ignore
            if (window.electronAPI) {
                const lastPath = localStorage.getItem('novelis_last_project_path');
                
                if (lastPath) {
                    try {
                        // @ts-ignore
                        const latestZip = await window.electronAPI.scanForLatestZip(lastPath);
                        if (latestZip) {
                            const parsed = await parseNoveSync(new File([latestZip.content as any], latestZip.name));
                            if (parsed && parsed.state) {
                            dispatch({ type: 'LOAD_PROJECT', payload: parsed.state });
                            if (parsed.settings) {
                                setSettings(prev => {
                                    const next = { ...prev, ...parsed.settings };
                                    settingsRef.current = next;
                                    return next;
                                });
                            }
                                setProjectPath(lastPath);
                                
                                // Extract name from path if possible
                                // @ts-ignore
                                const pathParts = lastPath.split(/[\\/]/);
                                setProjectName(pathParts[pathParts.length - 1] || 'My_Novel');

                                // Clear sync flag if we successfully loaded
                                localStorage.removeItem('novelis_sync_flag');

                                // Reset dirty state after load
                                setTimeout(() => {
                                    isFirstStateChange.current = false;
                                    setIsDirty(false);
                                }, 200);
                                return;
                            }
                        }
                    } catch (e) {
                        console.error("Failed to auto-load project:", e);
                    }
                }
            }
        };
        initializeApp();
    }, []);

    // Sync Dirty Status to Electron
    useEffect(() => {
        // @ts-ignore
        if (window.electronAPI && window.electronAPI.updateDirtyStatus) {
            // @ts-ignore
            window.electronAPI.updateDirtyStatus(isDirty);
        }
    }, [isDirty]);

    // Track Changes to Novel State or Settings
    useEffect(() => {
        if (isFirstStateChange.current) return;
        setIsDirty(true);
    }, [novelState, settings]);

    // --- BULLETPROOF SAVE LOGIC ---
    const handleSaveToFolder = useCallback(async (forceNewFolder: boolean = false): Promise<boolean> => {
        const currentSettings = settingsRef.current;
        const currentState = novelStateRef.current;

        const generateChapterVersionFileName = (chapter: IChapter): string => {
            const rawTitle = chapter.title || 'Untitled';
            const cleanTitle = rawTitle.replace(/[^a-z0-9]/gi, '_').substring(0, 30);
            const now = new Date();
            const yyyy = now.getFullYear();
            const mm = String(now.getMonth() + 1).padStart(2, '0');
            const dd = String(now.getDate()).padStart(2, '0');
            const hh = String(now.getHours()).padStart(2, '0');
            const min = String(now.getMinutes()).padStart(2, '0');
            const ss = String(now.getSeconds()).padStart(2, '0');
            return `${rawTitle}-${chapter.chapterNumber}_${yyyy}-${mm}-${dd}_${hh}-${min}-${ss}.rtf`;
        };

        const chaptersList = currentState.chapters || [];

        // @ts-ignore
        if (window.electronAPI) {
            let targetPath = forceNewFolder ? null : projectPath;
            
            // 1. Initial Save or Force New Folder: Prompt for Folder
            if (!targetPath) {
                // @ts-ignore
                targetPath = await window.electronAPI.selectDirectory();
                if (targetPath) {
                    setProjectPath(targetPath);
                    // Extract project name from folder name
                    // @ts-ignore
                    const parts = targetPath.split(/[\\/]/);
                    const folderName = parts[parts.length - 1];
                    setProjectName(folderName);
                    localStorage.setItem('novelis_last_project_path', targetPath);
                } else {
                    return false; // Cancelled
                }
            }

            if (targetPath) {
                // 2. Generate ZIP Buffer
                const blob = await createProjectZip(currentState, currentSettings);
                const arrayBuffer = await blob.arrayBuffer();
                const buffer = new Uint8Array(arrayBuffer);
                const fileName = generateTimestampedName(currentSettings.bookTitle || projectName);

                // 3. Write ZIP to Folder
                // @ts-ignore
                const success = await window.electronAPI.writeZipToFolder(targetPath, fileName, buffer);
                
                if (success) {
                    // 4. Save Version History for active chapter in Electron
                    const activeChapter = chaptersList.find(c => c.id === activeChapterId) || chaptersList[0];
                    if (activeChapter) {
                        const rtfContent = generateInitialChapterRtf(activeChapter);
                        const historyFileName = generateChapterVersionFileName(activeChapter);
                        try {
                            // @ts-ignore
                            await window.electronAPI.writeHistoryVersion(targetPath, historyFileName, rtfContent);
                        } catch (err) {
                            console.warn("Could not save to history subfolder in Electron:", err);
                        }
                    }

                    setIsSavingVisual(true);
                    setTimeout(() => setIsSavingVisual(false), 1500);
                    setIsDirty(false); // Reset dirty bit after successful save
                    return true;
                } else {
                    (window as any).novelis?.error("Failed to write file to disk.", "Save Error");
                    return false;
                }
            } else {
                return false; 
            }
        } else if ('showDirectoryPicker' in window) {
            try {
                let dirHandle = forceNewFolder ? null : directoryHandle;
                if (!dirHandle) {
                    // @ts-ignore
                    dirHandle = await window.showDirectoryPicker();
                    if (dirHandle) {
                        setDirectoryHandle(dirHandle);
                        setProjectName(dirHandle.name);
                        localStorage.setItem('novelis_last_project_name', dirHandle.name);
                    } else {
                        return false; // Cancelled
                    }
                }

                if (dirHandle) {
                    // 1. Archive existing Zips in root (Spec 2)
                    try {
                        const cumulativeDirHandle = await dirHandle.getDirectoryHandle('Cumulative Saves', { create: true });
                        
                        // @ts-ignore
                        for await (const entry of dirHandle.values()) {
                            if (entry.kind === 'file' && entry.name.endsWith('.zip')) {
                                // In File System Access API, "moving" is often "copy then delete"
                                // but we can use move() if supported (it's part of the spec now)
                                try {
                                    const file = await entry.getFile();
                                    const newFileHandle = await cumulativeDirHandle.getFileHandle(entry.name, { create: true });
                                    const writable = await newFileHandle.createWritable();
                                    await writable.write(file);
                                    await writable.close();
                                    await dirHandle.removeEntry(entry.name);
                                } catch (moveErr) {
                                    console.error(`Failed to archive ${entry.name}:`, moveErr);
                                }
                            }
                        }
                    } catch (archiveErr) {
                        console.warn("Failed to process automatic archiving:", archiveErr);
                    }

                    // 2. Generate ZIP of whole project
                    const blob = await createProjectZip(currentState, currentSettings);
                    const fileName = generateTimestampedName(currentSettings.bookTitle || projectName);
                    
                    // Write whole ZIP
                    const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
                    const writable = await fileHandle.createWritable();
                    await writable.write(blob);
                    await writable.close();

                    // 2. Save active chapter's RTF as a history file
                    const activeChapter = chaptersList.find(c => c.id === activeChapterId) || chaptersList[0];
                    if (activeChapter) {
                        const rtfContent = generateInitialChapterRtf(activeChapter);
                        const historyFileName = generateChapterVersionFileName(activeChapter);
                        
                        try {
                            const historyDirHandle = await dirHandle.getDirectoryHandle('Cumulative Saves', { create: true });
                            const historyFileHandle = await historyDirHandle.getFileHandle(historyFileName, { create: true });
                            const historyWritable = await historyFileHandle.createWritable();
                            await historyWritable.write(rtfContent);
                            await historyWritable.close();
                        } catch (err) {
                            console.warn("Could not save to history subfolder on web:", err);
                        }
                    }

                    setIsSavingVisual(true);
                    setTimeout(() => setIsSavingVisual(false), 1500);
                    setIsDirty(false); // Reset dirty bit after successful save
                    return true;
                }
                return false;
            } catch (err: any) {
                if (err.name !== 'AbortError') {
                    (window as any).novelis?.error("Error saving to folder: " + err, "Save Error");
                }
                return false;
            }
        } else {
            console.warn("Save feature requires Electron environment or updated Web Logic.");
            return false;
        }
    }, [projectPath, directoryHandle, projectName, activeChapterId]);

    const handleOpenProjectFolder = useCallback(async () => {
        // @ts-ignore
        if (window.electronAPI) {
            // @ts-ignore
            const targetPath = await window.electronAPI.selectDirectory();
            if (targetPath) {
                try {
                    // @ts-ignore
                    const latestZip = await window.electronAPI.scanForLatestZip(targetPath);
                    if (latestZip) {
                        const parsed = await parseNoveSync(new File([latestZip.content as any], latestZip.name));
                        if (parsed && parsed.state) {
                            dispatch({ type: 'LOAD_PROJECT', payload: parsed.state });
                            if (parsed.settings) {
                                setSettings(prev => {
                                    const next = { ...prev, ...parsed.settings };
                                    settingsRef.current = next;
                                    return next;
                                });
                            }
                            setProjectPath(targetPath);
                            
                            // Extract name from path if possible
                            // @ts-ignore
                            const pathParts = targetPath.split(/[\\/]/);
                            const nameFromPath = pathParts[pathParts.length - 1] || 'My_Novel';
                            setProjectName(nameFromPath);
                            localStorage.setItem('novelis_last_project_path', targetPath);
                            
                            setIsDirty(false);
                            isFirstStateChange.current = false;
                        }
                    } else {
                        // @ts-ignore
                        await window.electronAPI.showMessageBox({
                            type: 'info',
                            title: 'No Project Found',
                            message: 'No valid Novelis project (.zip) was found in this folder.'
                        });
                    }
                } catch (e) {
                    console.error("Failed to load project:", e);
                    // @ts-ignore
                    await window.electronAPI.showMessageBox({
                        type: 'error',
                        title: 'Load Error',
                        message: 'An error occurred while attempting to load the project.'
                    });
                }
            }
        } else if ('showDirectoryPicker' in window) {
            try {
                // @ts-ignore
                const dirHandle = await window.showDirectoryPicker();
                if (dirHandle) {
                    setDirectoryHandle(dirHandle);
                    setProjectName(dirHandle.name);
                }
            } catch (e) {
                console.error("Directory picker cancelled or failed:", e);
            }
        }
    }, [dispatch, settings]);

    // Global Save Shortcut
    useEffect(() => {
        const handleSaveShortcut = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                handleSaveToFolder(false);
            }
        };
        window.addEventListener('keydown', handleSaveShortcut);
        return () => window.removeEventListener('keydown', handleSaveShortcut);
    }, [handleSaveToFolder]);

    // Handle Save and Exit request from Electron Main Process
    useEffect(() => {
        // @ts-ignore
        if (window.electronAPI && window.electronAPI.onSaveAndExit) {
            // @ts-ignore
            const unsubscribe = window.electronAPI.onSaveAndExit(async () => {
                const saved = await handleSaveToFolder();
                if (saved) {
                    // @ts-ignore
                    window.electronAPI.close();
                }
            });
            return () => unsubscribe();
        }
    }, [handleSaveToFolder]);

    // Handle themed exit dialogue request
    useEffect(() => {
        // @ts-ignore
        if (window.electronAPI && window.electronAPI.onRequestCloseConfirmation) {
            // @ts-ignore
            const unsubscribe = window.electronAPI.onRequestCloseConfirmation(() => {
                setIsExitModalOpen(true);
            });
            return () => unsubscribe();
        }
    }, []);

    const handleExitWithoutSaving = () => {
        // @ts-ignore
        if (window.electronAPI && window.electronAPI.forceClose) {
            // @ts-ignore
            window.electronAPI.forceClose();
        }
    };

    const handleSaveAndExit = async () => {
        const saved = await handleSaveToFolder();
        if (saved) {
            handleExitWithoutSaving();
        }
    };

    // Prevent accidental close without saving (WEB ONLY)
    useEffect(() => {
        // @ts-ignore
        if (!window.electronAPI) {
            const handleBeforeUnload = (e: BeforeUnloadEvent) => {
                e.preventDefault();
                e.returnValue = ''; 
            };
            window.addEventListener('beforeunload', handleBeforeUnload);
            return () => window.removeEventListener('beforeunload', handleBeforeUnload);
        }
    }, []);

    // Set tracker to active after initial splash/load buffer if no project was auto-loaded
    useEffect(() => {
        const timer = setTimeout(() => {
            if (isFirstStateChange.current) {
                isFirstStateChange.current = false;
                setIsDirty(false);
            }
        }, 800);
        return () => clearTimeout(timer);
    }, []);

    const handleSettingsChange = useCallback(async (newSettings: Partial<EditorSettings>) => {
        if (newSettings.backgroundImage && typeof newSettings.backgroundImage === 'string') {
            try {
                const imageTheme = await getImageColors(newSettings.backgroundImage);
                setSettings(prev => {
                    const next = { ...prev, ...newSettings, ...imageTheme };
                    settingsRef.current = next;
                    return next;
                });
            } catch (error) {
                console.warn("Could not extract colors from image, using fallback.", error);
                setSettings(prev => {
                    const next = { ...prev, ...newSettings };
                    settingsRef.current = next;
                    return next;
                });
            }
        } else {
            setSettings(prev => {
                const next = { ...prev, ...newSettings };
                settingsRef.current = next;
                return next;
            });
        }
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            setShowSplash(false);
        }, 3000);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        // Ensure activeChapterId is valid if chapters change
        if (!chapters.find(c => c.id === activeChapterId)) {
            setActiveChapterId(chapters[0]?.id || '');
        }
    }, [chapters, activeChapterId]);
    
    useEffect(() => {
        const savedSettings = localStorage.getItem('architextSettingsV1');
        const savedGallery = localStorage.getItem('novelisDesignGalleryV1');

        let parsedSettings = {}
        if (savedSettings) {
            parsedSettings = JSON.parse(savedSettings);
            const finalVisibility = { ...DEFAULT_TOOLBAR_VISIBILITY, ...( (parsedSettings as EditorSettings).toolbarVisibility || {}) };
            setSettings(prev => {
                const next = { ...prev, ...parsedSettings, toolbarVisibility: finalVisibility };
                settingsRef.current = next;
                return next;
            });
        }

        let parsedGallery: GalleryItem[] = [];
        if (savedGallery) {
            parsedGallery = JSON.parse(savedGallery);
            setGalleryItems(parsedGallery);
        } else {
            parsedGallery = DEFAULT_GALLERY_ITEMS_URLS.map(item => ({ ...item, id: generateId() }));
            setGalleryItems(parsedGallery);
        }

        if ((parsedSettings as EditorSettings).galleryStartupBehavior === 'random' && parsedGallery.length > 0) {
            const randomIndex = Math.floor(Math.random() * parsedGallery.length);
            const randomItem = parsedGallery[randomIndex];
            if (randomItem?.url) {
                handleSettingsChange({ backgroundImage: randomItem.url });
            }
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('architextSettingsV1', JSON.stringify(settings));
    }, [settings]);

    useEffect(() => {
        localStorage.setItem('novelisDesignGalleryV1', JSON.stringify(galleryItems));
    }, [galleryItems]);

    
    useEffect(() => {
        const root = document.documentElement;
        root.style.setProperty('--app-bg', settings.backgroundColor);
        root.style.setProperty('--app-text', settings.textColor);
        root.style.setProperty('--app-accent', settings.accentColor || '#2563eb');
        root.style.setProperty('--app-accent-hover', settings.accentColorHover || '#1d4ed8');
        root.style.setProperty('--app-success', settings.successColor || '#16a34a');
        root.style.setProperty('--app-success-hover', settings.successColorHover || '#15803d');
        root.style.setProperty('--app-danger', settings.dangerColor || '#be123c');
        root.style.setProperty('--app-danger-hover', settings.dangerColorHover || '#9f1239');
        root.style.setProperty('--toolbar-bg', settings.toolbarBg || '#1F2937');
        root.style.setProperty('--toolbar-text', settings.toolbarText || '#FFFFFF');
        root.style.setProperty('--toolbar-button-bg', settings.toolbarButtonBg || '#374151');
        root.style.setProperty('--toolbar-button-hover', settings.toolbarButtonHoverBg || '#4B5563');
        root.style.setProperty('--toolbar-border', settings.toolbarInputBorderColor || '#4B5563');
        root.style.setProperty('--dropdown-bg', settings.dropdownBg || '#374151');

        root.style.setProperty('--scrollbar-track-color', settings.toolbarBg || '#111827');
        root.style.setProperty('--scrollbar-thumb-color', settings.toolbarButtonHoverBg || '#4B5563');
        root.style.setProperty('--scrollbar-thumb-hover-color', settings.accentColor || '#2563eb');
    }, [settings]);

    
    const handlePanelChange = (panel: AssemblyPanel) => {
        dispatch({ type: 'SET_ACTIVE_ASSEMBLY_PANEL', payload: panel });
    };

    const handleNavigation = useCallback((view: 'manuscript' | 'assembly', subView?: string, id?: string) => {
        setMode(view);
        if (view === 'assembly' && subView) {
            handlePanelChange(subView as AssemblyPanel);
            if (id) {
                // Use setTimeout to ensure the view renders before we scroll/expand
                setTimeout(() => {
                    if (subView === 'characters') {
                        dispatch({ type: 'UPDATE_ASSEMBLY_VIEW_STATE', payload: { expandedCharacterId: id } });
                    } else if (subView === 'world') {
                        dispatch({ type: 'UPDATE_ASSEMBLY_VIEW_STATE', payload: { worldPanelView: 'repository', expandedWorldItemId: id } });
                    }
                }, 100);
            }
        } else if (view === 'manuscript' && id) {
            setActiveChapterId(id);
        }
    }, [dispatch]);

    const onGenerateWhatIf = useCallback(async (text: string, context: string) => {
        dispatch({ type: 'UPDATE_WHAT_IF_STATE', payload: { isOpen: true, isLoading: true, originalText: text, suggestions: null, error: null } });
        try {
            const prompt = `You are a creative writing assistant. The user has highlighted a key decision point or event in their story. Your task is to brainstorm 2-3 plausible and interesting alternative outcomes or "what if" scenarios.

For each scenario, provide a brief, one-paragraph description of the alternative path. Make sure your suggestions are creative but still logically consistent with the surrounding story context provided.

**Surrounding Context:**
"""
${context}
"""

**Highlighted Text (The event to change):**
"""
${text}
"""

Return your response as a JSON array of strings, where each string is a single paragraph describing one alternative scenario.`;

            const response = await getAI(settings.geminiApiKey).models.generateContent({
                model: 'gemini-1.5-flash',
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING }
                    }
                }
            });

            const suggestions = extractJson<string[]>(response.text || '') || [];
            
            dispatch({ type: 'UPDATE_WHAT_IF_STATE', payload: { isLoading: false, suggestions } });
        } catch (e) {
            console.error(e);
            dispatch({ type: 'UPDATE_WHAT_IF_STATE', payload: { isLoading: false, error: 'Failed to generate suggestions.' } });
        }
    }, [dispatch]);

    const handleAcceptEULA = () => {
        setHasAcceptedEULA(true);
        localStorage.setItem('novelis_eula_accepted', 'true');
    };

    const navClasses = `
        absolute top-12 left-1/2 -translate-x-1/2 z-[110] print:hidden
        transition-transform duration-500 ease-in-out
        ${((mode === 'manuscript' && isFocusMode) || !isNavVisible) ? '-translate-y-32' : 'translate-y-0'}
    `;

    const headerButtonClasses = "px-4 py-2 rounded-md text-sm font-medium transition-colors focus:outline-none";
    
    const bgImageWithOverlay = useMemo(() => {
        if (!settings.backgroundImage) return 'none';
        const overlayOpacity = 1 - (settings.backgroundImageOpacity ?? 0.5);
        const color = settings.backgroundColor || '#111827';
        // Convert hex to rgb for the gradient
        const rgb = color.match(/\w\w/g)?.map(x => parseInt(x, 16));
        if (!rgb) return `linear-gradient(rgba(0, 0, 0, ${overlayOpacity}), rgba(0, 0, 0, ${overlayOpacity})), url(${settings.backgroundImage})`;
        return `linear-gradient(rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${overlayOpacity}), rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${overlayOpacity})), url(${settings.backgroundImage})`;
    }, [settings.backgroundImage, settings.backgroundImageOpacity, settings.backgroundColor]);

    return (
        <ErrorBoundary state={novelState}>
            <DialogProvider settings={settings}>
                <div 
                    className="h-screen w-screen relative overflow-hidden" 
                    style={{
                        backgroundColor: settings.backgroundColor,
                        color: settings.textColor,
                    }}
                >
                 {showEULA && <EULAModal settings={settings} onAccept={handleAcceptEULA} />}

                 {/* Title Bar for Window Controls - Hide in fullscreen */}
                 {!isFullscreen && <TitleBar backgroundColor={settings.toolbarBg || '#1F2937'} textColor={settings.toolbarText || '#FFFFFF'} />}

                 <SplashScreen visible={showSplash} settings={settings} />
                 {isSavingVisual && <div className="save-border-indicator" />}
                 {settings.backgroundImage && (
                    <div 
                        className="absolute inset-0"
                        style={{
                            backgroundImage: bgImageWithOverlay,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                        }}
                    />
                )}
                <div className={`relative z-10 h-full w-full flex flex-col ${isFullscreen ? '' : 'pt-8'}`}> {/* Conditional Padding Top */}
                    <GlobalStyles settings={settings} />
                    <nav 
                        className={navClasses}
                        onMouseEnter={() => setIsMouseOverNav(true)}
                        onMouseLeave={() => setIsMouseOverNav(false)}
                    >
                        <div 
                            className="flex items-center gap-2 p-1 rounded-lg shadow-lg"
                            style={{
                                backgroundColor: `${settings.toolbarBg}B3`, // 70% opacity
                                backdropFilter: 'blur(8px)',
                                WebkitBackdropFilter: 'blur(8px)',
                            }}
                        >
                            <button
                                onClick={() => setMode('manuscript')}
                                className={headerButtonClasses}
                                style={{
                                    backgroundColor: mode === 'manuscript' ? settings.accentColor : 'transparent',
                                    color: settings.toolbarText
                                }}
                                onMouseEnter={e => { if (mode !== 'manuscript') e.currentTarget.style.backgroundColor = settings.toolbarButtonHoverBg || ''}}
                                onMouseLeave={e => { if (mode !== 'manuscript') e.currentTarget.style.backgroundColor = 'transparent'}}
                                aria-current={mode === 'manuscript' ? 'page' : undefined}
                            >
                                Manuscript
                            </button>
                            <button
                                onClick={() => setMode('assembly')}
                                className={headerButtonClasses}
                                style={{
                                    backgroundColor: mode === 'assembly' ? settings.accentColor : 'transparent',
                                    color: settings.toolbarText
                                }}
                                onMouseEnter={e => { if (mode !== 'assembly') e.currentTarget.style.backgroundColor = settings.toolbarButtonHoverBg || ''}}
                                onMouseLeave={e => { if (mode !== 'assembly') e.currentTarget.style.backgroundColor = 'transparent'}}
                                aria-current={mode === 'assembly' ? 'page' : undefined}
                            >
                                Assembly
                            </button>
                        </div>
                    </nav>
                    <main className="flex-grow min-h-0 flex flex-col relative">
                        <div className={`absolute inset-0 ${mode === 'manuscript' ? 'block' : 'hidden'}`}>
                            <Manuscript 
                                settings={settings} 
                                onSettingsChange={handleSettingsChange} 
                                isFocusMode={isFocusMode} 
                                onToggleFocusMode={handleToggleFocusMode}
                                chapters={chapters}
                                activeChapterId={activeChapterId}
                                onActiveChapterIdChange={setActiveChapterId}
                                shortcuts={shortcuts}
                                onShortcutsChange={(newShortcuts) => dispatch({ type: 'SET_SHORTCUTS', payload: newShortcuts })}
                                writingGoals={writingGoals}
                                onWritingGoalsChange={setWritingGoals}
                                directoryHandle={directoryHandle}
                                projectPath={projectPath}
                                onDirectoryHandleChange={setDirectoryHandle}
                                onGenerateWhatIf={onGenerateWhatIf}
                                galleryItems={galleryItems}
                                onGalleryItemsChange={setGalleryItems}
                                isVisible={mode === 'manuscript'}
                                // Use our new handler for saving
                                isSaving={isSavingVisual}
                                onSaveToFolder={handleSaveToFolder} 
                                onOpenProjectFolder={handleOpenProjectFolder}
                            />
                        </div>
                        <div className={`h-full w-full ${mode === 'assembly' ? 'block' : 'hidden'}`}>
                            <Assembly 
                                settings={settings} 
                                onSettingsChange={handleSettingsChange}
                                directoryHandle={directoryHandle}
                                onDirectoryHandleChange={setDirectoryHandle}
                                activePanel={useNovelState().activeAssemblyPanel}
                                onPanelChange={handlePanelChange}
                            />
                        </div>
                    </main>
                    {whatIfState.isOpen && (
                        <WhatIfModal
                            state={whatIfState}
                            settings={settings}
                            onClose={() => dispatch({ type: 'UPDATE_WHAT_IF_STATE', payload: { isOpen: false } })}
                        />
                    )}
                    {isExitModalOpen && (
                        <ExitModal 
                            settings={settings}
                            onCancel={() => setIsExitModalOpen(false)}
                            onExitWithoutSaving={handleExitWithoutSaving}
                            onSaveAndExit={handleSaveAndExit}
                        />
                    )}
                    {socialMediaState.isOpen && (
                        <PostVariationsModal
                            isOpen={socialMediaState.isOpen}
                            onClose={() => dispatch({ type: 'UPDATE_SOCIAL_MEDIA_STATE', payload: { isOpen: false } })}
                            settings={settings}
                        />
                    )}
                    <CommandPalette 
                        isOpen={isCommandPaletteOpen} 
                        onClose={() => setIsCommandPaletteOpen(false)}
                        settings={settings}
                        onNavigate={handleNavigation}
                        onToggleFocus={handleToggleFocusMode}
                        onToggleFullscreen={handleToggleFullscreen}
                    />
                </div>
            </div>
        </DialogProvider>
        </ErrorBoundary>
    );
};

export default App;