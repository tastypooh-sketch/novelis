import React from 'react';
import { useNovelState } from '../../NovelContext';
import { SpinnerIcon, SparklesIconOutline, XIcon, CheckCircleIcon, AIErrorIcon } from './Icons';
import { motion, AnimatePresence } from 'framer-motion';
import { getContrastColor } from '../../utils/colorUtils';
import type { EditorSettings } from '../../types';

interface AIStatusBannerProps {
    settings: EditorSettings;
    activeContexts: string[];
}

export const AIStatusBanner: React.FC<AIStatusBannerProps> = ({ settings, activeContexts }) => {
    const { activeAITasks } = useNovelState();

    if (!activeAITasks || activeAITasks.length === 0) return null;

    // Filter tasks based on current active contexts
    const visibleTasks = activeAITasks.filter(task => {
        if (!task.contexts || task.contexts.length === 0 || task.contexts.includes('global')) return true;
        
        // Show if ANY of the task's contexts are currently active
        return task.contexts.some(ctx => activeContexts.includes(ctx));
    });

    if (visibleTasks.length === 0) return null;

    return (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-3 pointer-events-none w-full max-w-md px-6">
            <AnimatePresence mode="popLayout">
                {visibleTasks.map((task) => (
                    <motion.div
                        key={task.id}
                        layout
                        initial={{ opacity: 0, y: 20, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.9 }}
                        className="pointer-events-auto flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl border backdrop-blur-xl"
                        style={{ 
                            backgroundColor: task.status === 'error' ? 'rgba(127, 29, 29, 0.9)' : `${settings.toolbarBg}F2`, // 95% opacity
                            borderColor: task.status === 'completed' ? `${settings.successColor}80` : task.status === 'error' ? `${settings.dangerColor}80` : `${settings.accentColor}40`,
                            color: task.status === 'error' ? '#FFFFFF' : settings.toolbarText
                        }}
                    >
                        <div className="flex-shrink-0 relative">
                            {task.status === 'working' ? (
                                <>
                                    <SparklesIconOutline className="h-6 w-6 opacity-30" style={{ color: settings.accentColor }} />
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <SpinnerIcon className="h-4 w-4" style={{ color: settings.accentColor }} />
                                    </div>
                                </>
                            ) : task.status === 'completed' ? (
                                <CheckCircleIcon className="h-6 w-6 text-green-400" />
                            ) : (
                                <AIErrorIcon className="h-6 w-6 text-red-400" />
                            )}
                        </div>
                        <div className="flex flex-col min-w-0 flex-grow">
                            <span className="text-[10px] font-black uppercase tracking-widest opacity-60" style={{ color: task.status === 'completed' ? settings.successColor : task.status === 'error' ? '#fca5a5' : settings.accentColor }}>
                                {task.status === 'working' ? 'AI Processing' : task.status === 'completed' ? 'Task Complete' : 'Process Error'}
                            </span>
                            <span className="text-sm font-semibold truncate">
                                {task.status === 'error' ? (task.error || task.label) : task.label}
                            </span>
                        </div>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
};
