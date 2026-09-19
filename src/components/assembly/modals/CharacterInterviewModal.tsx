import React, { useState, useRef, useEffect } from 'react';
import { ICharacter, EditorSettings } from '../../../types';
import { Modal } from '../../manuscript/modals/Modal';
import { getCharacterInterviewResponse } from '../../../utils/interviewUtils';
import { SendIcon, SparklesIconOutline } from '../../common/Icons';
import { getContrastColor } from '../../../utils/colorUtils';
import { motion, AnimatePresence } from 'framer-motion';

interface CharacterInterviewModalProps {
    character: ICharacter;
    onClose: () => void;
    settings: EditorSettings;
}

export const CharacterInterviewModal: React.FC<CharacterInterviewModalProps> = ({ character, onClose, settings }) => {
    const [messages, setMessages] = useState<{ role: 'user' | 'model'; text: string }[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isLoading]);

    const handleSend = async () => {
        if (!inputValue.trim() || isLoading) return;
        if (!settings.geminiApiKey) return;

        const userMsg = inputValue.trim();
        setInputValue('');
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setIsLoading(true);

        try {
            const history = messages.map(m => ({ 
                role: m.role, 
                parts: [{ text: m.text }] 
            }));
            
            const response = await getCharacterInterviewResponse(
                settings.geminiApiKey,
                character,
                userMsg,
                history
            );
            
            setMessages(prev => [...prev, { role: 'model', text: response }]);
        } catch (err) {
            setMessages(prev => [...prev, { role: 'model', text: "Error: Failed to reach the character. Please check your connection." }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal 
            onClose={onClose} 
            settings={settings} 
            title={`Interview: ${character.name}`} 
            className="max-w-xl h-[600px] flex flex-col"
            footer={null}
        >
            <div className="flex flex-col h-full overflow-hidden">
                <div className="bg-black/20 p-3 mb-4 rounded-lg border border-white/5 text-xs italic opacity-70">
                    You are chatting directly with {character.name}. Ask them about their motivations, their past, or their feelings about the plot.
                </div>

                <div 
                    ref={scrollRef}
                    className="flex-1 overflow-y-auto space-y-4 pr-2 mb-4 custom-scrollbar"
                >
                    {messages.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full opacity-30 text-center px-8">
                            <SparklesIconOutline className="h-12 w-12 mb-4" />
                            <p className="text-sm italic">The stage is set. {character.name} is waiting for your first question.</p>
                        </div>
                    )}
                    
                    <AnimatePresence initial={false}>
                        {messages.map((m, i) => (
                            <motion.div 
                                key={i}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div 
                                    className={`max-w-[85%] p-3 rounded-2xl text-sm ${
                                        m.role === 'user' 
                                            ? 'bg-white/10 rounded-tr-none' 
                                            : 'bg-black/40 border border-white/10 rounded-tl-none'
                                    }`}
                                    style={m.role === 'user' ? { backgroundColor: `${settings.accentColor}30`, borderColor: `${settings.accentColor}50`, borderWidth: 1 } : {}}
                                >
                                    {m.text}
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                    
                    {isLoading && (
                        <motion.div 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }}
                            className="flex justify-start"
                        >
                            <div className="bg-black/40 border border-white/10 p-3 rounded-2xl rounded-tl-none flex gap-1">
                                <div className="w-1.5 h-1.5 bg-white/50 rounded-full animate-bounce [animation-delay:-0.3s]" />
                                <div className="w-1.5 h-1.5 bg-white/50 rounded-full animate-bounce [animation-delay:-0.15s]" />
                                <div className="w-1.5 h-1.5 bg-white/50 rounded-full animate-bounce" />
                            </div>
                        </motion.div>
                    )}
                </div>

                <div className="flex gap-2 p-2 bg-black/20 rounded-xl border border-white/10">
                    <input 
                        type="text" 
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder={`Message ${character.name}...`}
                        className="flex-1 bg-transparent border-none focus:ring-0 text-sm outline-none px-2"
                        autoFocus
                    />
                    <button 
                        onClick={handleSend}
                        disabled={!inputValue.trim() || isLoading}
                        className="btn-nuanced-success p-2 h-auto opacity-100 disabled:opacity-50"
                        style={{ 
                            color: getContrastColor(settings.accentColor),
                        }}
                    >
                        <SendIcon className="h-5 w-5" />
                    </button>
                </div>
            </div>
        </Modal>
    );
};
