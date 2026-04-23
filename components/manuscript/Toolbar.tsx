import React, { useState, useRef, useEffect, useMemo } from 'react';
import type { IChapter, EditorSettings, Palette, WritingGoals, ToolbarVisibility } from '../../types';
import { 
    HistoryIcon, StatsIcon, NoteIcon, SearchIcon, KeyboardIcon, PageTransitionIcon, SpellcheckIcon, 
    SpeakerOnIcon, SpeakerOffIcon, ExitFullscreenIcon, EnterFullscreenIcon, UnfocusIcon, FocusIcon, CogIcon, EarIcon,
    BrushIcon, JustifyIcon, BookOpenIcon, ProofreadIcon, ImportIcon, SaveIcon, LineHeightIcon
} from '../common/Icons';

type ModalType = 'findReplace' | 'shortcuts' | 'stats' | 'customizeToolbar' | 'history' | 'voiceSettings' | 'designGallery' | 'readAloud' | 'spellCheck' | 'userGuide';
type TTSStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'error';


interface ToolbarButtonProps {
    title: string;
    onClick: () => void;
    isActive?: boolean;
    isVisible?: boolean;
    settings: EditorSettings;
    children: React.ReactNode;
    style?: React.CSSProperties;
    className?: string;
    disabled?: boolean;
}

