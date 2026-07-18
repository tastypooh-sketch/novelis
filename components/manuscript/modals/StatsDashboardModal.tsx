
import React, { useState, useMemo } from 'react';
import { Modal } from './Modal';
import type { EditorSettings, IChapter, WritingGoals } from '../../../types';
import { calculateWordCountFromHtml } from '../../../utils/manuscriptUtils';

interface StatsDashboardModalProps {
    settings: EditorSettings;
    chapters: IChapter[];
    totalWordCount: number;
    goals: WritingGoals;
    onGoalsChange: (goals: WritingGoals) => void;
    onClose: () => void;
}

export const StatsDashboardModal: React.FC<StatsDashboardModalProps> = ({ settings, chapters, totalWordCount, goals, onGoalsChange, onClose }) => {
    const [manuscriptGoal, setManuscriptGoal] = useState(goals.manuscriptGoal.toString());
    const [dailyGoal, setDailyGoal] = useState(goals.dailyGoal.toString());

    const chapterWordCounts = useMemo(() => {
        return chapters.map(chapter => ({
            id: chapter.id,
            title: `${chapter.chapterNumber}. ${chapter.title}`,
            count: calculateWordCountFromHtml(chapter.content)
        })).sort((a,b) => b.count - a.count);
    }, [chapters]);

    const handleSave = () => {
        onGoalsChange({ 
            manuscriptGoal: parseInt(manuscriptGoal || '0', 10), 
            dailyGoal: parseInt(dailyGoal || '0', 10) 
        });
        onClose();
    };

    const manuscriptProgress = Math.min(100, (totalWordCount / (parseInt(manuscriptGoal || '1', 10))) * 100);
    const readingTimeMinutes = Math.ceil(totalWordCount / 250);
    const readingTimeHours = Math.floor(readingTimeMinutes / 60);
    const readingTimeMins = readingTimeMinutes % 60;

    const readingTimeString = readingTimeHours > 0 
        ? `${readingTimeHours}h ${readingTimeMins}m` 
        : `${readingTimeMins}m`;

    return (
        <Modal onClose={onClose} settings={settings} title="Writing Statistics & Goals" className="max-w-2xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Side: Goals & Progress */}
                <div className="space-y-6">
                    <div>
                        <h3 className="font-semibold mb-2">Manuscript Goal</h3>
                        <div className="relative h-6 w-full rounded-full" style={{backgroundColor: settings.toolbarButtonBg}}>
                             <div className="absolute top-0 left-0 h-6 rounded-full" style={{width: `${manuscriptProgress}%`, backgroundColor: settings.accentColor}}></div>
                             <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">{totalWordCount.toLocaleString()} / {parseInt(manuscriptGoal || '0', 10).toLocaleString()} words</span>
                        </div>
                        <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={manuscriptGoal}
                            onChange={e => {
                                const val = e.target.value;
                                if (val === '' || /^\d+$/.test(val)) setManuscriptGoal(val);
                            }}
                            className="w-full mt-2 px-2 py-1.5 rounded-md border text-sm"
                            style={{ backgroundColor: settings.backgroundColor, color: settings.textColor, borderColor: settings.toolbarInputBorderColor }}
                        />
                    </div>
                    <div>
                        <h3 className="font-semibold mb-2">Daily Writing Goal</h3>
                         <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={dailyGoal}
                            onChange={e => {
                                const val = e.target.value;
                                if (val === '' || /^\d+$/.test(val)) setDailyGoal(val);
                            }}
                            className="w-full px-2 py-1.5 rounded-md border text-sm"
                            style={{ backgroundColor: settings.backgroundColor, color: settings.textColor, borderColor: settings.toolbarInputBorderColor }}
                        />
                    </div>
                    
                    <div className="p-3 rounded border" style={{ backgroundColor: settings.toolbarButtonBg, borderColor: settings.toolbarInputBorderColor }}>
                        <h3 className="font-semibold text-sm mb-1">Estimated Reading Time</h3>
                        <p className="text-xl font-bold" style={{color: settings.accentColor}}>{readingTimeString}</p>
                        <p className="text-xs opacity-60">Based on avg. 250 wpm</p>
                    </div>

                     <button
                        onClick={handleSave}
                        className="w-full px-4 py-2 rounded-md font-bold"
                        style={{ backgroundColor: settings.successColor, color: 'var(--app-text)' }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = settings.successColorHover || ''}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = settings.successColor || ''}
                    >
                        Save Goals
                    </button>
                </div>
                {/* Right Side: Chapter Breakdown */}
                <div>
                    <h3 className="font-semibold mb-2">Chapter Word Counts</h3>
                    <div className="max-h-80 overflow-y-auto pr-2 space-y-2">
                        {chapterWordCounts.map(chapter => (
                            <div key={chapter.id} className="flex justify-between items-center text-sm p-2 rounded" style={{backgroundColor: settings.toolbarButtonBg}}>
                                <span className="truncate pr-4">{chapter.title}</span>
                                <span className="font-semibold flex-shrink-0">{chapter.count.toLocaleString()}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </Modal>
    );
};
