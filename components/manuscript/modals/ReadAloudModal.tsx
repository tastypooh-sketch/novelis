
import React, { useEffect } from 'react';
import { Modal } from './Modal';
import { PlayIcon, StopIcon, CogIcon } from '../../common/Icons';
import type { EditorSettings } from '../../../types';

interface ReadAloudModalProps {
    settings: EditorSettings;
    onClose: () => void;
    onPlay: () => void;
    onPause: () => void;
    onStop: () => void;
    onOpenSettings: () => void;
    status: 'idle' | 'playing' | 'paused' | 'loading' | 'error';
    activeChapterTitle: string;
}

export const ReadAloudModal: React.FC<ReadAloudModalProps> = ({ 
    settings, onClose, onPlay, onPause, onStop, onOpenSettings, status, activeChapterTitle 
}) => {
    
    // Simplified toggle logic: If playing, stop. If not playing, play.
    const handleTogglePlay = () => {
        if (status === 'playing') {
            onStop();
        } else {
            onPlay();
        }
    };

    return (
        <Modal onClose={onClose} settings={settings} title="Read Aloud" className="max-w-sm">
            <div className="flex flex-col items-center gap-6 py-6 relative">
                {/* Settings Button - Subtle positioning */}
                <button 
                    onClick={onOpenSettings}
                    className="absolute top-0 right-0 p-2 rounded-full transition-colors opacity-60 hover:opacity-100"
                    style={{ color: settings.toolbarText }}
                    title="Voice Settings"
                >
                    <CogIcon className="h-5 w-5" />
                </button>

                <div className="text-center px-8">
                    <h3 className="font-serif text-xl font-bold mb-2 leading-tight">{activeChapterTitle}</h3>
                    <p className="text-xs opacity-60 uppercase tracking-wider font-sans">Text to Speech</p>
                </div>

                <div className="flex items-center justify-center">
                    <button 
                        onClick={handleTogglePlay}
                        className="p-6 rounded-full shadow-xl transition-all hover:scale-105 active:scale-95 flex items-center justify-center"
                        style={{ 
                            backgroundColor: status === 'playing' ? settings.toolbarButtonBg : settings.accentColor, 
                            color: status === 'playing' ? settings.dangerColor : 'var(--app-text)',
                            border: status === 'playing' ? `2px solid ${settings.dangerColor}` : 'none'
                        }}
                        title={status === 'playing' ? "Stop" : "Play"}
                    >
                        {status === 'playing' ? (
                            <StopIcon className="h-10 w-10" />
                        ) : (
                            <PlayIcon className="h-10 w-10 ml-1" /> // Offset slightly for visual centering
                        )}
                    </button>
                </div>

                <div className="text-xs opacity-50 font-medium">
                    {status === 'playing' ? 'Reading...' : status === 'loading' ? 'Generating Audio...' : 'Ready'}
                </div>
                
                <p className="text-[10px] opacity-40 text-center max-w-[200px]">
                    You can close this dialog to edit text while listening. Playback will continue.
                </p>
            </div>
        </Modal>
    );
};
