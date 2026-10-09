
import { createContext, useContext } from 'react';
import type { ICharacter, IChapter, ISnippet, Excerpt, SocialPost, IWorldItem, ChapterPacingInfo, Theme, RelationshipDataPoint } from '../../types';

export type SnippetSuggestion = {
    chapterId: string;
    confidence: 'High' | 'Medium' | 'Low';
    justification: string;
};

export interface AssemblyAIState {
    isGeneratingProfile: string | null; // character.id
    isGeneratingChapter: string | null; // chapter.id
    isGeneratingWorldItem: string | null; // worldItem.id
    isDistillingWorld: boolean;
    isGeneratingSnippets: boolean;
    isGeneratingMap: boolean;
    errorId: string | null; // The ID of the item that failed, or a category string
    errorMessage: string | null; // The human-readable error message
}

export interface AssemblyAIContextType extends AssemblyAIState {
    onGenerateProfile: (character: ICharacter, rawNotes: string) => Promise<void>;
    onUpdateProfile: (character: ICharacter, selectedChapterIds?: string[]) => Promise<void>;
    onGenerateChapterDetails: (chapter: IChapter, rawNotes: string) => Promise<void>;
    onUpdateChapterFromManuscript: (chapter: IChapter) => Promise<Partial<IChapter> | null>;
    onAnalyzeSnippets: (rawText: string, characters: ICharacter[]) => Promise<boolean>;
    onSuggestPlacement: (snippet: ISnippet, chapters: IChapter[]) => Promise<SnippetSuggestion[] | string>;
    onGenerateFullAnalysis: () => Promise<void>;
    onRegeneratePacingAndStructure: () => Promise<void>;
    onRegenerateCharacters: () => Promise<void>;
    onRegenerateOpportunities: () => Promise<void>;
    onGenerateRelationshipAnalysis: (character1Id: string, character2Id: string) => Promise<void>;
    onGenerateChekhovsGuns: () => Promise<void>;
    onGenerateThematicAnalysis: () => Promise<void>;
    onGenerateArcTest: (characterId: string) => Promise<void>;
    onGenerateFullSynopsis: () => Promise<void>;
    onRegenerateMarketAnalysis: () => Promise<void>;
    onRegeneratePromotionalContent: () => Promise<void>;
    onRegenerateSynopsis: () => Promise<void>;
    onGenerateSocialContent: (excerpt: Excerpt) => Promise<void>;
    onRegenerateImage: (imagePrompt: string, moodOnly: boolean, character?: ICharacter) => Promise<string | null>;
    onRegenerateTextAndHashtags: (excerpt: Excerpt, platform: 'instagram' | 'tiktok') => Promise<void>;
    onExtractExcerpts: (chapter: IChapter, allCharacters: ICharacter[]) => Promise<void>;
    onGeneratePostVariations: (post: SocialPost, excerpt: Excerpt, platform: 'instagram' | 'tiktok') => Promise<void>;
    onRefineWorldItem: (item: IWorldItem) => Promise<void>;
    onDistillWorldNotes: (crucibleText: string) => Promise<void>;
    onConsolidateWorldItem: (item: IWorldItem) => Promise<void>;
    onInitiateNarrativeArchitect: (premise: string, intent: string, genre: string, targetChapters: number) => Promise<void>;
    onExpandNarrativeArchitect: (feedback?: string) => Promise<void>;
    onApplyNarrativeArchitect: () => void;
    onSetError: (message: string | null, id?: string | null) => void;
    onGeneratePacingAnalysis: () => Promise<void>;
    onSuggestLocations: () => Promise<void>;
}

export const AssemblyAIContext = createContext<AssemblyAIContextType | undefined>(undefined);

export const useAssemblyAI = () => {
    const context = useContext(AssemblyAIContext);
    if (!context) {
        console.warn('useAssemblyAI was accessed outside AssemblyAIProvider; using fallback state.');
        return {
            isGeneratingProfile: null,
            isGeneratingChapter: null,
            isGeneratingWorldItem: null,
            isDistillingWorld: false,
            isGeneratingSnippets: false,
            isGeneratingMap: false,
            errorId: null,
            errorMessage: null,
            onGenerateProfile: async () => {},
            onUpdateProfile: async () => {},
            onGenerateChapterDetails: async () => {},
            onUpdateChapterFromManuscript: async () => null,
            onAnalyzeSnippets: async () => false,
            onSuggestPlacement: async () => [],
            onGenerateFullAnalysis: async () => {},
            onRegeneratePacingAndStructure: async () => {},
            onRegenerateCharacters: async () => {},
            onRegenerateOpportunities: async () => {},
            onGenerateRelationshipAnalysis: async () => {},
            onGenerateChekhovsGuns: async () => {},
            onGenerateThematicAnalysis: async () => {},
            onGenerateArcTest: async () => {},
            onGenerateFullSynopsis: async () => {},
            onRegenerateMarketAnalysis: async () => {},
            onRegeneratePromotionalContent: async () => {},
            onRegenerateSynopsis: async () => {},
            onGenerateSocialContent: async () => {},
            onRegenerateImage: async () => null,
            onRegenerateTextAndHashtags: async () => {},
            onExtractExcerpts: async () => {},
            onGeneratePostVariations: async () => {},
            onRefineWorldItem: async () => {},
            onDistillWorldNotes: async () => {},
            onConsolidateWorldItem: async () => {},
            onInitiateNarrativeArchitect: async () => {},
            onExpandNarrativeArchitect: async () => {},
            onApplyNarrativeArchitect: () => {},
            onSetError: () => {},
            onGeneratePacingAnalysis: async () => {},
            onSuggestLocations: async () => {},
        } as AssemblyAIContextType;
    }
    return context;
};
