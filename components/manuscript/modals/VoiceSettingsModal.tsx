






import React, { useState } from 'react';
import { produce } from 'immer';
import { Modal } from './Modal';
import type { EditorSettings, ICharacter } from '../../../types';
import { useNovelDispatch } from '../../../NovelContext';

interface VoiceSettingsModalProps {
    settings: EditorSettings;
    characters: ICharacter[];
    onClose: () => void;
    onSettingsChange: (settings: Partial<EditorSettings>) => void;
}

const AVAILABLE_VOICES = ['Zephyr', 'Kore', 'Puck', 'Charon', 'Fenrir'];

export const VoiceSettingsModal: React.FC<VoiceSettingsModalProps> = ({ settings, characters, onClose, onSettingsChange }) => {
    const dispatch = useNovelDispatch();
    const [narratorVoice, setNarratorVoice] = useState(settings.narratorVoice || 'Zephyr');
    const [ttsAccent, setTtsAccent] = useState(settings.ttsAccent || 'en-US');
    const [ttsSpeed, setTtsSpeed] = useState(settings.ttsSpeed || 1);
    const [ttsVolume, setTtsVolume] = useState(settings.ttsVolume ?? 1.0);
    const [characterVoices, setCharacterVoices] = useState<Record<string, string>>(() => {
        const voices: Record<string, string> = {};
        characters.forEach(c => {
            voices[c.id] = c.voice || 'Default';
        });
        return voices;
    });

    const handleCharacterVoiceChange = (charId: string, voice: string) => {
        setCharacterVoices(produce(draft => {
            draft[charId] = voice;
        }));
    };

    const handleSave = () => {
        onSettingsChange({ narratorVoice, ttsAccent, ttsSpeed, ttsVolume });
        Object.entries(characterVoices).forEach(([id, voice]) => {
            const character = characters.find(c => c.id === id);
            if (character && character.voice !== voice) {
                dispatch({ type: 'UPDATE_CHARACTER', payload: { id, updates: { voice: voice === 'Default' ? undefined : voice } } });
            }
        });
        onClose();
    };

    return (
        <Modal onClose={onClose} settings={settings} title="Read Aloud Voice Settings" className="max-w-lg">
            <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="narrator-voice" className="block text-sm font-medium mb-1">Default Narrator Voice</label>
                        <select
                            id="narrator-voice"
                            value={narratorVoice}
                            onChange={(e) => setNarratorVoice(e.target.value)}
                            className="w-full p-2 rounded border"
                            style={{ backgroundColor: settings.backgroundColor, color: settings.textColor, borderColor: settings.toolbarInputBorderColor }}
                        >
                            {AVAILABLE_VOICES.map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="tts-accent" className="block text-sm font-medium mb-1">Accent / Dialect</label>
                        <select
                            id="tts-accent"
                            value={ttsAccent}
                            onChange={(e) => setTtsAccent(e.target.value as 'en-US' | 'en-GB')}
                            className="w-full p-2 rounded border"
                            style={{ backgroundColor: settings.backgroundColor, color: settings.textColor, borderColor: settings.toolbarInputBorderColor }}
                        >
                            <option value="en-US">American (US)</option>
                            <option value="en-GB">British (UK)</option>
                        </select>
                    </div>
                </div>
                <div>
                    <div className="flex justify-between items-center mb-1">
                        <label htmlFor="tts-speed" className="block text-sm font-medium">Speech Speed</label>
                        <span className="text-xs font-mono" style={{color: `${settings.textColor}99`}}>{ttsSpeed.toFixed(1)}x</span>
                    </div>
                    <input
                        id="tts-speed"
                        type="range"
                        min="0.5"
                        max="2.0"
                        step="0.1"
                        value={ttsSpeed}
                        onChange={(e) => setTtsSpeed(parseFloat(e.target.value))}
                        className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                        style={{ background: settings.toolbarButtonBg, accentColor: settings.accentColor }}
                    />
                </div>
                <div>
                    <div className="flex justify-between items-center mb-1">
                        <label htmlFor="tts-volume" className="block text-sm font-medium">Volume</label>
                        <span className="text-xs font-mono" style={{color: `${settings.textColor}99`}}>{Math.round(ttsVolume * 100)}%</span>
                    </div>
                    <input
                        id="tts-volume"
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={ttsVolume}
                        onChange={(e) => setTtsVolume(parseFloat(e.target.value))}
                        className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                        style={{ background: settings.toolbarButtonBg, accentColor: settings.accentColor }}
                    />
                </div>
                <div>
                    <h4 className="text-sm font-medium mb-2">Character Voices</h4>
                    <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                        {characters.map(character => (
                            <div key={character.id} className="flex items-center justify-between">
                                <label htmlFor={`voice-${character.id}`} className="flex-grow">{character.name}</label>
                                <select
                                    id={`voice-${character.id}`}
                                    value={characterVoices[character.id] || 'Default'}
                                    onChange={(e) => handleCharacterVoiceChange(character.id, e.target.value)}
                                    className="w-1/2 p-2 rounded border"
                                    style={{ backgroundColor: settings.backgroundColor, color: settings.textColor, borderColor: settings.toolbarInputBorderColor }}
                                >
                                    <option value="Default">Default (Narrator)</option>
                                    {AVAILABLE_VOICES.map(v => <option key={v} value={v}>{v}</option>)}
                                </select>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
             <div className="mt-6 flex justify-end">
                <button
                    onClick={handleSave}
                    className="px-4 py-2 rounded-md font-bold"
                    style={{ backgroundColor: settings.successColor, color: 'var(--app-text)' }}
                >
                    Save Settings
                </button>
            </div>
        </Modal>
    );
};