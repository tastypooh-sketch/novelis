import React, { createContext, useReducer, useContext, Dispatch, ReactNode } from 'react';
import { produce } from 'immer';
import type { INovelState, ICharacter, IChapter, ISnippet, SocialMediaState, AssemblyPanel, Excerpt, AssemblyViewState, BrainstormHistory, SocialPost, PlotBrainstormState, SynopsisState, IWorldItem, ChekhovsGun, WhatIfState, IMapLocation, Shortcut } from './types';
import { generateId } from './utils/common';

// --- ACTION TYPES ---

export type Action =
  | { type: 'SET_CHAPTERS'; payload: IChapter[] }
  | { type: 'ADD_CHAPTER'; payload: Partial<IChapter> }
  | { type: 'UPDATE_CHAPTER'; payload: { id: string; updates: Partial<IChapter> } }
  | { type: 'DELETE_CHAPTER'; payload: string }
  | { type: 'SET_CHARACTERS'; payload: ICharacter[] }
  | { type: 'ADD_CHARACTER'; payload: Partial<ICharacter> }
  | { type: 'UPDATE_CHARACTER'; payload: { id: string; updates: Partial<ICharacter> } }
  | { type: 'DELETE_CHARACTER'; payload: string }
  | { type: 'SET_SNIPPETS'; payload: ISnippet[] }
  | { type: 'ADD_SNIPPETS'; payload: ISnippet[] }
  | { type: 'UPDATE_SNIPPET'; payload: { id: string; updates: Partial<ISnippet> } }
  | { type: 'DELETE_SNIPPET'; payload: string }
  | { type: 'SET_WORLD_ITEMS'; payload: IWorldItem[] }
  | { type: 'ADD_WORLD_ITEM'; payload: Partial<IWorldItem> }
  | { type: 'ADD_WORLD_ITEMS'; payload: IWorldItem[] }
  | { type: 'UPDATE_WORLD_ITEM'; payload: { id: string; updates: Partial<IWorldItem> } }
  | { type: 'DELETE_WORLD_ITEM'; payload: string }
  | { type: 'ADD_MAP_LOCATION'; payload: IMapLocation }
  | { type: 'UPDATE_MAP_LOCATION'; payload: { id: string; updates: Partial<IMapLocation> } }
  | { type: 'DELETE_MAP_LOCATION'; payload: string }
  | { type: 'SET_SHORTCUTS'; payload: Shortcut[] }
  | { type: 'UPDATE_GLOBAL_NOTES'; payload: string }
  | { type: 'UPDATE_SOCIAL_MEDIA_STATE'; payload: Partial<SocialMediaState> }
  | { type: 'INITIATE_SOCIAL_POST'; payload: { text: string; chapterId: string; characterIds: string[] } }
  | { type: 'ADD_AI_EXCERPTS'; payload: Omit<Excerpt, 'id' | 'type'>[] }
  | { type: 'SET_SOCIAL_CHAPTER'; payload: string | null }
  | { type: 'SET_ACTIVE_ASSEMBLY_PANEL'; payload: AssemblyPanel }
  | { type: 'UPDATE_ASSEMBLY_VIEW_STATE'; payload: Partial<AssemblyViewState> }
  | { type: 'UPDATE_MAP_STATE'; payload: Partial<AssemblyViewState['mapState']> }
  | { type: 'SET_PLOT_BRAINSTORM_STATE'; payload: Partial<PlotBrainstormState> }
  | { type: 'UPDATE_CHEKHOVS_GUN'; payload: { id: string, updates: Partial<ChekhovsGun> } }
  | { type: 'SET_SYNOPSIS_STATE'; payload: Partial<SynopsisState> }
  | { type: 'SET_POST_VARIATIONS'; payload: { variations: SocialPost[]; platform: 'instagram' | 'tiktok' } }
  | { type: 'CLEAR_POST_VARIATIONS' }
  | { type: 'UPDATE_WHAT_IF_STATE'; payload: Partial<WhatIfState> }
  | { type: 'APPLY_POST_VARIATION'; payload: SocialPost }
  | { type: 'LOAD_PROJECT'; payload: INovelState };


// --- INITIAL STATE ---