const ToolbarButton = React.memo<ToolbarButtonProps>(({ title, onClick, isActive = false, isVisible = true, settings, children, style = {}, className = '', disabled = false }) => {
    if (!isVisible) return null;

    const buttonStyle = {
        backgroundColor: isActive ? settings.accentColor : settings.toolbarButtonBg,
        color: isActive ? '#FFFFFF' : settings.toolbarText,
        ...style,
    };
    
    const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
        if (!disabled) {
            e.currentTarget.style.backgroundColor = isActive ? settings.accentColorHover || '' : settings.toolbarButtonHoverBg || '';
        }
    };

    const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
        if (!disabled) {
            e.currentTarget.style.backgroundColor = isActive ? settings.accentColor || '' : settings.toolbarButtonBg || '';
        }
    };

    return (
        <button
            title={title}
            onClick={onClick}
            disabled={disabled}
            className={`p-2 rounded disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
            style={buttonStyle}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onMouseDown={(e) => e.preventDefault()}
        >
            {children}
        </button>
    );
});


interface ToolbarProps {
  settings: EditorSettings;
  onSettingsChange: (newSettings: Partial<EditorSettings>) => void;
  chapters: IChapter[];
  activeChapterId: string;
  onSelectChapter: (id: string) => void;
  isSaving: boolean;
  activeChapterWordCount: number;
  sessionWordCount: number;
  writingGoals: WritingGoals;
  onSaveToFolder: () => void;
  onDownloadRtf: () => void;
  isFocusMode: boolean;
  onToggleFocusMode: () => void;
  isNotesPanelOpen: boolean;
  onToggleNotesPanel: () => void;
  onToggleModal: (modal: ModalType) => void;
  isSoundEnabled: boolean;
  onToggleSound: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  isSinglePageView: boolean;
  isSpellcheckEnabled: boolean;
  onToggleSpellcheck: () => void;
  onToggleTransitionStyle: () => void;
  hasDirectory: boolean;
  onToggleReadAloud: () => void;
  ttsStatus: TTSStatus;
  onExportNove: () => void;
  onExportStandaloneNove: () => void;
  onExportBlankNove: () => void;
  onImportNove: () => void;
  updateAvailable?: boolean;
}

export const Toolbar: React.FC<ToolbarProps> = ({ 
    settings, onSettingsChange, chapters, activeChapterId, 
    onSelectChapter, isSaving, 
    activeChapterWordCount, sessionWordCount, writingGoals,
    onSaveToFolder, onDownloadRtf,
    isFocusMode, onToggleFocusMode, isNotesPanelOpen, onToggleNotesPanel, onToggleModal,
    isSoundEnabled, onToggleSound, isFullscreen, onToggleFullscreen,
    isSinglePageView, isSpellcheckEnabled, onToggleSpellcheck, onToggleTransitionStyle,
    hasDirectory, onToggleReadAloud, ttsStatus,
    onExportNove,
    onExportStandaloneNove,
    onExportBlankNove,
    onImportNove,
    updateAvailable = false
}) => {
  const fontOptions = ["Lora", "Merriweather", "Times New Roman", "Bookman Old Style", "Georgia", "Roboto", "Open Sans", "Arial", "Inter", "Inconsolata"];
  
  const [isSaveMenuOpen, setIsSaveMenuOpen] = useState(false);
  const saveMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (saveMenuRef.current && !saveMenuRef.current.contains(event.target as Node)) {
        setIsSaveMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const useHoverStyle = (baseBg: string, hoverBg: string) => {
    return useMemo(() => ({
        onMouseEnter: (e: React.MouseEvent<HTMLButtonElement>) => { e.currentTarget.style.backgroundColor = hoverBg; },
        onMouseLeave: (e: React.MouseEvent<HTMLButtonElement>) => { e.currentTarget.style.backgroundColor = baseBg; },
    }), [baseBg, hoverBg]);
  };

  const menuItemHoverProps = useHoverStyle('transparent', settings.toolbarButtonHoverBg || '');
  const buttonHoverProps = useHoverStyle(settings.toolbarButtonBg || '', settings.toolbarButtonHoverBg || '');
  
  const handleToolbarMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement;
      if (!['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName)) {
        e.preventDefault();
      }
  };

  return (
    <div 
        className="p-2 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm shadow-lg print:hidden border-t"
        onMouseDown={handleToolbarMouseDown}
        style={{
            backgroundColor: settings.toolbarBg,
            color: settings.toolbarText,
            borderColor: settings.toolbarInputBorderColor
        }}
    >
      <a 
        href="https://www.thomascorfield.com" 
        target="_blank" 
        rel="noopener noreferrer"
        className={`h-8 mr-2 flex items-center font-['Lora'] font-bold text-2xl tracking-tight select-none hover:opacity-80 transition-opacity ${isSaving ? 'save-flash' : ''}`}
        style={{ color: 'inherit' }}
      >
        Novel<span style={{ color: settings.accentColor }}>o</span>s
      </a>
      <div className="flex items-center">
        <select id="chapterSelect" value={activeChapterId} onChange={e => onSelectChapter(e.target.value)} 
            className="px-2 py-1 border rounded"
            style={{ backgroundColor: settings.toolbarButtonBg, borderColor: settings.toolbarInputBorderColor }}
        >
          {chapters.map(chap => <option key={chap.id} value={chap.id}>{chap.title} {chap.chapterNumber}</option>)}
        </select>
        <ToolbarButton
            title={hasDirectory ? "Chapter Version History" : "Save to a folder to enable version history"}
            onClick={() => onToggleModal('history')}
            disabled={!hasDirectory}
            settings={settings}
            isVisible={settings.toolbarVisibility?.history}
            className="ml-2"
        >
            <HistoryIcon />
        </ToolbarButton>
      </div>
       <div>
        <select id="fontSelect" aria-label="Font Selection" value={settings.fontFamily} onChange={e => onSettingsChange({ fontFamily: e.target.value })} 
            className="rounded px-2 py-1 border"
            style={{ backgroundColor: settings.toolbarButtonBg, borderColor: settings.toolbarInputBorderColor }}
        >
          {fontOptions.map(font => <option key={font} value={font}>{font}</option>)}
        </select>
      </div>
      <div className="flex items-center">
        <button 
            {...buttonHoverProps}
            onClick={() => onSettingsChange({ fontSize: Math.max(0.7, settings.fontSize - 0.1) })} 
            className="rounded-l px-2 py-1 border"
            style={{ backgroundColor: settings.toolbarButtonBg, borderColor: settings.toolbarInputBorderColor }}
        >-</button>
        <span className="px-2 py-1 border-t border-b"
            style={{ backgroundColor: settings.toolbarBg, borderColor: settings.toolbarInputBorderColor }}
        >{settings.fontSize.toFixed(1)}em</span>
        <button 
            {...buttonHoverProps}
            onClick={() => onSettingsChange({ fontSize: Math.min(2.5, settings.fontSize + 0.1) })} 
            className="rounded-r px-2 py-1 border"
            style={{ backgroundColor: settings.toolbarButtonBg, borderColor: settings.toolbarInputBorderColor }}
        >+</button>
      </div>
      
      <div className="flex-grow"></div>
      
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-3">
            <div className="text-right" style={{ color: settings.toolbarText ? `${settings.toolbarText}B3` : '#A0AEC0' }}>
                <div className="text-xs">Chapter: {activeChapterWordCount.toLocaleString()} words</div>
                <div className="text-xs">Session: {sessionWordCount.toLocaleString()} words</div>
            </div>
            <div className="w-24">
                <div className="text-xs text-center mb-0.5" style={{ color: settings.toolbarText ? `${settings.toolbarText}B3` : '#A0AEC0' }}>
                    Daily Goal
                </div>
                <div className="h-1.5 w-full rounded-full" style={{ backgroundColor: settings.toolbarButtonBg }}>
                    <div 
                        className="h-1.5 rounded-full transition-all duration-500" 
                        style={{
                            width: `${Math.min(100, (sessionWordCount / (writingGoals.dailyGoal || 1)) * 100)}%`,
                            backgroundColor: settings.accentColor
                        }}
                    />
                </div>
            </div>
        </div>
        
        <ToolbarButton 
            title={settings.textAlign === 'justify' ? "Switch to Left Align" : "Switch to Justified (with Hyphenation)"} 
            onClick={() => onSettingsChange({ textAlign: settings.textAlign === 'justify' ? 'left' : 'justify' })} 
            isActive={settings.textAlign === 'justify'}
            settings={settings}
            isVisible={settings.toolbarVisibility?.alignment}
        >
            <JustifyIcon />
        </ToolbarButton>
        <ToolbarButton 
            title={settings.lineHeight === 1.2 ? "Switch to Comfortable Spacing (1.8)" : "Switch to Compact Spacing (1.2)"} 
            onClick={() => onSettingsChange({ lineHeight: settings.lineHeight === 1.2 ? 1.8 : 1.2 })} 
            isActive={settings.lineHeight === 1.2}
            settings={settings}
            isVisible={settings.toolbarVisibility?.lineHeight}
        >
            <LineHeightIcon />
        </ToolbarButton>
        <ToolbarButton title="Design Gallery" onClick={() => onToggleModal('designGallery')} settings={settings} isVisible={settings.toolbarVisibility?.designGallery}><BrushIcon /></ToolbarButton>

        <ToolbarButton title="Writing Goals & Statistics" onClick={() => onToggleModal('stats')} settings={settings} isVisible={settings.toolbarVisibility?.stats}><StatsIcon /></ToolbarButton>
        <ToolbarButton title="Toggle Notes Panel" onClick={onToggleNotesPanel} settings={settings} isVisible={settings.toolbarVisibility?.notes} isActive={isNotesPanelOpen}><NoteIcon /></ToolbarButton>
        <ToolbarButton title="Find and Replace (Ctrl+F)" onClick={() => onToggleModal('findReplace')} settings={settings} isVisible={settings.toolbarVisibility?.findReplace}><SearchIcon /></ToolbarButton>
        <ToolbarButton title="Text Shortcuts" onClick={() => onToggleModal('shortcuts')} settings={settings} isVisible={settings.toolbarVisibility?.shortcuts}><KeyboardIcon /></ToolbarButton>
        <ToolbarButton title="Read Aloud (TTS)" onClick={onToggleReadAloud} settings={settings} isVisible={settings.toolbarVisibility?.readAloud} isActive={ttsStatus !== 'idle'}><EarIcon className="h-5 w-5" /></ToolbarButton>
        <ToolbarButton title={`Page Transition: ${settings.transitionStyle === 'scroll' ? 'Scroll' : 'Fade'}`} onClick={onToggleTransitionStyle} settings={settings} isVisible={settings.toolbarVisibility?.pageTransition}><PageTransitionIcon /></ToolbarButton>
        <ToolbarButton title="Toggle Spell Check (Native Browser)" onClick={onToggleSpellcheck} settings={settings} isVisible={settings.toolbarVisibility?.spellcheck} isActive={isSpellcheckEnabled}><SpellcheckIcon /></ToolbarButton>
        <ToolbarButton title="AI Proofreader" onClick={() => onToggleModal('spellCheck')} settings={settings} isVisible={settings.toolbarVisibility?.spellcheck}><ProofreadIcon /></ToolbarButton>
        <div className="flex items-center">
            <ToolbarButton title="Toggle Sound" onClick={onToggleSound} settings={settings} isVisible={settings.toolbarVisibility?.sound} isActive={isSoundEnabled}>{isSoundEnabled ? <SpeakerOnIcon /> : <SpeakerOffIcon />}</ToolbarButton>
            {isSoundEnabled && settings.toolbarVisibility?.sound && (
                <div className="flex items-center ml-1">
                    <input
                        type="range"
                        min="1"
                        max="4"
                        step="1"
                        value={(settings.soundVolume || 1) * 4}
                        onChange={(e) => onSettingsChange({ soundVolume: parseInt(e.target.value) / 4 })}
                        className="w-10 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                        style={{ accentColor: settings.accentColor }}
                        title="Typewriter Volume"
                    />
                </div>
            )}
        </div>
        <ToolbarButton title={isFullscreen ? "Exit Full Screen" : "Enter Full Screen"} onClick={onToggleFullscreen} settings={settings} isVisible={settings.toolbarVisibility?.fullscreen} isActive={isFullscreen}>{isFullscreen ? <ExitFullscreenIcon /> : <EnterFullscreenIcon />}</ToolbarButton>
        <ToolbarButton title="Toggle Focus Mode (Esc)" onClick={onToggleFocusMode} settings={settings} isVisible={settings.toolbarVisibility?.focus} isActive={isFocusMode}>{isFocusMode ? <UnfocusIcon /> : <FocusIcon />}</ToolbarButton>
        
        <div className="relative">
            <ToolbarButton title="Customize Toolbar" onClick={() => onToggleModal('customizeToolbar')} settings={settings}>
                <CogIcon />
            </ToolbarButton>
            {updateAvailable && (
                <span 
                    className="absolute top-0 right-0 w-3 h-3 rounded-full border-2 animate-pulse" 
                    style={{ backgroundColor: settings.accentColor, borderColor: settings.toolbarBg }}
                    title="Update Available"
                />
            )}
        </div>
        
        <ToolbarButton title="User Guide" onClick={() => onToggleModal('userGuide')} settings={settings} isVisible={settings.toolbarVisibility?.userGuide}><BookOpenIcon /></ToolbarButton>

        <div className="w-px h-6 bg-gray-600 mx-2 opacity-30 hidden sm:block"></div>

        <div className="relative" ref={saveMenuRef}>
            <button 
                onClick={() => setIsSaveMenuOpen(prev => !prev)} 
                onFocus={(e) => e.currentTarget.blur()}
                className="flex items-center gap-2 px-4 py-1.5 rounded text-sm font-medium transition-colors hover:opacity-90 text-white"
                style={{ backgroundColor: settings.accentColor }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = settings.accentColorHover || ''}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = settings.accentColor || ''}
                onMouseDown={(e) => e.preventDefault()}
            >
                <SaveIcon className="h-4 w-4" />
                Save
            </button>
            {isSaveMenuOpen && (
                <div className="absolute bottom-full right-0 mb-2 w-72 rounded-md shadow-lg z-10 py-1"
                    style={{ backgroundColor: settings.dropdownBg }}
                >
                    <div className="px-4 py-2 text-[10px] uppercase font-bold tracking-widest opacity-50" style={{ color: settings.toolbarText }}>File Management</div>
                    <button {...menuItemHoverProps} onClick={() => { onSaveToFolder(); setIsSaveMenuOpen(false); }} className="block w-full text-left px-4 py-2 text-sm cursor-pointer" style={{color: settings.toolbarText, backgroundColor: 'transparent'}}>Save Project to Folder (Ctrl+S)</button>
                    <button {...menuItemHoverProps} onClick={() => { onDownloadRtf(); setIsSaveMenuOpen(false); }} className="block w-full text-left px-4 py-2 text-sm cursor-pointer" style={{color: settings.toolbarText, backgroundColor: 'transparent'}}>Export Chapters as RTF</button>
                    
                    <div className="border-t my-1 mx-2" style={{borderColor: settings.toolbarInputBorderColor || 'transparent'}}></div>
                    
                    <div className="px-4 py-2 text-[10px] uppercase font-bold tracking-widest opacity-50" style={{ color: settings.toolbarText }}>Deployment & Distribution</div>
                    <button {...menuItemHoverProps} onClick={() => { onExportNove(); setIsSaveMenuOpen(false); }} className="block w-full text-left px-4 py-2 text-sm cursor-pointer" style={{color: settings.toolbarText, backgroundColor: 'transparent'}}>Export Portable Nové (.zip)</button>
                    <button {...menuItemHoverProps} onClick={() => { onExportBlankNove(); setIsSaveMenuOpen(false); }} className="block w-full text-left px-4 py-2 text-sm cursor-pointer" style={{color: settings.toolbarText, backgroundColor: 'transparent'}}>Export Blank Nové (.html)</button>
                    <button {...menuItemHoverProps} onClick={() => { onImportNove(); setIsSaveMenuOpen(false); }} className="block w-full text-left px-4 py-2 text-sm cursor-pointer" style={{color: settings.toolbarText, backgroundColor: 'transparent'}}>Import from Nové (.zip)</button>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};