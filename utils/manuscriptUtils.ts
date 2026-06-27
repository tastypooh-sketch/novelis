import { Packer, Document, Paragraph, TextRun, HeadingLevel, ImageRun, AlignmentType, ExternalHyperlink } from 'docx';
import JSZip from 'jszip';
import type { IChapter, INovelState, EditorSettings, ICharacter, ISnippet, WritingGoals } from '../types';
import { generateNoveHTML } from './noveGenerator';
import { initialNovelState } from '../NovelContext';

// --- ZIP PROTOCOL UTILS ---

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const generateTimestampedName = (projectName: string): string => {
    const safeName = projectName.replace(/[^a-z0-9]/gi, '_').substring(0, 40) || 'Untitled';
    const now = new Date();
    
    // Format: Project_Name_YYYYMMDD_HHMMSS.zip (Spec 2 compliant)
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    
    return `${safeName}_${yyyy}${mm}${dd}_${hh}${min}${ss}.zip`;
};

export const parseTimestampFromFilename = (filename: string): Date | null => {
    // Matches YYYYMMDD_HHMMSS
    const regexNew = /_(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})\.zip$/;
    // Matches older DD_MMM_HH_MM
    const regexOld = /_(\d{2})_([A-Za-z]{3})_(\d{2})_(\d{2})\.zip$/;
    
    const matchNew = filename.match(regexNew);
    if (matchNew) {
        const [_, y, m, d, hh, mm, ss] = matchNew;
        return new Date(parseInt(y), parseInt(m) - 1, parseInt(d), parseInt(hh), parseInt(mm), parseInt(ss));
    }

    const matchOld = filename.match(regexOld);
    if (matchOld) {
        const [_, dd, mmm, hh, mm] = matchOld;
        const monthIndex = MONTH_NAMES.findIndex(m => m.toLowerCase() === mmm.toLowerCase());
        
        if (monthIndex !== -1) {
            const now = new Date();
            const date = new Date(now.getFullYear(), monthIndex, parseInt(dd), parseInt(hh), parseInt(mm));
            if (date > now) {
                date.setFullYear(date.getFullYear() - 1);
            }
            return date;
        }
    }
    return null;
};

const getFaviconBase64 = async (): Promise<string> => {
    try {
        let response = await fetch('./icon.png');
        if (!response.ok) response = await fetch('./icon.ico');
        
        if (response.ok) {
            const blob = await response.blob();
            return await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(blob);
            });
        }
    } catch (e) {
        console.warn("Failed to load favicon for Nové export", e);
    }
    // Default fallback: a simple elegant book/quill SVG favicon
    return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='%23FFFFFF' d='M19 2H5c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z'/%3E%3Cpath fill='%23D1D5DB' d='M12 6H6v10.5l3-1.5 3 1.5V6z'/%3E%3C/svg%3E";
};

export const createProjectZip = async (state: INovelState, settings: EditorSettings): Promise<Blob> => {
    const zip = new JSZip();
    zip.file("project_data.json", JSON.stringify(state, null, 2));
    zip.file("settings.json", JSON.stringify(settings, null, 2));
    
    const rtfFolder = zip.folder("rtf");
    if (rtfFolder) {
        state.chapters.forEach(ch => {
            const rtf = generateInitialChapterRtf(ch);
            const safeTitle = ch.title.replace(/[^a-z0-9]/gi, '_').substring(0, 30);
            rtfFolder.file(`${ch.chapterNumber}_${safeTitle}.rtf`, rtf);
        });
    }

    return await zip.generateAsync({ type: "blob" });
};

// --- NOVE EXPORT UTILS ---

export const exportStandaloneNove = async (fullState: INovelState, settings: EditorSettings, writingGoals: WritingGoals) => {
    const favicon = await getFaviconBase64();
    const noveHtml = generateNoveHTML(fullState, settings, writingGoals, favicon);
    const filename = `Nove_${fullState.chapters[0]?.title || 'Manuscript'}.html`.replace(/[^a-z0-9.]/gi, '_');
    
    downloadFile(filename, noveHtml, 'text/html');
};

export const exportBlankNove = async (settings: EditorSettings, writingGoals: WritingGoals) => {
    const favicon = await getFaviconBase64();
    const noveHtml = generateNoveHTML(initialNovelState, settings, writingGoals, favicon);
    downloadFile('Nové.html', noveHtml, 'text/html');
};

export const exportForNove = async (fullState: INovelState, settings: EditorSettings, writingGoals: WritingGoals) => {
    const zip = new JSZip();
    const favicon = await getFaviconBase64();

    // 1. Generate Standalone Application HTML
    const noveHtml = generateNoveHTML(fullState, settings, writingGoals, favicon);
    zip.file("Nové.html", noveHtml);

    // 2. Add raw data files
    const projectData = zip.folder("Project_Data");
    if (projectData) {
        const initialBackup = await createProjectZip(fullState, settings);
        const name = generateTimestampedName("Nové_Export");
        projectData.file(name, initialBackup);
    }

    const content = await zip.generateAsync({ type: "blob" });
    const filename = generateTimestampedName("Nové_Portable");
    
    // @ts-ignore
    if (window.electronAPI) {
        try {
            const arrayBuffer = await content.arrayBuffer();
            // @ts-ignore
            await window.electronAPI.saveFile({ 
                name: filename, 
                content: new Uint8Array(arrayBuffer) 
            });
            localStorage.setItem('novelis_sync_flag', 'true');
        } catch (e) {
            console.error("Electron save failed:", e);
            alert("Failed to save via Electron dialog.");
        }
    } else {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        localStorage.setItem('novelis_sync_flag', 'true');
    }
};

