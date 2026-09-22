import { create } from 'zustand';
import { Project, Scene, VisualBeat, CreateProjectPayload } from '../../../shared/types';
import { AssetStatus } from '../../../shared/enums';

interface ProjectState {
  projects: Project[];
  currentProject: Project | null;
  currentScenes: Scene[];
  currentBeats: VisualBeat[];
  activeSceneId: string | null;
  activeBeatId: string | null;
  isLoading: boolean;
  error: string | null;

  fetchProjects: () => Promise<void>;
  fetchProject: (id: string) => Promise<void>;
  createProject: (payload: CreateProjectPayload) => Promise<Project>;
  deleteProject: (id: string) => Promise<void>;
  updateScene: (id: string, patch: Partial<Scene>) => Promise<void>;
  approveScene: (id: string) => Promise<void>;
  approveAllScenes: (projectId: string) => Promise<void>;
  autoEdit: (projectId: string) => Promise<Scene[]>;
  regenerateImage: (sceneId: string) => Promise<Scene>;
  regenerateVoice: (sceneId: string) => Promise<Scene>;
  updateSceneInList: (scene: Scene) => void;
  setActiveSceneId: (id: string | null) => void;

  // Visual Beat Actions
  fetchBeats: (projectId: string) => Promise<VisualBeat[]>;
  updateBeat: (id: string, patch: Partial<VisualBeat>) => Promise<void>;
  updateBeatInList: (beat: VisualBeat) => void;
  regenerateBeatImage: (beatId: string, customPrompt?: string) => Promise<VisualBeat>;
  replaceBeatImage: (beatId: string, filePath: string) => Promise<VisualBeat>;
  setActiveBeatId: (id: string | null) => void;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  currentProject: null,
  currentScenes: [],
  currentBeats: [],
  activeSceneId: null,
  activeBeatId: null,
  isLoading: false,
  error: null,

