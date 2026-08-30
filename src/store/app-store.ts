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
  // cross-view selection: when a country is selected from the world map,
  // store its name so CountriesTab can pre-select it after navigation.
  selectedCountryName: string | null;
  setSelectedCountryName: (name: string | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  view: "hall",
  knowledgeTab: "countries",
  adminTab: "overview",
  selectedCountryName: null,
  setView: (view) => set({ view }),
  setKnowledgeTab: (knowledgeTab) => set({ knowledgeTab }),
  setAdminTab: (adminTab) => set({ adminTab }),
  setSelectedCountryName: (selectedCountryName) => set({ selectedCountryName }),
}));
