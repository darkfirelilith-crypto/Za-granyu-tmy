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
  // lab subview — lives here (not in LabView) so search results and the Hall
  // can drop the reader straight onto the right shelf.
  labTab: string;
  setLabTab: (t: string) => void;
  // cross-view selection: when a country is selected from the world map,
  // store its name so CountriesTab can pre-select it after navigation.
  selectedCountryName: string | null;
  setSelectedCountryName: (name: string | null) => void;
  /**
   * Cross-view "open this record" signal. Anything that links deeper into the
   * site (omnisearch, the Hall carousel) sets the id here; the destination
   * view pre-selects that entity and clears the signal once the reader
   * interacts, so it never overrides a later manual choice.
   */
  focusId: string | null;
  setFocusId: (id: string | null) => void;
  /** Navigate to a view, optionally landing on a tab and a specific record. */
  goTo: (target: { view: View; knowledgeTab?: KnowledgeTab; labTab?: string; focusId?: string }) => void;
}

export const useAppStore = create<AppState>((set) => ({
  view: "hall",
  knowledgeTab: "countries",
  adminTab: "overview",
  labTab: "RACE",
  selectedCountryName: null,
  focusId: null,
  setView: (view) => set({ view }),
  setKnowledgeTab: (knowledgeTab) => set({ knowledgeTab }),
  setAdminTab: (adminTab) => set({ adminTab }),
  setLabTab: (labTab) => set({ labTab }),
  setSelectedCountryName: (selectedCountryName) => set({ selectedCountryName }),
  setFocusId: (focusId) => set({ focusId }),
  goTo: ({ view, knowledgeTab, labTab, focusId }) =>
    set((s) => ({
      view,
      knowledgeTab: knowledgeTab ?? s.knowledgeTab,
      labTab: labTab ?? s.labTab,
      focusId: focusId ?? null,
    })),
}));
