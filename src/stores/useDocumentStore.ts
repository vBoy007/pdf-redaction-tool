import { create } from 'zustand';
import type {
  DocumentState,
  RedactionBox,
  TextAnnotation,
  ImageAnnotation,
  ToolType,
} from '@/types';

interface DocumentStore extends DocumentState {
  setFile: (file: File) => void;
  setNumPages: (numPages: number) => void;
  setCurrentPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  setZoom: (zoom: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  fitToWidth: () => void;
  setCurrentTool: (tool: ToolType) => void;
  addRedaction: (redaction: RedactionBox) => void;
  updateRedaction: (id: string, updates: Partial<RedactionBox>) => void;
  removeRedaction: (id: string) => void;
  addTextAnnotation: (annotation: TextAnnotation) => void;
  updateTextAnnotation: (id: string, updates: Partial<TextAnnotation>) => void;
  removeTextAnnotation: (id: string) => void;
  addImageAnnotation: (annotation: ImageAnnotation) => void;
  updateImageAnnotation: (id: string, updates: Partial<ImageAnnotation>) => void;
  removeImageAnnotation: (id: string) => void;
  setProcessing: (isProcessing: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState: DocumentState = {
  file: null,
  fileName: '',
  numPages: 0,
  currentPage: 1,
  zoom: 1.0,
  pages: [],
  redactions: [],
  textAnnotations: [],
  imageAnnotations: [],
  currentTool: 'select',
  isProcessing: false,
  error: null,
};

export const useDocumentStore = create<DocumentStore>((set) => ({
  ...initialState,

  setFile: (file) =>
    set({
      file,
      fileName: file.name,
      error: null,
    }),

  setNumPages: (numPages) => set({ numPages }),

  setCurrentPage: (page) =>
    set((state) => ({
      currentPage: Math.max(1, Math.min(page, state.numPages)),
    })),

  nextPage: () =>
    set((state) => ({
      currentPage: Math.min(state.currentPage + 1, state.numPages),
    })),

  prevPage: () =>
    set((state) => ({
      currentPage: Math.max(state.currentPage - 1, 1),
    })),

  setZoom: (zoom) =>
    set({
      zoom: Math.max(0.5, Math.min(zoom, 3.0)),
    }),

  zoomIn: () =>
    set((state) => ({
      zoom: Math.min(state.zoom + 0.25, 3.0),
    })),

  zoomOut: () =>
    set((state) => ({
      zoom: Math.max(state.zoom - 0.25, 0.5),
    })),

  fitToWidth: () => set({ zoom: 1.0 }),

  setCurrentTool: (tool) => set({ currentTool: tool }),

  addRedaction: (redaction) =>
    set((state) => ({
      redactions: [...state.redactions, redaction],
    })),

  updateRedaction: (id, updates) =>
    set((state) => ({
      redactions: state.redactions.map((r) =>
        r.id === id ? { ...r, ...updates } : r
      ),
    })),

  removeRedaction: (id) =>
    set((state) => ({
      redactions: state.redactions.filter((r) => r.id !== id),
    })),

  addTextAnnotation: (annotation) =>
    set((state) => ({
      textAnnotations: [...state.textAnnotations, annotation],
    })),

  updateTextAnnotation: (id, updates) =>
    set((state) => ({
      textAnnotations: state.textAnnotations.map((a) =>
        a.id === id ? { ...a, ...updates } : a
      ),
    })),

  removeTextAnnotation: (id) =>
    set((state) => ({
      textAnnotations: state.textAnnotations.filter((a) => a.id !== id),
    })),

  addImageAnnotation: (annotation) =>
    set((state) => ({
      imageAnnotations: [...state.imageAnnotations, annotation],
    })),

  updateImageAnnotation: (id, updates) =>
    set((state) => ({
      imageAnnotations: state.imageAnnotations.map((a) =>
        a.id === id ? { ...a, ...updates } : a
      ),
    })),

  removeImageAnnotation: (id) =>
    set((state) => ({
      imageAnnotations: state.imageAnnotations.filter((a) => a.id !== id),
    })),

  setProcessing: (isProcessing) => set({ isProcessing }),

  setError: (error) => set({ error }),

  reset: () => set(initialState),
}));
