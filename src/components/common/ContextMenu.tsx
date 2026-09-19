import React, { useRef, useEffect } from 'react';
import type { EditorSettings } from '../../types';

interface ContextMenuAction {
    label: string;
    onSelect: () => void;
}

interface ContextMenuProps {
    x: number;
    y: number;
    actions: ContextMenuAction[];
    onClose: () => void;
    settings: EditorSettings;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, actions, onClose, settings }) => {
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [onClose]);

    return (
        <div
            ref={menuRef}
            className="fixed z-50 rounded-md shadow-lg py-1"
            style={{
                top: y,
                left: x,
                backgroundColor: settings.dropdownBg,
                color: settings.toolbarText,
            }}
        >
            {actions.map((action, index) => (
                <button
                    key={index}
                    onClick={() => {
                        action.onSelect();
                        onClose();
                    }}
                    className="block w-full text-left px-4 py-2 text-sm"
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = settings.toolbarButtonHoverBg || ''}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                    {action.label}
                </button>
            ))}
        </div>
    );
};
