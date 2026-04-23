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
    const dd = String(now.getDate()).padStart(2, '0');
    const mmm = MONTH_NAMES[now.getMonth()];
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    
    // Format: Project_Name_01_Dec_15_56.zip
    return `${safeName}_${dd}_${mmm}_${hh}_${mm}.zip`;
};

export const parseTimestampFromFilename = (filename: string): Date | null => {
    const regex = /_(\d{2})_([A-Za-z]{3})_(\d{2})_(\d{2})\.zip$/;
    const match = filename.match(regex);
    
    if (match) {
        const [_, dd, mmm, hh, mm] = match;
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
    return "";
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
    if (chapter.keywords && chapter.keywords.length > 0) html += `<div><strong>Keywords:</strong> ${chapter.keywords.map(escapeHtml).join(', ')}</div>`;
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

export const parseNoveSync = async (file: File): Promise<{ state: INovelState, settings?: EditorSettings } | null> => {
    if (file.name.endsWith('.zip')) {
        try {
            const zip = new JSZip();
            const content = await zip.loadAsync(file);
            let jsonFile = content.file("project_data.json");
            if (!jsonFile) jsonFile = content.file("nove_data.json");
            if (jsonFile) {
                const jsonStr = await jsonFile.async("string");
                const json = JSON.parse(jsonStr);
                let settings = undefined;
                const settingsFile = content.file("settings.json");
                if (settingsFile) {
                    const settingsStr = await settingsFile.async("string");
                    settings = JSON.parse(settingsStr);
                }
                if (json && (json.chapters || json.state?.chapters)) {
                    const state = json.chapters ? json : json.state;
                    return { state: state as unknown as INovelState, settings };
                }
            }
            throw new Error("No valid project data found in Zip.");
        } catch (err) {
            console.error("Failed to parse Zip:", err);
            throw err;
        }
    } else {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const json = JSON.parse(e.target?.result as string);
                    if (json && json.chapters) {
                        resolve({ state: json as unknown as INovelState, settings: json.settings });
                    } else {
                        reject(new Error("Invalid format."));
                    }
                } catch (err) { reject(err); }
            };
            reader.readAsText(file);
        });
    }
};