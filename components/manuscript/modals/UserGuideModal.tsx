
import React from 'react';
import { Modal } from './Modal';
import type { EditorSettings } from '../../../types';

interface UserGuideModalProps {
    settings: EditorSettings;
    onClose: () => void;
}

export const UserGuideModal: React.FC<UserGuideModalProps> = ({ settings, onClose }) => {
    const guideContent = [
        {
            level: 1, 
            title: "QUICK START OVERVIEW", 
            children: [
                {
                    level: 2, 
                    title: "1. Immersive Drafting (Manuscript Mode)",
                    content: [
                        "• <strong>Infinite Spread:</strong> Maximise your screen with horizontal dual-pane flow. Use the scroll wheel or Page Up/Down to flip pages like a book.",
                        "• <strong>Focus Mode:</strong> Press <strong>ESC</strong> to instantly hide all UI elements and enter a pure writing state.",
                        "• <strong>Ambiance:</strong> Toggle typewriter sound effects via the Speaker icon and customise your visual environment in the <strong>Design Gallery</strong>."
                    ]
                },
                {
                    level: 2, 
                    title: "2. Narrative Engineering (Assembly Mode)",
                    content: [
                        "• <strong>Chapters & Acts:</strong> Organise your story into the classic 3-Act structure. Drag and drop tiles to reorder your narrative.",
                        "• <strong>Character Profiles:</strong> Use the AI to generate deep backgrounds and photorealistic headshots based on your rough notes.",
                        "• <strong>The World Crucible:</strong> Braindump world-building notes and let the AI distill them into an organised Story Bible (Codex)."
                    ]
                },
                {
                    level: 2, 
                    title: "3. Advanced Intelligence & Analysis",
                    content: [
                        "• <strong>Pacing Heatmap:</strong> Visualise narrative tension across your entire book to spot 'sagging' middles.",
                        "• <strong>Plot Brainstorm:</strong> Detect plot holes, inconsistencies, and generate character-driven twists.",
                        "• <strong>Social Media Studio:</strong> Automatically create visual promotional content and captions for Instagram/TikTok from your manuscript excerpts."
                    ]
                },
                {
                    level: 2, 
                    title: "4. Portability & Backups",
                    content: [
                        "• <strong>The ZIP Protocol:</strong> Novelis saves your work into timestamped ZIP archives. Keep these in your cloud folder for ultimate safety.",
                        "• <strong>Nové Portable:</strong> Export a standalone <strong>Nové.html</strong> file to your USB stick. It contains your whole book and works offline in any browser."
                    ]
                }
            ]
        }
    ];

    return (
        <Modal onClose={onClose} settings={settings} title="Novelis Quick Start Guide" className="max-w-4xl">
            <div className="space-y-8 py-2">
                {guideContent.map((section, sIdx) => (
                    <div key={sIdx} className="space-y-6">
                        <h2 className="text-2xl font-serif font-bold tracking-tight border-b pb-2" style={{ borderColor: settings.toolbarInputBorderColor, color: settings.accentColor }}>
                            {section.title}
                        </h2>
                        <div className="space-y-8 pl-2">
                            {section.children.map((child, cIdx) => (
                                <div key={cIdx} className="space-y-3">
                                    <h3 className="text-lg font-bold opacity-90">{child.title}</h3>
                                    <div className="space-y-4 text-sm leading-relaxed opacity-80">
                                        {child.content.map((paragraph, pIdx) => (
                                            <p key={pIdx} dangerouslySetInnerHTML={{ __html: paragraph }} />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
                
                <div className="p-6 rounded-xl border-2 text-center space-y-3 bg-black/10" style={{ borderColor: settings.accentColor }}>
                    <h3 className="font-bold text-lg">Need the full documentation?</h3>
                    <p className="text-sm opacity-80">For a deep dive into every feature, AI prompt engineering, and setup instructions, visit the comprehensive online manual.</p>
                    <a 
                        href="https://www.thomascorfield.com/post/novelis-user-guide" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-block px-6 py-2 rounded-lg font-bold transition-transform active:scale-95"
                        style={{ backgroundColor: settings.accentColor, color: 'var(--app-text)' }}
                    >
                        View Full User Manual
                    </a>
                </div>

                <div className="pt-8 text-center border-t opacity-40 text-xs" style={{ borderColor: settings.toolbarInputBorderColor }}>
                    <p>Novelis v76.8.0 &mdash; Thomas Corfield</p>
                </div>
            </div>
        </Modal>
    );
};