export const initialNovelState: INovelState = {
  characters: [{
    id: 'initial_char_1',
    name: 'New Character',
    photo: null,
    rawNotes: '',
    tagline: '',
    summary: '',
    profile: '',
    keywords: [],
    imageColor: '#6b7280',
    accentStyle: 'left-top-ingress',
    isPhotoLocked: false,
    isPrimary: false,
  }],
  chapters: [{
    id: 'initial_chap_1', 
    title: 'Chapter', 
    chapterNumber: 1, 
    content: '<div><br></div>', 
    notes: '',
    rawNotes: '',
    summary: '',
    outline: '',
    analysis: '',
    photo: null,
    imageColor: '#6b7280',
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
  }],
  snippets: [],
  worldItems: [],
  mapLocations: [],
  shortcuts: [
    // Punctuation & Typography
    { id: generateId(), key: '--', value: '—' },
    { id: generateId(), key: '...', value: '…' },
    { id: generateId(), key: '." he', value: '," he' },
    { id: generateId(), key: '." she', value: '," she' },
    { id: generateId(), key: '." I', value: '," I' },
    // Common Typos & Misspellings
    { id: generateId(), key: 'taht', value: 'that' },
    { id: generateId(), key: 'teh', value: 'the' },
    { id: generateId(), key: 'abd', value: 'and' },
    { id: generateId(), key: 'adn', value: 'and' },
    { id: generateId(), key: 'hvae', value: 'have' },
    { id: generateId(), key: 'wihout', value: 'without' },
    { id: generateId(), key: 'recieve', value: 'receive' },
    { id: generateId(), key: 'beleive', value: 'believe' },
    { id: generateId(), key: 'seperate', value: 'separate' },
    { id: generateId(), key: 'occured', value: 'occurred' },
    { id: generateId(), key: 'occurence', value: 'occurrence' },
    { id: generateId(), key: 'definately', value: 'definitely' },
    { id: generateId(), key: 'wierd', value: 'weird' },
    { id: generateId(), key: 'writting', value: 'writing' },
    { id: generateId(), key: 'lenth', value: 'length' },
    { id: generateId(), key: 'wich', value: 'which' },
    { id: generateId(), key: 'comming', value: 'coming' },
    { id: generateId(), key: 'tommorrow', value: 'tomorrow' },
    { id: generateId(), key: 'thier', value: 'their' },
    { id: generateId(), key: 'yuo', value: 'you' },
    // Contractions & Capitalization
    { id: generateId(), key: 'dont', value: "don't" },
    { id: generateId(), key: 'wont', value: "won't" },
    { id: generateId(), key: 'cant', value: "can't" },
    { id: generateId(), key: 'didnt', value: "didn't" },
    { id: generateId(), key: 'theyre', value: "they're" },
    { id: generateId(), key: 'i', value: 'I' },
    { id: generateId(), key: "i'm", value: "I'm" },
  ],
  globalNotes: 'This is where you can keep global notes for your entire project. They will be saved as part of your project file.',
  socialMediaState: {
    isLoading: false,
    error: null,
    selectedChapterId: null,
    excerpts: [],
    selectedExcerptId: null,
    generatedImagePrompt: null,
    generatedImageUrl: null,
    generatedInstagramPost: null,
    generatedTiktokPost: null,
    postVariations: null,
    variationPlatform: null,
  },
  activeAssemblyPanel: 'chapters',
  assemblyState: {
    selectedCharacterIds: [],
    selectedChapterIds: [],
    expandedCharacterId: null,
    expandedChapterId: null,
    isChapterLinkPanelOpen: false,
    // World Panel State
    worldPanelView: 'crucible',
    worldCrucibleText: '',
    expandedWorldItemId: null,
    pacingAnalysis: null,
    isGeneratingPacingAnalysis: false,
    mapState: {
        pan: { x: 0, y: 0 },
        zoom: 1,
    },
  },
  plotBrainstormState: {
    pacingAndStructureAnalysis: null,
    characterAnalysis: null,
    opportunityAnalysis: null,
    isGeneratingPacingAndStructure: false,
    isGeneratingCharacters: false,
    isGeneratingOpportunities: false,
    error: null,
    selectedCharacter1IdForRelationship: null,
    selectedCharacter2IdForRelationship: null,
    isGeneratingRelationshipAnalysis: false,
    relationshipAnalysis: null,
    isGeneratingThemes: false,
    thematicAnalysis: null,
    selectedTheme: null,
    isGeneratingChekhovsGuns: false,
    chekhovsGuns: null,
    selectedCharacterIdForArcTest: null,
    isGeneratingArcTest: false,
    arcTestResult: null,
  },
  synopsisState: {
    marketAnalysis: null,
    promotionalContent: null,
    synopsis: null,
    isGeneratingMarketAnalysis: false,
    isGeneratingPromotionalContent: false,
    isGeneratingSynopsis: false,
    error: null,
  },
  whatIfState: {
    isOpen: false,
    isLoading: false,
    originalText: null,
    suggestions: null,
    error: null,
    position: null,
  },
};


// --- REDUCER ---

