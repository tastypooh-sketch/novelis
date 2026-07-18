
import type { INovelState, EditorSettings, WritingGoals } from '../types';

// Default backgrounds from App.tsx to ensure consistency
const DEFAULT_BACKGROUNDS = [
    { url: 'https://static.vecteezy.com/system/resources/previews/036/215/115/non_2x/ai-generated-abstract-black-leaf-on-dark-background-elegant-design-generated-by-ai-free-photo.jpg', category: 'Backgrounds' as const },
    { url: 'https://static.vecteezy.com/system/resources/previews/036/185/896/non_2x/ai-generated-green-soft-background-free-photo.jpg', category: 'Backgrounds' as const },
    { url: 'https://static.vecteezy.com/system/resources/previews/035/598/194/non_2x/ai-generated-love-filled-background-with-gentle-lighting-hearts-and-space-for-heartfelt-messages-free-photo.jpg', category: 'Backgrounds' as const },
    { url: 'https://static.vecteezy.com/system/resources/previews/036/228/869/non_2x/ai-generated-ivory-soft-background-free-photo.jpg', category: 'Backgrounds' as const },
    { url: 'https://static.vecteezy.com/system/resources/previews/035/812/116/non_2x/ai-generated-graceful-light-elegant-background-photo.jpg', category: 'Backgrounds' as const },
    { url: 'https://static.vecteezy.com/system/resources/thumbnails/029/349/797/small/abstract-christmas-background-with-empty-space-smoke-bokeh-lights-copy-space-for-your-text-merry-xmas-happy-new-year-festive-backdrop-generative-ai-photo.jpeg', category: 'Backgrounds' as const },
    { url: 'https://static.vecteezy.com/system/resources/thumbnails/035/940/968/small/ai-generated-chic-design-elegant-background-photo.jpg', category: 'Backgrounds' as const },
    { url: 'https://static.vecteezy.com/system/resources/thumbnails/035/812/116/small/ai-generated-graceful-light-elegant-background-photo.jpg', category: 'Backgrounds' as const },
    { url: 'https://static.vecteezy.com/system/resources/thumbnails/053/748/239/small/an-old-brown-paper-with-leaves-on-it-photo.jpg', category: 'Backgrounds' as const },
    { url: 'https://static.vecteezy.com/system/resources/thumbnails/010/818/982/small/multicolor-background-modern-dark-low-poly-effect-with-abstract-gradient-for-backdrop-free-vector.jpg', category: 'Backgrounds' as const },
    { url: 'https://static.vecteezy.com/system/resources/thumbnails/007/278/150/small/dark-background-abstract-with-light-effect-vector.jpg', category: 'Backgrounds' as const },
    { url: 'https://static.vecteezy.com/system/resources/thumbnails/073/050/678/small/purple-and-pink-hexagonal-pattern-gradient-background-vector.jpg', category: 'Backgrounds' as const },
    { url: 'https://static.vecteezy.com/system/resources/thumbnails/071/443/047/small/sepia-toned-floral-background-with-beige-and-brown-flowers-photo.jpg', category: 'Backgrounds' as const },
    { url: 'https://static.vecteezy.com/system/resources/previews/020/526/952/non_2x/abstract-subtle-background-free-vector.jpg', category: 'Backgrounds' as const },
    { url: 'https://static.vecteezy.com/system/resources/previews/021/565/020/non_2x/minimalist-abstract-background-design-smooth-and-clean-subtle-background-free-vector.jpg', category: 'Backgrounds' as const },
    { url: 'https://static.vecteezy.com/system/resources/previews/068/630/930/non_2x/elegant-abstract-background-with-subtle-flowing-light-blue-curves-on-a-deep-blue-gradient-offering-a-modern-and-sophisticated-feel-for-various-digital-projects-vector.jpg', category: 'Backgrounds' as const },
    { url: 'https://static.vecteezy.com/system/resources/previews/044/792/171/non_2x/a-red-and-black-background-with-a-bright-light-gradient-art-design-idea-template-free-vector.jpg', category: 'Backgrounds' as const },
    { url: 'https://static.vecteezy.com/system/resources/thumbnails/008/014/636/small/abstract-dynamic-black-background-design-vector.jpg', category: 'Backgrounds' as const },
    { url: 'https://static.vecteezy.com/system/resources/previews/010/654/924/non_2x/wave-lights-with-black-background-and-focus-spot-light-free-vector.jpg', category: 'Backgrounds' as const },
    { url: 'https://static.vecteezy.com/system/resources/thumbnails/033/863/113/small/grunge-paper-background-with-space-for-text-or-image-old-paper-texture-old-paper-sheet-vintage-aged-original-background-or-texture-ai-generated-free-photo.jpg', category: 'Backgrounds' as const },
];

// Helper to safely encode data for HTML injection
const safeEncode = (data: any) => {
    try {
        const json = JSON.stringify(data);
        return btoa(encodeURIComponent(json).replace(/%([0-9A-F]{2})/g,
            function toSolidBytes(match, p1) {
                return String.fromCharCode(parseInt(p1 as string, 16));
            }));
    } catch (e) {
        console.error("Failed to encode data for Nove export", e);
        return "";
    }
};

