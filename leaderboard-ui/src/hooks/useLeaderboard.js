import { useEffect, useState } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export function useLeaderboard(endpoint) {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isActive = true;

    async function loadLeaderboard() {
      setIsLoading(true);
      setError('');

      try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`);
        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(payload?.error || 'Failed to load leaderboard');
        }

        if (isActive) {
          setData(Array.isArray(payload) ? payload : []);
        }
      } catch (loadError) {
        if (isActive) {
          setError(loadError.message || 'Failed to load leaderboard');
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    loadLeaderboard();

    return () => {
      isActive = false;
    };
  }, [endpoint]);

  return { data, isLoading, error };
}
