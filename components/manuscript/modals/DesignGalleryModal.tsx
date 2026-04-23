import React, { useState, useMemo, useRef } from 'react';
import { produce } from 'immer';
import { Modal } from './Modal';
import type { EditorSettings, Palette, GalleryItem, GalleryCategory } from '../../../types';
import { generateId } from '../../../utils/common';
import { TrashIconOutline } from '../../common/Icons';

interface DesignGalleryModalProps {
    settings: EditorSettings;
    onClose: () => void;
    galleryItems: GalleryItem[];
    onGalleryItemsChange: (items: GalleryItem[]) => void;
    onSettingsChange: (settings: Partial<EditorSettings>) => void;
}

const CATEGORIES: GalleryCategory[] = ['Backgrounds'];

const PALETTES: Palette[] = [
    { name: 'Midnight', backgroundColor: '#111827', textColor: '#FFFFFF', toolbarBg: '#1F2937', toolbarText: '#FFFFFF', toolbarButtonBg: '#374151', toolbarButtonHoverBg: '#4B5563', toolbarInputBorderColor: '#4B5563', accentColor: '#2563eb', accentColorHover: '#1d4ed8', successColor: '#16a34a', successColorHover: '#15803d', dangerColor: '#be123c', dangerColorHover: '#9f1239', dropdownBg: '#374151' },
    { name: 'Charcoal', backgroundColor: '#202020', textColor: '#E8E8E8', toolbarBg: '#1E1E1E', toolbarText: '#E8E8E8', toolbarButtonBg: '#333333', toolbarButtonHoverBg: '#454545', toolbarInputBorderColor: '#454545', accentColor: '#4A90E2', accentColorHover: '#357ABD', successColor: '#22c55e', successColorHover: '#16a34a', dangerColor: '#dc2626', dangerColorHover: '#b91c1c', dropdownBg: '#333333' },
    { name: 'Sepia', backgroundColor: '#f5eeda', textColor: '#5c4033', toolbarBg: '#e9ddc7', toolbarText: '#5c4033', toolbarButtonBg: '#dcd0b9', toolbarButtonHoverBg: '#cebfa5', toolbarInputBorderColor: '#cebfa5', accentColor: '#8c6b5d', accentColorHover: '#73574c', successColor: '#5a8b5a', successColorHover: '#497049', dangerColor: '#a65b5b', dangerColorHover: '#8c4a4a', dropdownBg: '#dcd0b9' },
    { name: 'Paperback', backgroundColor: '#f8f8f8', textColor: '#1a1a1a', toolbarBg: '#F0F0F0', toolbarText: '#1a1a1a', toolbarButtonBg: '#e0e0e0', toolbarButtonHoverBg: '#d0d0d0', toolbarInputBorderColor: '#c8c8c8', accentColor: '#2563eb', accentColorHover: '#1d4ed8', successColor: '#16a34a', successColorHover: '#15803d', dangerColor: '#be123c', dangerColorHover: '#9f1239', dropdownBg: '#e0e0e0' },
    { name: 'Terminal', backgroundColor: '#000000', textColor: '#F5F5F5', toolbarBg: '#111111', toolbarText: '#F5F5F5', toolbarButtonBg: '#222222', toolbarButtonHoverBg: '#333333', toolbarInputBorderColor: '#333333', accentColor: '#10b981', accentColorHover: '#059669', successColor: '#22c55e', successColorHover: '#16a34a', dangerColor: '#f43f5e', dangerColorHover: '#e11d48', dropdownBg: '#222222' },
    { name: 'Gothic', backgroundColor: '#1a1414', textColor: '#e0c5a3', toolbarBg: '#241a1a', toolbarText: '#e0c5a3', toolbarButtonBg: '#3d3030', toolbarButtonHoverBg: '#4d4040', toolbarInputBorderColor: '#4d4040', accentColor: '#a855f7', accentColorHover: '#9333ea', successColor: '#4ade80', successColorHover: '#22c55e', dangerColor: '#ef4444', dangerColorHover: '#dc2626', dropdownBg: '#3d3030' },
];

