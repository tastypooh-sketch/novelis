export {};

declare global {
  interface ElectronAPI {
    minimize: () => void;
    maximize: () => void;
    close: () => void;
    saveFile: (data: { name: string; content: Uint8Array }) => Promise<boolean>;
    selectDirectory: () => Promise<string | null>;
    writeZipToFolder: (folderPath: string, fileName: string, content: Uint8Array) => Promise<boolean>;
    scanForLatestZip: (folderPath: string) => Promise<{ name: string; path: string; date: number; content: Uint8Array } | null>;
    openFileDialog: () => Promise<{ name: string; content: Uint8Array } | null>;
    importNoveFile: () => Promise<{ name: string; content: Uint8Array; warning?: string } | null>;
    activateLicense: (key: string) => Promise<{ success: boolean; error?: string }>;
    checkLicense: () => Promise<boolean>;
    openPath: (path: string) => Promise<boolean>;
    showMessageBox: (options: any) => Promise<{ response: number }>;
  }

  interface Window {
    electronAPI?: ElectronAPI;
    webkitAudioContext?: typeof AudioContext;
  }
}
