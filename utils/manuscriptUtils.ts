import { Packer, Document, Paragraph, TextRun, HeadingLevel, ImageRun, AlignmentType, ExternalHyperlink } from 'docx';
import JSZip from 'jszip';
import type { IChapter, INovelState, EditorSettings, ICharacter, ISnippet, WritingGoals } from '../types';
import { generateNoveHTML } from './noveGenerator';
import { initialNovelState } from '../NovelContext';

// --- ZIP PROTOCOL UTILS ---

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const generateTimestampedName = (projectName: string, isNove: boolean = false): string => {
    const baseName = projectName.trim() || 'Novelis';
    // Allow spaces, hyphens, and alphanumeric
    const cleanName = baseName.replace(/[^a-z0-9\s-]/gi, '_').substring(0, 40);
    const now = new Date();
    
    const dd = String(now.getDate()).padStart(2, '0');
    const mon = MONTH_NAMES[now.getMonth()];
    const yy = String(now.getFullYear()).slice(-2);
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    
    const timestamp = `${dd}-${mon}-${yy} ${hh}-${min}`;
    const prefix = isNove ? 'Nove ' : '';
    
    return `${prefix}${cleanName} ${timestamp}.zip`;
};

export const parseTimestampFromFilename = (filename: string): Date | null => {
    // Matches the new format: [Prefix] Project Name DD-Mon-YY HH-mm.zip
    const regexNewest = /(?:Nove )?(.+?)\s(\d{2})-([A-Za-z]{3})-(\d{2})\s(\d{2})-(\d{2})\.zip$/;
    // Matches YYYYMMDD_HHMMSS
    const regexNew = /_(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})\.zip$/;
    // Matches older DD_MMM_HH_MM
    const regexOld = /_(\d{2})_([A-Za-z]{3})_(\d{2})_(\d{2})\.zip$/;
    // Matches the previously broken format: DD-Mth-YY HH:mm
    const regexBroken = /\s(\d{2})-([A-Za-z]{3})-(\d{2})\s(\d{2}):(\d{2})\.zip$/;
    
    const matchNewest = filename.match(regexNewest);
    if (matchNewest) {
        const [_, name, d, mon, y, hh, mm] = matchNewest;
        const monthIndex = MONTH_NAMES.findIndex(m => m.toLowerCase() === mon.toLowerCase());
        if (monthIndex !== -1) {
            const fullYear = 2000 + parseInt(y);
            return new Date(fullYear, monthIndex, parseInt(d), parseInt(hh), parseInt(mm));
        }
    }

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

    const matchBroken = filename.match(regexBroken);
    if (matchBroken) {
        const [_, d, mth, y, hh, mm] = matchBroken;
        const monthIndex = MONTH_NAMES.findIndex(m => m.toLowerCase() === mth.toLowerCase());
        if (monthIndex !== -1) {
            const fullYear = 2000 + parseInt(y);
            return new Date(fullYear, monthIndex, parseInt(d), parseInt(hh), parseInt(mm));
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

        // Add Assembly.rtf
        const assemblyRtf = generateAssemblyRtf(state);
        rtfFolder.file("Assembly.rtf", assemblyRtf);
    }

    return await zip.generateAsync({ type: "blob" });
};

