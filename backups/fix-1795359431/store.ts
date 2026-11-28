'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type TabId =
  | 'home'
  | 'subjects'
  | 'library'
  | 'announcements'
  | 'tools'
  | 'notes'
  | 'assistant'
  | 'feedback'
  | 'about';

export interface Note {
  id: string;
  title: string;
  content: string;
  category: string; // subject title or 'عام'
  color: string; // hex
  pinned: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface TodoItem {
  id: string;
  text: string;
  subject?: string;
  done: boolean;
  priority: 'low' | 'medium' | 'high';
  dueDate?: string; // ISO date
  createdAt: number;
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  subject: string;
  mastery: 0 | 1 | 2 | 3; // 0=new, 3=mastered
  createdAt: number;
}

export interface StudySession {
  id: string;
  subject: string;
  minutes: number;
  date: string; // ISO date
  createdAt: number;
}

export interface QuizResult {
  id: string;
  subject: string;
  total: number;
  correct: number;
  date: number;
}

export interface DictTerm {
  id: string;
  term: string;
  definition: string;
  example?: string;
  category: string;
  custom: boolean;
  createdAt: number;
}

interface PlatformState {
  activeTab: TabId;
  setActiveTab: (t: TabId) => void;

  // subject browser
  selectedCategory: string;
  selectedSubjectId: string | null;
  setSelectedCategory: (c: string) => void;
  setSelectedSubject: (id: string | null) => void;

  // favorites & recent
  favorites: string[]; // file urls
  recents: { url: string; label: string; subjectTitle: string; type: string; ts: number }[];
  toggleFavorite: (url: string) => void;
  isFavorite: (url: string) => boolean;
  addRecent: (r: { url: string; label: string; subjectTitle: string; type: string }) => void;

  // notes
  notes: Note[];
  addNote: (n: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateNote: (id: string, patch: Partial<Note>) => void;
  deleteNote: (id: string) => void;

  // todos
  todos: TodoItem[];
  addTodo: (t: Omit<TodoItem, 'id' | 'createdAt'>) => void;
  updateTodo: (id: string, patch: Partial<TodoItem>) => void;
  deleteTodo: (id: string) => void;

  // flashcards
  flashcards: Flashcard[];
  addFlashcard: (f: Omit<Flashcard, 'id' | 'createdAt'>) => void;
  updateFlashcard: (id: string, patch: Partial<Flashcard>) => void;
  deleteFlashcard: (id: string) => void;

  // study sessions
  sessions: StudySession[];
  addSession: (s: Omit<StudySession, 'id' | 'createdAt'>) => void;

  // quiz results
  quizResults: QuizResult[];
  addQuizResult: (r: Omit<QuizResult, 'id' | 'date'>) => void;

  // dictionary
  terms: DictTerm[];
  addTerm: (t: Omit<DictTerm, 'id' | 'createdAt' | 'custom'>) => void;
  deleteTerm: (id: string) => void;

  // active tool
  activeTool: string | null;
  setActiveTool: (t: string | null) => void;
}

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

export const usePlatformStore = create<PlatformState>()(
  persist(
    (set, get) => ({
      activeTab: 'home',
      setActiveTab: (t) => set({ activeTab: t }),

      selectedCategory: 'college',
      selectedSubjectId: null,
      setSelectedCategory: (c) => set({ selectedCategory: c, selectedSubjectId: null }),
      setSelectedSubject: (id) => set({ selectedSubjectId: id }),

      favorites: [],
      recents: [],
      toggleFavorite: (url) =>
        set((s) => ({
          favorites: s.favorites.includes(url)
            ? s.favorites.filter((f) => f !== url)
            : [...s.favorites, url],
        })),
      isFavorite: (url) => get().favorites.includes(url),
      addRecent: (r) =>
        set((s) => ({
          recents: [
            { ...r, ts: Date.now() },
            ...s.recents.filter((x) => x.url !== r.url),
          ].slice(0, 30),
        })),

      notes: [],
      addNote: (n) =>
        set((s) => ({
          notes: [{ ...n, id: uid(), createdAt: Date.now(), updatedAt: Date.now() }, ...s.notes],
        })),
      updateNote: (id, patch) =>
        set((s) => ({
          notes: s.notes.map((n) =>
            n.id === id ? { ...n, ...patch, updatedAt: Date.now() } : n
          ),
        })),
      deleteNote: (id) => set((s) => ({ notes: s.notes.filter((n) => n.id !== id) })),

      todos: [],
      addTodo: (t) =>
        set((s) => ({ todos: [{ ...t, id: uid(), createdAt: Date.now() }, ...s.todos] })),
      updateTodo: (id, patch) =>
        set((s) => ({ todos: s.todos.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),
      deleteTodo: (id) => set((s) => ({ todos: s.todos.filter((t) => t.id !== id) })),

      flashcards: [],
      addFlashcard: (f) =>
        set((s) => ({ flashcards: [{ ...f, id: uid(), createdAt: Date.now() }, ...s.flashcards] })),
      updateFlashcard: (id, patch) =>
        set((s) => ({ flashcards: s.flashcards.map((f) => (f.id === id ? { ...f, ...patch } : f)) })),
      deleteFlashcard: (id) => set((s) => ({ flashcards: s.flashcards.filter((f) => f.id !== id) })),

      sessions: [],
      addSession: (s) =>
        set((st) => ({ sessions: [{ ...s, id: uid(), createdAt: Date.now() }, ...st.sessions] })),

      quizResults: [],
      addQuizResult: (r) =>
        set((s) => ({ quizResults: [{ ...r, id: uid(), date: Date.now() }, ...s.quizResults] })),

      terms: [],
      addTerm: (t) =>
        set((s) => ({ terms: [{ ...t, id: uid(), createdAt: Date.now(), custom: true }, ...s.terms] })),
      deleteTerm: (id) => set((s) => ({ terms: s.terms.filter((t) => t.id !== id) })),

      activeTool: null,
      setActiveTool: (t) => set({ activeTool: t }),
    }),
    {
      name: 'platform-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        favorites: s.favorites,
        recents: s.recents,
        notes: s.notes,
        todos: s.todos,
        flashcards: s.flashcards,
        sessions: s.sessions,
        quizResults: s.quizResults,
        terms: s.terms,
      }),
    }
  )
);