// --- EXISTING UTILS ---

export const smartQuotes = (text: string): string => {
  return text
    .replace(/(^|[-\u2014\s(\["])'/g, "$1\u2018")
    .replace(/'/g, "\u2019")
    .replace(/(^|[-\u2014/\[(\u2018\s])"/g, "$1\u201C")
    .replace(/"/g, "\u201D")
    .replace(/--/g, "\u2014");
};

const escapeRtfText = (text: string): string => {
    let result = '';
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const code = text.charCodeAt(i);
        if (char === '\\' || char === '{' || char === '}') {
            result += `\\${char}`;
        } else if (code >= 128) {
            result += `\\u${code}?`;
        } else if (code < 32 && char !== '\t') {
        } else {
            result += char;
        }
    }
    return result;
};

const escapeHtml = (text: string): string => {
    if (!text) return '';
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
};

const processNodeForRtf = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) {
        return escapeRtfText(node.textContent || '');
    }
    if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as HTMLElement;
        const tagName = element.tagName.toLowerCase();
        let childrenRtf = Array.from(element.childNodes).map(processNodeForRtf).join('');
        
        switch (tagName) {
            case 'i': case 'em': return `{\\i ${childrenRtf}}`;
            case 'b': case 'strong': return `{\\b ${childrenRtf}}`;
            case 'br': return '\\line ';
            default: return childrenRtf;
        }
    }
    return '';
};

export const generateRtfForChapters = (chapters: IChapter[]): string => {
    const header = `{\\rtf1\\ansi\\ansicpg1252\\deff0\\nouicompat\\deflang1033`;
    const fontTbl = `{\\fonttbl{\\f0\\fnil\\fcharset0 Times New Roman;}}`;
    const styles = `\\viewkind4\\uc1\\pard\\sa200\\sl276\\slmult1\\f0\\fs24`;

    const rtfChapters = chapters.map(chapter => {
        const chapterTitleText = `${chapter.title} ${chapter.chapterNumber}`;
        const sanitizedTitle = escapeRtfText(chapterTitleText);
        const chapterTitle = `{\\pard\\qc\\b\\fs32 ${sanitizedTitle}\\par\\par}`;
        
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = chapter.content;

        const paragraphs = Array.from(tempDiv.childNodes).map((node, index) => {
             if (node.nodeType === Node.ELEMENT_NODE && node.nodeName === 'DIV') {
                const indent = index === 0 ? '{\\pard\\fi0 ' : '{\\pard\\fi360 ';
                const content = Array.from(node.childNodes).map(processNodeForRtf).join('');
                return `${indent}${content}\\par}`;
             }
             return null;
        }).filter(Boolean).join('\n');

        return `${chapterTitle}${paragraphs}`;
    }).join('\\page\n');

    return `${header}\n${fontTbl}\n${styles}\n${rtfChapters}\n}`;
};

export const generateBriefingHtml = (chapter: IChapter, allCharacters: ICharacter[], allSnippets: ISnippet[]): string => {
    let html = `<div><strong>[ CHAPTER BRIEFING ]</strong></div>`;
    if (chapter.tagline) html += `<div><strong>Tagline:</strong> ${escapeHtml(chapter.tagline)}</div>`;
    if (chapter.keywords && chapter.keywords.length > 0) html += `<div><strong>Keywords:</strong> ${escapeHtml(chapter.keywords.join(', '))}</div>`;
    const involvedCharacters = (chapter.characterIds || [])
        .map(id => allCharacters.find(c => c.id === id)?.name)
        .filter(Boolean)
        .map(name => escapeHtml(name || ''));
    if (involvedCharacters.length > 0) html += `<div><strong>Characters:</strong> ${involvedCharacters.join(', ')}</div>`;
    if (chapter.summary) html += `<div><strong>Summary:</strong> ${escapeHtml(chapter.summary)}</div>`;
    const involvedSnippets = (chapter.linkedSnippetIds || [])
        .map(id => allSnippets.find(s => s.id === id)?.cleanedText)
        .filter(Boolean)
        .map(text => escapeHtml(text || ''));
    if (involvedSnippets.length > 0) {
        html += `<div><strong>Required Snippets:</strong></div>`;
        involvedSnippets.forEach(text => { html += `<div>- "${text}"</div>`; });
    }
    html += `<div>* * *</div><div><br></div>`;
    return html;
};

export const downloadFile = (filename: string, content: string, mimeType: string) => {
    // @ts-ignore
    if (window.electronAPI) {
        // @ts-ignore
        window.electronAPI.saveFile({ name: filename, content: new TextEncoder().encode(content) });
    } else {
        const blob = new Blob([content], { type: mimeType });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};

export const calculateWordCountFromHtml = (html: string): number => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    const text = tempDiv.innerText || '';
    return text.trim().split(/\s+/).filter(Boolean).length;
};

export const generateInitialChapterRtf = (chapter: IChapter): string => {
    return generateRtfForChapters([chapter]);
};

export function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export const safeDecode = (str: string) => {
    try {
        return JSON.parse(decodeURIComponent(atob(str).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join('')));
    } catch (e) {
        console.error("Decoding error", e);
        return null;
    }
};

const parseFromNoveHtml = (html: string): { state: INovelState, settings?: EditorSettings } | null => {
    // Look for the encoded data in the HTML script tags
    const stateMatch = html.match(/const initialState = safeDecode\(['"](.*?)['"]\);/);
    const settingsMatch = html.match(/const initialSettings = safeDecode\(['"](.*?)['"]\);/);
    
    if (stateMatch) {
        const state = safeDecode(stateMatch[1]);
        const settings = settingsMatch ? safeDecode(settingsMatch[1]) : undefined;
        if (state && (state.chapters || state.state?.chapters)) {
            const finalState = state.chapters ? state : state.state;
            return { state: finalState as unknown as INovelState, settings };
        }
    }
    return null;
}

export const parseNoveSync = async (file: File): Promise<{ state: INovelState, settings?: EditorSettings } | null> => {
    if (file.name.endsWith('.zip')) {
        try {
            const zip = new JSZip();
            const content = await zip.loadAsync(file);
            
            // 1. Search for project_data.json or nove_data.json at any level
            const allFiles = Object.keys(content.files);
            let jsonFileKey = allFiles.find(f => f.endsWith('project_data.json') || f.endsWith('nove_data.json'));
            
            // 2. If not found, look for ANY json that looks like a project
            if (!jsonFileKey) {
                for (const key of allFiles) {
                    if (key.endsWith('.json')) {
                        const str = await content.files[key].async("string");
                        try {
                            const parsed = JSON.parse(str);
                            if (parsed && (parsed.chapters || (parsed.state && parsed.state.chapters))) {
                                jsonFileKey = key;
                                break;
                            }
                        } catch(e) {}
                    }
                }
            }

            if (jsonFileKey) {
                const jsonStr = await content.files[jsonFileKey].async("string");
                const json = JSON.parse(jsonStr);
                let settings = undefined;
                
                // Try to find a settings.json nearby
                const dir = jsonFileKey.substring(0, jsonFileKey.lastIndexOf('/') + 1);
                const settingsFile = content.file(`${dir}settings.json`) || content.file("settings.json");
                
                if (settingsFile) {
                    const settingsStr = await settingsFile.async("string");
                    settings = JSON.parse(settingsStr);
                }
                
                if (json && (json.chapters || json.state?.chapters)) {
                    const state = json.chapters ? json : json.state;
                    return { state: state as unknown as INovelState, settings };
                }
            }
            
            // 3. Check for Project_Data folder (Portable Export structure)
            const projectDataKeys = allFiles.filter(f => f.includes('Project_Data/') && f.endsWith('.zip'));
            if (projectDataKeys.length > 0) {
                 // Pick the most recent/relevant backup
                 projectDataKeys.sort().reverse();
                 const nestedZipBlob = await content.files[projectDataKeys[0]].async("blob");
                 return parseNoveSync(new File([nestedZipBlob], projectDataKeys[0]));
            }

            // 4. Check for embedded data in Nove.html inside the zip
            const htmlFileKey = allFiles.find(f => f.toLowerCase().endsWith('nové.html') || f.toLowerCase().endsWith('nove.html'));
            if (htmlFileKey) {
                const htmlStr = await content.files[htmlFileKey].async("string");
                const parsed = parseFromNoveHtml(htmlStr);
                if (parsed) return parsed;
            }

            throw new Error("No valid project data found in Zip.");
        } catch (err) {
            console.error("Failed to parse Zip:", err);
            throw err;
        }
    } else if (file.name.toLowerCase().endsWith('.html')) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const html = e.target?.result as string;
                const parsed = parseFromNoveHtml(html);
                if (parsed) resolve(parsed);
                else reject(new Error("Could not extract data from HTML."));
            };
            reader.onerror = () => reject(new Error("Failed to read HTML file."));
            reader.readAsText(file);
        });
    } else {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const json = JSON.parse(e.target?.result as string);
                    if (json && (json.chapters || (json.state && json.state.chapters))) {
                        const state = json.chapters ? json : json.state;
                        resolve({ state: state as unknown as INovelState, settings: json.settings || state.settings });
                    } else {
                        reject(new Error("Invalid JSON format."));
                    }
                } catch (err) { reject(err); }
            };
            reader.readAsText(file);
        });
    }
};