export const generateAssemblyRtf = (state: INovelState): string => {
    const header = `{\\rtf1\\ansi\\ansicpg1252\\deff0\\nouicompat\\deflang1033`;
    const fontTbl = `{\\fonttbl{\\f0\\fnil\\fcharset0 Times New Roman;}}`;
    const styles = `\\viewkind4\\uc1\\pard\\sa200\\sl276\\slmult1\\f0\\fs24`;

    let rtf = `${header}\n${fontTbl}\n${styles}\n`;

    const addTitle = (text: string) => {
        rtf += `{\\pard\\qc\\b\\fs48 ${escapeRtfText(text)}\\par\\par}`;
    };

    const addHeading = (text: string) => {
        rtf += `{\\pard\\b\\fs32 ${escapeRtfText(text)}\\par}`;
    };

    const addSubheading = (text: string) => {
        rtf += `{\\pard\\b\\fs28 ${escapeRtfText(text)}\\par}`;
    };

    const addText = (text: string | null | undefined) => {
        if (!text) return;
        // Basic conversion of line breaks to RTF line breaks
        const escaped = escapeRtfText(text).replace(/\n/g, '\\line ');
        rtf += `{\\pard ${escaped}\\par\\par}`;
    };

    const addLabelValue = (label: string, value: string | null | undefined) => {
        if (!value) return;
        rtf += `{\\pard\\b ${escapeRtfText(label)}: } ${escapeRtfText(value)}\\par`;
    };

    const addSeparator = () => {
        rtf += `{\\pard\\qc — — — — — — — — — — — — — — — — — — — — — —\\par\\par}`;
    };

    addTitle("NOVELIS ASSEMBLY BINDER");
    rtf += `{\\pard\\qc Exported on ${new Date().toLocaleDateString()}\\par\\par}`;

    // 1. SYNOPSIS & MARKETING
    addHeading("1. SYNOPSIS & MARKETING");
    addLabelValue("Market Analysis", state.synopsisState.marketAnalysis);
    addLabelValue("Promotional Content", state.synopsisState.promotionalContent);
    addLabelValue("Synopsis", state.synopsisState.synopsis);
    addSeparator();

    // 2. PLOT & BRAINSTORMING
    addHeading("2. PLOT & BRAINSTORMING");
    if (state.plotBrainstormState.pacingAndStructureAnalysis) {
        addSubheading("Pacing & Structure Analysis");
        addText(state.plotBrainstormState.pacingAndStructureAnalysis.summary);
        if (state.plotBrainstormState.pacingAndStructureAnalysis.plotPoints.length > 0) {
            state.plotBrainstormState.pacingAndStructureAnalysis.plotPoints.forEach(p => {
                addLabelValue(`Plot Point (${p.type})`, `${p.title}: ${p.description}`);
            });
        }
    }
    addLabelValue("Character Analysis", state.plotBrainstormState.characterAnalysis);
    addLabelValue("Opportunity Analysis", state.plotBrainstormState.opportunityAnalysis);

    addSubheading("Narrative Architect");
    addLabelValue("Premise", state.plotBrainstormState.narrativeArchitect.premise);
    addLabelValue("Intent", state.plotBrainstormState.narrativeArchitect.intent);
    addLabelValue("Genre", state.plotBrainstormState.narrativeArchitect.genre);
    if (state.plotBrainstormState.narrativeArchitect.chapters.length > 0) {
        state.plotBrainstormState.narrativeArchitect.chapters.forEach(ch => {
            addLabelValue(`Architect Ch ${ch.act}`, `${ch.title}: ${ch.summary}`);
        });
    }

    if (state.plotBrainstormState.chekhovsGuns && state.plotBrainstormState.chekhovsGuns.length > 0) {
        addSubheading("Chekhov's Guns");
        state.plotBrainstormState.chekhovsGuns.forEach(g => {
            addLabelValue(g.item, `Introduced Ch ${g.chapterIntroduced}: ${g.significance} (${g.isResolved ? 'Resolved' : 'Pending'})`);
        });
    }

    if (state.plotBrainstormState.thematicAnalysis) {
        addSubheading("Thematic Analysis");
        addText(state.plotBrainstormState.thematicAnalysis.summary);
        state.plotBrainstormState.thematicAnalysis.themes.forEach(t => {
            addLabelValue(`Theme: ${t.name}`, t.description);
        });
    }

    if (state.plotBrainstormState.relationshipAnalysis) {
        addSubheading("Relationship Analysis");
        addText(state.plotBrainstormState.relationshipAnalysis.analysisText);
    }
    addSeparator();

    // 3. CHARACTERS
    addHeading("3. CHARACTERS");
    state.characters.forEach(char => {
        addSubheading(char.name);
        if (char.tagline) addLabelValue("Tagline", char.tagline);
        if (char.keywords) addLabelValue("Keywords", char.keywords.join(", "));
        if (char.summary) addLabelValue("Summary", char.summary);
        if (char.voice) addLabelValue("Voice", char.voice);
        if (char.profile) {
            rtf += `{\\pard\\b Profile:}\\par`;
            addText(char.profile);
        }
        if (char.relationships && char.relationships.length > 0) {
            rtf += `{\\pard\\b Relationships:}\\par`;
            char.relationships.forEach(rel => {
                const otherChar = state.characters.find(c => c.id === rel.characterId);
                addLabelValue(otherChar ? otherChar.name : "Unknown", rel.description);
            });
        }
        rtf += `\\par`;
    });
    addSeparator();

    // 4. WORLD BUILDING
    addHeading("4. WORLD BUILDING");
    state.worldItems.forEach(item => {
        addSubheading(`${item.name} (${item.type})`);
        if (item.tagline) addLabelValue("Tagline", item.tagline);
        if (item.summary) addLabelValue("Summary", item.summary);
        if (item.description) {
            rtf += `{\\pard\\b Description:}\\par`;
            addText(item.description);
        }
        if (item.keywords) addLabelValue("Keywords", item.keywords.join(", "));
        rtf += `\\par`;
    });
    addSeparator();

    // 5. CHAPTER METADATA
    addHeading("5. CHAPTER PLANNING DATA");
    state.chapters.forEach(ch => {
        addSubheading(`Chapter ${ch.chapterNumber}: ${ch.title}`);
        if (ch.tagline) addLabelValue("Tagline", ch.tagline);
        if (ch.keywords) addLabelValue("Keywords", ch.keywords.join(", "));
        if (ch.summary) addLabelValue("Summary", ch.summary);
        if (ch.outline) {
            rtf += `{\\pard\\b Outline:}\\par`;
            addText(ch.outline);
        }
        if (ch.conflict) addLabelValue("Conflict", ch.conflict);
        if (ch.chapterGoal) addLabelValue("Goal", ch.chapterGoal);
        if (ch.location) addLabelValue("Location", ch.location);
        
        // --- SPREADSHEET FIELDS ---
        if (ch.storyEvent) addLabelValue("Story Event", ch.storyEvent);
        if (ch.storyEventSummary) addLabelValue("Event Summary", ch.storyEventSummary);
        if (ch.quadrant) addLabelValue("Quadrant", ch.quadrant);
        if (ch.convention) addLabelValue("Convention", ch.convention);
        if (ch.incitingIncident) addLabelValue("Inciting Incident", ch.incitingIncident);
        if (ch.progressiveComplication) addLabelValue("Prog. Complication", ch.progressiveComplication);
        if (ch.crisis) addLabelValue("Crisis", ch.crisis);
        if (ch.climax) addLabelValue("Climax", ch.climax);
        if (ch.resolution) addLabelValue("Resolution", ch.resolution);
        if (ch.valueLevels) addLabelValue("Value Levels", ch.valueLevels);
        if (ch.tropeSceneType) addLabelValue("Trope/Scene Type", ch.tropeSceneType);
        if (ch.polarity) addLabelValue("Polarity", ch.polarity);
        if (ch.turningPointCategory) addLabelValue("Turning Point Cat", ch.turningPointCategory);
        if (ch.turningPointSummary) addLabelValue("Turning Point Summary", ch.turningPointSummary);
        if (ch.pov) addLabelValue("POV", ch.pov);
        if (ch.periodTime) addLabelValue("Time/Period", ch.periodTime);
        if (ch.duration) addLabelValue("Duration", ch.duration);

        rtf += `\\par`;
    });
    addSeparator();

    // 6. SNIPPETS
    addHeading("6. SNIPPETS & BRAINSTORMING");
    if (state.globalNotes) {
        addSubheading("Global Notes");
        addText(state.globalNotes);
    }
    
    if (state.snippets.length > 0) {
        addSubheading("Snippets Collection");
        state.snippets.forEach(s => {
            addLabelValue(s.type, s.cleanedText);
        });
    }

    // 7. SOCIAL MEDIA POSTS
    if (state.socialMediaState.generatedInstagramPost || state.socialMediaState.generatedTiktokPost || (state.socialMediaState.postVariations && state.socialMediaState.postVariations.length > 0)) {
        addSeparator();
        addHeading("7. SOCIAL MEDIA & PROMOTION");
        if (state.socialMediaState.generatedInstagramPost) {
            addSubheading("Instagram Post");
            addText(state.socialMediaState.generatedInstagramPost.text);
            addLabelValue("Hashtags", state.socialMediaState.generatedInstagramPost.hashtags.join(" "));
        }
        if (state.socialMediaState.generatedTiktokPost) {
            addSubheading("TikTok Post");
            addText(state.socialMediaState.generatedTiktokPost.text);
            addLabelValue("Hashtags", state.socialMediaState.generatedTiktokPost.hashtags.join(" "));
        }
        if (state.socialMediaState.postVariations && state.socialMediaState.postVariations.length > 0) {
            addSubheading(`Post Variations (${state.socialMediaState.variationPlatform || 'General'})`);
            state.socialMediaState.postVariations.forEach((v, i) => {
                addLabelValue(`Variation ${i+1}`, v.text);
                addLabelValue("Hashtags", v.hashtags.join(" "));
            });
        }
    }

    // 8. LOCKED CHEST
    if (state.lockedChest && state.lockedChest.length > 0) {
        addSeparator();
        addHeading("8. LOCKED CHEST (SCRATCHPAD)");
        
        // Group by modalId
        const groups: Record<string, typeof state.lockedChest> = {};
        state.lockedChest.forEach(item => {
            if (!groups[item.modalId]) groups[item.modalId] = [];
            groups[item.modalId].push(item);
        });

        Object.entries(groups).forEach(([modalId, items]) => {
            const displayName = modalId.charAt(0).toUpperCase() + modalId.slice(1).replace(/-/g, ' ');
            addSubheading(`From ${displayName}`);
            items.forEach(item => {
                rtf += `{\\pard\\b [${escapeRtfText(item.tag)}]}\\par`;
                addText(item.content);
                rtf += `{\\pard\\fs18 Added on ${new Date(item.timestamp).toLocaleString()}\\par\\par}`;
            });
        });
    }

    rtf += `\n}`;
    return rtf;
};