const NOVELIS_COLLECTION = [
    { url: 'https://static.vecteezy.com/system/resources/previews/036/215/115/non_2x/ai-generated-abstract-black-leaf-on-dark-background-elegant-design-generated-by-ai-free-photo.jpg' },
    { url: 'https://static.vecteezy.com/system/resources/previews/036/185/896/non_2x/ai-generated-green-soft-background-free-photo.jpg' },
    { url: 'https://static.vecteezy.com/system/resources/previews/035/598/194/non_2x/ai-generated-love-filled-background-with-gentle-lighting-hearts-and-space-for-heartfelt-messages-free-photo.jpg' },
    { url: 'https://static.vecteezy.com/system/resources/previews/036/228/869/non_2x/ai-generated-ivory-soft-background-free-photo.jpg' },
    { url: 'https://static.vecteezy.com/system/resources/previews/035/812/116/non_2x/ai-generated-graceful-light-elegant-background-photo.jpg' },
    { url: 'https://static.vecteezy.com/system/resources/thumbnails/029/349/797/small/abstract-christmas-background-with-empty-space-smoke-bokeh-lights-copy-space-for-your-text-merry-xmas-happy-new-year-festive-backdrop-generative-ai-photo.jpeg' },
    { url: 'https://static.vecteezy.com/system/resources/thumbnails/035/940/968/small/ai-generated-chic-design-elegant-background-photo.jpg' },
    { url: 'https://static.vecteezy.com/system/resources/thumbnails/035/812/116/small/ai-generated-graceful-light-elegant-background-photo.jpg' },
    { url: 'https://static.vecteezy.com/system/resources/thumbnails/053/748/239/small/an-old-brown-paper-with-leaves-on-it-photo.jpg' },
    { url: 'https://static.vecteezy.com/system/resources/thumbnails/010/818/982/small/multicolor-background-modern-dark-low-poly-effect-with-abstract-gradient-for-backdrop-free-vector.jpg' },
    { url: 'https://static.vecteezy.com/system/resources/thumbnails/007/278/150/small/dark-background-abstract-with-light-effect-vector.jpg' },
    { url: 'https://static.vecteezy.com/system/resources/thumbnails/073/050/678/small/purple-and-pink-hexagonal-pattern-gradient-background-vector.jpg' },
    { url: 'https://static.vecteezy.com/system/resources/thumbnails/071/443/047/small/sepia-toned-floral-background-with-beige-and-brown-flowers-photo.jpg' },
    { url: 'https://static.vecteezy.com/system/resources/previews/020/526/952/non_2x/abstract-subtle-background-free-vector.jpg' },
    { url: 'https://static.vecteezy.com/system/resources/previews/021/565/020/non_2x/minimalist-abstract-background-design-smooth-and-clean-subtle-background-free-vector.jpg' },
    { url: 'https://static.vecteezy.com/system/resources/previews/068/630/930/non_2x/elegant-abstract-background-with-subtle-flowing-light-blue-curves-on-a-deep-blue-gradient-offering-a-modern-and-sophisticated-feel-for-various-digital-projects-vector.jpg' },
    { url: 'https://static.vecteezy.com/system/resources/previews/044/792/171/non_2x/a-red-and-black-background-with-a-bright-light-gradient-art-design-idea-template-free-vector.jpg' },
    { url: 'https://static.vecteezy.com/system/resources/thumbnails/008/014/636/small/abstract-dynamic-black-background-design-vector.jpg' },
    { url: 'https://static.vecteezy.com/system/resources/previews/010/654/924/non_2x/wave-lights-with-black-background-and-focus-spot-light-free-vector.jpg' },
    { url: 'https://static.vecteezy.com/system/resources/thumbnails/033/863/113/small/grunge-paper-background-with-space-for-text-or-image-old-paper-texture-old-paper-sheet-vintage-aged-original-background-or-texture-ai-generated-free-photo.jpg' },
];

