
import React from 'react';
import { XIcon } from './Icons';

// Simple Icons for Min/Max
const MinusIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" />
    </svg>
);

const SquareIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 7.5A2.25 2.25 0 017.5 5.25h9a2.25 2.25 0 012.25 2.25v9a2.25 2.25 0 01-2.25 2.25h-9a2.25 2.25 0 01-2.25-2.25v-9z" />
    </svg>
);

interface TitleBarProps {
    backgroundColor: string;
    textColor: string;
}

export const TitleBar: React.FC<TitleBarProps> = ({ backgroundColor, textColor }) => {
    
    const handleAction = (action: 'minimize' | 'maximize' | 'close') => {
        // @ts-ignore
        if (window.electronAPI) {
            // @ts-ignore
            window.electronAPI[action]();
        } else {
            console.warn("Electron API not available");
        }
    };

    return (
        <div 
            className="h-8 flex items-center justify-between select-none fixed top-0 left-0 right-0 z-[100]"
            style={{ 
                backgroundColor: backgroundColor, 
                color: textColor,
                ['WebkitAppRegion' as any]: 'drag'
            }}
        >
            <div className="px-4 text-xs font-bold tracking-widest opacity-50">
                Novelis
            </div>
            <div className="flex h-full" style={{ ['WebkitAppRegion' as any]: 'no-drag' }}>
                <button 
                    onClick={() => handleAction('minimize')}
                    className="px-4 h-full hover:bg-toolbar-button-hover flex items-center justify-center transition-colors"
                    tabIndex={-1}
                    title="Minimize"
                >
                    <MinusIcon />
                </button>
                <button 
                    onClick={() => handleAction('maximize')}
                    className="px-4 h-full hover:bg-toolbar-button-hover flex items-center justify-center transition-colors"
                    tabIndex={-1}
                    title="Maximize"
                >
                    <SquareIcon />
                </button>
                <button 
                    onClick={() => handleAction('close')}
                    className="px-4 h-full hover:bg-app-danger hover:text-app-text flex items-center justify-center transition-colors"
                    tabIndex={-1}
                    title="Close"
                >
                    <XIcon className="h-4 w-4"/>
                </button>
            </div>
        </div>
    );
};
