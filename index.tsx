import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { NovelProvider } from './NovelContext';
import { LicenseGate } from './components/common/LicenseGate';
import './index.css';

// Minimal settings loader for the License Gate styling
const getInitialSettings = () => {
    const saved = localStorage.getItem('architextSettingsV1');
    const defaults = {
        backgroundColor: '#111827',
        textColor: '#FFFFFF',
        toolbarBg: '#1F2937',
        toolbarInputBorderColor: '#4B5563',
        accentColor: '#2563eb',
        dangerColor: '#be123c',
        fontFamily: 'Lora',
        fontSize: 1.4,
        showBookSpine: false,
    };
    return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
};

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <NovelProvider>
      <LicenseGate settings={getInitialSettings()}>
        <App />
      </LicenseGate>
    </NovelProvider>
  </React.StrictMode>
);