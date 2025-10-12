/**
 * Hook to get authentication token for unit or veterinarian
 * Checks both localStorage keys and returns the appropriate token
 */
export function useUnitAuth() {
  const getToken = () => {
    // Check for unit token first
    const unitToken = localStorage.getItem('unit-token');
    if (unitToken) {
      return { token: unitToken, type: 'unit' as const };
    }
    
    // Check for veterinarian token
    const vetToken = localStorage.getItem('veterinarian-token');
    if (vetToken) {
      return { token: vetToken, type: 'veterinarian' as const };
    }
    
    return { token: null, type: null };
  };

  const { token, type } = getToken();

  return {
    token,
    type,
    isAuthenticated: !!token,
    isUnit: type === 'unit',
    isVeterinarian: type === 'veterinarian'
  };
}
