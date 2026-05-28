import React, { useState, useEffect } from 'react';
import { SpinnerIcon, LockClosedIconOutline } from './Icons';
import type { EditorSettings } from '../../types';

interface LicenseGateProps {
    children: React.ReactNode;
    settings: EditorSettings;
}

export const LicenseGate: React.FC<LicenseGateProps> = ({ children, settings }) => {
    const [licenseKey, setLicenseKey] = useState('');
    const [isActivated, setIsActivated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const checkStatus = async () => {
            if (localStorage.getItem('novelis_dev_activated') === 'true') {
                setIsActivated(true);
            }
            
            // @ts-ignore
            if (window.electronAPI) {
                // @ts-ignore
                const hasLicense = await window.electronAPI.checkLicense();
                if (hasLicense) {
                    setIsActivated(true);
                }
            }
            setIsLoading(false);
        };
        checkStatus();
    }, []);

    const validateLicense = async (key: string) => {
        setIsLoading(true);
        setError(null);

        try {
            if (key === 'DEVMODE') {
                setIsActivated(true);
                localStorage.setItem('novelis_dev_activated', 'true');
                return;
            }

            // @ts-ignore
            if (window.electronAPI) {
                // @ts-ignore
                const result = await window.electronAPI.activateLicense(key);
                if (result.success) {
                    setIsActivated(true);
                } else {
                    setError(result.error || 'Invalid license key.');
                }
            } else {
                setError("Activation is only available in the Desktop Application (except for DEVMODE).");
            }
        } catch (err) {
            console.error(err);
            setError('An unexpected error occurred.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        validateLicense(licenseKey.trim());
    };

    if (isLoading) {
        return (
            <div className="h-screen w-screen flex flex-col items-center justify-center" style={{ backgroundColor: settings.backgroundColor, color: settings.textColor }}>
                <SpinnerIcon className="h-10 w-10 mb-4" />
                <p>Verifying License...</p>
            </div>
        );
    }

    if (isActivated) {
        return <>{children}</>;
    }

    return (
        <div className="h-screen w-screen flex flex-col items-center justify-center relative overflow-hidden" style={{ backgroundColor: settings.backgroundColor, color: settings.textColor }}>
            {/* Background ambiance */}
            {settings.backgroundImage && (
                <div 
                    className="absolute inset-0 opacity-30 bg-cover bg-center blur-sm"
                    style={{ backgroundImage: `url(${settings.backgroundImage})` }}
                />
            )}
            
            <div className="relative z-10 w-full max-w-md p-8 rounded-xl shadow-2xl border" style={{ backgroundColor: settings.toolbarBg, borderColor: settings.toolbarInputBorderColor }}>
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold font-serif mb-2">Novel<span style={{ color: settings.accentColor }}>i</span>s</h1>
                    <p className="opacity-70 text-sm">Product Activation</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-semibold mb-2 opacity-90">Enter your License Key</label>
                        <div className="relative">
                            <input 
                                type="text" 
                                value={licenseKey}
                                onChange={(e) => setLicenseKey(e.target.value)}
                                placeholder="XXXX-XXXX-XXXX-XXXX"
                                className="w-full p-3 rounded-lg border bg-transparent font-mono text-center tracking-widest uppercase focus:ring-2 outline-none"
                                style={{ 
                                    borderColor: error ? settings.dangerColor : settings.toolbarInputBorderColor,
                                    color: settings.textColor,
                                    '--tw-ring-color': settings.accentColor
                                } as React.CSSProperties}
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-50">
                                <LockClosedIconOutline />
                            </div>
                        </div>
                        {error && <p className="text-red-400 text-xs mt-2 text-center">{error}</p>}
                    </div>

                    <button 
                        type="submit" 
                        disabled={!licenseKey.trim()}
                        className="w-full py-3 rounded-lg font-bold text-white shadow-lg transition-transform active:scale-95 disabled:opacity-50 disabled:scale-100"
                        style={{ backgroundColor: settings.accentColor }}
                    >
                        Activate
                    </button>
                </form>

                <div className="mt-6 text-center text-xs opacity-60">
                    <p className="mb-2 font-medium">Important: AI features require your own Google API Key.</p>
                    <p className="text-[10px] opacity-75">(Google's Free Tier is generous. Most authors pay $0.00.)</p>
                    <p className="mt-4">Don't have a license? <a href="#" className="underline hover:opacity-100">Purchase Novelis</a></p>
                </div>
            </div>
        </div>
    );
};