export const generateNoveHTML = (state: INovelState, settings: EditorSettings, writingGoals: WritingGoals, faviconBase64: string = ""): string => {
    const exportedSettings = {
        fontFamily: settings.fontFamily,
        fontSize: settings.fontSize,
        lineHeight: settings.lineHeight ?? 1.8,
        textAlign: settings.textAlign,
        transitionStyle: settings.transitionStyle,
        isSoundEnabled: false,
        soundVolume: settings.soundVolume ?? 0.75,
        themeName: 'Custom',
        backgroundColor: settings.backgroundColor,
        textColor: settings.textColor,
        toolbarBg: settings.toolbarBg,
        toolbarText: settings.toolbarText,
        toolbarButtonBg: settings.toolbarButtonBg,
        toolbarButtonHoverBg: settings.toolbarButtonHoverBg,
        toolbarInputBorderColor: settings.toolbarInputBorderColor,
        accentColor: settings.accentColor,
        accentColorHover: settings.accentColorHover,
        successColor: settings.successColor,
        successColorHover: settings.successColorHover,
        dangerColor: settings.dangerColor,
        dangerColorHover: settings.dangerColorHover,
        dropdownBg: settings.dropdownBg,
        backgroundImage: settings.backgroundImage,
        backgroundImageOpacity: settings.backgroundImageOpacity,
        showBookSpine: settings.showBookSpine ?? false
    };

    const encodedState = safeEncode(state);
    const encodedSettings = safeEncode(exportedSettings);
    const encodedGoals = safeEncode(writingGoals);
    const encodedBackgrounds = safeEncode(DEFAULT_BACKGROUNDS);

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <title>Nove: Portable Manuscript</title>
    ${faviconBase64 ? `<link rel="icon" href="${faviconBase64}" />` : ''}
    <script src="https://cdn.tailwindcss.com" crossorigin="anonymous"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/react/18.3.1/umd/react.production.min.js" crossorigin="anonymous"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.3.1/umd/react-dom.production.min.js" crossorigin="anonymous"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/regenerator-runtime/0.14.1/runtime.min.js" crossorigin="anonymous"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/7.24.7/babel.min.js" crossorigin="anonymous"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js" crossorigin="anonymous"></script>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inconsolata:wght@200..900&family=Inter:wght@100..900&family=Lora:ital,wght@0,400..700;1,400..700&family=Merriweather:ital,wght@0,300;0,400;0,700;0,900;1,300;1,400;1,700;1,900&family=Open+Sans:ital,wght@0,300..800;1,300..800&family=Roboto:ital,wght@0,100;0,300;0,400;0,500;0,700;0,900;1,100;1,300;1,400;1,500;1,700;1,900&display=swap" rel="stylesheet">
    <style>
        body, html { overflow: hidden; height: 100%; width: 100%; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(156, 163, 175, 0.5); border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(156, 163, 175, 0.8); }
        
        .editor-content div,
        .editor-content p {
            text-indent: 1em;
            margin: 0;
            orphans: 2; 
            widows: 2;
            min-height: 1em;
        }
        
        .editor-content > div:first-child,
        .editor-content > p:first-child {
            text-indent: 0;
        }

        .editor-content div[style*="text-align: center"],
        .editor-content p[style*="text-align: center"],
        .editor-content div[align="center"],
        .editor-content p[align="center"] {
            text-indent: 0 !important;
        }
        
        .editor-content div,
        .editor-content p,
        .editor-content span,
        .editor-content font,
        .editor-content i,
        .editor-content em,
        .editor-content b,
        .editor-content strong {
            font-size: 1em !important;
            line-height: inherit !important;
            font-family: inherit !important;
            background-color: transparent !important;
            color: inherit !important;
        }

        .editor-content::after {
            content: "";
            display: block;
            height: 100%;
            min-height: 100%;
            break-before: column;
            -webkit-column-break-before: always;
            visibility: hidden;
        }
        
        @keyframes flash-accent-glow {
            0% { filter: drop-shadow(0 0 10px ${settings.accentColor || '#4ade80'}) brightness(1.2); }
            100% { filter: none; }
        }
        .save-flash { animation: flash-accent-glow 0.8s ease-out forwards; }
        .save-flash-green { animation: flash-accent-glow 0.8s ease-out forwards; }

        .book-spine-effect {
            position: fixed;
            top: 0;
            bottom: 0;
            left: 50%;
            width: 60px;
            margin-left: -30px;
            background: linear-gradient(to right, 
                rgba(0,0,0,0) 0%, 
                rgba(0,0,0,0.15) 35%, 
                rgba(0,0,0,0.3) 50%, 
                rgba(0,0,0,0.15) 65%, 
                rgba(0,0,0,0) 100%
            );
            pointer-events: none;
            z-index: 5;
            opacity: 0.6;
        }
    </style>
</head>
<body class="h-screen w-screen flex flex-col transition-colors duration-300 overflow-hidden" id="body-root">
    <div id="root" class="h-full w-full">
        <div id="loading-screen" style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #94a3b8; font-family: system-ui, -apple-system, sans-serif; background: #0f172a;">
            <div style="font-size: 24px; font-weight: bold; margin-bottom: 8px; color: white;">Nové</div>
            <div style="font-size: 14px; opacity: 0.8;">Initialising Engine...</div>
        </div>
    </div>

    <script>
        window.NoveBoot = {
            start: Date.now(),
            loaded: false,
            error: null
        };
        console.log("Nové (Manual) Bootstrapping...");
        window.onerror = function(msg, url, lineNo, columnNo, error) {
            window.NoveBoot.error = msg;
            console.error('Nové Boot Error: ', msg, ' at ', lineNo, ':', columnNo);
            if (error) console.error('Full Error Object:', error);
            const root = document.getElementById('root');
            const loader = document.getElementById('loading-screen');
            if (loader) loader.style.display = 'none';
            if (root) {
                root.innerHTML = '<div style="padding: 24px; color: white; background: #7f1d1d; font-family: system-ui, sans-serif; border-radius: 12px; margin: 40px; border: 1px solid #ef4444;">' +
                    '<h2 style="margin-top:0; font-size: 20px;">Nové Critical Error (Manual)</h2>' +
                    '<p style="opacity: 0.9; font-size: 14px;">The Nové engine failed to start. This is often caused by browser security policies or an old browser.</p>' +
                    '<pre style="white-space: pre-wrap; font-size: 12px; background: rgba(0,0,0,0.3); padding: 12px; border-radius: 6px; margin-top: 8px;">' + msg + '</pre>' +
                    '</div>';
            }
            return false;
        };
        setTimeout(() => {
            if (!window.NoveBoot.loaded && !window.NoveBoot.error) {
                console.warn("Loading slow...");
            }
        }, 10000);
    </script>

    <script type="text/babel" data-presets="react,env">
        // --- REACT GLOBALS ---
        const { useState, useEffect, useRef, useMemo, useCallback, useLayoutEffect } = React;

        // --- DATA DECODING ---
        const safeDecode = (str) => {
            try {
                return JSON.parse(decodeURIComponent(atob(str).split('').map(function(c) {
                    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
                }).join('')));
            } catch (e) {
                console.error("Decoding error", e);
                return null;
            }
        };

        const initialState = safeDecode('${encodedState}');
        const initialSettings = safeDecode('${encodedSettings}');
        const initialGoals = safeDecode('${encodedGoals}');
        const DEFAULT_BGS = safeDecode('${encodedBackgrounds}');
        
        // --- UTILS ---
        const hexToRgb = (hex) => {
            const result = /^#?([a-f\\d]{2})([a-f\\d]{2})([a-f\\d]{2})$/i.exec(hex);
            return result ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)] : null;
        };
        
        const rgbToHsl = (r, g, b) => {
            r /= 255; g /= 255; b /= 255;
            const max = Math.max(r, g, b), min = Math.min(r, g, b);
            let h = 0, s = 0, l = (max + min) / 2;
            if (max !== min) {
                const d = max - min;
                s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
                switch (max) {
                    case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                    case g: h = (b - r) / d + 2; break;
                    case b: h = (r - g) / d + 4; break;
                }
                h /= 6;
            }
            return [h, s, l];
        };

        const hslToHex = (h, s, l) => {
            let r, g, b;
            if (s === 0) { r = g = b = l; } else {
                const hue2rgb = (p, q, t) => {
                    if (t < 0) t += 1; if (t > 1) t -= 1;
                    if (t < 1 / 6) return p + (q - p) * 6 * t;
                    if (t < 1 / 2) return q;
                    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
                    return p;
                };
                const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
                const p = 2 * l - q;
                r = hue2rgb(p, q, h + 1 / 3); g = hue2rgb(p, q, h); b = hue2rgb(p, q, h - 1 / 3);
            }
            const toHex = (c) => ('0' + Math.round(c * 255).toString(16)).slice(-2);
            return '#' + toHex(r) + toHex(g) + toHex(b);
        };

        const getImageColors = (imageUrl) => {
            return new Promise((resolve) => {
                const img = new Image();
                img.crossOrigin = 'Anonymous';
                img.onload = () => {
                    try {
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');
                        canvas.width = 64; canvas.height = 64;
                        ctx.drawImage(img, 0, 0, 64, 64);
                        const imageData = ctx.getImageData(0, 0, 64, 64).data;
                        const colorCounts = {};
                        const quantization = 32;
                        for (let i = 0; i < imageData.length; i += 4) {
                            if (imageData[i + 3] < 128) continue;
                            const r = imageData[i], g = imageData[i + 1], b = imageData[i + 2];
                            const saturation = Math.max(r, g, b) - Math.min(r, g, b);
                            if (saturation < 25) continue;
                            const qr = Math.round(r / quantization) * quantization;
                            const qg = Math.round(g / quantization) * quantization;
                            const qb = Math.round(b / quantization) * quantization;
                            const key = \`\${qr},\${qg},\${qb}\`;
                            if (!colorCounts[key]) colorCounts[key] = { count: 0, original: [r, g, b] };
                            colorCounts[key].count++;
                        }
                        const sorted = Object.keys(colorCounts).sort((a, b) => colorCounts[b].count - colorCounts[a].count);
                        if (sorted.length === 0) { 
                             resolve({ backgroundColor: '#202020', textColor: '#E8E8E8', toolbarBg: '#1E1E1E', toolbarButtonBg: '#333333', toolbarButtonHoverBg: '#454545', accentColor: '#4A90E2', toolbarInputBorderColor: '#454545', dropdownBg: '#333333' });
                             return; 
                        }
                        
                        const [r, g, b] = colorCounts[sorted[0]].original;
                        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
                        const isDark = luminance < 0.5;
                        const [h, s, l] = rgbToHsl(r, g, b);
                        
                        const backgroundColor = hslToHex(h, s, l);
                        const textColor = isDark ? '#FFFFFF' : '#111827';
                        const toolbarBg = hslToHex(h, s, isDark ? Math.max(0, l - 0.05) : Math.min(1, l + 0.05));
                        const toolbarButtonBg = hslToHex(h, s, isDark ? Math.max(0, l + 0.05) : Math.min(1, l - 0.05));
                        const toolbarButtonHoverBg = hslToHex(h, s, isDark ? Math.max(0, l + 0.1) : Math.min(1, l - 0.1));
                        
                        let accentH = h;
                        if (sorted.length > 1) {
                             const [ar, ag, ab] = colorCounts[sorted[1]].original;
                             const [ah, , al] = rgbToHsl(ar, ag, ab);
                             if (Math.abs(al - l) > 0.15 || Math.abs(ah - h) > 0.15) accentH = ah;
                             else accentH = (h + 0.3) % 1;
                        } else accentH = (h + 0.3) % 1;
                        
                        const accentColor = hslToHex(accentH, Math.max(0.45, s), isDark ? 0.60 : 0.40);
                        
                        resolve({ backgroundColor, textColor, toolbarBg, toolbarButtonBg, toolbarButtonHoverBg, accentColor, toolbarInputBorderColor: toolbarButtonHoverBg, dropdownBg: toolbarButtonBg });
                    } catch (e) { resolve(null); }
                };
                img.onerror = () => resolve(null);
                img.src = imageUrl;
            });
        };

        const generateSimpleRtf = (chapter) => {
            const escape = (t) => t.replace(/[\\\\{}\\\\]/g, '\\\\$&').replace(/\\n/g, '\\\\par ');
            const div = document.createElement('div');
            div.innerHTML = chapter.content;
            let text = "";
            div.childNodes.forEach(n => {
                if(n.textContent) text += n.textContent + "\\\\par\\\\n";
            });
            const rtfHeader = '{\\\\rtf1\\\\ansi\\\\deff0 {\\\\fonttbl {\\\\f0 Times New Roman;}} \\\\f0\\\\fs24 \\\\pard\\\\qc\\\\b\\\\fs32 ';
            const rtfBody = ' \\\\par\\\\par \\\\pard\\\\fi360 ';
            return rtfHeader + escape(chapter.title) + ' ' + chapter.chapterNumber + rtfBody + escape(text) + ' }';
        };

        const useDebouncedCallback = (callback, delay) => {
            const timeoutRef = useRef(null);
            const debounced = useCallback((...args) => {
                if (timeoutRef.current) clearTimeout(timeoutRef.current);
                timeoutRef.current = setTimeout(() => callback(...args), delay);
            }, [callback, delay]);
            return debounced;
        };

        const THEMES = {
            Midnight: { backgroundColor: '#111827', textColor: '#FFFFFF', toolbarBg: '#1F2937', toolbarButtonBg: '#374151', accentColor: '#2563eb' },
            Charcoal: { backgroundColor: '#202020', textColor: '#E8E8E8', toolbarBg: '#1E1E1E', toolbarButtonBg: '#333333', accentColor: '#4A90E2' },
            Sepia: { backgroundColor: '#f5eeda', textColor: '#5c4033', toolbarBg: '#e9ddc7', toolbarButtonBg: '#dcd0b9', accentColor: '#8c6b5d' },
            Paperback: { backgroundColor: '#f8f8f8', textColor: '#1a1a1a', toolbarBg: '#F0F0F0', toolbarButtonBg: '#e0e0e0', accentColor: '#2563eb' },
            Terminal: { backgroundColor: '#000000', textColor: '#F5F5F5', toolbarBg: '#111111', toolbarButtonBg: '#222222', accentColor: '#10b981' },
        };

        const Icons = {
            ChevronDown: () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>,
            Save: () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>,
            Import: () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>,
            Sparkles: () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09-3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.898 20.562L16.25 22.5l-.648-1.938a2.25 2.25 0 01-1.473-1.473L12.25 18l1.938-.648a2.25 2.25 0 011.473 1.473L16.25 20.5l.648-1.938a2.25 2.25 0 011.473-1.473L20.25 16.5l-1.938.648a2.25 2.25 0 01-1.473 1.473z" /></svg>,
            Note: () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>,
            Spinner: () => <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>,
            Justify: () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>,
            Search: () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>,
            Focus: () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
            Unfocus: () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.243 4.243l-4.243-4.243" /></svg>,
            SoundOn: () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" /></svg>,
            SoundOff: () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l-2.25 2.25M19.5 12l2.25-2.25M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" /></svg>,
            Transition: () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>,
            Spellcheck: () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5"><path d="M0 0h24v24H0z" fill="none"/><text x="2" y="15" fontSize="13" fontWeight="bold" fontFamily="sans-serif" fill="currentColor">abc</text><path d="M21 7L9 19l-5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>,
            Brush: () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" /></svg>,
            Close: () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>,
            Stats: () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>,
            Heart: () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>,
            Refresh: () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348A4.992 4.992 0 0010.5 6h-1.262a.375.375 0 00-.375.375v3.506a.375.375 0 00.375.375h3.506a.375.375 0 00.375-.375v-1.262a4.993 4.993 0 00-2.828-2.828 4.99 4.99 0 00-3.95 1.056l-1.542 1.542a.375.375 0 000 .53l2.828 2.828a.375.375 0 00.53 0l1.542-1.542a4.99 4.99 0 001.056-3.95z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 9.75-7.5 9.75S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>,
            EnterFullscreen: () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4h4M20 8V4h-4M4 16v4h4M20 16v4h-4" /></svg>,
            ExitFullscreen: () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M8 4H4v4M16 4h4v4M8 20H4v-4M16 20h4v-4" /></svg>,
            Help: () => <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>,
            Plus: () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>,
            LineHeight: () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /><path strokeLinecap="round" strokeLinejoin="round" d="M21 6.75v10.5m0 0l-2.25-2.25M21 17.25l2.25-2.25" /></svg>,
        };

        const useTypewriterSound = (enabled, volume = 0.75) => {
            const audioContextRef = useRef(null);
            const enterThudBufferRef = useRef(null);
            const keyClickBufferRef = useRef(null);
            
            useEffect(() => {
                if (enabled && !audioContextRef.current) {
                    const AudioContext = window.AudioContext || window.webkitAudioContext;
                    if (AudioContext) audioContextRef.current = new AudioContext();
                }
            }, [enabled]);
            
            const play = useCallback((type = 'key') => {
                if (!enabled || !audioContextRef.current) return;
                const ctx = audioContextRef.current;
                const vol = volume;
                
                if (ctx.state === 'suspended') ctx.resume();
                const t = ctx.currentTime;
                
                if (type === 'enter') {
                    const osc1 = ctx.createOscillator();
                    const gain1 = ctx.createGain();
                    osc1.type = 'sine';
                    osc1.frequency.setValueAtTime(2000, t);
                    gain1.gain.setValueAtTime(0, t);
                    gain1.gain.linearRampToValueAtTime(0.04 * vol, t + 0.01);
                    gain1.gain.exponentialRampToValueAtTime(0.001, t + 1.5);
                    osc1.connect(gain1); gain1.connect(ctx.destination);
                    osc1.start(t); osc1.stop(t + 1.5);

                    const osc2 = ctx.createOscillator();
                    const gain2 = ctx.createGain();
                    osc2.type = 'sine';
                    osc2.frequency.setValueAtTime(5200, t);
                    gain2.gain.setValueAtTime(0, t);
                    gain2.gain.linearRampToValueAtTime(0.02 * vol, t + 0.01);
                    gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
                    osc2.connect(gain2); gain2.connect(ctx.destination);
                    osc2.start(t); osc2.stop(t + 0.8);

                    if (!enterThudBufferRef.current) {
                        const bufferSize = ctx.sampleRate * 0.05;
                        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
                        const data = buffer.getChannelData(0);
                        for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.5;
                        enterThudBufferRef.current = buffer;
                    }
                    const noise = ctx.createBufferSource();
                    noise.buffer = enterThudBufferRef.current;
                    const noiseFilter = ctx.createBiquadFilter();
                    noiseFilter.type = 'lowpass';
                    noiseFilter.frequency.value = 600;
                    const noiseGain = ctx.createGain();
                    noiseGain.gain.setValueAtTime(0.02 * vol, t);
                    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
                    noise.connect(noiseFilter); noiseFilter.connect(noiseGain); noiseGain.connect(ctx.destination);
                    noise.start(t);
                } else {
                    const gain = ctx.createGain();
                    const filter = ctx.createBiquadFilter();
                    if (!keyClickBufferRef.current) {
                        const bufferSize = ctx.sampleRate * 0.05;
                        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
                        const data = buffer.getChannelData(0);
                        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
                        keyClickBufferRef.current = buffer;
                    }
                    const src = ctx.createBufferSource();
                    src.buffer = keyClickBufferRef.current;
                    filter.type = 'bandpass';
                    filter.frequency.value = 2500;
                    filter.Q.value = 1.5;
                    gain.gain.setValueAtTime(0.15 * vol, t);
                    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);
                    src.connect(filter); filter.connect(gain); gain.connect(ctx.destination); src.start(t);
                }
            }, [enabled, volume]);
            return play;
        };

        const getWordCount = (html) => {
            const div = document.createElement('div'); div.innerHTML = html;
            return (div.innerText || '').trim().split(/\\s+/).filter(Boolean).length;
        };

        const Modal = ({ onClose, title, children, settings }) => (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm" onClick={onClose}>
                <div className="w-full m-4 rounded-lg shadow-2xl flex flex-col max-w-xl max-h-[90vh]" style={{backgroundColor: settings.toolbarBg, color: settings.textColor, borderColor: settings.toolbarInputBorderColor}} onClick={e => e.stopPropagation()}>
                    <div className="p-4 border-b flex justify-between items-center" style={{borderColor: settings.toolbarButtonBg}}>
                        <h3 className="font-bold">{title}</h3>
                        <button onClick={onClose} className="p-1 hover:bg-white/10 rounded"><Icons.Close /></button>
                    </div>
                    <div className="p-6 overflow-y-auto">{children}</div>
                </div>
            </div>
        );

        const EULAModal = ({ settings, onAccept }) => {
            const [accepted, setAccepted] = useState(false);
            return (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md">
                    <div className="w-full max-w-xl m-4 rounded-lg shadow-2xl border flex flex-col overflow-hidden" style={{ backgroundColor: settings.toolbarBg, color: settings.textColor, borderColor: settings.toolbarInputBorderColor }}>
                        <header className="p-6 border-b" style={{ borderColor: settings.toolbarInputBorderColor }}>
                            <h2 className="text-xl font-serif font-bold">End User License Agreement</h2>
                        </header>
                        <div className="p-8 text-sm space-y-4 font-sans opacity-90">
                             <p><strong>1. DISCLAIMER:</strong> This software is provided "AS IS". The developer assumes no responsibility for data loss, system crashes, or lost income.</p>
                             <p><strong>2. PRIVACY:</strong> Nove works offline. Your manuscript stays on your device. No data is harvested or transmitted.</p>
                             <p><strong>3. BACKUPS:</strong> You are solely responsible for maintaining external backups. Nove saves "snapshots" into ZIP files when you click save.</p>
                             <p><strong>4. STANDALONE USE:</strong> Nove is a derivative of Novelis. It is free for portable use, but does not include AI tools, which require a Novelis Desktop license.</p>
                             
                             <label className="flex items-center gap-3 pt-4 cursor-pointer select-none">
                                <input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)} className="w-4 h-4 rounded" style={{accentColor: settings.accentColor}} />
                                <span className="text-xs font-bold">I have read the disclaimer and understand my responsibilities regarding data backups.</span>
                             </label>
                        </div>
                        <footer className="p-6 border-t flex justify-end gap-4" style={{ borderColor: settings.toolbarInputBorderColor }}>
                            <button disabled={!accepted} onClick={onAccept} className="px-8 py-2 rounded font-bold shadow-lg transition-all active:scale-95 disabled:opacity-30" style={{ backgroundColor: settings.accentColor, color: '#FFFFFF' }}>Accept & Proceed</button>
                        </footer>
                    </div>
                </div>
            );
        };

        const UserGuideModal = ({ onClose, settings }) => {
            const guideContent = [
                {
                    level: 1, title: "GETTING STARTED", children: [
                        { level: 2, title: "Welcome to Nove Portable", content: ["Nove is a zero-installation, private, and ultra-portable word processor designed for long-form fiction. You can write anywhere with just a browser."] },
                        { level: 2, title: "The Infinite Spread", content: ["Nove uses a landscape-oriented dual-pane layout. As you fill one page, the text naturally flows to the next spread. This eliminates the fatigue of infinite vertical scrolling and mimics the experience of reading a physical book."] },
                        { level: 2, title: "Navigation", content: ["Use your mouse wheel to scroll through spreads. On touchscreens, swipe left and right. You can also use Page Up and Page Down keys to flip entire spreads instantly."] }
                    ]
                },
                {
                    level: 1, title: "WRITING TOOLS", children: [
                        { level: 2, title: "Focus Mode", content: ["Click the Eye Icon or press Escape to hide all toolbars and UI elements. Combined with browser Fullscreen (Ctrl+F11), this transforms your device into a dedicated writing appliance."] },
                        { level: 2, title: "Design & Ambiance", content: ["Use the Design Gallery (Brush Icon) to change themes like Midnight, Sepia, or Paperback. You can also upload custom background images. Toggle Typewriter Sounds (Speaker Icon) for rhythmic auditory feedback."] },
                        { level: 2, title: "Chapter Management", content: ["Add new chapters via the Plus icon in the toolbar. Switch between chapters using the dropdown menu. Note: These changes only persist once you perform a Save/Export."] }
                    ]
                },
                {
                    level: 1, title: "SAVING & SYNCING", children: [
                        { level: 2, title: "How Saving Works", content: ["Browsers cannot directly overwrite files on your computer. When you click 'Save', Nove packages your manuscript and settings into a timestamped ZIP file. Save this ZIP to your hard drive, cloud folder, or USB stick."] },
                        { level: 2, title: "Back to Novelis", content: ["To resume work in the full Novelis Desktop application, use the 'Import from Nove' button and select your latest ZIP file. Everything—including your design choices—will be synchronized."] }
                    ]
                },
                {
                    level: 1, title: "FREQUENTLY ASKED QUESTIONS", children: [
                        { level: 2, title: "Is my data private?", content: ["Absolutely. Nove runs entirely on your local machine. No data is sent to our servers. Your words live inside the HTML file and the ZIP snapshots you create."] },
                        { level: 2, title: "Can I use it offline?", content: ["Yes. Once you have the Nove.html file, you do not need an internet connection to write or save snapshots."] },
                        { level: 2, title: "Why a ZIP file instead of a Word doc?", content: ["The ZIP protocol is our 'Save' method. It allows us to bundle the structural data needed for syncing back to Novelis alongside human-readable RTF backups of every chapter."] },
                        { level: 2, title: "Where are my characters and world notes?", content: ["The portable Nove editor focuses on pure writing. While Nove is the perfect tool for distraction-free drafting on any device, the heavy lifting of structural analysis and world management happens in the full Novelis suite.", "Think of Nove as your agile satellite and Novelis as your powerful mothership. When you return to your desktop, Novelis unlocks a universe of features: the AI-powered Pacing Heatmap, full character relationship graphs, the World-Building Crucible, and the Social Media Studio to automate your marketing. By separating drafting from structural engineering, you maintain creative flow while ensuring your story bible is always just a sync away."] }
                    ]
                }
            ];

            return (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm p-4" onClick={onClose}>
                    <div className="w-full max-w-4xl m-4 rounded-lg shadow-2xl flex flex-col overflow-hidden h-[85vh]" style={{backgroundColor: settings.toolbarBg, color: settings.textColor, borderColor: settings.toolbarInputBorderColor}} onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b flex justify-between items-center bg-black/10" style={{borderColor: settings.toolbarButtonBg}}>
                            <h3 className="font-bold text-lg">Nove User Guide & FAQ</h3>
                            <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10"><Icons.Close /></button>
                        </div>
                        <div className="p-8 overflow-y-auto flex-grow space-y-10 text-sm leading-relaxed scroll-smooth">
                            {guideContent.map(section => (
                                <div key={section.title}>
                                    <h3 className="text-2xl font-bold mb-6 tracking-tight border-b pb-2 uppercase text-opacity-80" style={{borderColor: settings.toolbarInputBorderColor, color: settings.accentColor}}>{section.title}</h3>
                                    <div className="space-y-8 pl-2">
                                        {section.children.map(child => (
                                            <div key={child.title}>
                                                <h4 className="text-lg font-semibold mb-3">{child.title}</h4>
                                                <div className="space-y-3 opacity-90 text-base">
                                                    {child.content.map((p, i) => <p key={i}>{p}</p>)}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                            
                            <div className="pt-10 mt-10 border-t text-center opacity-40 text-xs" style={{borderColor: settings.toolbarInputBorderColor}}>
                                <p>Nove v7.0 Portable &mdash; Part of the Novelis Ecosystem</p>
                            </div>
                        </div>
                    </div>
                </div>
            );
        };

        const StatsModal = ({ onClose, settings, totalWordCount, sessionWordCount, goals, onGoalsChange, chapters }) => {
            const [daily, setDaily] = useState(goals.dailyGoal.toString());
            const [manuscript, setManuscript] = useState(goals.manuscriptGoal.toString());
            const chapterWordCounts = useMemo(() => {
                return chapters.map(chapter => ({
                    id: chapter.id,
                    title: \`\${chapter.chapterNumber}. \${chapter.title}\`,
                    count: getWordCount(chapter.content)
                })).sort((a,b) => b.count - a.count);
            }, [chapters]);
            const progress = Math.min(100, (totalWordCount / (parseInt(manuscript || '1', 10))) * 100);
            const handleSave = () => {
                onGoalsChange({ dailyGoal: parseInt(daily || '0', 10), manuscriptGoal: parseInt(manuscript || '0', 10) });
                onClose();
            };
            return (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm" onClick={onClose}>
                    <div className="w-full m-4 rounded-lg shadow-2xl flex flex-col max-w-2xl max-h-[90vh]" style={{backgroundColor: settings.toolbarBg, color: settings.textColor, borderColor: settings.toolbarInputBorderColor}} onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b flex justify-between items-center" style={{borderColor: settings.toolbarButtonBg}}>
                            <h3 className="font-bold">Writing Statistics & Goals</h3>
                            <button onClick={onClose} className="p-1 hover:bg-white/10 rounded"><Icons.Close /></button>
                        </div>
                        <div className="p-6 overflow-y-auto">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-6">
                                    <div>
                                        <h3 className="font-semibold mb-2">Manuscript Goal</h3>
                                        <div className="relative h-6 w-full rounded-full" style={{backgroundColor: settings.toolbarButtonBg}}>
                                             <div className="absolute top-0 left-0 h-6 rounded-full" style={{width: \`\${progress}%\`, backgroundColor: settings.accentColor}}></div>
                                             <span className="absolute inset-0 flex items-center justify-center text-xs font-bold" style={{textShadow: '0 1px 2px rgba(0,0,0,0.5)'}}>{totalWordCount.toLocaleString()} / {parseInt(manuscript || '0', 10).toLocaleString()} words</span>
                                        </div>
                                        <input type="text" inputMode="numeric" pattern="[0-9]*" value={manuscript} onChange={e => { const val = e.target.value; if (val === '' || /^\\d+$/.test(val)) setManuscript(val); }} className="w-full mt-2 px-2 py-1.5 rounded-md border text-sm" style={{ backgroundColor: settings.backgroundColor, color: settings.textColor, borderColor: settings.toolbarInputBorderColor }} />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold mb-2">Daily Writing Goal</h3>
                                         <input type="text" inputMode="numeric" pattern="[0-9]*" value={daily} onChange={e => { const val = e.target.value; if (val === '' || /^\\d+$/.test(val)) setDaily(val); }} className="w-full px-2 py-1.5 rounded-md border text-sm" style={{ backgroundColor: settings.backgroundColor, color: settings.textColor, borderColor: settings.toolbarInputBorderColor }} />
                                    </div>
                                     <button onClick={handleSave} className="w-full px-4 py-2 rounded-md font-bold" style={{ backgroundColor: settings.successColor || '#16a34a', color: '#FFFFFF' }}>Save Goals</button>
                                </div>
                                <div>
                                    <h3 className="font-semibold mb-2">Chapter Word Counts</h3>
                                    <div className="max-h-80 overflow-y-auto pr-2 space-y-2">
                                        {chapterWordCounts.map(chapter => (
                                            <div key={chapter.id} className="flex justify-between items-center text-sm p-2 rounded" style={{backgroundColor: settings.toolbarButtonBg}}>
                                                <span className="truncate pr-4">{chapter.title}</span>
                                                <span className="font-semibold flex-shrink-0">{chapter.count.toLocaleString()}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            );
        };

        const FindReplacePanel = ({ onClose, settings, chapters, activeChapterId, onNavigateMatch, onReplace, onReplaceAll }) => {
            const [find, setFind] = useState('');
            const [replaceText, setReplaceText] = useState('');
            const [results, setResults] = useState([]);
            const [scope, setScope] = useState('chapter');
            const [position, setPosition] = useState({ x: window.innerWidth - 340, y: 80 });
            const [isDragging, setIsDragging] = useState(false);
            const dragOffset = useRef({ x: 0, y: 0 });

            useEffect(() => {
                const handleMouseMove = (e) => { if (isDragging) setPosition({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y }); };
                const handleMouseUp = () => setIsDragging(false);
                if (isDragging) { window.addEventListener('mousemove', handleMouseMove); window.addEventListener('mouseup', handleMouseUp); }
                return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp); };
            }, [isDragging]);

            const performSearch = () => {
                if(!find) return setResults([]);
                const regex = new RegExp(find.replace(/[.*+?^$\{ }()|[\\]\\\\]/g, '\\\\$&'), 'gi');
                const newResults = [];
                const targetChapters = scope === 'chapter' ? chapters.filter(c => c.id === activeChapterId) : chapters;
                targetChapters.forEach(ch => {
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = ch.content;
                    const text = tempDiv.innerText;
                    let match;
                    while ((match = regex.exec(text)) !== null) {
                        const start = Math.max(0, match.index - 20);
                        const end = Math.min(text.length, match.index + match[0].length + 20);
                        let context = text.substring(start, end);
                        if(start > 0) context = '...' + context;
                        if(end < text.length) context = context + "...";
                        newResults.push({ id: Math.random().toString(), chapterId: ch.id, chapterName: ch.title, index: match.index, length: match[0].length, context: context });
                    }
                });
                setResults(newResults);
            };

            return (
                <div className="fixed z-50 w-80 rounded-lg shadow-2xl border flex flex-col" style={{top: position.y, left: position.x, backgroundColor: settings.toolbarBg, borderColor: settings.toolbarInputBorderColor, color: settings.textColor}}>
                    <div className="p-3 border-b flex justify-between items-center cursor-move select-none" style={{borderColor: settings.toolbarButtonBg}} onMouseDown={(e) => { setIsDragging(true); const rect = e.currentTarget.parentElement.getBoundingClientRect(); dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }; }}>
                        <h3 className="font-bold text-sm flex items-center gap-2"><Icons.Search /> Find & Replace</h3>
                        <button onClick={onClose} className="p-1 hover:bg-white/10 rounded"><Icons.Close /></button>
                    </div>
                    <div className="p-3 space-y-3" style={{backgroundColor: settings.backgroundColor}}>
                        <div className="flex bg-black/10 p-1 rounded">
                            <button onClick={() => setScope('chapter')} className={\`flex-1 py-1 text-xs rounded \${scope === 'chapter' ? 'bg-white/10 shadow-sm' : 'opacity-50'}\`}>Current</button>
                            <button onClick={() => setScope('manuscript')} className={\`flex-1 py-1 text-xs rounded \${scope === 'manuscript' ? 'bg-white/10 shadow-sm' : 'opacity-50'}\`}>Manuscript</button>
                        </div>
                        <input value={find} onChange={e => setFind(e.target.value)} onKeyDown={e => e.key === 'Enter' && performSearch()} placeholder="Find..." className="w-full p-2 rounded text-sm bg-transparent border" style={{borderColor: settings.toolbarInputBorderColor}} />
                        <input value={replaceText} onChange={e => setReplaceText(e.target.value)} placeholder="Replace..." className="w-full p-2 rounded text-sm bg-transparent border" style={{borderColor: settings.toolbarInputBorderColor}} />
                        <div className="flex justify-end gap-2"><button onClick={performSearch} className="px-3 py-1 text-xs border rounded" style={{borderColor: settings.toolbarInputBorderColor}}>Find All</button></div>
                        <div className="flex gap-2 pt-2 border-t" style={{borderColor: settings.toolbarInputBorderColor}}>
                            <button onClick={() => onReplace(replaceText)} className="flex-1 py-1.5 text-xs rounded border hover:bg-white/5" style={{borderColor: settings.toolbarInputBorderColor}}>Replace</button>
                            <button onClick={() => onReplaceAll(find, replaceText, scope)} className="flex-1 py-1.5 text-xs rounded hover:opacity-90" style={{backgroundColor: settings.accentColor, color: '#FFFFFF'}}>Replace All</button>
                        </div>
                    </div>
                    <div className="max-h-60 overflow-y-auto border-t pt-0 bg-opacity-50" style={{borderColor: settings.toolbarInputBorderColor, backgroundColor: settings.toolbarBg}}>
                        <div className="p-2 text-xs opacity-50">{results.length} result{results.length !== 1 ? 's' : ''}</div>
                        {results.map(r => (
                            <div key={r.id} onClick={() => onNavigateMatch(r)} className="p-2 hover:bg-white/5 rounded cursor-pointer text-xs border-b border-white/5 last:border-0">
                                {scope === 'manuscript' && <div className="opacity-50 text-[10px] uppercase font-bold mb-1">{r.chapterName}</div>}
                                <div dangerouslySetInnerHTML={{__html: r.context.replace(new RegExp(\`(\${find.replace(/[.*+?^$\{ }()|[\\]\\\\]/g, '\\\\$&')})\`, 'gi'), '<span style="background-color: #facc15; color: #000; font-weight: bold;">$1</span>')}} />
                            </div>
                        ))}
                    </div>
                </div>
            );
        };

        const NoveManuscript = ({ chapter, onChange, settings, isFocusMode, onPlaySound, notesOpen, onPageInfoChange, isSpellcheckEnabled, searchTarget }) => {
            const editorRef = useRef(null);
            const editorContainerRef = useRef(null);
            const isTyping = useRef(false);
            const stableScrollLeft = useRef(0);
            const typingTimeoutRef = useRef(null);
            const isLocalUpdate = useRef(false);
            const [layout, setLayout] = useState({ colWidth: 0, stride: 0, gap: 60, sideMargin: 40, columns: 2 });
            const [pageInfo, setPageInfo] = useState({ current: 1, total: 1 });
            const [isTransitioning, setIsTransitioning] = useState(false);

            const calculateLayout = useCallback(() => {
                if (!editorContainerRef.current) return;
                const containerWidth = editorContainerRef.current.clientWidth;
                const minTwoPageColWidth = 450;
                const GAP_PX = 60;
                const SIDE_MARGIN_PX = 40;
                const availableWidthTwo = Math.max(0, containerWidth - GAP_PX - (2 * SIDE_MARGIN_PX));
                const safeColWidthTwo = Math.floor(availableWidthTwo / 2);
                let columns = 2;
                let colWidth = safeColWidthTwo;
                if (safeColWidthTwo < minTwoPageColWidth) {
                    columns = 1;
                    const availableWidthOne = Math.max(0, containerWidth - (2 * SIDE_MARGIN_PX));
                    colWidth = Math.floor(availableWidthOne);
                }
                const stride = colWidth + GAP_PX;
                setLayout({ colWidth, stride, gap: GAP_PX, sideMargin: SIDE_MARGIN_PX, columns });
                
                const scrollLeft = editorContainerRef.current.scrollLeft;
                const currentColumnIndex = stride > 0 ? Math.round(scrollLeft / stride) : 0;
                const contentWidth = editorContainerRef.current.scrollWidth - (2 * SIDE_MARGIN_PX);
                const totalColumns = stride > 0 ? Math.ceil((contentWidth + GAP_PX) / stride) : 1;
                const actualPageCount = Math.max(2, totalColumns - 1);
                const currentLeftPage = currentColumnIndex + 1;
                setPageInfo({ current: currentLeftPage, total: actualPageCount });
            }, []);

            useEffect(() => { if(onPageInfoChange) onPageInfoChange(pageInfo); }, [pageInfo, onPageInfoChange]);
            useEffect(() => { document.execCommand('defaultParagraphSeparator', false, 'div'); }, []);

            useLayoutEffect(() => {
                const timer = setTimeout(calculateLayout, 10);
                window.addEventListener('resize', calculateLayout);
                return () => { window.removeEventListener('resize', calculateLayout); clearTimeout(timer); }
            }, [calculateLayout, isFocusMode, settings.fontSize, settings.fontFamily, notesOpen]);

            useLayoutEffect(() => {
                const wasLocal = isLocalUpdate.current;
                if (editorRef.current && editorRef.current.innerHTML !== chapter.content) {
                    if (!wasLocal) editorRef.current.innerHTML = chapter.content;
                }
                isLocalUpdate.current = false;
                if (!wasLocal) calculateLayout();
            }, [chapter.id, chapter.content, calculateLayout]);

            const snapToSpread = useCallback((targetSpreadIndex, useTransition = true) => {
                if (!editorContainerRef.current || layout.stride === 0) return;
                const currentTotalPages = Math.max(2, Math.ceil((editorContainerRef.current.scrollWidth - (2 * layout.sideMargin)) / layout.stride) + 1);
                const clampedIndex = Math.max(0, Math.min(targetSpreadIndex, currentTotalPages));
                const targetScrollLeft = clampedIndex * layout.stride;
                if (Math.abs(editorContainerRef.current.scrollLeft - targetScrollLeft) < 2) return;
                if (settings.transitionStyle === 'fade' && useTransition) {
                    setIsTransitioning(true);
                    setTimeout(() => {
                        if (editorContainerRef.current) editorContainerRef.current.scrollTo({ left: targetScrollLeft, behavior: 'instant' });
                        requestAnimationFrame(() => setIsTransitioning(false));
                    }, 150);
                } else {
                    editorContainerRef.current.scrollTo({ left: targetScrollLeft, behavior: useTransition ? 'smooth' : 'instant' });
                }
            }, [layout, settings.transitionStyle]);

            useEffect(() => {
                if (searchTarget && searchTarget.chapterId === chapter.id) {
                    const editor = editorRef.current;
                    if (!editor) return;
                    const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT, null);
                    let currentIndex = 0;
                    let node;
                    while((node = walker.nextNode())) {
                        const nodeLen = node.textContent.length;
                        if (currentIndex + nodeLen > searchTarget.index) {
                            const start = searchTarget.index - currentIndex;
                            const end = Math.min(start + searchTarget.length, nodeLen);
                            const range = document.createRange();
                            range.setStart(node, start); range.setEnd(node, end);
                            const sel = window.getSelection();
                            sel.removeAllRanges(); sel.addRange(range);
                            const rect = range.getBoundingClientRect();
                            const container = editorContainerRef.current;
                            if (container && rect && layout.stride > 0) {
                                const relX = (rect.left - container.getBoundingClientRect().left) + container.scrollLeft;
                                const spread = Math.floor(Math.max(0, relX - layout.sideMargin) / layout.stride);
                                snapToSpread(spread, true);
                            }
                            return;
                        }
                        currentIndex += nodeLen;
                    }
                }
            }, [searchTarget, layout, chapter.id, snapToSpread]);

            const updatePageInfo = useCallback(() => {
                if (!editorContainerRef.current || layout.stride === 0) return;
                const container = editorContainerRef.current;
                const scrollLeft = container.scrollLeft;
                const currentColumnIndex = Math.round(scrollLeft / layout.stride);
                const contentWidth = container.scrollWidth - (2 * layout.sideMargin);
                const totalColumns = Math.ceil((contentWidth + layout.gap) / layout.stride);
                const actualPageCount = Math.max(2, totalColumns - 1);
                const currentLeftPage = currentColumnIndex + 1;
                setPageInfo({ current: currentLeftPage, total: actualPageCount });
            }, [layout]);

            const handleScroll = useDebouncedCallback(() => {
                if (!editorContainerRef.current || layout.stride === 0) return;
                updatePageInfo();
                if (!isTyping.current) {
                    const currentScroll = editorContainerRef.current.scrollLeft;
                    const nearestSpread = Math.round(currentScroll / layout.stride);
                    snapToSpread(nearestSpread, false);
                }
            }, 150);

            useEffect(() => {
                const container = editorContainerRef.current;
                if (!container) return;
                const handleNativeScroll = () => {
                    if (isTyping.current) {
                        const diff = Math.abs(container.scrollLeft - stableScrollLeft.current);
                        if (diff > 5) container.scrollLeft = stableScrollLeft.current;
                    } else {
                        stableScrollLeft.current = container.scrollLeft;
                    }
                };
                container.addEventListener('scroll', handleNativeScroll, { passive: false });
                return () => container.removeEventListener('scroll', handleNativeScroll);
            }, []);

            const checkAndEnforceCaretVisibility = useCallback(() => {
                const container = editorContainerRef.current;
                const editor = editorRef.current;
                if (document.activeElement !== editor && !editor?.contains(document.activeElement)) return;
                const selection = window.getSelection();
                if (!container || !editor || !selection || selection.rangeCount === 0 || layout.stride === 0) return;
                const range = selection.getRangeAt(0);
                if (!editor.contains(range.commonAncestorContainer)) return;
                const caretRect = range.getBoundingClientRect();
                if (caretRect.width === 0 && caretRect.height === 0 && caretRect.x === 0 && caretRect.y === 0) return;
                const containerRect = container.getBoundingClientRect();
                const relativeCaretX = (caretRect.left - containerRect.left) + container.scrollLeft;
                const adjustedCaretX = Math.max(0, relativeCaretX - layout.sideMargin);
                const columnIndex = Math.floor(adjustedCaretX / layout.stride);
                const currentScrollIndex = Math.round(container.scrollLeft / layout.stride);
                if (columnIndex >= currentScrollIndex + layout.columns) snapToSpread(columnIndex - (layout.columns - 1), false);
                else if (columnIndex < currentScrollIndex) snapToSpread(columnIndex, false);
                updatePageInfo();
            }, [layout, snapToSpread, updatePageInfo]);

            const handleBeforeInput = useCallback(() => {
                if (editorContainerRef.current && layout.stride > 0) {
                    isTyping.current = true;
                    const currentScroll = editorContainerRef.current.scrollLeft;
                    const nearestSpread = Math.round(currentScroll / layout.stride);
                    stableScrollLeft.current = nearestSpread * layout.stride;
                    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                }
            }, [layout.stride]);

            const handleInput = (e) => {
                isLocalUpdate.current = true;
                const editor = e.currentTarget;
                const sel = window.getSelection();
                if (sel && sel.rangeCount > 0) {
                    const range = sel.getRangeAt(0);
                    const node = range.startContainer;
                    const offset = range.startOffset;
                    if (node.nodeType === Node.TEXT_NODE) {
                        const textContent = node.textContent || '';
                        const nativeEvent = e.nativeEvent;
                        const insertedChar = nativeEvent?.data;
                        if (nativeEvent?.inputType === 'insertText' && (insertedChar === '"' || insertedChar === "'")) {
                            const textBefore = textContent.substring(0, offset - 1);
                            const charBefore = textBefore.slice(-1);
                            const isOpenQuoteCondition = textBefore.length === 0 || /[\\s(\\[{“‘]/.test(charBefore);
                            let replacementChar = insertedChar === '"' ? (isOpenQuoteCondition ? '“' : '”') : (isOpenQuoteCondition ? '‘' : '’');
                            if (replacementChar) {
                                node.textContent = textContent.substring(0, offset - 1) + replacementChar + textContent.substring(offset);
                                const newRange = document.createRange();
                                newRange.setStart(node, offset); newRange.collapse(true);
                                sel.removeAllRanges(); sel.addRange(newRange);
                            }
                        }
                    }
                }
                onChange(editor.innerHTML);
                if (sel && sel.rangeCount > 0 && editorContainerRef.current && layout.stride > 0) {
                     const range = sel.getRangeAt(0);
                     if (editorRef.current?.contains(range.commonAncestorContainer)) {
                         const caretRect = range.getBoundingClientRect();
                         const containerRect = editorContainerRef.current.getBoundingClientRect();
                         if (caretRect.width !== 0 || caretRect.height !== 0 || caretRect.x !== 0) {
                             const relativeCaretX = (caretRect.left - containerRect.left) + editorContainerRef.current.scrollLeft;
                             const adjustedCaretX = Math.max(0, relativeCaretX - layout.sideMargin);
                             const columnIndex = Math.floor(adjustedCaretX / layout.stride);
                             const currentScrollIndex = Math.round(stableScrollLeft.current / layout.stride);
                             let targetSpread = currentScrollIndex;
                             if (columnIndex >= currentScrollIndex + layout.columns) targetSpread = columnIndex - (layout.columns - 1);
                             else if (columnIndex < currentScrollIndex) targetSpread = columnIndex;
                             const targetScrollLeft = targetSpread * layout.stride;
                             if (targetScrollLeft !== stableScrollLeft.current) {
                                 stableScrollLeft.current = targetScrollLeft;
                                 editorContainerRef.current.scrollLeft = targetScrollLeft;
                             }
                         }
                     }
                }
                requestAnimationFrame(() => requestAnimationFrame(() => updatePageInfo()));
            };

            const handleKeyDown = (e) => {
                if (editorContainerRef.current && layout.stride > 0) {
                    isTyping.current = true;
                    const currentScroll = editorContainerRef.current.scrollLeft;
                    const nearestSpread = Math.round(currentScroll / layout.stride);
                    stableScrollLeft.current = nearestSpread * layout.stride;
                    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                }
                if (e.key === 'Backspace') {
                    const sel = window.getSelection();
                    if (sel && sel.rangeCount > 0 && sel.isCollapsed) {
                        const range = sel.getRangeAt(0);
                        const node = range.startContainer;
                        let p = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
                        while(p && p.nodeName !== 'DIV' && p.parentElement !== e.currentTarget) p = p.parentElement;
                        if (p && p.parentElement === e.currentTarget) {
                            const isAtStart = (range.startOffset === 0) && (node === p || node === p.firstChild || (node.parentNode === p && node === p.firstChild));
                            if (isAtStart) {
                                if (!p.style.textIndent || p.style.textIndent !== '0px') {
                                    e.preventDefault(); p.style.textIndent = '0px';
                                    onChange(e.currentTarget.innerHTML); return;
                                }
                            }
                        }
                    }
                }
                if (e.key === 'Enter') {
                    e.preventDefault(); document.execCommand('insertParagraph', false);
                    const selection = window.getSelection();
                    if (selection && selection.rangeCount > 0) {
                        let node = selection.anchorNode;
                        while (node && (node.nodeType !== Node.ELEMENT_NODE || node.nodeName !== 'DIV') && node.parentNode !== e.currentTarget) node = node.parentNode;
                        if (node && node.nodeName === 'DIV' && node.style.textIndent === '0px') {
                            node.style.removeProperty('text-indent');
                            if (!node.getAttribute('style')) node.removeAttribute('style');
                        }
                    }
                    onPlaySound('enter'); onChange(e.currentTarget.innerHTML);
                    setTimeout(checkAndEnforceCaretVisibility, 10);
                    return;
                }
                if (/^[a-zA-Z ]$/.test(e.key)) onPlaySound('key');
                if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) setTimeout(checkAndEnforceCaretVisibility, 10);
                if (e.key === 'PageDown') { e.preventDefault(); const currentScroll = editorContainerRef.current.scrollLeft; const currentSpread = Math.round(currentScroll / layout.stride); snapToSpread(currentSpread + 1); }
                else if (e.key === 'PageUp') { e.preventDefault(); const currentScroll = editorContainerRef.current.scrollLeft; const currentSpread = Math.round(currentScroll / layout.stride); snapToSpread(currentSpread - 1); }
            };

            const handleKeyUp = useCallback(() => {
                if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                typingTimeoutRef.current = setTimeout(() => {
                    isTyping.current = false;
                    if (editorContainerRef.current && layout.stride > 0) {
                        const currentScroll = editorContainerRef.current.scrollLeft;
                        const nearestSpread = Math.round(currentScroll / layout.stride);
                        stableScrollLeft.current = nearestSpread * layout.stride;
                    }
                }, 150);
            }, [layout.stride]);

            const handleWheel = (e) => {
                if (!editorContainerRef.current || layout.stride === 0) return;
                if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
                    e.preventDefault();
                    const currentScroll = editorContainerRef.current.scrollLeft;
                    const currentSpreadIndex = Math.round(currentScroll / layout.stride);
                    if (Math.abs(e.deltaY) > 20) {
                        const direction = Math.sign(e.deltaY);
                        const nextSpreadIndex = Math.max(0, currentSpreadIndex + direction);
                        snapToSpread(nextSpreadIndex);
                    }
                }
            };

            const exactContentWidth = layout.colWidth > 0 ? (layout.colWidth * layout.columns) + (layout.gap * (layout.columns - 1)) : '100%';
            const editorStyle = {
                fontFamily: settings.fontFamily || 'Lora', fontSize: \`\${settings.fontSize || 1.4}em\`, color: settings.textColor, lineHeight: settings.lineHeight || 1.8,
                textAlign: settings.textAlign || 'left', hyphens: settings.textAlign === 'justify' ? 'auto' : 'manual', WebkitHyphens: settings.textAlign === 'justify' ? 'auto' : 'manual',
                height: 'calc(100% - 6rem)', columnFill: 'auto', columnGap: \`\${layout.gap}px\`, columnWidth: \`\${layout.colWidth}px\`, columnCount: layout.columns,
                width: typeof exactContentWidth === 'number' ? \`\${exactContentWidth}px\` : exactContentWidth,
                paddingTop: '3rem', paddingBottom: '3rem', paddingLeft: \`\${layout.sideMargin}px\`, paddingRight: \`\${layout.sideMargin}px\`,
                boxSizing: 'content-box', opacity: isTransitioning ? 0 : 1, transition: 'opacity 0.15s ease-in-out', orphans: 2, widows: 2, transform: 'translateZ(0)'
            };

            return (
                <div className="flex-grow relative min-h-0 overflow-hidden">
                    <div ref={editorContainerRef} className="absolute inset-0 overflow-x-auto overflow-y-hidden focus:outline-none no-scrollbar" onWheel={handleWheel} onScroll={handleScroll} onClick={() => setTimeout(checkAndEnforceCaretVisibility, 10)} style={{ overflowAnchor: 'none' }}>
                        {layout.columns === 2 && (settings.showBookSpine === true) && <div className="book-spine-effect" />}
                        <div ref={editorRef} contentEditable suppressContentEditableWarning spellCheck={isSpellcheckEnabled} className="editor-content outline-none" style={editorStyle} onBeforeInput={handleBeforeInput} onInput={handleInput} onKeyDown={handleKeyDown} onKeyUp={handleKeyUp} onBlur={checkAndEnforceCaretVisibility} />
                    </div>
                    <div className="absolute bottom-4 right-8 z-10 text-xs font-sans pointer-events-none select-none transition-opacity duration-300 backdrop-blur-sm px-2 py-1 rounded" style={{ color: settings.textColor, opacity: 0.6, backgroundColor: settings.toolbarBg ? \`\${settings.toolbarBg}40\` : 'transparent' }}>
                        {layout.columns === 1 ? <span>Page {pageInfo.current} of {pageInfo.total}</span> : <span>Pages {pageInfo.current} and {pageInfo.current + 1} of {pageInfo.total}</span>}
                    </div>
                </div>
            );
        };

        const DesignGalleryModal = ({ isOpen, onClose, settings, onSettingsChange }) => {
            if (!isOpen) return null;
            const [newUrl, setNewUrl] = useState('');
            const handleFileUpload = (e) => {
                const file = e.target.files[0];
                if (file) { const reader = new FileReader(); reader.onload = (ev) => onSettingsChange({ backgroundImage: ev.target.result }); reader.readAsDataURL(file); }
            };
            return (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm" onClick={onClose}>
                    <div className="w-full max-w-3xl m-4 rounded-lg shadow-2xl flex flex-col overflow-hidden" style={{backgroundColor: settings.toolbarBg, color: settings.textColor}} onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b flex justify-between items-center" style={{borderColor: settings.toolbarButtonBg}}>
                            <h3 className="font-bold">Design Gallery</h3>
                            <button onClick={onClose}><Icons.Close /></button>
                        </div>
                        <div className="p-6 overflow-y-auto max-h-[80vh] space-y-6">
                            <div>
                                <h4 className="font-semibold mb-3 opacity-80">Color Themes</h4>
                                <div className="flex flex-wrap gap-3">
                                    {Object.keys(THEMES).map(name => ( <button key={name} onClick={() => onSettingsChange({ ...THEMES[name], themeName: name, backgroundImage: null })} className="px-4 py-2 rounded border" style={{borderColor: settings.toolbarButtonBg, backgroundColor: settings.toolbarButtonBg}}>{name}</button> ))}
                                </div>
                            </div>
                            <div>
                                <h4 className="font-semibold mb-3 opacity-80">Background Image</h4>
                                <div className="space-y-4">
                                    <div className="flex gap-2">
                                        <input type="text" placeholder="Image URL" value={newUrl} onChange={e => setNewUrl(e.target.value)} className="flex-grow px-2 py-1 rounded border" style={{ backgroundColor: '#FFFFFF', color: '#000000' }} />
                                        <button onClick={() => onSettingsChange({ backgroundImage: newUrl })} className="px-3 py-1 rounded" style={{backgroundColor: settings.accentColor, color: '#FFFFFF'}}>Set</button>
                                        <div className="relative">
                                            <input type="file" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" />
                                            <button className="px-3 py-1 rounded" style={{backgroundColor: settings.toolbarButtonBg, color: settings.textColor}}>Upload</button>
                                        </div>
                                    </div>
                                    <div className="flex items-end gap-4">
                                        <div className="flex-grow">
                                            <label className="text-xs block mb-1">Image Opacity: {settings.backgroundImageOpacity}</label>
                                            <input type="range" min="0" max="1" step="0.1" value={settings.backgroundImageOpacity} onChange={e => onSettingsChange({ backgroundImageOpacity: parseFloat(e.target.value) })} className="w-full" />
                                        </div>
                                        {settings.backgroundImage && <button onClick={() => onSettingsChange({ backgroundImage: null })} className="px-3 py-2 rounded text-xs border hover:bg-white/10 transition-colors flex-shrink-0" style={{borderColor: settings.toolbarButtonBg, color: settings.textColor}}>Remove Image</button>}
                                    </div>
                                </div>
                            </div>
                            <div>
                                <h4 className="font-semibold mb-3 opacity-80">Novelis Collection</h4>
                                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                                    {DEFAULT_BGS.map((bg, i) => ( <div key={i} onClick={() => onSettingsChange({ backgroundImage: bg.url })} className="aspect-square rounded overflow-hidden cursor-pointer hover:opacity-80 border-2 border-transparent hover:border-white transition-all"><img src={bg.url} className="w-full h-full object-cover" loading="lazy" /></div> ))}
                                </div>
                            </div>
                            <div className="border-t pt-4" style={{borderColor: settings.toolbarButtonBg}}>
                                <h4 className="font-semibold mb-3 opacity-80">Display Options</h4>
                                <div className="flex items-center gap-4 p-2 rounded-md" style={{backgroundColor: settings.backgroundColor}}>
                                    <label className="flex items-center select-none cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={settings.showBookSpine === true}
                                            onChange={(e) => onSettingsChange({ showBookSpine: e.target.checked })}
                                            className="mr-2 h-4 w-4 rounded cursor-pointer"
                                            style={{accentColor: settings.accentColor}}
                                        />
                                        Show Book Spine Shadow
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            );
        };

        const NoveApp = () => {
            const [chapters, setChapters] = useState(initialState?.chapters || []);
            const [shortcuts, setShortcuts] = useState(initialState?.shortcuts || []);
            const [characters, setCharacters] = useState(initialState?.characters || []);
            const [world, setWorld] = useState(initialState?.world || []);
            const [plot, setPlot] = useState(initialState?.plot || []);
            const [activeChapterId, setActiveChapterId] = useState(initialState?.chapters[0]?.id || '');
            const [notesOpen, setNotesOpen] = useState(false);
            const [isFocusMode, setIsFocusMode] = useState(false);
            const [isFullscreen, setIsFullscreen] = useState(false);
            const [isGalleryOpen, setIsGalleryOpen] = useState(false);
            const [isStatsOpen, setIsStatsOpen] = useState(false);
            const [isFindReplaceOpen, setIsFindReplaceOpen] = useState(false);
            const [isUserGuideOpen, setIsUserGuideOpen] = useState(false);
            const [isSpellcheckEnabled, setIsSpellcheckEnabled] = useState(false);
            const [pageInfo, setPageInfo] = useState({ current: 1, total: 1 });
            const [isSaving, setIsSaving] = useState(false);
            const [isSaveMenuOpen, setIsSaveMenuOpen] = useState(false);
            const [searchTarget, setSearchTarget] = useState(null);
            const [portableDirHandle, setPortableDirHandle] = useState(null);
            const [hasAcceptedEULA, setHasAcceptedEULA] = useState(() => localStorage.getItem('noveli_eula_accepted') === 'true');
            const isFirstRun = useRef(true);
            const [notification, setNotification] = useState(null);

            useEffect(() => {
                if (!isSaveMenuOpen) return;
                const closeMenu = () => setIsSaveMenuOpen(false);
                document.addEventListener('click', closeMenu);
                return () => document.removeEventListener('click', closeMenu);
            }, [isSaveMenuOpen]);

            const [projectHubOpen, setProjectHubOpen] = useState(false);
            const [settings, setSettings] = useState(initialSettings);
            const [writingGoals, setWritingGoals] = useState(initialGoals);

            // IndexedDB for Folder Persistence
            const getDB = () => new Promise((resolve, reject) => {
                const request = indexedDB.open("NoveProjectHub", 1);
                request.onupgradeneeded = () => request.result.createObjectStore("handles");
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
            const storeHandle = async (handle) => {
                const db = await getDB();
                const tx = db.transaction("handles", "readwrite");
                tx.objectStore("handles").put(handle, "projectFolder");
                return tx.complete;
            };
            const getStoredHandle = async () => {
                const db = await getDB();
                return new Promise((resolve) => {
                    const req = db.transaction("handles").objectStore("handles").get("projectFolder");
                    req.onsuccess = () => resolve(req.result);
                    req.onerror = () => resolve(null);
                });
            };

            const autoSyncLatestProject = async (handle) => {
                try {
                    const files = [];
                    for await (const entry of handle.values()) {
                        if (entry.kind === 'file' && entry.name.endsWith('.zip')) files.push(entry);
                    }
                    if (files.length === 0) return;
                    
                    const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                    const parseDate = (name) => {
                        const m = name.match(/_(\d{2})_([A-Za-z]{3})_(\d{2})_(\d{2})\.zip$/);
                        if (!m) return 0;
                        const [_, dd, mmm, hh, mm] = m;
                        const month = MONTHS.findIndex(mo => mo.toLowerCase() === mmm.toLowerCase());
                        if (month === -1) return 0;
                        const d = new Date(); d.setMonth(month); d.setDate(parseInt(dd)); d.setHours(parseInt(hh)); d.setMinutes(parseInt(mm));
                        return d.getTime();
                    };

                    files.sort((a, b) => parseDate(b.name) - parseDate(a.name));
                    const latest = files[0];
                    setNotification('Found recent project: ' + latest.name + '. Loading...');
                    
                    const file = await latest.getFile();
                    const zip = new JSZip();
                    const content = await zip.loadAsync(file);
                    let jsonFile = content.file("project_data.json");
                    if (!jsonFile) jsonFile = content.file("nove_data.json");
                    
                    if (jsonFile) {
                        const json = JSON.parse(await jsonFile.async("string"));
                        const importedChapters = json.chapters || json.state?.chapters;
                        const importedShortcuts = json.shortcuts || json.state?.shortcuts || [];
                        const importedSettings = json.settings || json.state?.settings;
                        if (importedChapters) {
                            setChapters(importedChapters);
                            setShortcuts(importedShortcuts);
                            setActiveChapterId(importedChapters[0].id);
                            if (importedSettings) setSettings(s => ({ ...s, ...importedSettings }));
                            
                            if (json.writingGoals) setWritingGoals(json.writingGoals);
                            if (json.characters || (json.state && json.state.characters)) setCharacters(json.characters || json.state.characters);
                            if (json.world || (json.state && json.state.world)) setWorld(json.world || json.state.world);
                            if (json.plot || (json.state && json.state.plot)) setPlot(json.plot || json.state.plot);
                            
                            setNotification("Loaded most recent project automatically.");
                        }
                    }
                } catch (e) { console.error("Auto-sync error", e); }
            };

            useEffect(() => {
                const checkHub = async () => {
                    const handle = await getStoredHandle();
                    if (handle) {
                        setPortableDirHandle(handle);
                        if (await handle.queryPermission({ mode: 'readwrite' }) === 'granted') {
                            autoSyncLatestProject(handle);
                        } else {
                            setProjectHubOpen(true);
                        }
                    }
                };
                checkHub();
            }, []);

            useEffect(() => {
                const handleDragOver = (e) => { e.preventDefault(); e.stopPropagation(); };
                const handleDrop = async (e) => {
                    e.preventDefault(); e.stopPropagation();
                    const items = e.dataTransfer.items;
                    if (items && items[0]) {
                        const item = items[0].webkitGetAsEntry ? items[0].webkitGetAsEntry() : null;
                        if (item && item.isDirectory) {
                            try {
                                const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
                                if (handle) {
                                    await storeHandle(handle);
                                    setPortableDirHandle(handle);
                                    await autoSyncLatestProject(handle);
                                    setProjectHubOpen(false);
                                }
                            } catch (err) { console.error("Folder drops handled via picker due to API restrictions", err); }
                        }
                    }
                };
                window.addEventListener('dragover', handleDragOver);
                window.addEventListener('drop', handleDrop);
                return () => { window.removeEventListener('dragover', handleDragOver); window.removeEventListener('drop', handleDrop); };
            }, []);
            const initialTotal = useRef(0);
            const [sessionCount, setSessionCount] = useState(0);
            const fontOptions = ["Lora", "Merriweather", "Times New Roman", "Bookman Old Style", "Georgia", "Roboto", "Open Sans", "Arial", "Inter", "Inconsolata"];

            const activeChapter = chapters.find(c => c.id === activeChapterId) || chapters[0] || { content: '' };
            const activeChapterWordCount = useMemo(() => activeChapter ? getWordCount(activeChapter.content) : 0, [activeChapter?.content]);
            const playSound = useTypewriterSound(settings.isSoundEnabled, settings.soundVolume);
            const totalWordCount = useMemo(() => chapters.reduce((acc, c) => acc + getWordCount(c.content), 0), [chapters]);

            useEffect(() => {
                const unlockAudio = () => {
                    const AudioContext = window.AudioContext || window.webkitAudioContext;
                    if (AudioContext) {
                        const ctx = new AudioContext();
                        if(ctx.state === 'suspended') ctx.resume();
                    }
                    document.removeEventListener('click', unlockAudio);
                    document.removeEventListener('keydown', unlockAudio);
                };
                document.addEventListener('click', unlockAudio);
                document.addEventListener('keydown', unlockAudio);
                return () => { document.removeEventListener('click', unlockAudio); document.removeEventListener('keydown', unlockAudio); }
            }, []);

            useEffect(() => {
                if (initialTotal.current === 0) initialTotal.current = totalWordCount;
                setSessionCount(Math.max(0, totalWordCount - initialTotal.current));
            }, [totalWordCount]);

            useEffect(() => {
                const handleBeforeUnload = (e) => { e.preventDefault(); e.returnValue = ''; };
                window.addEventListener('beforeunload', handleBeforeUnload);
                return () => window.removeEventListener('beforeunload', handleBeforeUnload);
            }, []);

            const toggleFullscreen = () => {
                if (!document.fullscreenElement) document.documentElement.requestFullscreen();
                else if (document.exitFullscreen) document.exitFullscreen();
            };

            useEffect(() => {
                const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
                document.addEventListener('fullscreenchange', handleFullscreenChange);
                return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
            }, []);

            useEffect(() => {
                const attemptLock = async () => {
                    if (isFocusMode && isFullscreen && 'keyboard' in navigator && 'lock' in navigator.keyboard) { try { await navigator.keyboard.lock(['Escape']); } catch (e) { } }
                    else if ('keyboard' in navigator && 'unlock' in navigator.keyboard) navigator.keyboard.unlock();
                };
                attemptLock();
                return () => { if ('keyboard' in navigator && 'unlock' in navigator.keyboard) navigator.keyboard.unlock(); };
            }, [isFocusMode, isFullscreen]);

            useEffect(() => {
                const handleGlobalKeyDown = (e) => { if (e.key === 'Escape' && isFocusMode) { e.preventDefault(); e.stopPropagation(); setIsFocusMode(false); } };
                window.addEventListener('keydown', handleGlobalKeyDown, { capture: true });
                return () => window.removeEventListener('keydown', handleGlobalKeyDown, { capture: true });
            }, [isFocusMode]);

            useEffect(() => {
                if (isFirstRun.current) { isFirstRun.current = false; return; }
                if (settings.backgroundImage) {
                    getImageColors(settings.backgroundImage).then(colors => { if (colors) setSettings(prev => ({ ...prev, ...colors })); });
                }
            }, [settings.backgroundImage]);

            const bgImageWithOverlay = useMemo(() => {
                if (!settings.backgroundImage) return 'none';
                const overlayOpacity = 1 - (settings.backgroundImageOpacity ?? 0.5);
                const color = settings.backgroundColor || '#111827';
                const result = hexToRgb(color);
                const rgb = result ? [result[0], result[1], result[2]] : [0,0,0];
                return \`linear-gradient(rgba(\${rgb[0]}, \${rgb[1]}, \${rgb[2]}, \${overlayOpacity}), rgba(\${rgb[0]}, \${rgb[1]}, \${rgb[2]}, \${overlayOpacity})), url(\${settings.backgroundImage})\`;
            }, [settings.backgroundImage, settings.backgroundImageOpacity, settings.backgroundColor]);

            useEffect(() => {
                document.body.style.backgroundColor = settings.backgroundColor;
                document.body.style.color = settings.textColor;
                document.body.style.backgroundImage = bgImageWithOverlay;
                document.body.style.backgroundSize = 'cover';
                document.body.style.backgroundPosition = 'center';
            }, [settings.backgroundColor, settings.textColor, bgImageWithOverlay]);

            const handleContentChange = (newContent) => {
                if (!activeChapter) return;
                const updatedChapters = chapters.map(c => c.id === activeChapter.id ? { ...c, content: newContent } : c);
                setChapters(updatedChapters);
            };

            const handleSettingsChange = (newSettings) => setSettings(prev => ({...prev, ...newSettings}));

            const handleReplaceAll = (find, replace, scope) => {
                if (!find) return;
                const regex = new RegExp(find.replace(/[.*+?^$\{ }()|[\\]\\\\]/g, '\\\\$&'), 'g');
                if (scope === 'chapter') { handleContentChange(activeChapter.content.replace(regex, replace)); }
                else { setChapters(chapters.map(c => ({...c, content: c.content.replace(regex, replace)}))); }
            };

            const handleNavigateMatch = (result) => {
                if (result.chapterId !== activeChapterId) { setActiveChapterId(result.chapterId); setTimeout(() => setSearchTarget(result), 100); }
                else { setSearchTarget(result); }
            };
            
            const handleReplace = (replaceText) => {
                const sel = window.getSelection();
                if (sel && !sel.isCollapsed) document.execCommand('insertText', false, replaceText);
            };

            const handleUpgrade = () => window.open('https://novelis.lemonsqueezy.com/', '_blank');
            const handleDonate = () => window.open('https://buymeacoffee.com/doovenism', '_blank');

            const handleAddChapter = () => {
                const newId = 'chap_' + Date.now();
                setChapters([...chapters, { id: newId, title: 'New Chapter', chapterNumber: chapters.length + 1, content: '<div><br></div>', notes: '', rawNotes: '' }]);
                setActiveChapterId(newId);
            };

            const handleAcceptEULA = () => {
                setHasAcceptedEULA(true);
                localStorage.setItem('noveli_eula_accepted', 'true');
            };

            const handlePortableSave = async (forceNewFolder = false) => {
                setIsSaving(true);
                const syncData = { 
                    chapters: chapters, 
                    shortcuts: shortcuts,
                    settings: settings, 
                    characters: characters,
                    world: world,
                    plot: plot,
                    writingGoals: writingGoals,
                    timestamp: new Date().toISOString(), 
                    source: 'Nove' 
                };
                try {
                    const zip = new JSZip();
                    zip.file("project_data.json", JSON.stringify(syncData, null, 2));
                    const rtfFolder = zip.folder("RTF_Backups");
                    chapters.forEach(ch => {
                        const safeTitle = ch.title.replace(/[^a-z0-9]/gi, '_').substring(0, 30);
                        rtfFolder.file(\`\${ch.chapterNumber}_\${safeTitle}.rtf\`, generateSimpleRtf(ch));
                    });
                    const blob = await zip.generateAsync({type:"blob"});
                    const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                    const now = new Date();
                    const dd = String(now.getDate()).padStart(2, '0');
                    const mmm = MONTH_NAMES[now.getMonth()];
                    const hh = String(now.getHours()).padStart(2, '0');
                    const mm = String(now.getMinutes()).padStart(2, '0');
                    const filename = \`Nove_Project_\${dd}_\${mmm}_\${hh}_\${mm}.zip\`;

                    if ('showDirectoryPicker' in window) {
                        try {
                            let dirHandle = portableDirHandle;
                            if (!dirHandle || forceNewFolder) { dirHandle = await window.showDirectoryPicker(); setPortableDirHandle(dirHandle); await storeHandle(dirHandle); }
                            const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
                            const writable = await fileHandle.createWritable();
                            await writable.write(blob);
                            await writable.close();
                            setNotification(\`Saved to \${dirHandle.name}/\${filename}\`);
                        } catch (err) { if (err.name !== 'AbortError') alert("Error saving: " + err); setIsSaving(false); return; }
                    } else {
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
                        setTimeout(() => URL.revokeObjectURL(url), 1000); setNotification('Saved to Downloads');
                    }
                } catch (e) { alert("Error creating sync zip: " + e); }
                setIsSaving(false); setTimeout(() => setNotification(null), 3000);
            };

            useEffect(() => {
                const handleKeyDown = (e) => { if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); handlePortableSave(false); } };
                window.addEventListener('keydown', handleKeyDown);
                return () => window.removeEventListener('keydown', handleKeyDown);
            }, [chapters, settings, portableDirHandle]);

            const btnStyle = { backgroundColor: settings.toolbarButtonBg, color: settings.textColor };
            const activeBtnStyle = { backgroundColor: settings.accentColor, color: '#FFF' };

            if (!activeChapter) return <div className="p-8 text-center">Loading Manuscript...</div>;

            return (
                <div className="flex flex-col h-screen font-sans overflow-hidden transition-colors duration-300 bg-transparent">
                    {!hasAcceptedEULA && <EULAModal settings={settings} onAccept={handleAcceptEULA} />}
                    {notification && <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-[9999] px-6 py-2 rounded-full shadow-xl toast-enter flex items-center gap-2 backdrop-blur-md border border-white/20" style={{ backgroundColor: settings.accentColor || '#16a34a', color: '#FFFFFF' }}><span className="font-bold text-sm">{notification}</span></div>}
                    {projectHubOpen && (
                        <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-[999] bg-black/90 backdrop-blur-md border border-white/20 p-5 rounded-2xl shadow-2xl flex items-center gap-5 animate-in slide-in-from-bottom-6 duration-700 max-w-xl scale-105">
                            <div className="p-3 rounded-xl shadow-inner flex items-center justify-center" style={{ backgroundColor: (settings.accentColor || '#3b82f6') + '33', color: settings.accentColor || '#3b82f6' }}>
                                <Icons.Import className="h-8 w-8" />
                            </div>
                            <div className="flex-grow">
                                <h4 className="font-bold text-base leading-tight" style={{ color: '#FFFFFF' }}>Resume Project Workspace?</h4>
                                <p className="text-sm mt-1" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Reconnect your project folder to automatically load the most recent save.</p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => setProjectHubOpen(false)} className="px-3 py-2 rounded-lg text-sm font-semibold transition-colors" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>Not now</button>
                                <button 
                                    onClick={async () => {
                                        try {
                                            const newHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
                                            if (newHandle) {
                                                await storeHandle(newHandle);
                                                setPortableDirHandle(newHandle);
                                                if (await newHandle.requestPermission({ mode: 'readwrite' }) === 'granted') {
                                                    await autoSyncLatestProject(newHandle);
                                                    setProjectHubOpen(false);
                                                }
                                            }
                                        } catch (e) {
                                            if (e.name !== 'AbortError') console.error("Error connecting different folder", e);
                                        }
                                    }} 
                                    className="px-3 py-2 rounded-xl text-sm font-semibold bg-white/10 hover:bg-white/20 transition-colors border border-white/10"
                                    style={{ color: '#FFFFFF' }}
                                    title="Choose a different project folder"
                                >
                                    Different Folder
                                </button>
                                <button 
                                    onClick={async () => {
                                        try {
                                            let handle = await getStoredHandle();
                                            if (!handle) {
                                                handle = await window.showDirectoryPicker({ mode: 'readwrite' });
                                                await storeHandle(handle);
                                            }
                                            if (await handle.requestPermission({ mode: 'readwrite' }) === 'granted') {
                                                await autoSyncLatestProject(handle);
                                                setProjectHubOpen(false);
                                            }
                                        } catch (e) { console.error("Permission denied or error", e); }
                                    }} 
                                    className="px-4 py-2 rounded-xl text-sm font-bold shadow-lg active:scale-95 transition-transform"
                                    style={{ backgroundColor: settings.accentColor || '#3b82f6', color: '#FFFFFF' }}
                                >
                                    Connect Folder
                                </button>
                            </div>
                        </div>
                    )}
                    <div className="flex flex-grow overflow-hidden relative">
                        <NoveManuscript chapter={activeChapter} onChange={handleContentChange} settings={settings} isFocusMode={isFocusMode} onPlaySound={playSound} notesOpen={notesOpen} onPageInfoChange={setPageInfo} isSpellcheckEnabled={isSpellcheckEnabled} searchTarget={searchTarget} />
                        {isFindReplaceOpen && <FindReplacePanel onClose={() => setIsFindReplaceOpen(false)} settings={settings} chapters={chapters} activeChapterId={activeChapterId} onNavigateMatch={handleNavigateMatch} onReplace={handleReplace} onReplaceAll={handleReplaceAll} />}
                        {notesOpen && !isFocusMode && (
                            <div className="w-80 border-l flex flex-col shadow-xl z-20 flex-shrink-0 transition-colors backdrop-blur-md" style={{backgroundColor: settings.toolbarBg + 'E6', borderColor: settings.toolbarButtonBg}}>
                                <div className="p-4 border-b font-bold text-sm uppercase tracking-wider flex items-center justify-between" style={{borderColor: settings.toolbarButtonBg}}><span>Notes</span><button onClick={() => setNotesOpen(false)}><Icons.Close /></button></div>
                                <div className="p-4 flex-grow overflow-y-auto space-y-4">
                                    <div className="flex-grow flex flex-col h-full"><textarea className="w-full border-none text-sm resize-none flex-grow focus:ring-0 bg-transparent" style={{color: settings.textColor}} placeholder="Jot down ideas..." defaultValue={activeChapter.rawNotes || ""} onChange={(e) => { const newNotes = e.target.value; setChapters(chapters.map(c => c.id === activeChapter.id ? { ...c, rawNotes: newNotes } : c)); }} /></div>
                                    <div className="mt-auto pt-4 border-t" style={{borderColor: settings.toolbarButtonBg}}><div className="p-3 rounded-lg text-center" style={{backgroundColor: settings.backgroundColor + '80'}}><p className="text-xs opacity-70 mb-2">Need AI tools?</p><button className="w-full py-1.5 rounded text-xs font-bold shadow-sm hover:opacity-90 transition-opacity cursor-not-allowed opacity-50" disabled style={{backgroundColor: settings.accentColor, color: '#FFFFFF'}}>Available in Novelis Desktop</button></div></div>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className={\`flex-shrink-0 flex flex-wrap items-center justify-center sm:justify-between gap-y-2 px-4 shadow-lg z-20 transition-all duration-300 \${isFocusMode ? 'max-h-0 py-0 opacity-0 pointer-events-none border-none overflow-hidden' : 'max-h-48 py-2 opacity-100 border-t'}\`} style={{backgroundColor: settings.toolbarBg, borderColor: settings.toolbarButtonBg}}>
                        <div className="flex items-center gap-2 sm:gap-4 flex-wrap justify-center sm:justify-start w-full sm:w-auto">
                            <a href="https://www.thomascorfield.com" target="_blank" rel="noopener noreferrer" className="text-xl font-serif font-bold tracking-wider hover:opacity-80 transition-opacity" style={{color: settings.textColor}}>Novel<span style={{color: settings.accentColor}}>e</span></a>
                            <select value={activeChapterId} onChange={(e) => setActiveChapterId(e.target.value)} className="text-sm border rounded px-2 py-1 focus:outline-none" style={{backgroundColor: settings.toolbarButtonBg, color: settings.textColor, borderColor: settings.toolbarButtonBg}}>{chapters.map(c => <option key={c.id} value={c.id}>{c.chapterNumber}. {c.title}</option>)}</select>
                            <button onClick={handleAddChapter} className="p-1 rounded hover:opacity-80 transition-colors" style={{backgroundColor: settings.toolbarButtonBg, color: settings.textColor}} title="Add New Chapter"><Icons.Plus /></button>
                            <div className="flex items-center gap-2">
                                <select value={settings.fontFamily} onChange={e => handleSettingsChange({ fontFamily: e.target.value })} className="text-sm border rounded px-2 py-1 focus:outline-none" style={{backgroundColor: settings.toolbarButtonBg, color: settings.textColor, borderColor: settings.toolbarButtonBg}}>{fontOptions.map(font => <option key={font} value={font}>{font}</option>)}</select>
                                <div className="flex items-center"><button onClick={() => handleSettingsChange({ fontSize: Math.max(0.7, settings.fontSize - 0.1) })} className="rounded-l px-2 py-1 border" style={{ backgroundColor: settings.toolbarButtonBg, borderColor: settings.toolbarButtonBg, color: settings.textColor }} title="Decrease Font Size">-</button><span className="px-2 py-1 border-t border-b text-sm" style={{ backgroundColor: settings.toolbarBg, borderColor: settings.toolbarButtonBg }}>{settings.fontSize.toFixed(1)}em</span><button onClick={() => handleSettingsChange({ fontSize: Math.min(2.5, settings.fontSize + 0.1) })} className="rounded-r px-2 py-1 border" style={{ backgroundColor: settings.toolbarButtonBg, borderColor: settings.toolbarButtonBg, color: settings.textColor }} title="Increase Font Size">+</button></div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-end w-full sm:w-auto">
                            <div className="flex items-center gap-3 mr-2 hidden md:flex"><div className="text-right" style={{ color: settings.toolbarText ? \`\${settings.toolbarText}B3\` : '#A0AEC0' }}><div className="text-xs">Chapter: {activeChapterWordCount.toLocaleString()}</div><div className="text-xs">Session: {sessionCount.toLocaleString()}</div></div></div>
                            <button onClick={() => setSettings(s => ({...s, textAlign: s.textAlign === 'left' ? 'justify' : 'left'}))} className="p-2 rounded hover:opacity-80 transition-colors" style={settings.textAlign === 'justify' ? activeBtnStyle : btnStyle} title="Toggle Text Alignment"><Icons.Justify /></button>
                            <button onClick={() => handleSettingsChange({ lineHeight: settings.lineHeight === 1.2 ? 1.8 : 1.2 })} className="p-2 rounded hover:opacity-80 transition-colors" style={settings.lineHeight === 1.2 ? activeBtnStyle : btnStyle} title="Toggle Line Spacing"><Icons.LineHeight /></button>
                            <button onClick={() => setIsGalleryOpen(true)} className="p-2 rounded hover:opacity-80 transition-colors" style={btnStyle} title="Design Gallery"><Icons.Brush /></button>
                            <button onClick={() => setIsStatsOpen(true)} className="p-2 rounded hover:opacity-80 transition-colors" style={btnStyle} title="Writing Statistics & Goals"><Icons.Stats /></button>
                            <button onClick={() => setNotesOpen(!notesOpen)} className="p-2 rounded hover:opacity-80 transition-colors" style={notesOpen ? activeBtnStyle : btnStyle} title="Chapter Notes"><Icons.Note /></button>
                            <button onClick={() => setIsFindReplaceOpen(true)} className="p-2 rounded hover:opacity-80 transition-colors" style={btnStyle} title="Find and Replace"><Icons.Search /></button>
                            <button onClick={() => setSettings(s => ({...s, transitionStyle: s.transitionStyle === 'scroll' ? 'fade' : 'scroll'}))} className="p-2 rounded hover:opacity-80 transition-colors" style={btnStyle} title="Toggle Page Transition"><Icons.Transition /></button>
                            <button onClick={() => setIsSpellcheckEnabled(!isSpellcheckEnabled)} className="p-2 rounded hover:opacity-80 transition-colors" style={isSpellcheckEnabled ? activeBtnStyle : btnStyle} title="Toggle Spell Check"><Icons.Spellcheck /></button>
                            <button onClick={() => setSettings(s => ({...s, isSoundEnabled: !s.isSoundEnabled}))} className="p-2 rounded hover:opacity-80 transition-colors" style={settings.isSoundEnabled ? activeBtnStyle : btnStyle} title="Toggle Typewriter Sounds">{settings.isSoundEnabled ? <Icons.SoundOn /> : <Icons.SoundOff />}</button>
                            {settings.isSoundEnabled && (
                                <div className="flex items-center ml-1">
                                    <input
                                        type="range"
                                        min="1"
                                        max="4"
                                        step="1"
                                        value={(settings.soundVolume || 0.75) * 4}
                                        onChange={(e) => setSettings(s => ({...s, soundVolume: parseInt(e.target.value) / 4}))}
                                        className="w-10 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                                        style={{ accentColor: settings.accentColor }}
                                        title="Typewriter Volume"
                                    />
                                </div>
                            )}
                            <button onClick={toggleFullscreen} className="p-2 rounded hover:opacity-80 transition-colors" style={isFullscreen ? activeBtnStyle : btnStyle} title="Toggle Fullscreen">{isFullscreen ? <Icons.ExitFullscreen /> : <Icons.EnterFullscreen />}</button>
                            <button onClick={() => setIsFocusMode(!isFocusMode)} className="p-2 rounded hover:opacity-80 transition-colors" style={isFocusMode ? activeBtnStyle : btnStyle} title="Focus Mode (Esc)"><Icons.Focus /></button>
                            <button onClick={handleDonate} className="p-2 rounded hover:opacity-80 transition-colors" style={{...btnStyle, color: '#ef4444'}} title="Donate"><Icons.Heart /></button>
                            <button onClick={() => setIsUserGuideOpen(true)} className="p-2 rounded hover:opacity-80 transition-colors" style={btnStyle} title="User Guide"><Icons.Help /></button>
                            <button onClick={handleUpgrade} className="px-3 py-1.5 rounded text-sm transition-colors hover:opacity-90" style={{backgroundColor: settings.accentColor, color: '#FFF'}} title="Upgrade to Novelis Desktop">Upgrade</button>
                            
                            <div className="relative flex items-center">
                                <button 
                                    onClick={() => handlePortableSave(false)} 
                                    onContextMenu={(e) => { e.preventDefault(); setIsSaveMenuOpen(!isSaveMenuOpen); }}
                                    className="flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium transition-colors hover:opacity-90 group" 
                                    style={{backgroundColor: settings.accentColor, color: '#FFFFFF'}} 
                                    title="Save Project Snapshot (Ctrl+S) - Right-click for options"
                                >
                                    <div className="flex items-center gap-2">
                                        <Icons.Save />
                                        <span>Save</span>
                                        <div 
                                            className={"opacity-50 group-hover:opacity-100 transition-transform duration-200 " + (isSaveMenuOpen ? "rotate-180" : "")}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setIsSaveMenuOpen(!isSaveMenuOpen);
                                            }}
                                        >
                                            <Icons.ChevronDown />
                                        </div>
                                    </div>
                                </button>
                                
                                {isSaveMenuOpen && (
                                    <div 
                                        className="absolute bottom-full right-0 mb-2 w-48 rounded-xl shadow-2xl p-1 border animate-in fade-in slide-in-from-bottom-2 duration-200 z-[9999] backdrop-blur-md flex flex-col"
                                        style={{
                                            backgroundColor: 'rgba(0, 0, 0, 0.95)',
                                            borderColor: 'rgba(255, 255, 255, 0.15)',
                                            color: '#FFFFFF'
                                        }}
                                    >
                                        <button 
                                            onClick={() => { setIsSaveMenuOpen(false); handlePortableSave(false); }} 
                                            className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold hover:bg-white/10 flex items-center gap-2 transition-colors"
                                            style={{ color: '#FFFFFF' }}
                                        >
                                            <Icons.Save />
                                            <span>Save Snapshot</span>
                                        </button>
                                        <button 
                                            onClick={() => { setIsSaveMenuOpen(false); handlePortableSave(true); }} 
                                            className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold hover:bg-white/10 flex items-center gap-2 transition-colors"
                                            style={{ color: '#FFFFFF' }}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                            <span>Save to new folder...</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    {isGalleryOpen && <DesignGalleryModal isOpen={isGalleryOpen} onClose={() => setIsGalleryOpen(false)} settings={settings} onSettingsChange={handleSettingsChange} />}
                    {isStatsOpen && <StatsModal onClose={() => setIsStatsOpen(false)} settings={settings} totalWordCount={totalWordCount} sessionWordCount={sessionCount} goals={writingGoals} onGoalsChange={setWritingGoals} chapters={chapters} />}
                    {isUserGuideOpen && <UserGuideModal onClose={() => setIsUserGuideOpen(false)} settings={settings} />}
                    {isFocusMode && <button onClick={() => setIsFocusMode(false)} className="absolute top-4 right-4 p-2 rounded-full bg-black/20 hover:bg-black/40 transition-colors z-50" style={{ color: '#FFFFFF' }} title="Exit Focus Mode"><Icons.Unfocus /></button>}
                </div>
            );
        };

        const root = ReactDOM.createRoot(document.getElementById('root'));
        root.render(<NoveApp />);
        window.NoveBoot.loaded = true;
    </script>
</body>
</html>`;
}
