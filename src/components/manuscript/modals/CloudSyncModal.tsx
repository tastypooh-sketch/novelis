
import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { useDialog } from '../../common/DialogProvider';
import type { EditorSettings, INovelState } from '../../../types';
import { GoogleDriveIcon, CheckCircleIcon, SpinnerIcon, CloudSyncIcon, RevertIcon, HelpIcon } from '../../common/Icons';
import { useNovelDispatch, useNovelState } from '../../../NovelContext';

interface CloudSyncModalProps {
    settings: EditorSettings;
    onClose: () => void;
}

// Mock "Cloud" storage using localStorage for demonstration
const STORAGE_KEY_BACKUP = 'novelis_cloud_backup_mock';
const STORAGE_KEY_META = 'novelis_cloud_meta_mock';

export const CloudSyncModal: React.FC<CloudSyncModalProps> = ({ settings, onClose }) => {
    const dialog = useDialog();
    const currentState = useNovelState();
    const dispatch = useNovelDispatch();

    const [googleConnected, setGoogleConnected] = useState(false);
    const [lastSync, setLastSync] = useState<string | null>(null);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isRestoring, setIsRestoring] = useState(false);
    const [statusMessage, setStatusMessage] = useState<string | null>(null);

    // Load mocked connection state
    useEffect(() => {
        const meta = localStorage.getItem(STORAGE_KEY_META);
        if (meta) {
            const parsed = JSON.parse(meta);
            setGoogleConnected(parsed.google || false);
            setLastSync(parsed.lastSync || null);
        }
    }, []);

    const updateMeta = (updates: any) => {
        const currentMeta = localStorage.getItem(STORAGE_KEY_META) 
            ? JSON.parse(localStorage.getItem(STORAGE_KEY_META)!) 
            : {};
        const newMeta = { ...currentMeta, ...updates };
        localStorage.setItem(STORAGE_KEY_META, JSON.stringify(newMeta));
        if (updates.google !== undefined) setGoogleConnected(updates.google);
        if (updates.lastSync !== undefined) setLastSync(updates.lastSync);
    };

    const handleConnect = () => {
        // Simulate OAuth flow
        const width = 500;
        const height = 600;
        const left = (window.innerWidth - width) / 2;
        const top = (window.innerHeight - height) / 2;
        
        const popup = window.open('', 'Connect Google Drive', `width=${width},height=${height},top=${top},left=${left}`);
        
        if (popup) {
            popup.document.write(`
                <html>
                    <body style="font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; background: #f3f4f6;">
                        <h2>Connecting to Google Drive...</h2>
                        <p>(Simulation)</p>
                        <p>Please wait...</p>
                        <script>
                            setTimeout(() => {
                                window.close();
                            }, 1500);
                        </script>
                    </body>
                </html>
            `);
            
            const checkClosed = setInterval(() => {
                if (popup.closed) {
                    clearInterval(checkClosed);
                    updateMeta({ google: true });
                }
            }, 200);
        }
    };

    const handleDisconnect = () => {
        updateMeta({ google: false });
    };

    const handleBackup = () => {
        if (!googleConnected) return;
        
        setIsSyncing(true);
        setStatusMessage("Packaging project...");

        setTimeout(() => {
            setStatusMessage(`Uploading to Google Drive...`);
            
            setTimeout(() => {
                // Create backup
                const backupData = JSON.stringify(currentState);
                localStorage.setItem(STORAGE_KEY_BACKUP, backupData);
                
                const now = new Date().toLocaleString();
                updateMeta({ lastSync: now });
                
                setIsSyncing(false);
                setStatusMessage("Backup complete!");
                setTimeout(() => setStatusMessage(null), 3000);
            }, 1500);
        }, 800);
    };

    const handleRestore = async () => {
        const backup = localStorage.getItem(STORAGE_KEY_BACKUP);
        if (!backup) {
            dialog.error("No backup found in Google Drive (Simulation Storage).", "Cloud Sync");
            return;
        }

        if (!await dialog.confirm("Are you sure? This will overwrite your current project with the cloud backup. This action cannot be undone.", "Restore from Cloud")) {
            return;
        }

        setIsRestoring(true);
        setStatusMessage("Downloading from Google Drive...");

        setTimeout(() => {
            try {
                const state = JSON.parse(backup) as INovelState;
                dispatch({ type: 'LOAD_PROJECT', payload: state });
                setStatusMessage("Project restored successfully!");
            } catch (e) {
                console.error(e);
                dialog.error("Failed to restore backup: Invalid data.", "Restore Failed");
                setStatusMessage(null);
            } finally {
                setIsRestoring(false);
                setTimeout(() => setStatusMessage(null), 3000);
            }
        }, 1500);
    };

    return (
        <Modal onClose={onClose} settings={settings} title="Cloud Sync & Backup" className="max-w-xl">
            <div className="space-y-6">
                
                {/* Simulation Notice */}
                <div className="p-3 rounded border border-yellow-500/30 bg-yellow-500/10 text-xs text-center opacity-80">
                    <strong>Simulation Mode:</strong> This interface demonstrates the user experience. 
                    In production, this would connect to your real Google Drive using OAuth 2.0. 
                    Currently, backups are saved to your browser's local storage.
                </div>

                <div className="text-center space-y-2">
                    <p className="text-sm opacity-80">
                        Connect your Google Drive account to safely backup your novel to the cloud.
                    </p>
                </div>

                {/* Connection Card */}
                <div className="p-6 rounded-lg border flex flex-col items-center gap-4 transition-colors" 
                    style={{ 
                        backgroundColor: settings.toolbarButtonBg, 
                        borderColor: googleConnected ? settings.successColor : settings.toolbarInputBorderColor 
                    }}
                >
                    <div className="flex flex-col items-center gap-2">
                        <div className="p-3 rounded-full bg-white/10">
                            <GoogleDriveIcon />
                        </div>
                        <div className="font-semibold text-lg">Google Drive</div>
                        {googleConnected ? (
                            <div className="text-sm font-medium flex items-center gap-1.5" style={{ color: settings.successColor }}>
                                <CheckCircleIcon className="h-4 w-4" /> Connected
                            </div>
                        ) : (
                            <div className="text-sm opacity-60">Not Connected</div>
                        )}
                    </div>

                    <button
                        onClick={googleConnected ? handleDisconnect : handleConnect}
                        className={`px-6 py-2 rounded-md text-sm border transition-colors font-medium`}
                        style={{ 
                            borderColor: settings.toolbarInputBorderColor,
                            backgroundColor: googleConnected ? 'transparent' : settings.backgroundColor,
                            color: googleConnected ? settings.dangerColor : settings.textColor
                        }}
                    >
                        {googleConnected ? 'Disconnect Account' : 'Connect Account'}
                    </button>
                </div>

                {/* Actions Section */}
                <div className={`transition-all duration-500 ${googleConnected ? 'opacity-100 max-h-96' : 'opacity-50 max-h-0 overflow-hidden'}`}>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            <CloudSyncIcon />
                            Sync Actions
                        </h3>
                        {lastSync && (
                            <span className="text-xs opacity-60">Last Backup: {lastSync}</span>
                        )}
                    </div>

                    <div className="bg-black/10 rounded-lg p-6 border" style={{ borderColor: settings.toolbarInputBorderColor }}>
                        {statusMessage ? (
                            <div className="flex flex-col items-center justify-center py-4">
                                {(isSyncing || isRestoring) && <SpinnerIcon className="h-8 w-8 mb-3 text-blue-500" />}
                                <p className="font-medium">{statusMessage}</p>
                            </div>
                        ) : (
                            <div className="flex flex-col sm:flex-row gap-4">
                                <button
                                    onClick={handleBackup}
                                    disabled={isSyncing || isRestoring}
                                    className="flex-1 py-3 rounded-md font-medium flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95 hover:opacity-90"
                                    style={{ backgroundColor: settings.accentColor, color: 'var(--app-text)' }}
                                >
                                    <CloudSyncIcon />
                                    Backup Now
                                </button>
                                <button
                                    onClick={handleRestore}
                                    disabled={isSyncing || isRestoring}
                                    className="flex-1 py-3 rounded-md font-medium flex items-center justify-center gap-2 border transition-colors hover:bg-white/5"
                                    style={{ borderColor: settings.toolbarInputBorderColor, color: settings.textColor }}
                                >
                                    <RevertIcon className="h-5 w-5" />
                                    Restore
                                </button>
                            </div>
                        )}
                        <p className="text-xs text-center mt-4 opacity-60">
                            Backups are stored in a 'Novelis' folder in your Drive.
                        </p>
                    </div>
                </div>
            </div>
        </Modal>
    );
};
