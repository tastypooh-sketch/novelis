import React from 'react';
import { Modal } from './Modal';
import type { EditorSettings } from '../../../types';

interface DonateModalProps {
    settings: EditorSettings;
    onClose: () => void;
}

export const DonateModal: React.FC<DonateModalProps> = ({ settings, onClose }) => {
    return (
        <Modal onClose={onClose} settings={settings} title="Support Novelis" className="max-w-md">
            <div className="space-y-4 text-center">
                <p>If you find Novelis useful, please consider supporting its development. Your contribution helps keep the app free and actively maintained.</p>
                <p className="font-semibold">Thank you for your support!</p>
                <div>
                     <a href="https://www.buymeacoffee.com/yourusername" target="_blank" rel="noopener noreferrer" className="inline-block px-6 py-3 rounded-md text-white font-semibold" style={{backgroundColor: settings.accentColor}}>
                        Buy Me a Coffee
                    </a>
                </div>
            </div>
        </Modal>
    );
};
