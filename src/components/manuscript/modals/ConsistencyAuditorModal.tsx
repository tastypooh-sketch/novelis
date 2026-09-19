import React, { useState } from 'react';
import { useNovelState, useNovelDispatch } from '../../../NovelContext';
import { Modal } from './Modal';
import { EditorSettings, ConsistencyIssue } from '../../../types';
import { runNarrativeAudit } from '../../../utils/auditUtils';
import { SparklesIconOutline, CheckCircleIcon, ExclamationTriangleIcon, InformationCircleIcon } from '../../common/Icons';
import { getContrastColor } from '../../../utils/colorUtils';

interface ConsistencyAuditorModalProps {
    onClose: () => void;
    settings: EditorSettings;
}

export const ConsistencyAuditorModal: React.FC<ConsistencyAuditorModalProps> = ({ onClose, settings }) => {
    const { chapters, characters, worldItems, consistencyAuditState } = useNovelState();
    const dispatch = useNovelDispatch();
    const [isLocalAuditing, setIsLocalAuditing] = useState(false);

    const handleRunAudit = async () => {
        if (!settings.geminiApiKey) {
            dispatch({ type: 'UPDATE_CONSISTENCY_AUDIT_STATE', payload: { error: "Gemini API Key is missing. Please add it in settings." } });
            return;
        }

        setIsLocalAuditing(true);
        dispatch({ type: 'UPDATE_CONSISTENCY_AUDIT_STATE', payload: { isAuditing: true, error: null } });

        try {
            const issues = await runNarrativeAudit(
                settings.geminiApiKey,
                chapters,
                characters,
                worldItems
            );
            dispatch({ 
                type: 'UPDATE_CONSISTENCY_AUDIT_STATE', 
                payload: { 
                    issues, 
                    lastAuditTimestamp: Date.now(),
                    isAuditing: false 
                } 
            });
        } catch (err: any) {
            dispatch({ 
                type: 'UPDATE_CONSISTENCY_AUDIT_STATE', 
                payload: { 
                    error: err.message || "Failed to run audit.",
                    isAuditing: false 
                } 
            });
        } finally {
            setIsLocalAuditing(false);
        }
    };

    const getSeverityIcon = (severity: ConsistencyIssue['severity']) => {
        switch (severity) {
            case 'High': return <ExclamationTriangleIcon className="text-red-500 h-5 w-5" />;
            case 'Medium': return <ExclamationTriangleIcon className="text-amber-500 h-5 w-5" />;
            case 'Low': return <InformationCircleIcon className="text-blue-500 h-5 w-5" />;
        }
    };

    const getSeverityBg = (severity: ConsistencyIssue['severity']) => {
        switch (severity) {
            case 'High': return 'bg-red-500/10 border-red-500/30';
            case 'Medium': return 'bg-amber-500/10 border-amber-500/30';
            case 'Low': return 'bg-blue-500/10 border-blue-500/30';
        }
    };

    return (
        <Modal 
            onClose={onClose} 
            settings={settings} 
            title="Narrative Consistency Auditor" 
            className="max-w-2xl"
            footer={
                <div className="flex justify-between items-center w-full">
                    <span className="text-xs opacity-60">
                        {consistencyAuditState?.lastAuditTimestamp ? `Last run: ${new Date(consistencyAuditState.lastAuditTimestamp).toLocaleTimeString()}` : 'No audit run yet.'}
                    </span>
                    <button
                        onClick={handleRunAudit}
                        disabled={isLocalAuditing}
                        className="btn-nuanced-lg-primary px-6 py-2.5 opacity-100 disabled:opacity-50"
                    >
                        {isLocalAuditing ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                                Auditing Manuscript...
                            </>
                        ) : (
                            <>
                                <SparklesIconOutline className="h-5 w-5" />
                                Run Consistency Audit
                            </>
                        )}
                    </button>
                </div>
            }
        >
            <div className="space-y-4 min-h-[300px]">
                <p className="text-sm opacity-80">
                    The auditor uses Gemini Pro to scan your entire project context (chapters, characters, and world notes) to identify contradictions, continuity errors, and plot holes.
                </p>

                {consistencyAuditState?.error && (
                    <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-sm text-red-200">
                        {consistencyAuditState.error}
                    </div>
                )}

                {consistencyAuditState?.issues && consistencyAuditState.issues.length > 0 ? (
                    <div className="space-y-3">
                        {consistencyAuditState.issues.map(issue => (
                            <div key={issue.id} className={`p-4 rounded-xl border ${getSeverityBg(issue.severity)}`}>
                                <div className="flex items-start gap-3">
                                    <div className="mt-1">{getSeverityIcon(issue.severity)}</div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-xs font-bold uppercase tracking-wider opacity-60">{issue.type} Issue</span>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${issue.severity === 'High' ? 'bg-red-500 text-white' : issue.severity === 'Medium' ? 'bg-amber-500 text-black' : 'bg-blue-500 text-white'}`}>
                                                {issue.severity}
                                            </span>
                                        </div>
                                        <h4 className="font-semibold text-sm mb-2">{issue.description}</h4>
                                        <div className="text-sm opacity-80 bg-black/20 p-2 rounded border border-white/5 italic">
                                            <span className="font-bold non-italic mr-1 text-xs opacity-70">Suggestion:</span>
                                            {issue.suggestion}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : !isLocalAuditing && consistencyAuditState?.lastAuditTimestamp ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center opacity-60">
                        <CheckCircleIcon className="h-16 w-16 mb-4 text-green-500" />
                        <h3 className="text-lg font-medium">No inconsistencies found</h3>
                        <p className="text-sm">Your manuscript continuity looks solid!</p>
                    </div>
                ) : !isLocalAuditing && (
                    <div className="flex flex-col items-center justify-center py-12 text-center opacity-40">
                        <SparklesIconOutline className="h-16 w-16 mb-4" />
                        <h3 className="text-lg font-medium">Ready to Audit</h3>
                        <p className="text-sm">Run the audit to check for narrative contradictions.</p>
                    </div>
                )}
            </div>
        </Modal>
    );
};