  fetchProjects: async () => {
    set({ isLoading: true, error: null });
    try {
      const list = await window.docuforge.projects.list();
      set({ projects: list, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  fetchProject: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const result = await window.docuforge.projects.get(id);
      let beats: VisualBeat[] = [];
      if (window.docuforge.beats?.listByProject) {
        try {
          beats = await window.docuforge.beats.listByProject(id);
        } catch (e) {
          console.warn('Could not fetch beats:', e);
        }
      }

      if (result) {
        const scenesWithBeats = result.scenes.map((s) => ({
          ...s,
          visualBeats: beats.filter((b) => b.sceneId === s.id)
        }));

        set({
          currentProject: result.project,
          currentScenes: scenesWithBeats,
          currentBeats: beats,
          activeSceneId: result.scenes.length > 0 ? result.scenes[0].id : null,
          activeBeatId: beats.length > 0 ? beats[0].id : null,
          isLoading: false
        });
      } else {
        set({ currentProject: null, currentScenes: [], currentBeats: [], isLoading: false });
      }
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  createProject: async (payload: CreateProjectPayload) => {
    set({ isLoading: true, error: null });
    try {
      const newProj = await window.docuforge.projects.create(payload);
      await get().fetchProjects();
      set({ isLoading: false });
      return newProj;
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  deleteProject: async (id: string) => {
    await window.docuforge.projects.delete(id);
    await get().fetchProjects();
  },

  updateScene: async (id: string, patch: Partial<Scene>) => {
    const updated = await window.docuforge.scenes.update(id, patch);
    set((state) => ({
      currentScenes: state.currentScenes.map((s) => (s.id === id ? { ...s, ...updated } : s))
    }));
  },

  approveScene: async (id: string) => {
    const updated = await window.docuforge.scenes.approve(id);
    set((state) => ({
      currentScenes: state.currentScenes.map((s) => (s.id === id ? { ...s, ...updated } : s))
    }));
  },

  approveAllScenes: async (projectId: string) => {
    const updatedScenes = await window.docuforge.scenes.approveAll(projectId);
    set({ currentScenes: updatedScenes });
  },

  autoEdit: async (projectId: string) => {
    set({ isLoading: true });
    try {
      const res: any = await window.docuforge.projects.autoEdit(projectId);
      const rawScenes: Scene[] = Array.isArray(res) ? res : (res?.scenes || []);
      let beats: VisualBeat[] = [];
      if (window.docuforge.beats?.listByProject) {
        beats = await window.docuforge.beats.listByProject(projectId);
      }
      let updatedProject: Project | null = null;
      if (window.docuforge.projects?.get) {
        const pRes: any = await window.docuforge.projects.get(projectId);
        updatedProject = pRes?.project || pRes || null;
      }
      const scenesWithBeats = rawScenes.map((s) => ({
        ...s,
        visualBeats: beats.filter((b) => b.sceneId === s.id)
      }));
      set((state) => ({
        currentScenes: scenesWithBeats,
        currentBeats: beats,
        currentProject: updatedProject || state.currentProject,
        isLoading: false
      }));
      return scenesWithBeats;
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  regenerateImage: async (sceneId: string) => {
    set((state) => ({
      currentScenes: state.currentScenes.map((s) =>
        s.id === sceneId ? { ...s, imageStatus: AssetStatus.GENERATING } : s
      )
    }));
    try {
      const updated = await window.docuforge.scenes.regenerateImage(sceneId);
      set((state) => ({
        currentScenes: state.currentScenes.map((s) => (s.id === sceneId ? updated : s))
      }));
      return updated;
    } catch (err) {
      set((state) => ({
        currentScenes: state.currentScenes.map((s) =>
          s.id === sceneId ? { ...s, imageStatus: AssetStatus.FAILED } : s
        )
      }));
      throw err;
    }
  },

  regenerateVoice: async (sceneId: string) => {
    set((state) => ({
      currentScenes: state.currentScenes.map((s) =>
        s.id === sceneId ? { ...s, audioStatus: AssetStatus.GENERATING } : s
      )
    }));
    try {
      const updated = await window.docuforge.scenes.regenerateVoice(sceneId);
      set((state) => ({
        currentScenes: state.currentScenes.map((s) => (s.id === sceneId ? updated : s))
      }));
      return updated;
    } catch (err) {
      set((state) => ({
        currentScenes: state.currentScenes.map((s) =>
          s.id === sceneId ? { ...s, audioStatus: AssetStatus.FAILED } : s
        )
      }));
      throw err;
    }
  },

  updateSceneInList: (scene: Scene) => {
    set((state) => ({
      currentScenes: state.currentScenes.map((s) => (s.id === scene.id ? { ...s, ...scene } : s))
    }));
  },

  setActiveSceneId: (id: string | null) => {
    set({ activeSceneId: id });
  },

  // Visual Beat Actions
  fetchBeats: async (projectId: string) => {
    if (!window.docuforge.beats) return [];
    try {
      const beats = await window.docuforge.beats.listByProject(projectId);
      set({ currentBeats: beats });
      return beats;
    } catch (e) {
      console.warn('fetchBeats error:', e);
      return [];
    }
  },

  updateBeat: async (id: string, patch: Partial<VisualBeat>) => {
    if (!window.docuforge.beats) return;
    const updated = await window.docuforge.beats.update(id, patch);
    if (updated) {
      set((state) => {
        const nextBeats = state.currentBeats.map((b) => (b.id === id ? { ...b, ...updated } : b));
        const nextScenes = state.currentScenes.map((s) => ({
          ...s,
          visualBeats: nextBeats.filter((b) => b.sceneId === s.id)
        }));
        return { currentBeats: nextBeats, currentScenes: nextScenes };
      });
    }
  },

  updateBeatInList: (beat: VisualBeat) => {
    set((state) => {
      const exists = state.currentBeats.some((b) => b.id === beat.id);
      const nextBeats = exists
        ? state.currentBeats.map((b) => (b.id === beat.id ? { ...b, ...beat } : b))
        : [...state.currentBeats.filter((b) => !(b.sceneId === beat.sceneId && b.beatIndex === beat.beatIndex)), beat];
      const nextScenes = state.currentScenes.map((s) => ({
        ...s,
        visualBeats: nextBeats.filter((b) => b.sceneId === s.id)
      }));
      return { currentBeats: nextBeats, currentScenes: nextScenes };
    });
  },

  regenerateBeatImage: async (beatId: string, customPrompt?: string) => {
    set((state) => ({
      currentBeats: state.currentBeats.map((b) =>
        b.id === beatId ? { ...b, generationStatus: 'GENERATING' } : b
      )
    }));
    try {
      const updated = await window.docuforge.beats.regenerateImage(beatId, customPrompt);
      get().updateBeatInList(updated);
      return updated;
    } catch (err) {
      set((state) => ({
        currentBeats: state.currentBeats.map((b) =>
          b.id === beatId ? { ...b, generationStatus: 'FAILED' } : b
        )
      }));
      throw err;
    }
  },

  replaceBeatImage: async (beatId: string, filePath: string) => {
    const updated = await window.docuforge.beats.replaceImage(beatId, filePath);
    get().updateBeatInList(updated);
    return updated;
  },

  setActiveBeatId: (id: string | null) => {
    set({ activeBeatId: id });
  }
}));
