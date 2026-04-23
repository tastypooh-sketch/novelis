
import React, { useState } from 'react';
import { Modal } from '../manuscript/modals/Modal';
import type { EditorSettings } from '../../types';

interface EULAModalProps {
    settings: EditorSettings;
    onAccept: () => void;
}

export const EULAModal: React.FC<EULAModalProps> = ({ settings, onAccept }) => {
    const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const target = e.currentTarget;
        if (Math.abs(target.scrollHeight - target.scrollTop - target.clientHeight) < 1) {
            setHasScrolledToBottom(true);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black bg-opacity-90 backdrop-blur-md">
            <div 
                className="w-full max-w-2xl m-4 rounded-lg shadow-2xl flex flex-col overflow-hidden border"
                style={{ backgroundColor: settings.toolbarBg, color: settings.toolbarText, borderColor: settings.toolbarInputBorderColor }}
            >
                <header className="p-6 border-b" style={{ borderColor: settings.toolbarInputBorderColor }}>
                    <h2 className="text-2xl font-serif font-bold">End User License Agreement</h2>
                    <p className="text-xs opacity-60 mt-1 uppercase tracking-widest">Please read and accept to continue</p>
                </header>
                
                <div 
                    className="p-8 overflow-y-auto max-h-[60vh] text-sm leading-relaxed space-y-4 font-sans"
                    onScroll={handleScroll}
                >
                    <section>
                        <h3 className="font-bold text-base mb-2">1. ACCEPTANCE BY INSTALLATION</h3>
                        <p>By installing, accessing, or using Novelis (the "Software"), you agree to be bound by the terms of this Agreement. If you do not agree, do not install or use the Software.</p>
                    </section>

                    <section className="p-4 border-l-4 border-red-500 bg-red-500/10">
                        <h3 className="font-bold text-base mb-2 text-red-400">2. ABSOLUTE LIMITATION OF LIABILITY</h3>
                        <p className="font-bold uppercase mb-2">The Software is provided "AS IS", without warranty of any kind, express or implied.</p>
                        <p>In no event shall the Software Developer, Authors, or Copyright Holders be liable for any claim, damages, or other liability, whether in an action of contract, tort, or otherwise, arising from, out of, or in connection with the Software or the use or other dealings in the Software.</p>
                    </section>

                    <section>
                        <h3 className="font-bold text-base mb-2">3. DISCLAIMER REGARDING DATA AND INCOME LOSS</h3>
                        <p>The User acknowledges that the Software is a digital tool subject to unforeseen bugs, system crashes, or file corruption. The Developer shall NOT be held responsible for:</p>
                        <ul className="list-disc pl-5 mt-2 space-y-1">
                            <li>Loss of any written content, manuscripts, or data.</li>
                            <li>Loss of actual or projected income resulting from software failure.</li>
                            <li>Academic consequences, including but not limited to, missed deadlines for theses, dissertations, or assignments.</li>
                            <li>Professional reputation damage or any consequential, incidental, or special damages.</li>
                        </ul>
                        <p className="mt-2 italic">User is solely responsible for maintaining secondary and tertiary backups of all work external to the Software's environment.</p>
                    </section>

                    <section>
                        <h3 className="font-bold text-base mb-2">4. AI-GENERATED CONTENT</h3>
                        <p>Novelis provides features powered by third-party Artificial Intelligence. The Developer makes no guarantees regarding the accuracy, tone, or safety of AI outputs. All AI-generated suggestions are to be used at the User's own risk and discretion.</p>
                    </section>

                    <section>
                        <h3 className="font-bold text-base mb-2">5. GOVERNING LAW</h3>
                        <p>This agreement is governed by the laws of the Developer's jurisdiction. Any legal disputes arising from Software use shall be handled exclusively within that jurisdiction.</p>
                    </section>
                </div>

                <footer className="p-6 border-t flex flex-col sm:flex-row items-center justify-between gap-4" style={{ borderColor: settings.toolbarInputBorderColor }}>
                    <p className="text-[10px] opacity-50 max-w-[300px]">
                        Scroll to the bottom of the agreement to enable acceptance.
                    </p>
                    <div className="flex gap-4">
                        <button 
                            onClick={() => window.close()} 
                            className="px-6 py-2 rounded text-sm opacity-70 hover:opacity-100"
                        >
                            Decline
                        </button>
                        <button 
                            disabled={!hasScrolledToBottom}
                            onClick={onAccept}
                            className="px-8 py-2 rounded font-bold text-white shadow-lg transition-all active:scale-95 disabled:opacity-30 disabled:scale-100"
                            style={{ backgroundColor: settings.accentColor }}
                        >
                            I Accept & Proceed
                        </button>
                    </div>
                </footer>
            </div>
        </div>
    );
};