// --- NOVE EXPORT UTILS ---

export const exportStandaloneNove = async (fullState: INovelState, settings: EditorSettings, writingGoals: WritingGoals) => {
    const favicon = await getFaviconBase64();
    // Strip Assembly data for the portable Nove.html export
    const liteState: INovelState = {
        ...initialNovelState,
        chapters: fullState.chapters,
        shortcuts: fullState.shortcuts,
        globalNotes: fullState.globalNotes,
        // Keep these empty or as initial to respect "only a word processor"
        characters: [],
        worldItems: [],
        snippets: [],
        plotBrainstormState: initialNovelState.plotBrainstormState,
        synopsisState: initialNovelState.synopsisState,
    };
    const noveHtml = generateNoveHTML(liteState, settings, writingGoals, favicon);
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

    // 1. Generate Standalone Application HTML (Lite state, word processor only)
    const liteState: INovelState = {
        ...initialNovelState,
        chapters: fullState.chapters,
        shortcuts: fullState.shortcuts,
        globalNotes: fullState.globalNotes,
        characters: [],
        worldItems: [],
        snippets: [],
    };
    const noveHtml = generateNoveHTML(liteState, settings, writingGoals, favicon);
    zip.file("Nové.html", noveHtml);

    // 2. Add raw data files (FULL state for sync/backup purposes)
    const projectData = zip.folder("Project_Data");
    if (projectData) {
        const initialBackup = await createProjectZip(fullState, settings);
        const name = generateTimestampedName(settings.bookTitle || "Nové_Export");
        projectData.file(name, initialBackup);
    }

    const content = await zip.generateAsync({ type: "blob" });
    const filename = generateTimestampedName(settings.bookTitle || "Novelis", true);
    
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
            if ((window as any).novelis) {
                (window as any).novelis.error("Failed to save via Electron dialog.", "System Error");
            } else {
                console.error("Failed to save via Electron dialog.");
            }
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
        const chapterTitleText = `${chapter.chapterNumber}. ${chapter.title}`;
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
    let html = `<div><strong>[ CHAPTER BRIEFING: ${escapeHtml(chapter.title)} ]</strong></div>`;
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

export const generateSpreadsheetCSV = (chapters: IChapter[]): string => {
    const headers = [
        'Chapter',
        'Title',
        'Story Event',
        'Story Event Summary',
        'Quadrant',
        'Convention',
        'Inciting Incident',
        'Progressive Complication',
        'Crisis',
        'Climax',
        'Resolution',
        'Value Levels',
        'Trope Scene Type',
        'Polarity',
        'Turning Point Category',
        'Turning Point Summary',
        'POV',
        'Period Time',
        'Duration',
        'Location',
        'Word Count'
    ];

    const escapeCSV = (text: string | undefined | null) => {
        if (!text) return '""';
        const str = String(text).replace(/"/g, '""');
        return `"${str}"`;
    };

    const rows = chapters.map(ch => [
        ch.chapterNumber,
        escapeCSV(ch.title),
        escapeCSV(ch.storyEvent),
        escapeCSV(ch.storyEventSummary),
        escapeCSV(ch.quadrant),
        escapeCSV(ch.convention),
        escapeCSV(ch.incitingIncident),
        escapeCSV(ch.progressiveComplication),
        escapeCSV(ch.crisis),
        escapeCSV(ch.climax),
        escapeCSV(ch.resolution),
        escapeCSV(ch.valueLevels),
        escapeCSV(ch.tropeSceneType),
        escapeCSV(ch.polarity),
        escapeCSV(ch.turningPointCategory),
        escapeCSV(ch.turningPointSummary),
        escapeCSV(ch.pov),
        escapeCSV(ch.periodTime),
        escapeCSV(ch.duration),
        escapeCSV(ch.location),
        ch.wordCount || 0
    ]);

    return [
        headers.join(','),
        ...rows.map(row => row.join(','))
    ].join('\n');
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
        const binString = atob(str);
        const bytes = Uint8Array.from(binString, (m) => m.codePointAt(0)!);
        return JSON.parse(new TextDecoder().decode(bytes));
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
            
            const allFiles = Object.keys(content.files);
            
            // 1. Search for project_data.json or nove_data.json at the root or nearby
            // We prioritize the root level to avoid deep scanning if possible
            let jsonFileKey = allFiles.find(f => f === 'project_data.json' || f === 'nove_data.json') ||
                              allFiles.find(f => f.endsWith('/project_data.json') || f.endsWith('/nove_data.json'));
            
            // 2. If not found, look for ANY json that looks like a project, but limit the search
            if (!jsonFileKey) {
                // Only scan top-level or second-level JSONs to avoid massive node_modules scans
                const likelyFiles = allFiles.filter(f => f.endsWith('.json') && f.split('/').length <= 3);
                for (const key of likelyFiles) {
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