const novelReducer = (state: INovelState, action: Action): INovelState => {
  return produce(state, draft => {
    switch (action.type) {
      case 'SET_CHAPTERS':
        draft.chapters = action.payload.map(ch => {
          const textOnly = (ch.content || '').replace(/<[^>]*>/g, ' ');
          ch.wordCount = textOnly.trim().split(/\s+/).filter(Boolean).length;
          return ch;
        });
        break;
      case 'ADD_CHAPTER': {
        const newChapter: IChapter = {
          id: generateId(),
          title: 'Chapter',
          chapterNumber: draft.chapters.length + 1,
          content: '<div><br></div>',
          notes: '',
          rawNotes: '',
          summary: '',
          outline: '',
          analysis: '',
          location: '',
          conflict: '',
          chapterGoal: '',
          wordCount: 0,
          ...action.payload,
        };
        const contentStr = newChapter.content || '';
        const textOnly = contentStr.replace(/<[^>]*>/g, ' ');
        newChapter.wordCount = textOnly.trim().split(/\s+/).filter(Boolean).length;
        draft.chapters.push(newChapter);
        break;
      }
      case 'UPDATE_CHAPTER': {
        const chapter = draft.chapters.find(c => c.id === action.payload.id);
        if (chapter) {
          Object.assign(chapter, action.payload.updates);
          if (action.payload.updates.content !== undefined) {
            const textOnly = chapter.content.replace(/<[^>]*>/g, ' ');
            chapter.wordCount = textOnly.trim().split(/\s+/).filter(Boolean).length;
          }
        }
        break;
      }
      case 'DELETE_CHAPTER': {
        draft.chapters = draft.chapters.filter(c => c.id !== action.payload);
        break;
      }
      case 'SET_CHARACTERS':
        draft.characters = action.payload;
        break;
      case 'ADD_CHARACTER': {
        const newCharacter: ICharacter = {
          id: generateId(),
          name: 'New Character',
          rawNotes: '',
          summary: '',
          profile: '',
          imageColor: '#6b7280',
          ...action.payload,
        };
        draft.characters.push(newCharacter);
        break;
      }
      case 'UPDATE_CHARACTER': {
        const character = draft.characters.find(c => c.id === action.payload.id);
        if (character) {
          Object.assign(character, action.payload.updates);
        }
        break;
      }
      case 'DELETE_CHARACTER': {
        draft.characters = draft.characters.filter(c => c.id !== action.payload);
        break;
      }
      case 'SET_SNIPPETS':
        draft.snippets = action.payload;
        break;
      case 'ADD_SNIPPETS':
        draft.snippets.push(...action.payload);
        break;
      case 'UPDATE_SNIPPET': {
        const snippet = draft.snippets.find(s => s.id === action.payload.id);
        if (snippet) {
          Object.assign(snippet, action.payload.updates);
        }
        break;
      }
      case 'DELETE_SNIPPET': {
        draft.snippets = draft.snippets.filter(s => s.id !== action.payload);
        // Also remove from any chapters it was linked to
        draft.chapters.forEach(chapter => {
            if (chapter.linkedSnippetIds) {
                chapter.linkedSnippetIds = chapter.linkedSnippetIds.filter(id => id !== action.payload);
            }
        });
        break;
      }
      case 'SET_WORLD_ITEMS':
        draft.worldItems = action.payload;
        break;
      case 'ADD_WORLD_ITEM': {
        const newItem: IWorldItem = {
          id: generateId(),
          name: 'New World Item',
          type: 'Concept',
          rawNotes: '',
          summary: '',
          description: '',
          imageColor: '#6b7280',
          ...action.payload,
        };
        draft.worldItems.unshift(newItem);
        break;
      }
       case 'ADD_WORLD_ITEMS': {
        draft.worldItems.push(...action.payload);
        break;
      }
      case 'UPDATE_WORLD_ITEM': {
        const item = draft.worldItems.find(i => i.id === action.payload.id);
        if (item) {
          Object.assign(item, action.payload.updates);
        }
        break;
      }
      case 'DELETE_WORLD_ITEM': {
        draft.worldItems = draft.worldItems.filter(i => i.id !== action.payload);
        break;
      }
      case 'ADD_MAP_LOCATION':
        draft.mapLocations.push(action.payload);
        break;
      case 'UPDATE_MAP_LOCATION': {
        const location = draft.mapLocations.find(l => l.id === action.payload.id);
        if (location) {
          Object.assign(location, action.payload.updates);
        }
        break;
      }
      case 'DELETE_MAP_LOCATION':
        draft.mapLocations = draft.mapLocations.filter(l => l.id !== action.payload);
        break;
      case 'SET_SHORTCUTS':
        draft.shortcuts = action.payload;
        break;
      case 'UPDATE_GLOBAL_NOTES': {
        draft.globalNotes = action.payload;
        break;
      }
      case 'UPDATE_SOCIAL_MEDIA_STATE':
        if (!action.payload.error) {
            draft.socialMediaState.error = null;
        }
        Object.assign(draft.socialMediaState, action.payload);
        break;
      case 'INITIATE_SOCIAL_POST': {
        const newExcerpt: Excerpt = {
            id: generateId(),
            text: action.payload.text,
            chapterId: action.payload.chapterId,
            characterIds: action.payload.characterIds,
            type: 'user',
        };
        const alreadyExists = draft.socialMediaState.excerpts.some(e => e.text === newExcerpt.text);
        if (!alreadyExists) {
            draft.socialMediaState.excerpts.unshift(newExcerpt);
        }
        break;
      }
      case 'SET_SOCIAL_CHAPTER':
        draft.socialMediaState.selectedChapterId = action.payload;
        // Keep user-sent excerpts, clear AI ones
        draft.socialMediaState.excerpts = draft.socialMediaState.excerpts.filter(e => e.type === 'user');
        break;
      case 'ADD_AI_EXCERPTS': {
        const existingAiExcerpts = new Set(draft.socialMediaState.excerpts.filter(e => e.type === 'ai').map(e => e.text));
        const newExcerpts = action.payload
            .filter(e => !existingAiExcerpts.has(e.text))
            .map(e => ({
                ...e,
                id: generateId(),
                type: 'ai' as const,
            }));
        draft.socialMediaState.excerpts.push(...newExcerpts);
        break;
      }
      case 'SET_ACTIVE_ASSEMBLY_PANEL':
        draft.activeAssemblyPanel = action.payload;
        break;
      case 'UPDATE_ASSEMBLY_VIEW_STATE':
        Object.assign(draft.assemblyState, action.payload);
        break;
      case 'UPDATE_MAP_STATE':
        draft.assemblyState.mapState = { ...draft.assemblyState.mapState, ...action.payload };
        break;
      case 'SET_PLOT_BRAINSTORM_STATE':
        Object.assign(draft.plotBrainstormState, action.payload);
        break;
      case 'UPDATE_CHEKHOVS_GUN': {
        const gun = draft.plotBrainstormState.chekhovsGuns?.find(g => g.id === action.payload.id);
        if (gun) {
            Object.assign(gun, action.payload.updates);
        }
        break;
      }
      case 'SET_SYNOPSIS_STATE':
        Object.assign(draft.synopsisState, action.payload);
        break;
      case 'SET_POST_VARIATIONS':
        draft.socialMediaState.postVariations = action.payload.variations;
        draft.socialMediaState.variationPlatform = action.payload.platform;
        break;
      case 'CLEAR_POST_VARIATIONS':
        draft.socialMediaState.postVariations = null;
        draft.socialMediaState.variationPlatform = null;
        break;
      case 'UPDATE_WHAT_IF_STATE':
        Object.assign(draft.whatIfState, action.payload);
        break;
      case 'APPLY_POST_VARIATION':
        if (draft.socialMediaState.variationPlatform === 'instagram') {
            draft.socialMediaState.generatedInstagramPost = action.payload;
        } else if (draft.socialMediaState.variationPlatform === 'tiktok') {
            draft.socialMediaState.generatedTiktokPost = action.payload;
        }
        draft.socialMediaState.postVariations = null;
        draft.socialMediaState.variationPlatform = null;
        break;
      case 'LOAD_PROJECT': {
        const loadedState = action.payload;
        if (loadedState && loadedState.chapters) {
          loadedState.chapters = loadedState.chapters.map(ch => {
            const textOnly = (ch.content || '').replace(/<[^>]*>/g, ' ');
            ch.wordCount = textOnly.trim().split(/\s+/).filter(Boolean).length;
            return ch;
          });
        }
        return loadedState;
      }
    }
  });
};

// --- CONTEXT ---

const NovelStateContext = createContext<INovelState | undefined>(undefined);
const NovelDispatchContext = createContext<Dispatch<Action> | undefined>(undefined);

// --- PROVIDER ---

export const NovelProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(novelReducer, initialNovelState);

  return (
    <NovelStateContext.Provider value={state}>
      <NovelDispatchContext.Provider value={dispatch}>
        {children}
      </NovelDispatchContext.Provider>
    </NovelStateContext.Provider>
  );
};

// --- HOOKS ---

export const useNovelState = () => {
  const context = useContext(NovelStateContext);
  if (context === undefined) {
    throw new Error('useNovelState must be used within a NovelProvider');
  }
  return context;
};

export const useNovelDispatch = () => {
  const context = useContext(NovelDispatchContext);
  if (context === undefined) {
    throw new Error('useNovelDispatch must be used within a NovelProvider');
  }
  return context;
};
