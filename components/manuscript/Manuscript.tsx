import React, { useState, useEffect, useCallback, useRef, useMemo, useLayoutEffect } from 'react';
import type { IChapter, EditorSettings, Shortcut, WritingGoals, GalleryItem, INovelState, SearchResult, AppUpdate } from '../../types';
import { useDebouncedCallback } from 'use-debounce';
import { useNovelDispatch, useNovelState, initialNovelState } from '../../NovelContext';
import { getAI } from '../../utils/ai';
// Fix: Import Modality and GenerateContentResponse to ensure correct overload matching and return typing
import { Modality, GenerateContentResponse } from "@google/genai";

import { generateRtfForChapters, downloadFile, calculateWordCountFromHtml, decode, exportForNove, exportStandaloneNove, exportBlankNove } from '../../utils/manuscriptUtils';
import { generateId, extractJson } from '../../utils/common';

import { Toolbar } from './Toolbar';
import { NotesPanel } from './NotesPanel';
import { FindReplaceModal } from './modals/FindReplaceModal';
import { ShortcutsModal } from './modals/ShortcutsModal';
import { StatsDashboardModal } from './modals/StatsDashboardModal';
import { CustomizeToolbarModal } from './modals/CustomizeToolbarModal';
import { VersionHistoryModal } from './modals/VersionHistoryModal';
import { ContextMenu } from '../common/ContextMenu';
import { VoiceSettingsModal } from './modals/VoiceSettingsModal';
import { ReadAloudModal } from './modals/ReadAloudModal';
import { DesignGalleryModal } from './modals/DesignGalleryModal';
import { SpellCheckModal } from './modals/SpellCheckModal';
import { UserGuideModal } from './modals/UserGuideModal';
import { ImportNovelModal } from '../assembly/modals/ImportNovelModal';
import { UnfocusIcon, PauseIcon, PlayIcon, StopIcon } from '../common/Icons';

interface ManuscriptProps {
    settings: EditorSettings;
    onSettingsChange: (newSettings: Partial<EditorSettings>) => Promise<void>;
    isFocusMode: boolean;
    onToggleFocusMode: () => void;
    chapters: IChapter[];
    activeChapterId: string;
    onActiveChapterIdChange: (id: string) => void;
    shortcuts: Shortcut[];
    onShortcutsChange: (shortcuts: Shortcut[]) => void;
    writingGoals: WritingGoals;
    onWritingGoalsChange: (goals: WritingGoals) => void;
    directoryHandle: FileSystemDirectoryHandle | null;
    projectPath?: string | null;
    onDirectoryHandleChange: (handle: FileSystemDirectoryHandle | null) => void;
    onGenerateWhatIf: (text: string, context: string) => void;
    galleryItems: GalleryItem[];
    onGalleryItemsChange: (items: GalleryItem[]) => void;
    isVisible: boolean;
    isSaving: boolean;
    onSaveToFolder: (forceNewFolder?: boolean) => Promise<boolean>;
}

type ModalType = 'findReplace' | 'shortcuts' | 'stats' | 'customizeToolbar' | 'history' | 'voiceSettings' | 'designGallery' | 'readAloud' | 'spellCheck' | 'userGuide' | 'importNovel';
type TTSStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'error';

const createWavUrl = (pcmData: Uint8Array, sampleRate: number): string => {
    const header = new ArrayBuffer(44);
    const view = new DataView(header);
    const writeString = (view: DataView, offset: number, string: string) => {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    };
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + pcmData.length, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(view, 36, 'data');
    view.setUint32(40, pcmData.length, true);
    const blob = new Blob([header, pcmData as any], { type: 'audio/wav' });
    return URL.createObjectURL(blob);
};

const useTypewriterSound = (enabled: boolean, volume: number = 0.75) => {
    const audioContextRef = useRef<AudioContext | null>(null);
    const enterThudBufferRef = useRef<AudioBuffer | null>(null);
    const keyClickBufferRef = useRef<AudioBuffer | null>(null);

    useEffect(() => {
        if (!enabled) return;
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        audioContextRef.current = ctx;
        return () => {
            if (ctx.state !== 'closed') ctx.close().catch(e => console.warn("Failed to close audio context", e));
            audioContextRef.current = null;
        };
    }, [enabled]);

    const play = useCallback((type: 'key' | 'enter' = 'key') => {
        const ctx = audioContextRef.current;
        if (!enabled || !ctx) return;
        const vol = volume;
        if (ctx.state === 'suspended') ctx.resume().catch(e => console.warn("Audio resume failed", e));
        const t = ctx.currentTime;
        if (type === 'enter') {
            const osc1 = ctx.createOscillator();
            const gain1 = ctx.createGain();
            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(2000, t);
            gain1.gain.setValueAtTime(0, t);
            gain1.gain.linearRampToValueAtTime(0.04 * vol, t + 0.01);
            gain1.gain.exponentialRampToValueAtTime(0.001, t + 1.5);
            osc1.connect(gain1); gain1.connect(ctx.destination);
            osc1.start(t); osc1.stop(t + 1.5);
            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(5200, t);
            gain2.gain.setValueAtTime(0, t);
            gain2.gain.linearRampToValueAtTime(0.02 * vol, t + 0.01);
            gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
            osc2.connect(gain2); gain2.connect(ctx.destination);
            osc2.start(t); osc2.stop(t + 0.8);
            if (!enterThudBufferRef.current) {
                const bufferSize = ctx.sampleRate * 0.05;
                const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
                const data = buffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.5;
                enterThudBufferRef.current = buffer;
            }
            const noise = ctx.createBufferSource();
            noise.buffer = enterThudBufferRef.current;
            const noiseFilter = ctx.createBiquadFilter();
            noiseFilter.type = 'lowpass';
            noiseFilter.frequency.value = 600;
            const noiseGain = ctx.createGain();
            noiseGain.gain.setValueAtTime(0.02 * vol, t);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
            noise.connect(noiseFilter); noiseFilter.connect(noiseGain); noiseGain.connect(ctx.destination);
            noise.start(t);
        } else {
            const gain = ctx.createGain();
            const filter = ctx.createBiquadFilter();
            if (!keyClickBufferRef.current) {
                const bufferSize = ctx.sampleRate * 0.05;
                const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
                const data = buffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
                keyClickBufferRef.current = buffer;
            }
            const src = ctx.createBufferSource();
            src.buffer = keyClickBufferRef.current;
            filter.type = 'bandpass';
            filter.frequency.value = 2500;
            filter.Q.value = 1.5;
            gain.gain.setValueAtTime(0.15 * vol, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);
            src.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
            src.start(t);
        }
    }, [enabled, volume]);
    return play;
};