export const DesignGalleryModal: React.FC<DesignGalleryModalProps> = ({ settings, onClose, galleryItems, onGalleryItemsChange, onSettingsChange }) => {
    const [newUrl, setNewUrl] = useState('');
    const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleAddUrl = () => {
        if (newUrl.trim()) {
            try {
                new URL(newUrl); // Validate URL
                const url = newUrl.trim();
                const newItem: GalleryItem = {
                    id: generateId(),
                    url: url,
                    category: 'Backgrounds',
                };
                onGalleryItemsChange([...galleryItems, newItem]);
                onSettingsChange({ backgroundImage: url }); // Apply immediately
                setNewUrl('');
            } catch (error) {
                alert('Please enter a valid URL.');
            }
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                alert('Please select a valid image file (PNG, JPG, GIF, WebP).');
                return;
            }
            const reader = new FileReader();
            reader.onload = (event) => {
                const imageUrl = event.target?.result as string;
                if (imageUrl) {
                    const newItem: GalleryItem = {
                        id: generateId(),
                        url: imageUrl,
                        category: 'Backgrounds',
                    };
                    onGalleryItemsChange([...galleryItems, newItem]);
                    onSettingsChange({ backgroundImage: imageUrl }); // Apply immediately
                }
            };
            reader.readAsDataURL(file);
        }
        if (e.target) {
            e.target.value = '';
        }
    };


    const handleDeleteItem = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        onGalleryItemsChange(galleryItems.filter(item => item.id !== id));
    };

    const handleApplyItem = (url: string) => {
        onSettingsChange({ backgroundImage: url });
        // Don't close to allow previewing
    };

    const handlePaletteClick = (palette: Palette) => {
        onSettingsChange({ ...palette, backgroundImage: null });
        // Don't close to allow previewing
    };

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, id: string) => {
        setDraggedItemId(id);
        e.dataTransfer.setData('text/plain', id);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>, category: GalleryCategory) => {
        e.preventDefault();
        const id = e.dataTransfer.getData('text/plain');
        if (id) {
            onGalleryItemsChange(produce(galleryItems, draft => {
                const item = draft.find(i => i.id === id);
                if (item) {
                    item.category = category;
                }
            }));
        }
        setDraggedItemId(null);
    };

    const handleContainerDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        const container = scrollContainerRef.current;
        if (!container || !draggedItemId) return;

        const rect = container.getBoundingClientRect();
        const y = e.clientY - rect.top;
        const scrollThreshold = 50; // pixels from edge
        const scrollSpeed = 10; // scroll amount

        if (y < scrollThreshold) {
            container.scrollTop -= scrollSpeed;
        } else if (y > rect.height - scrollThreshold) {
            container.scrollTop += scrollSpeed;
        }
    };

    const groupedItems = useMemo(() => {
        const groups: { [key in GalleryCategory]?: GalleryItem[] } = {};
        CATEGORIES.forEach(cat => groups[cat] = []);
        galleryItems.forEach(item => {
            if (!groups[item.category]) {
                groups[item.category] = [];
            }
            groups[item.category]!.push(item);
        });
        return groups;
    }, [galleryItems]);

    return (
        <Modal onClose={onClose} settings={settings} title="Design Gallery" className="max-w-4xl">
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <h3 className="font-semibold mb-2">Add New Background</h3>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                            accept="image/png, image/jpeg, image/gif, image/webp"
                            className="hidden"
                        />
                        <div className="flex gap-2">
                            <input
                                type="url"
                                value={newUrl}
                                onChange={e => setNewUrl(e.target.value)}
                                placeholder="Paste image URL here..."
                                className="w-full px-2 py-1.5 rounded-md border text-sm"
                                style={{ backgroundColor: settings.backgroundColor, color: settings.textColor, borderColor: settings.toolbarInputBorderColor }}
                            />
                            <button 
                                onClick={handleAddUrl} 
                                className="px-4 py-1.5 text-sm rounded-md text-white flex-shrink-0" 
                                style={{ backgroundColor: settings.accentColor }}
                                onMouseEnter={e => e.currentTarget.style.backgroundColor = settings.accentColorHover || ''}
                                onMouseLeave={e => e.currentTarget.style.backgroundColor = settings.accentColor || ''}
                            >
                                Add URL
                            </button>
                            <button 
                                onClick={() => fileInputRef.current?.click()} 
                                className="px-4 py-1.5 text-sm rounded-md flex-shrink-0"
                                style={{ backgroundColor: settings.toolbarButtonBg, color: settings.toolbarText }}
                                onMouseEnter={e => e.currentTarget.style.backgroundColor = settings.toolbarButtonHoverBg || ''}
                                onMouseLeave={e => e.currentTarget.style.backgroundColor = settings.toolbarButtonBg || ''}
                            >
                                Upload
                            </button>
                        </div>
                    </div>
                    <div>
                        <h3 className="font-semibold mb-2">Startup Behavior</h3>
                        <div className="flex items-center gap-4 p-2 rounded-md" style={{backgroundColor: settings.backgroundColor}}>
                            <label className="flex items-center cursor-pointer">
                                <input type="radio" name="startup" value="fixed" checked={settings.galleryStartupBehavior !== 'random'} onChange={() => onSettingsChange({galleryStartupBehavior: 'fixed'})} className="mr-2" style={{accentColor: settings.accentColor}}/>
                                Keep Last Used
                            </label>
                             <label className="flex items-center cursor-pointer">
                                <input type="radio" name="startup" value="random" checked={settings.galleryStartupBehavior === 'random'} onChange={() => onSettingsChange({galleryStartupBehavior: 'random'})} className="mr-2" style={{accentColor: settings.accentColor}}/>
                                Load Random
                            </label>
                        </div>
                    </div>
                </div>
                
                <div>
                    <h3 className="font-semibold mb-2">Current Background</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-3 rounded-md" style={{backgroundColor: settings.backgroundColor}}>
                        <div>
                            <label htmlFor="bgOpacity" className="text-sm opacity-80">Image Intensity</label>
                            <input
                                id="bgOpacity"
                                type="range"
                                min="0"
                                max="1"
                                step="0.05"
                                value={settings.backgroundImageOpacity ?? 0.5}
                                onChange={e => onSettingsChange({ backgroundImageOpacity: parseFloat(e.target.value) })}
                                disabled={!settings.backgroundImage}
                                className="w-full h-2 rounded-lg appearance-none cursor-pointer disabled:opacity-50"
                                style={{ background: settings.toolbarButtonBg, accentColor: settings.accentColor }}
                            />
                        </div>
                        <div>
                             <label className="text-sm block mb-1 opacity-0 select-none">&nbsp;</label>
                            <button
                                onClick={() => onSettingsChange({ backgroundImage: null })}
                                disabled={!settings.backgroundImage}
                                className="w-full px-4 py-1.5 text-sm rounded-md disabled:opacity-50"
                                style={{ backgroundColor: settings.toolbarButtonBg, color: settings.toolbarText }}
                                onMouseEnter={e => { if (e.currentTarget.disabled) return; e.currentTarget.style.backgroundColor = settings.toolbarButtonHoverBg || ''; }}
                                onMouseLeave={e => { if (e.currentTarget.disabled) return; e.currentTarget.style.backgroundColor = settings.toolbarButtonBg || ''; }}
                            >
                                Remove Background
                            </button>
                        </div>
                    </div>
                </div>

                <div>
                    <h3 className="font-semibold mb-2">Color Palettes</h3>
                    <div className="flex flex-wrap items-center gap-3">
                        {PALETTES.map(palette => (
                            <div key={palette.name} onClick={() => handlePaletteClick(palette)} title={palette.name}
                                className="flex items-center gap-2 cursor-pointer p-2 rounded-md"
                                style={{backgroundColor: settings.toolbarButtonBg}}>
                                <div className="w-6 h-6 rounded-full border-2" style={{ backgroundColor: palette.backgroundColor, borderColor: settings.toolbarInputBorderColor }} />
                                <span className="text-sm">{palette.name}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div 
                    ref={scrollContainerRef}
                    onDragOver={handleContainerDragOver}
                    className="space-y-6 max-h-96 overflow-y-auto pr-2"
                >
                    {/* Hardcoded Novelis Collection */}
                    <div>
                        <h3 className="font-semibold mb-2">Novelis Collection</h3>
                        <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-3 p-3 rounded-md min-h-[140px]" style={{ backgroundColor: settings.backgroundColor }}>
                            {NOVELIS_COLLECTION.map((item, i) => (
                                <div 
                                    key={i} 
                                    onClick={() => handleApplyItem(item.url)}
                                    className="relative aspect-video rounded-md overflow-hidden cursor-pointer group border-2 border-transparent hover:border-white transition-all"
                                >
                                    <img src={item.url} alt="Preset" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                            ))}
                        </div>
                    </div>

                    {CATEGORIES.map(category => (
                        <div key={category}>
                            <h3 className="font-semibold mb-2">My Uploads</h3>
                            <div
                                onDragOver={e => e.preventDefault()}
                                onDrop={e => handleDrop(e, category)}
                                className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-3 p-3 rounded-md min-h-[140px]"
                                style={{ backgroundColor: settings.backgroundColor }}
                            >
                                {groupedItems[category]?.map(item => (
                                    <div
                                        key={item.id}
                                        draggable
                                        onDragStart={e => handleDragStart(e, item.id)}
                                        onDragEnd={() => setDraggedItemId(null)}
                                        onClick={() => handleApplyItem(item.url)}
                                        className={`relative aspect-video rounded-md overflow-hidden cursor-pointer group transition-transform ${draggedItemId === item.id ? 'opacity-30' : ''}`}
                                    >
                                        <img src={item.url} alt="" className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        <button onClick={(e) => handleDeleteItem(item.id, e)} className="absolute top-1 right-1 p-1 rounded-full bg-red-600/80 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                            <TrashIconOutline className="h-3 w-3" />
                                        </button>
                                    </div>
                                ))}
                                {groupedItems[category]?.length === 0 && (
                                    <div className="col-span-full flex items-center justify-center text-xs opacity-50">
                                        Drag items here
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="border-t pt-4" style={{borderColor: settings.toolbarInputBorderColor}}>
                    <h3 className="font-semibold mb-2">Display Options</h3>
                    <div className="flex items-center gap-4 p-2 rounded-md" style={{backgroundColor: settings.backgroundColor}}>
                        <label className="flex items-center cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={settings.showBookSpine ?? true}
                                onChange={(e) => onSettingsChange({ showBookSpine: e.target.checked })}
                                className="mr-2 h-4 w-4 rounded cursor-pointer"
                                style={{accentColor: settings.accentColor}}
                            />
                            Show Book Spine Shadow (in 2-column view)
                        </label>
                    </div>
                </div>
            </div>
        </Modal>
    );
};