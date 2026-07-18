import React, { useRef, useEffect } from 'react';
import type { EditorSettings } from '../../../types';
import { XIcon } from '../../common/Icons';

interface ModalProps {
  onClose: () => void;
  children: React.ReactNode;
  settings: EditorSettings;
  title: string;
  className?: string;
  footer?: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ onClose, children, settings, title, className = 'max-w-xl', footer }) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  return (
    <div 
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm"
        aria-modal="true"
        role="dialog"
    >
      <div
        ref={modalRef}
        className={`w-full m-4 rounded-lg shadow-2xl flex flex-col ${className}`}
        style={{
          backgroundColor: settings.toolbarBg,
          color: settings.toolbarText,
          maxHeight: '90vh'
        }}
      >
        <header className="flex items-center justify-between p-4 border-b flex-shrink-0" style={{ borderColor: settings.toolbarInputBorderColor }}>
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full"
            style={{ color: settings.toolbarText }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = settings.toolbarButtonHoverBg || ''}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
            aria-label="Close modal"
          >
            <XIcon />
          </button>
        </header>
        <main className="flex-grow p-6 overflow-y-auto">
          {children}
        </main>
        {footer && (
            <footer className="flex-shrink-0 flex justify-end gap-4 p-4 border-t" style={{borderColor: settings.toolbarInputBorderColor}}>
                {footer}
            </footer>
        )}
      </div>
    </div>
  );
};