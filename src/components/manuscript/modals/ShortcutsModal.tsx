import React, { useState, useEffect, useRef } from 'react';
import { useDialog } from '../../common/DialogProvider';
import type { EditorSettings, Shortcut } from '../../../types';
import { generateId } from '../../../utils/common';
import { TrashIcon } from '../../common/Icons';

interface ShortcutsModalProps {
    onClose: () => void;
    shortcuts: Shortcut[];
    onUpdateShortcuts: (shortcuts: Shortcut[]) => void;
    settings: EditorSettings;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ onClose, shortcuts, onUpdateShortcuts, settings }) => {
    const dialog = useDialog();
    const [localShortcuts, setLocalShortcuts] = useState<Shortcut[]>(shortcuts);
    const modalRef = useRef<HTMLDivElement>(null);
    const [newKey, setNewKey] = useState('');
    const [newValue, setNewValue] = useState('');

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    const handleAddShortcut = () => {
        if (newKey.trim() && newValue.trim()) {
            if (/\s/.test(newKey)) {
                dialog.error("Shortcut key cannot contain spaces.", "Invalid Shortcut");
                return;
            }
            const newShortcut: Shortcut = { id: generateId(), key: newKey.trim(), value: newValue.trim() };
            const updatedShortcuts = [...localShortcuts, newShortcut];
            setLocalShortcuts(updatedShortcuts);
            onUpdateShortcuts(updatedShortcuts);
            setNewKey('');
            setNewValue('');
        }
    };
    
    const handleDeleteShortcut = (id: string) => {
        const updatedShortcuts = localShortcuts.filter(s => s.id !== id);
        setLocalShortcuts(updatedShortcuts);
        onUpdateShortcuts(updatedShortcuts);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div ref={modalRef} className="p-6 rounded-lg shadow-xl w-full max-w-lg" style={{ backgroundColor: settings.toolbarBg, color: settings.toolbarText }}>
                <h2 className="text-xl font-bold mb-4">Text Shortcuts</h2>
                <div className="space-y-4 mb-6">
                    <div className="flex gap-4">
                         <input
                            type="text"
                            placeholder="Shortcut (e.g., Osc)"
                            value={newKey}
                            onChange={(e) => setNewKey(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddShortcut()}
                            className="w-1/3 p-2 rounded border"
                            style={{ backgroundColor: settings.toolbarButtonBg, borderColor: settings.toolbarInputBorderColor }}
                        />
                        <input
                            type="text"
                            placeholder="Expanded Text (e.g., Oscar)"
                            value={newValue}
                            onChange={(e) => setNewValue(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddShortcut()}
                            className="flex-grow p-2 rounded border"
                            style={{ backgroundColor: settings.toolbarButtonBg, borderColor: settings.toolbarInputBorderColor }}
                        />
                        <button onClick={handleAddShortcut} className="rounded px-4 py-2" style={{ backgroundColor: settings.accentColor, color: 'var(--app-text)' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = settings.accentColorHover || ''} onMouseLeave={e => e.currentTarget.style.backgroundColor = settings.accentColor || ''}>Add</button>
                    </div>
                </div>

                <div className="max-h-64 overflow-y-auto pr-2">
                    {localShortcuts.length > 0 ? (
                        <ul className="space-y-2">
                            {localShortcuts.map(shortcut => (
                                <li key={shortcut.id} className="flex items-center justify-between p-2 rounded" style={{backgroundColor: settings.toolbarButtonBg}}>
                                    <div>
                                        <span className="font-mono p-1 rounded text-sm" style={{backgroundColor: settings.backgroundColor}}>{shortcut.key}</span>
                                        <span className="mx-2">→</span>
                                        <span>{shortcut.value}</span>
                                    </div>
                                    <button onClick={() => handleDeleteShortcut(shortcut.id)} className="p-1 rounded" style={{backgroundColor: settings.dangerColor, color: 'var(--app-text)'}} onMouseEnter={e => e.currentTarget.style.backgroundColor = settings.dangerColorHover || ''} onMouseLeave={e => e.currentTarget.style.backgroundColor = settings.dangerColor || ''}>
                                        <TrashIcon />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-center" style={{color: settings.toolbarText ? `${settings.toolbarText}B3` : '#A0AEC0'}}>No shortcuts defined. Add one above.</p>
                    )}
                </div>

                <div className="mt-6 flex justify-end gap-4">
                    <button onClick={onClose} className="rounded px-4 py-2" style={{ backgroundColor: settings.toolbarButtonBg }} onMouseEnter={e => e.currentTarget.style.backgroundColor = settings.toolbarButtonHoverBg || ''} onMouseLeave={e => e.currentTarget.style.backgroundColor = settings.toolbarButtonBg || ''}>Close</button>
                </div>
            </div>
        </div>
    );
};