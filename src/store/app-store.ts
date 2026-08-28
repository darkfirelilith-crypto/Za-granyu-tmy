import { create } from "zustand";
import type { View, KnowledgeTab } from "@/lib/types";

interface AppState {
  view: View;
  knowledgeTab: KnowledgeTab;
  setView: (v: View) => void;
  setKnowledgeTab: (t: KnowledgeTab) => void;
  // admin subview
  adminTab: string;
  setAdminTab: (t: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  view: "hall",
  knowledgeTab: "countries",
  adminTab: "overview",
  setView: (view) => set({ view }),
  setKnowledgeTab: (knowledgeTab) => set({ knowledgeTab }),
  setAdminTab: (adminTab) => set({ adminTab }),
}));
