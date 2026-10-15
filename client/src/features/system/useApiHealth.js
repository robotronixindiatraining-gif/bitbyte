import { useQuery } from '@tanstack/react-query';
import { getHealth } from '../../services/api/system.js';

export function useApiHealth() {
  return useQuery({
    queryKey: ['system', 'health'],
    queryFn: ({ signal }) => getHealth({ signal }),
    refetchInterval: 30_000,
    retry: false,
  });
}
