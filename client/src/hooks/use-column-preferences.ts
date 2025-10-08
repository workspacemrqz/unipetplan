import { useState, useEffect } from "react";

interface UseColumnPreferencesReturn {
  visibleColumns: string[];
  toggleColumn: (col: string) => void;
}

/**
 * Custom hook to manage column visibility preferences with localStorage persistence
 * 
 * @param storageKey - Unique key for localStorage storage
 * @param defaultColumns - Default columns to show if no preferences are saved
 * @returns Object containing visibleColumns array and toggleColumn function
 */
export function useColumnPreferences(
  storageKey: string,
  defaultColumns: readonly string[]
): UseColumnPreferencesReturn {
  // Initialize state with default columns
  const [visibleColumns, setVisibleColumns] = useState<string[]>([...defaultColumns]);

  // Load preferences from localStorage on mount
  useEffect(() => {
    try {
      // Check if localStorage is available (handles SSR)
      if (typeof window !== "undefined" && window.localStorage) {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const parsedColumns = JSON.parse(saved);
          // Validate that parsed data is an array
          if (Array.isArray(parsedColumns)) {
            setVisibleColumns(parsedColumns);
          }
        }
      }
    } catch (error) {
      // If localStorage is not available or parsing fails, use defaults
      console.warn(`Failed to load column preferences for ${storageKey}:`, error);
    }
  }, [storageKey]);

  // Save preferences to localStorage whenever visibleColumns changes
  useEffect(() => {
    try {
      // Check if localStorage is available and columns have been initialized
      if (typeof window !== "undefined" && window.localStorage) {
        localStorage.setItem(storageKey, JSON.stringify(visibleColumns));
      }
    } catch (error) {
      // If localStorage is not available, silently fail
      console.warn(`Failed to save column preferences for ${storageKey}:`, error);
    }
  }, [storageKey, visibleColumns]);

  // Toggle column visibility
  const toggleColumn = (col: string) => {
    setVisibleColumns((prev) =>
      prev.includes(col)
        ? prev.filter((c) => c !== col)
        : [...prev, col]
    );
  };

  return {
    visibleColumns,
    toggleColumn,
  };
}