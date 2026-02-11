import { create } from "zustand";
import type { Project } from "@/types";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/api/client";

interface ProjectsState {
  projects: Project[];
  loading: boolean;
  error: string | null;
  fetchProjects: () => Promise<void>;
  createProject: (name: string) => Promise<Project>;
  updateProject: (id: string, name: string) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
}

export const useAppStore = create<ProjectsState>((set, get) => ({
  projects: [],
  loading: false,
  error: null,

  fetchProjects: async () => {
    set({ loading: true, error: null });
    try {
      const projects = await apiGet<Project[]>("/projects");
      set({ projects, loading: false });
    } catch (e) {
      set({
        error: e instanceof Error ? e.message : "Errore caricamento progetti",
        loading: false,
      });
    }
  },

  createProject: async (name: string) => {
    const project = await apiPost<Project>("/projects", { name });
    set((s) => ({ projects: [project, ...s.projects] }));
    return project;
  },

  updateProject: async (id: string, name: string) => {
    await apiPatch(`/projects/${id}`, { name });
    set((s) => ({
      projects: s.projects.map((p) => (p.id === id ? { ...p, name } : p)),
    }));
  },

  deleteProject: async (id: string) => {
    await apiDelete(`/projects/${id}`);
    set((s) => ({ projects: s.projects.filter((p) => p.id !== id) }));
  },
}));
