import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SearchResult {
  symbol: string;
  name: string;
  exchange: string;
  type: string;
}

interface SearchState {
  recentSearches: SearchResult[];
  activeRegion: 'IN' | 'US';
  activeFilter: 'ALL' | 'STOCKS' | 'ETFS' | 'CRYPTO';
  selectedSymbol: string | null;
  
  addRecentSearch: (result: SearchResult) => void;
  setRegion: (region: 'IN' | 'US') => void;
  setFilter: (filter: 'ALL' | 'STOCKS' | 'ETFS' | 'CRYPTO') => void;
  setSelectedSymbol: (symbol: string | null) => void;
  clearRecent: () => void;
}

export const useSearchStore = create<SearchState>()(
  persist(
    (set) => ({
      recentSearches: [],
      activeRegion: 'IN',
      activeFilter: 'ALL',
      selectedSymbol: null,

      addRecentSearch: (result) => set((state) => {
        const filtered = state.recentSearches.filter(s => s.symbol !== result.symbol);
        return { recentSearches: [result, ...filtered].slice(0, 10) };
      }),

      setRegion: (region) => set({ activeRegion: region }),
      setFilter: (filter) => set({ activeFilter: filter }),
      setSelectedSymbol: (symbol) => set({ selectedSymbol: symbol }),
      clearRecent: () => set({ recentSearches: [] }),
    }),
    {
      name: 'luminous-search-store',
      partialize: (state) => ({ recentSearches: state.recentSearches }),
    }
  )
);