export const Manuscript: React.FC<ManuscriptProps> = ({ 
    settings, onSettingsChange, isFocusMode, onToggleFocusMode,
    chapters, activeChapterId, onActiveChapterIdChange,
    shortcuts, onShortcutsChange,
    writingGoals, onWritingGoalsChange, directoryHandle, projectPath, onDirectoryHandleChange,
    onGenerateWhatIf,
    galleryItems, onGalleryItemsChange,
    isVisible,
    isSaving: isSavingProp,
    onSaveToFolder
}) => {
    const fullState = useNovelState();
    const { characters } = fullState;
    const dispatch = useNovelDispatch();
    const [isNotesPanelOpen, setIsNotesPanelOpen] = useState<boolean>(false);
    const [notesPanelWidth, setNotesPanelWidth] = useState(320);
    const [activeModal, setActiveModal] = useState<ModalType | null>(null);
    const [previousModal, setPreviousModal] = useState<ModalType | null>(null); 
    const [isFindReplaceOpen, setIsFindReplaceOpen] = useState(false); 
    
    const [isSaving, setIsSaving] = useState(isSavingProp);
    const [isSpellcheckEnabled, setIsSpellcheckEnabled] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(!!document.fullscreenElement);
    const [sessionWordCount, setSessionWordCount] = useState(0);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [isToolbarAnimating, setIsToolbarAnimating] = useState(false);
    const [notification, setNotification] = useState<string | null>(null);
    const [availableUpdate, setAvailableUpdate] = useState<AppUpdate | null>(null);
    
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; actions: { label: string; onSelect: () => void }[] } | null>(null);
    const [pageInfo, setPageInfo] = useState({ current: 1, total: 1 });
    const [ttsStatus, setTtsStatus] = useState<TTSStatus>('idle');
    const ttsAudioElementRef = useRef<HTMLAudioElement | null>(null);
    
    const isSoundEnabled = settings.isSoundEnabled || false;
    const playTypewriterSound = useTypewriterSound(isSoundEnabled, settings.soundVolume);

    const editorRef = useRef<HTMLDivElement>(null);
    const editorContainerRef = useRef<HTMLDivElement>(null);
    const initialTotalWordCountRef = useRef<number | null>(null);
    const savedSelectionRange = useRef<Range | null>(null);
    const isLocalUpdate = useRef(false);
    const pendingSearchRef = useRef<SearchResult | null>(null);
    const isTyping = useRef(false);
    const stableScrollLeft = useRef(0);
    const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    
    const GAP_PX = 60; 
    const SIDE_MARGIN_PX = 40;
    const [layout, setLayout] = useState({ colWidth: 0, stride: 0, gap: GAP_PX, sideMargin: SIDE_MARGIN_PX, columns: 2 });

    const handleChapterDetailsChange = useCallback((id: string, updates: Partial<IChapter>) => {
        dispatch({ type: 'UPDATE_CHAPTER', payload: { id, updates } });
    }, [dispatch]);

    const handleContentChange = useCallback((newContent: string) => {
        handleChapterDetailsChange(activeChapterId, { content: newContent });
    }, [activeChapterId, handleChapterDetailsChange]);

    useEffect(() => {
        setIsSaving(isSavingProp);
    }, [isSavingProp]);

    useEffect(() => {
        const checkUpdates = async () => {
            // @ts-ignore
            if (window.electronAPI && window.electronAPI.checkForUpdates) {
                try {
                    // @ts-ignore
                    const result = await window.electronAPI.checkForUpdates();
                    if (result && result.isNewer) setAvailableUpdate(result);
                } catch (e) { console.warn("Update check failed", e); }
            }
        };
        const timer = setTimeout(checkUpdates, 5000);
        return () => clearTimeout(timer);
    }, []);

    const activeChapter = useMemo(() => (chapters.find(ch => ch.id === activeChapterId) || chapters[0]) as IChapter, [chapters, activeChapterId]);
    const shortcutsMap = useMemo(() => {
        const map = new Map<string, string>();
        shortcuts.forEach(s => map.set(s.key, s.value));
        return map;
    }, [shortcuts]);

    const activeChapterWordCount = useMemo(() => {
        if (activeChapter.wordCount !== undefined) return activeChapter.wordCount;
        return calculateWordCountFromHtml(activeChapter.content);
    }, [activeChapter.content, activeChapter.wordCount]);
    
    const totalWordCount = useMemo(() => {
        return chapters.reduce((acc, chapter) => {
            const count = chapter.wordCount !== undefined ? chapter.wordCount : calculateWordCountFromHtml(chapter.content);
            return acc + count;
        }, 0);
    }, [chapters]);

    const hasContent = useMemo(() => {
        if (chapters.length > 1) return true;
        const c1 = chapters[0];
        if (!c1) return false;
        if (c1.content.length > 30) return true;
        return false;
    }, [chapters]);

    useEffect(() => {
        const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    useEffect(() => {
        if (initialTotalWordCountRef.current === null) initialTotalWordCountRef.current = totalWordCount;
        setSessionWordCount(totalWordCount - (initialTotalWordCountRef.current || 0));
    }, [totalWordCount]);

    useEffect(() => { document.execCommand('defaultParagraphSeparator', false, 'div'); }, []);

    const handleManualSave = useCallback(async () => {
        if (isSaving) return;
        const success = await onSaveToFolder(false);
        if (success) {
            const now = new Date();
            const d = String(now.getDate()).padStart(2, '0');
            const m = String(now.getMonth() + 1).padStart(2, '0');
            const h = String(now.getHours()).padStart(2, '0');
            const min = String(now.getMinutes()).padStart(2, '0');
            setNotification(`Project Saved [${d}/${m} ${h}:${min}]`);
            setTimeout(() => setNotification(null), 3000);
        }
    }, [isSaving, onSaveToFolder]);

    const handleExportNove = useCallback(async () => {
        setIsSaving(true);
        setNotification("Preparing Nové Portable...");
        try {
            await exportForNove(fullState, settings, writingGoals);
            setNotification("Nové Portable Exported");
        } catch (e) {
            console.error("Export failed:", e);
            alert("An error occurred during export.");
        } finally {
            setIsSaving(false);
            setTimeout(() => setNotification(null), 3000);
        }
    }, [fullState, settings, writingGoals]);

    const handleExportStandaloneNove = useCallback(async () => {
        setIsSaving(true);
        setNotification("Generating Standalone Nové...");
        try {
            await exportStandaloneNove(fullState, settings, writingGoals);
            setNotification("Standalone Nové Exported");
        } catch (e) {
            console.error("Export failed:", e);
            alert("An error occurred during standalone export.");
        } finally {
            setIsSaving(false);
            setTimeout(() => setNotification(null), 3000);
        }
    }, [fullState, settings, writingGoals]);

    const handleExportBlankNove = useCallback(async () => {
        setIsSaving(true);
        setNotification("Generating Blank Nové...");
        try {
            await exportBlankNove(settings, writingGoals);
            setNotification("Blank Nové Exported");
        } catch (e) {
            console.error("Export failed:", e);
            alert("An error occurred during blank export.");
        } finally {
            setIsSaving(false);
            setTimeout(() => setNotification(null), 3000);
        }
    }, [settings, writingGoals]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); handleManualSave(); } };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleManualSave]);

    const saveSelection = useCallback(() => {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0 && editorRef.current && editorRef.current.contains(sel.anchorNode)) savedSelectionRange.current = sel.getRangeAt(0).cloneRange();
        else savedSelectionRange.current = null;
    }, []);

    const restoreSelection = useCallback(() => {
        if (savedSelectionRange.current && editorRef.current) {
            const sel = window.getSelection();
            if (sel) {
                sel.removeAllRanges(); sel.addRange(savedSelectionRange.current);
                if (document.activeElement !== editorRef.current) editorRef.current.focus();
            }
            savedSelectionRange.current = null;
        }
    }, []);

    const handleToggleNotesPanel = useCallback(() => {
        saveSelection(); setIsNotesPanelOpen(prev => !prev);
    }, [saveSelection]);

    const highlightTextInEditor = useCallback((index: number, length: number) => {
        if (!editorRef.current) return;
        const walker = document.createTreeWalker(editorRef.current, NodeFilter.SHOW_TEXT, null);
        let currentIndex = 0; let node: Node | null = null;
        while(node = walker.nextNode()) {
            const nodeLen = node.textContent?.length || 0;
            if (currentIndex + nodeLen > index) {
                const startOffset = index - currentIndex;
                const range = document.createRange();
                const endOffset = Math.min(startOffset + length, nodeLen); 
                range.setStart(node, startOffset); range.setEnd(node, endOffset);
                const sel = window.getSelection();
                if (sel) {
                    sel.removeAllRanges(); sel.addRange(range);
                    const rect = range.getBoundingClientRect();
                    const container = editorContainerRef.current;
                    if (container && rect) {
                        const relativeX = rect.left - container.getBoundingClientRect().left + container.scrollLeft;
                        const targetSpread = Math.floor(Math.max(0, relativeX - layout.sideMargin) / layout.stride);
                        container.scrollTo({ left: targetSpread * layout.stride, behavior: 'smooth' });
                    }
                }
                return;
            }
            currentIndex += nodeLen;
        }
    }, [layout]);

    useEffect(() => {
        if (pendingSearchRef.current && pendingSearchRef.current.chapterId === activeChapterId) {
            setTimeout(() => {
                if (pendingSearchRef.current) {
                    highlightTextInEditor(pendingSearchRef.current.index, pendingSearchRef.current.length);
                    pendingSearchRef.current = null;
                }
            }, 200);
        }
    }, [activeChapterId, activeChapter.content, highlightTextInEditor]);

    const handleNavigateMatch = useCallback(async (result: SearchResult) => {
        if (result.chapterId !== activeChapterId) {
            setIsSaving(true); setNotification("Saving before navigation...");
            await onSaveToFolder(); setIsSaving(false); setNotification(null);
            pendingSearchRef.current = result; onActiveChapterIdChange(result.chapterId);
        } else {
            highlightTextInEditor(result.index, result.length);
        }
    }, [activeChapterId, onSaveToFolder, onActiveChapterIdChange, highlightTextInEditor]);

    const handleFindReplaceUpdate = (result: SearchResult, newText: string) => {
        if (result.chapterId !== activeChapterId) { handleNavigateMatch(result); return; }
        document.execCommand('insertText', false, newText);
    };

    const handleGlobalReplace = (find: string, replace: string, scope: 'chapter' | 'manuscript') => {
        const regex = new RegExp(find.replace(/[.*+?${}()|[\]\\]/g, '\\$&'), 'g');
        if (scope === 'chapter') {
             handleChapterDetailsChange(activeChapter.id, { content: activeChapter.content.replace(regex, replace) });
        } else {
             chapters.forEach(ch => {
                 if (ch.content.match(regex)) {
                     dispatch({ type: 'UPDATE_CHAPTER', payload: { id: ch.id, updates: { content: ch.content.replace(regex, replace) } } });
                 }
             });
             alert("Global replace complete.");
        }
    };

    useEffect(() => {
        const closeMenu = () => setContextMenu(null);
        window.addEventListener('click', closeMenu);
        return () => window.removeEventListener('click', closeMenu);
    }, []);

    const handleContextMenu = useCallback((e: React.MouseEvent) => {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed || !editorRef.current?.contains(selection.anchorNode)) return;
        e.preventDefault();
        const text = selection.toString();
        let context = text;
        if (selection.anchorNode && selection.anchorNode.parentElement) context = selection.anchorNode.parentElement.innerText.substring(0, 1000); 
        setContextMenu({ x: e.clientX, y: e.clientY, actions: [{ label: '🔮 What If? (Brainstorm Alternatives)', onSelect: () => onGenerateWhatIf(text, context) }] });
    }, [onGenerateWhatIf]);

    const calculateLayout = useCallback(() => {
        if (!editorContainerRef.current) return;
        const containerWidth = editorContainerRef.current.clientWidth;
        const minTwoPageColWidth = 450;
        const availableWidthTwo = Math.max(0, containerWidth - GAP_PX - (2 * SIDE_MARGIN_PX));
        const safeColWidthTwo = Math.floor(availableWidthTwo / 2);
        let columns = 2; let colWidth = safeColWidthTwo;
        if (safeColWidthTwo < minTwoPageColWidth) {
            columns = 1; colWidth = Math.floor(Math.max(0, containerWidth - (2 * SIDE_MARGIN_PX)));
        }
        const stride = colWidth + GAP_PX;
        setLayout({ colWidth, stride, gap: GAP_PX, sideMargin: SIDE_MARGIN_PX, columns });
        const scrollLeft = editorContainerRef.current.scrollLeft;
        const currentColumnIndex = stride > 0 ? Math.round(scrollLeft / stride) : 0;
        const contentWidth = editorContainerRef.current.scrollWidth - (2 * SIDE_MARGIN_PX);
        const totalColumns = stride > 0 ? Math.ceil((contentWidth + GAP_PX) / stride) : 1;
        setPageInfo({ current: currentColumnIndex + 1, total: Math.max(2, totalColumns - 1) });
    }, []);

    useLayoutEffect(() => {
        const timer = setTimeout(() => {
            calculateLayout();
            if (editorContainerRef.current && layout.stride > 0) {
                editorContainerRef.current.scrollTo({ left: Math.round(editorContainerRef.current.scrollLeft / layout.stride) * layout.stride });
            }
            restoreSelection();
        }, 10);
        window.addEventListener('resize', calculateLayout);
        return () => { window.removeEventListener('resize', calculateLayout); clearTimeout(timer); };
    }, [calculateLayout, isNotesPanelOpen, notesPanelWidth, isFocusMode, settings.fontSize, settings.fontFamily, restoreSelection, isVisible]);

    const snapToSpread = useCallback((targetSpreadIndex: number, useTransition: boolean = true) => {
        if (!editorContainerRef.current || layout.stride === 0) return;
        const totalColumns = Math.ceil((editorContainerRef.current.scrollWidth - (2 * SIDE_MARGIN_PX) + GAP_PX) / layout.stride);
        const targetScrollLeft = Math.max(0, Math.min(targetSpreadIndex, totalColumns)) * layout.stride;
        if (Math.abs(editorContainerRef.current.scrollLeft - targetScrollLeft) < 2) return;
        if (settings.transitionStyle === 'fade' && useTransition) {
            setIsTransitioning(true);
            setTimeout(() => {
                if (editorContainerRef.current) editorContainerRef.current.scrollTo({ left: targetScrollLeft, behavior: 'instant' });
                requestAnimationFrame(() => setIsTransitioning(false));
            }, 150); 
        } else {
            editorContainerRef.current.scrollTo({ left: targetScrollLeft, behavior: useTransition ? 'smooth' : 'instant' });
        }
    }, [layout, settings.transitionStyle, GAP_PX, SIDE_MARGIN_PX]);

    const handleWheel = useCallback((e: React.WheelEvent) => {
        if (!editorContainerRef.current || layout.stride === 0) return;
        if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
            e.preventDefault();
            if (Math.abs(e.deltaY) > 20) snapToSpread(Math.round(editorContainerRef.current.scrollLeft / layout.stride) + Math.sign(e.deltaY), true);
        }
    }, [layout, snapToSpread]);

    const updatePageInfo = useCallback(() => {
        if (!editorContainerRef.current || layout.stride === 0) return;
        const currentColumnIndex = Math.round(editorContainerRef.current.scrollLeft / layout.stride);
        const totalColumns = Math.ceil((editorContainerRef.current.scrollWidth - (2 * SIDE_MARGIN_PX) + GAP_PX) / layout.stride);
        setPageInfo({ current: currentColumnIndex + 1, total: Math.max(2, totalColumns - 1) });
    }, [layout, GAP_PX, SIDE_MARGIN_PX]);

    const handleScroll = useDebouncedCallback(() => {
        if (!editorContainerRef.current || layout.stride === 0) return;
        updatePageInfo();
        if (!isTyping.current) snapToSpread(Math.round(editorContainerRef.current.scrollLeft / layout.stride), false);
    }, 150);

    useEffect(() => {
        if (!editorContainerRef.current) return;
        const container = editorContainerRef.current;
        const handleNativeScroll = () => {
            if (isTyping.current) { if (Math.abs(container.scrollLeft - stableScrollLeft.current) > 5) container.scrollLeft = stableScrollLeft.current; }
            else stableScrollLeft.current = container.scrollLeft;
        };
        container.addEventListener('scroll', handleNativeScroll, { passive: false });
        return () => container.removeEventListener('scroll', handleNativeScroll);
    }, []);

    const checkAndEnforceCaretVisibility = useCallback(() => {
        const selection = window.getSelection();
        if (!editorContainerRef.current || !editorRef.current || !selection || selection.rangeCount === 0 || layout.stride === 0) return;
        const range = selection.getRangeAt(0);
        if (!editorRef.current.contains(range.commonAncestorContainer)) return;
        const caretRect = range.getBoundingClientRect();
        if (caretRect.width === 0 && caretRect.height === 0 && caretRect.x === 0 && caretRect.y === 0) return;
        const containerRect = editorContainerRef.current.getBoundingClientRect();
        const relativeCaretX = (caretRect.left - containerRect.left) + editorContainerRef.current.scrollLeft;
        const adjustedCaretX = Math.max(0, relativeCaretX - layout.sideMargin);
        const columnIndex = Math.floor(adjustedCaretX / layout.stride);
        const currentScrollIndex = Math.round(editorContainerRef.current.scrollLeft / layout.stride);
        if (columnIndex >= currentScrollIndex + layout.columns) snapToSpread(columnIndex - (layout.columns - 1), false);
        else if (columnIndex < currentScrollIndex) snapToSpread(columnIndex, false);
        updatePageInfo();
    }, [layout, snapToSpread, updatePageInfo]);

    const handleBeforeInput = useCallback(() => {
        if (editorContainerRef.current && layout.stride > 0) {
            isTyping.current = true; stableScrollLeft.current = Math.round(editorContainerRef.current.scrollLeft / layout.stride) * layout.stride;
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        }
    }, [layout.stride]);

    const handleInput = useCallback((e: React.FormEvent<HTMLDivElement>) => {
        isLocalUpdate.current = true; const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
            const range = sel.getRangeAt(0); const node = range.startContainer; const offset = range.startOffset;
            if (node.nodeType === Node.TEXT_NODE) {
                const textContent = node.textContent || ''; const nativeEvent = e.nativeEvent as InputEvent; const insertedChar = nativeEvent?.data;
                if (nativeEvent?.inputType === 'insertText') {
                    if (insertedChar === '"' || insertedChar === "'") {
                        const textBefore = textContent.substring(0, offset - 1); const charBefore = textBefore.slice(-1);
                        const isOpen = textBefore.length === 0 || /[\\s(\\[{“‘]/.test(charBefore);
                        let rep = insertedChar === '"' ? (isOpen ? '“' : '”') : (isOpen ? '‘' : '’');
                        if (rep) {
                            node.textContent = textContent.substring(0, offset - 1) + rep + textContent.substring(offset);
                            const nr = document.createRange(); nr.setStart(node, offset); nr.collapse(true);
                            sel.removeAllRanges(); sel.addRange(nr);
                        }
                    } else if (insertedChar === ' ' || insertedChar === null) {
                        const textBeforeCursor = textContent.substring(0, offset - 1);
                        
                        // Robust suffix-based matching for shortcuts
                        // Fix: Explicitly type entries to ensure it is correctly recognized as iterable
                        const matchedShortcut = Array.from(shortcutsMap as Iterable<[string, string]>)
                            .sort((a, b) => b[0].length - a[0].length)
                            .find(([key]) => {
                                if (!textBeforeCursor.endsWith(key)) return false;
                                
                                // Word key check: punctuation or spaces must precede letters/numbers keys
                                const isWordKey = /^[a-zA-Z0-9']+$/.test(key);
                                if (isWordKey) {
                                    const charBefore = textBeforeCursor.length > key.length 
                                        ? textBeforeCursor[textBeforeCursor.length - key.length - 1] 
                                        : ' ';
                                    return /[ \s(\[{“‘]/.test(charBefore);
                                }
                                return true; // Complex punctuation strings match instantly
                            });

                        if (matchedShortcut) {
                            const [key, value] = matchedShortcut;
                            const startIndex = offset - 1 - key.length;
                            node.textContent = textContent.substring(0, startIndex) + value + textContent.substring(offset - 1);
                            const newCaretPos = startIndex + value.length + 1;
                            const nr = document.createRange(); nr.setStart(node, newCaretPos); nr.collapse(true);
                            sel.removeAllRanges(); sel.addRange(nr);
                        }
                    }
                }
            }
        }
        handleContentChange(e.currentTarget.innerHTML);
        if (sel && sel.rangeCount > 0 && editorContainerRef.current && layout.stride > 0) {
             const range = sel.getRangeAt(0);
             if (editorRef.current?.contains(range.commonAncestorContainer)) {
                 const caretRect = range.getBoundingClientRect(); const containerRect = editorContainerRef.current.getBoundingClientRect();
                 if (caretRect.width !== 0 || caretRect.height !== 0 || caretRect.x !== 0) {
                     const relX = (caretRect.left - containerRect.left) + editorContainerRef.current.scrollLeft;
                     const adjX = Math.max(0, relX - layout.sideMargin); const colIdx = Math.floor(adjX / layout.stride);
                     const currIdx = Math.round(stableScrollLeft.current / layout.stride); let target = currIdx;
                     if (colIdx >= currIdx + layout.columns) target = colIdx - (layout.columns - 1);
                     else if (colIdx < currIdx) target = colIdx;
                     const targetScroll = target * layout.stride;
                     if (targetScroll !== stableScrollLeft.current) {
                         stableScrollLeft.current = targetScroll; editorContainerRef.current.scrollLeft = targetScroll;
                     }
                 }
             }
        }
    }, [handleContentChange, shortcutsMap, layout]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
        if (editorContainerRef.current && layout.stride > 0) {
            isTyping.current = true; stableScrollLeft.current = Math.round(editorContainerRef.current.scrollLeft / layout.stride) * layout.stride;
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        }
        if (e.key === 'Backspace') {
            const sel = window.getSelection();
            if (sel && sel.rangeCount > 0 && sel.isCollapsed) {
                const range = sel.getRangeAt(0); const node = range.startContainer;
                let p = node.nodeType === Node.TEXT_NODE ? node.parentElement : node as HTMLElement;
                while (p && p.nodeName !== 'DIV' && p.parentElement !== e.currentTarget) p = p.parentElement;
                if (p && p.parentElement === e.currentTarget) {
                    if ((range.startOffset === 0) && (node === p || node === p.firstChild || (node.parentNode === p && node === p.firstChild))) {
                        if (!p.style.textIndent || p.style.textIndent !== '0px') {
                            e.preventDefault(); p.style.textIndent = '0px'; handleContentChange(e.currentTarget.innerHTML); return; 
                        }
                    }
                }
            }
        }
        if (e.key === 'Enter') {
            e.preventDefault(); document.execCommand('insertParagraph', false);
            const selection = window.getSelection();
            if (selection && selection.rangeCount > 0) {
                let node = selection.anchorNode;
                while (node && (node.nodeType !== Node.ELEMENT_NODE || node.nodeName !== 'DIV') && node.parentNode !== e.currentTarget) node = node.parentNode;
                if (node && node.nodeName === 'DIV' && (node as HTMLElement).style.textIndent === '0px') {
                    (node as HTMLElement).style.removeProperty('text-indent');
                    if (!(node as HTMLElement).getAttribute('style')) (node as HTMLElement).removeAttribute('style');
                }
            }
            playTypewriterSound('enter'); handleContentChange(e.currentTarget.innerHTML);
            setTimeout(checkAndEnforceCaretVisibility, 10); return;
        }
        if (!['Shift', 'Control', 'Alt', 'Meta', 'CapsLock'].includes(e.key)) {
            if (e.key === 'Enter') playTypewriterSound('enter'); else playTypewriterSound('key');
        }
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) setTimeout(checkAndEnforceCaretVisibility, 10);
        if (e.key === 'PageDown') { e.preventDefault(); snapToSpread(Math.round((editorContainerRef.current?.scrollLeft || 0) / layout.stride) + 1, true); }
        else if (e.key === 'PageUp') { e.preventDefault(); snapToSpread(Math.round((editorContainerRef.current?.scrollLeft || 0) / layout.stride) - 1, true); }
    }, [checkAndEnforceCaretVisibility, layout, snapToSpread, playTypewriterSound, handleContentChange]);

    const handleKeyUp = useCallback(() => {
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            isTyping.current = false;
            if (editorContainerRef.current && layout.stride > 0) stableScrollLeft.current = Math.round(editorContainerRef.current.scrollLeft / layout.stride) * layout.stride;
        }, 150);
    }, [layout.stride]);

    useEffect(() => {
        if (ttsAudioElementRef.current) {
            if (settings.ttsSpeed) ttsAudioElementRef.current.playbackRate = settings.ttsSpeed;
            if (settings.ttsVolume !== undefined) ttsAudioElementRef.current.volume = settings.ttsVolume;
        }
    }, [settings.ttsSpeed, settings.ttsVolume]);

    const handleTTSPlay = useCallback(async () => {
        if (ttsStatus === 'loading') return;
        if (ttsStatus === 'paused' && ttsAudioElementRef.current) {
            try {
                await ttsAudioElementRef.current.play();
                setTtsStatus('playing'); return;
            } catch (e) { console.warn("Resumed play failed", e); }
        }
        setTtsStatus('loading'); const selection = window.getSelection(); let textToRead = '';
        if (selection && selection.toString().trim().length > 0 && editorRef.current?.contains(selection.anchorNode)) {
            textToRead = selection.toString();
        } else {
            const div = document.createElement('div'); div.innerHTML = activeChapter.content; textToRead = div.innerText;
        }
        if (!textToRead.trim()) { setTtsStatus('idle'); return; }
        try {
            const accent = settings.ttsAccent === 'en-GB' ? 'British' : 'American';
            // Fix: Correctly type response as GenerateContentResponse and use Modality.AUDIO from SDK
            const response: GenerateContentResponse = await getAI().models.generateContent({
                model: "gemini-2.5-flash-preview-tts",
                contents: { parts: [{ text: `Please read the following text with a ${accent} accent and appropriate emotion:\n\n${textToRead}` }] },
                config: { responseModalities: [Modality.AUDIO], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: settings.narratorVoice || 'Kore' } } } },
            });
            const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (!base64Audio) throw new Error("No audio data received.");
            if (ttsAudioElementRef.current) {
                ttsAudioElementRef.current.pause(); ttsAudioElementRef.current.src = ""; ttsAudioElementRef.current = null;
            }
            const bytes = decode(base64Audio); const audioUrl = createWavUrl(bytes, 24000); const audio = new Audio(audioUrl);
            audio.playbackRate = settings.ttsSpeed || 1.0; audio.volume = settings.ttsVolume ?? 1.0; audio.preservesPitch = true;
            audio.onended = () => { setTtsStatus('idle'); URL.revokeObjectURL(audioUrl); };
            audio.onerror = () => { setTtsStatus('error'); URL.revokeObjectURL(audioUrl); };
            await audio.play(); ttsAudioElementRef.current = audio; setTtsStatus('playing');
        } catch (e) {
            console.error("TTS System Error:", e); setTtsStatus('error'); setTimeout(() => setTtsStatus('idle'), 3000);
        }
    }, [activeChapter.content, ttsStatus, settings]);

    const handleTTSPause = useCallback(() => {
        if (ttsAudioElementRef.current) { ttsAudioElementRef.current.pause(); setTtsStatus('paused'); }
    }, []);

    const handleTTSStop = useCallback(() => {
        if (ttsAudioElementRef.current) { ttsAudioElementRef.current.pause(); ttsAudioElementRef.current.src = ""; ttsAudioElementRef.current = null; }
        setTtsStatus('idle');
    }, []);

    useLayoutEffect(() => {
        if (editorRef.current && activeChapter.content && editorRef.current.innerHTML !== activeChapter.content && !isLocalUpdate.current) {
            editorRef.current.innerHTML = activeChapter.content;
        }
        isLocalUpdate.current = false; calculateLayout();
    }, [activeChapter.id, activeChapter.content, calculateLayout]);

    useEffect(() => {
        setIsToolbarAnimating(true); const timer = setTimeout(() => setIsToolbarAnimating(false), 300);
        return () => clearTimeout(timer);
    }, [isFocusMode]);

    const toolbarContainerClasses = `
        transition-[max-height] duration-300 ease-in-out flex-shrink-0 relative z-20
        ${isFocusMode ? 'max-h-0 overflow-hidden' : 'max-h-40'}
        ${!isFocusMode && isToolbarAnimating ? 'overflow-hidden' : ''}
        ${!isFocusMode && !isToolbarAnimating ? 'overflow-visible' : ''}
    `;

    return (
        <div className="flex h-full overflow-hidden antialiased" style={{ backgroundColor: "transparent" }}>
            <style>{`
                .editor-content::after { content: ""; display: block; height: 100%; min-height: 100%; break-before: column; -webkit-column-break-before: always; visibility: hidden; }
                @keyframes slide-in-top { 0% { transform: translate(-50%, -100%); opacity: 0; } 100% { transform: translate(-50%, 0); opacity: 1; } }
                .toast-enter { animation: slide-in-top 0.3s ease-out forwards; }
                .book-spine-effect { position: fixed; top: 0; bottom: 0; left: 50%; width: 60px; margin-left: -30px; background: linear-gradient(to right, rgba(0,0,0,0) 0%, rgba(0,0,0,0.15) 35%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.15) 65%, rgba(0,0,0,0) 100%); pointer-events: none; z-index: 5; opacity: 0.6; }
            `}</style>
            {notification && (
                <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-[9999] px-6 py-2 rounded-full shadow-xl toast-enter flex items-center gap-2 backdrop-blur-md border border-white/20" style={{ backgroundColor: settings.successColor, color: '#FFFFFF' }}><span className="font-bold text-sm">{notification}</span></div>
            )}
            <div className="flex-grow flex flex-col min-w-0 h-full relative">
                <div className="flex-grow relative min-h-0 overflow-hidden">
                    <div id="editorContainer" ref={editorContainerRef} className="absolute inset-0 overflow-x-auto overflow-y-hidden focus:outline-none" onWheel={handleWheel} onScroll={handleScroll} onClick={() => setTimeout(checkAndEnforceCaretVisibility, 10)} onKeyUp={handleKeyUp} style={{ overflowAnchor: 'none' }}>
                        {layout.columns === 2 && (settings.showBookSpine !== false) && <div className="book-spine-effect" />}
                        <div 
                            ref={editorRef} 
                            contentEditable 
                            suppressContentEditableWarning 
                            spellCheck={isSpellcheckEnabled} 
                            className="editor-content outline-none" 
                            style={{ 
                                fontFamily: settings.fontFamily, fontSize: `${settings.fontSize}em`, color: settings.textColor, lineHeight: settings.lineHeight || 1.8, textAlign: settings.textAlign === 'justify' ? 'justify' : 'left', 
                                hyphens: settings.textAlign === 'justify' ? 'auto' : 'manual', WebkitHyphens: settings.textAlign === 'justify' ? 'auto' : 'manual', height: 'calc(100% - 6rem)', columnFill: 'auto', columnGap: `${layout.gap}px`, columnWidth: `${layout.colWidth}px`, columnCount: layout.columns, boxSizing: 'content-box', width: typeof layout.colWidth === 'number' ? `${(layout.colWidth * layout.columns) + (layout.gap * (layout.columns - 1))}px` : '100%', paddingTop: '3rem', paddingBottom: '3rem', paddingLeft: `${layout.sideMargin}px`, paddingRight: `${layout.sideMargin}px`, orphans: 3, widows: 3, opacity: isTransitioning ? 0 : 1, transition: 'opacity 0.15s ease-in-out', transform: 'translateZ(0)' 
                            }} 
                            onBeforeInput={handleBeforeInput} onInput={handleInput} onKeyDown={handleKeyDown} onBlur={checkAndEnforceCaretVisibility} onContextMenu={handleContextMenu} 
                        />
                    </div>
                    {isFocusMode && <button onClick={onToggleFocusMode} className="absolute top-4 right-4 z-50 p-2 rounded-full transition-all duration-300 backdrop-blur-[2px] opacity-50 hover:opacity-100" style={{ backgroundColor: settings.toolbarBg ? `${settings.toolbarBg}40` : 'rgba(0,0,0,0.2)', color: settings.toolbarText || '#FFF' }} title="Exit Focus Mode"><UnfocusIcon /></button>}
                    {(ttsStatus === 'playing' || ttsStatus === 'paused') && activeModal !== 'readAloud' && (
                        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-50 rounded-full shadow-lg flex items-center px-3 py-2 gap-3 border backdrop-blur-md transition-all duration-300 ease-in-out" style={{ backgroundColor: `${settings.toolbarBg}E6`, borderColor: settings.toolbarInputBorderColor, color: settings.toolbarText }}>
                            <button onClick={ttsStatus === 'playing' ? handleTTSPause : handleTTSPlay} className="p-2 rounded-full hover:bg-black/10 transition-colors" title={ttsStatus === 'playing' ? "Pause" : "Resume"}>{ttsStatus === 'playing' ? <PauseIcon className="h-6 w-6"/> : <PlayIcon className="h-6 w-6"/>}</button>
                            <div className="w-px h-5 bg-gray-500/30"></div>
                            <button onClick={handleTTSStop} className="p-2 rounded-full hover:bg-black/10 transition-colors text-red-400" title="Stop"><StopIcon className="h-6 w-6"/></button>
                        </div>
                    )}
                    <div className="absolute bottom-4 right-8 z-10 text-xs font-sans pointer-events-none select-none transition-opacity duration-300 backdrop-blur-sm px-2 py-1 rounded" style={{ color: settings.textColor, opacity: 0.6, backgroundColor: settings.toolbarBg ? `${settings.toolbarBg}40` : 'transparent' }}>{layout.columns === 1 ? <span>Page {pageInfo.current} of {pageInfo.total}</span> : <span>Pages {pageInfo.current} and {pageInfo.current + 1} of {pageInfo.total}</span>}</div>
                </div>
                <div className={toolbarContainerClasses}>
                    <Toolbar settings={settings} onSettingsChange={settings => onSettingsChange(settings)} chapters={chapters} activeChapterId={activeChapterId} onSelectChapter={onActiveChapterIdChange} isSaving={isSaving} activeChapterWordCount={activeChapterWordCount} sessionWordCount={sessionWordCount} writingGoals={writingGoals} onSaveToFolder={async (forceNewFolder?: boolean) => { if (isSavingProp) return false; return onSaveToFolder(forceNewFolder).then(() => true); }} onDownloadRtf={() => { const rtf = generateRtfForChapters(chapters); downloadFile('novel.rtf', rtf, 'application/rtf'); }} isFocusMode={isFocusMode} onToggleFocusMode={onToggleFocusMode} isNotesPanelOpen={isNotesPanelOpen} onToggleNotesPanel={handleToggleNotesPanel} onToggleModal={(modal) => modal === 'findReplace' ? setIsFindReplaceOpen(p => !p) : setActiveModal(modal)} isSoundEnabled={isSoundEnabled} onToggleSound={() => onSettingsChange({ isSoundEnabled: !isSoundEnabled })} isFullscreen={isFullscreen} onToggleFullscreen={() => { if (!document.fullscreenElement) document.documentElement.requestFullscreen(); else document.exitFullscreen(); setIsFullscreen(!isFullscreen); }} isSinglePageView={false} isSpellcheckEnabled={isSpellcheckEnabled} onToggleSpellcheck={() => setIsSpellcheckEnabled(p => !p)} onToggleTransitionStyle={() => onSettingsChange({ transitionStyle: settings.transitionStyle === 'scroll' ? 'fade' : 'scroll' })} hasDirectory={!!directoryHandle || !!projectPath} onToggleReadAloud={() => setActiveModal('readAloud')} ttsStatus={ttsStatus} onExportNove={handleExportNove} onExportStandaloneNove={handleExportStandaloneNove} onExportBlankNove={handleExportBlankNove} onImportNove={() => setActiveModal('importNovel')} updateAvailable={!!availableUpdate} />
                </div>
            </div>
            {isNotesPanelOpen && <div className="flex-shrink-0 h-full relative border-l" style={{ width: `${notesPanelWidth}px`, borderColor: settings.toolbarInputBorderColor }}><NotesPanel settings={settings} activeChapter={activeChapter} onChapterDetailsChange={handleChapterDetailsChange} initialWidth={notesPanelWidth} onWidthChange={setNotesPanelWidth} allChapters={chapters} allCharacters={characters} generateId={generateId} /></div>}
            {activeModal === 'stats' && <StatsDashboardModal settings={settings} chapters={chapters} totalWordCount={totalWordCount} goals={writingGoals} onGoalsChange={onWritingGoalsChange} onClose={() => setActiveModal(null)} />}
            {isFindReplaceOpen && <FindReplaceModal settings={settings} chapters={chapters} activeChapterId={activeChapterId} onNavigateMatch={handleNavigateMatch} onReplace={handleFindReplaceUpdate} onReplaceAll={handleGlobalReplace} onClose={() => setIsFindReplaceOpen(false)} />}
            {activeModal === 'shortcuts' && <ShortcutsModal settings={settings} shortcuts={shortcuts} onUpdateShortcuts={onShortcutsChange} onClose={() => setActiveModal(null)} />}
            {activeModal === 'customizeToolbar' && <CustomizeToolbarModal settings={settings} currentVisibility={settings.toolbarVisibility || {}} onSave={(newVisibility) => onSettingsChange({ toolbarVisibility: newVisibility })} onClose={() => setActiveModal(null)} onSaveProject={onSaveToFolder} hasContent={hasContent} appUpdate={availableUpdate} onExportBlankNove={handleExportBlankNove} />}
            {activeModal === 'designGallery' && <DesignGalleryModal settings={settings} onClose={() => setActiveModal(null)} galleryItems={galleryItems} onGalleryItemsChange={onGalleryItemsChange} onSettingsChange={onSettingsChange} />}
            {activeModal === 'voiceSettings' && <VoiceSettingsModal settings={settings} characters={characters} onClose={() => { if (previousModal) { setActiveModal(previousModal); setPreviousModal(null); } else setActiveModal(null); }} onSettingsChange={onSettingsChange} />}
            {activeModal === 'history' && <VersionHistoryModal settings={settings} activeChapter={activeChapter} directoryHandle={directoryHandle} projectPath={projectPath} onRestore={(content) => handleChapterDetailsChange(activeChapterId, { content })} onClose={() => setActiveModal(null)} />}
            {activeModal === 'readAloud' && <ReadAloudModal settings={settings} onClose={() => setActiveModal(null)} onPlay={handleTTSPlay} onPause={handleTTSPause} onStop={handleTTSStop} onOpenSettings={() => { setPreviousModal('readAloud'); setActiveModal('voiceSettings'); }} status={ttsStatus} activeChapterTitle={`${activeChapter.chapterNumber}. ${activeChapter.title}`} />}
            {activeModal === 'spellCheck' && <SpellCheckModal settings={settings} chapter={activeChapter} onClose={() => setActiveModal(null)} onUpdateContent={(newContent) => handleChapterDetailsChange(activeChapter.id, { content: newContent })} />}
            {activeModal === 'importNovel' && <ImportNovelModal settings={settings} onClose={() => setActiveModal(null)} directoryHandle={directoryHandle} />}
            {activeModal === 'userGuide' && <UserGuideModal settings={settings} onClose={() => setActiveModal(null)} />}
            {contextMenu && <ContextMenu x={contextMenu.x} y={contextMenu.y} actions={contextMenu.actions} onClose={() => setContextMenu(null)} settings={settings} />}
        </div>
    );
};