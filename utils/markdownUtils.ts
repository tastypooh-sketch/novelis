
import { IChapter } from '../types';
import { generateId } from './common';

export const exportChaptersToMarkdown = (chapters: IChapter[]): string => {
    return chapters.map(ch => {
        // Convert simple HTML to plain text/markdown
        const content = ch.content
            .replace(/<div><br><\/div>/g, '\n')
            .replace(/<div>/g, '')
            .replace(/<\/div>/g, '\n')
            .replace(/<p>/g, '')
            .replace(/<\/p>/g, '\n')
            .replace(/<br\s*\/?>/g, '\n')
            .replace(/&nbsp;/g, ' ')
            .trim();

        const metadata = [
            `title: "${ch.title.replace(/"/g, '\\"')}"`,
            `chapterNumber: ${ch.chapterNumber}`,
            ch.tagline ? `tagline: "${ch.tagline.replace(/"/g, '\\"')}"` : null,
            ch.keywords && ch.keywords.length > 0 ? `keywords: [${ch.keywords.map(k => `"${k.replace(/"/g, '\\"')}"`).join(', ')}]` : null,
            ch.summary ? `summary: |\n  ${ch.summary.replace(/\n/g, '\n  ')}` : null,
            ch.location ? `location: "${ch.location.replace(/"/g, '\\"')}"` : null,
            ch.conflict ? `conflict: "${ch.conflict.replace(/"/g, '\\"')}"` : null,
            ch.chapterGoal ? `goal: "${ch.chapterGoal.replace(/"/g, '\\"')}"` : null,
            // Spreadsheet fields
            ch.storyEvent ? `storyEvent: "${ch.storyEvent.replace(/"/g, '\\"')}"` : null,
            ch.quadrant ? `quadrant: "${ch.quadrant.replace(/"/g, '\\"')}"` : null,
            ch.pov ? `pov: "${ch.pov.replace(/"/g, '\\"')}"` : null,
        ].filter(Boolean).join('\n');

        return `---\n${metadata}\n---\n\n# ${ch.title}\n<!-- ID: ${ch.id} -->\n\n${content}`;
    }).join('\n\n---\n\n');
};

export const importChaptersFromMarkdown = (markdown: string, existingChapters: IChapter[]): IChapter[] => {
    // Split by horizontal rule separator if present, otherwise try to split by # Chapter headers
    const segments = markdown.split(/\n---\n/);
    
    const newChapters: IChapter[] = [];
    
    segments.forEach((segment, index) => {
        const titleMatch = segment.match(/^#\s+(.+)$/m);
        const idMatch = segment.match(/<!--\s*ID:\s*([a-zA-Z0-9_-]+)\s*-->/);
        
        let title = titleMatch ? titleMatch[1].trim() : `Chapter ${index + 1}`;
        let id = idMatch ? idMatch[1] : generateId();
        
        // Remove header and metadata lines from content
        let content = segment
            .replace(/^#\s+.+$/m, '')
            .replace(/<!--\s*ID:\s*[a-zA-Z0-9_-]+\s*-->/, '')
            .trim();

        // Convert back to simple HTML structure used in the app
        const htmlContent = content.split('\n').map(line => {
            if (line.trim() === '') return '<div><br></div>';
            return `<div>${line}</div>`;
        }).join('');

        const existing = existingChapters.find(c => c.id === id);
        
        if (existing) {
            newChapters.push({
                ...existing,
                title,
                content: htmlContent,
                chapterNumber: index + 1
            });
        } else {
            // New chapter if ID doesn't match
            newChapters.push({
                id,
                title,
                content: htmlContent,
                chapterNumber: index + 1,
                notes: '',
                rawNotes: '',
                summary: '',
                outline: '',
                analysis: '',
                photo: null,
                imageColor: undefined,
                isPhotoLocked: false,
                tagline: '',
                keywords: [],
                location: '',
                conflict: '',
                chapterGoal: '',
                accentStyle: 'left-top-ingress',
                linkedSnippetIds: [],
                betaFeedback: '',
                betaFeedbackSummary: '',
                wordCount: 0,
            });
        }
    });

    return newChapters;
};
