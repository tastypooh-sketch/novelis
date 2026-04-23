import React, { Component, ErrorInfo, ReactNode } from 'react';
import { INovelState } from '../../types';
import { RefreshIcon, SaveIcon } from './Icons';

interface ErrorBoundaryProps {
  children?: ReactNode;
  state: INovelState;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * ErrorBoundary component to catch rendering errors and provide a rescue backup option.
 */
// Fix: Inherit from Component directly from named imports to ensure inheritance is correctly recognized by TypeScript
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  constructor(props: ErrorBoundaryProps) {
    // super(props) is essential for React class components
    super(props);
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error, errorInfo: null };
  }

  // Handle errors caught during the render phase
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught rendering error in Novelis:", error, errorInfo);
    // Fix: Access setState inherited from the Component base class
    this.setState({ errorInfo });
  }

  // Generate a clean state snapshot that can be re-imported in case of emergency
  private handleEmergencySave = () => {
    try {
        const stateToSave = {
            // Fix: Access inherited props from the Component base class
            ...this.props.state,
            // Ensure UI transient states are reset in the backup to avoid carrying over error states
            whatIfState: { isOpen: false, isLoading: false, originalText: null, suggestions: null, error: null, position: null }
        };
        const backupData = JSON.stringify(stateToSave, null, 2);
        const blob = new Blob([backupData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        a.download = `novelis_emergency_recovery_${timestamp}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (e) {
        alert("Emergency snapshot failed. Please check the browser console to copy your data manually.");
        console.error("State snapshot failed:", e);
        // Fallback: log state to console
        // Fix: Access inherited props from the Component base class
        console.log("Current Application State (Rescue this!):", this.props.state);
    }
  };

  private handleReload = () => {
    window.location.reload();
  };

  render(): ReactNode {
    // Check local state to determine if we should render the error UI
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-900 text-white p-8 text-center font-sans">
          <div className="bg-red-950/40 border border-red-500/50 p-10 rounded-2xl max-w-2xl shadow-2xl backdrop-blur-xl">
            <div className="mb-6 inline-flex p-4 rounded-full bg-red-500/10 border border-red-500/20">
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 text-red-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
               </svg>
            </div>
            
            <h1 className="text-3xl font-serif font-bold text-red-400 mb-2">Rescue Protocol Triggered</h1>
            <p className="text-slate-300 mb-6 text-lg">
              A serious error occurred. Your work is still held in memory. Save a recovery snapshot now to avoid losing progress.
            </p>
            
            <div className="bg-black/40 p-4 rounded-lg text-left overflow-auto max-h-40 mb-8 font-mono text-xs text-red-300/80 border border-red-500/10">
              {/* Display error message and stack trace if available */}
              {this.state.error && this.state.error.toString()}
              <br />
              {this.state.errorInfo && this.state.errorInfo.componentStack}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button 
                onClick={this.handleEmergencySave}
                className="flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 transition-all font-bold text-white shadow-lg active:scale-95"
              >
                <SaveIcon className="h-5 w-5" />
                Download Snapshot
              </button>
              <button 
                onClick={this.handleReload}
                className="flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-slate-800 hover:bg-slate-700 transition-all font-semibold border border-slate-700 active:scale-95"
              >
                <RefreshIcon className="h-5 w-5" />
                Reload & Restart
              </button>
            </div>
            
            <div className="mt-8 pt-6 border-t border-slate-700/50 text-xs text-slate-500 leading-relaxed">
              <p>Tip: After reloading, if your project does not load automatically, use the recovery file you just downloaded to import your work.</p>
            </div>
          </div>
        </div>
      );
    }

    // Fix: Access inherited props from the Component base class
    return this.props.children;
  }
}