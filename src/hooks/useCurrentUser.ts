import useSWR from 'swr';

export function useCurrentUser() {
  const { data, error, isLoading, mutate } = useSWR('/api/users/me');
  return {
    user: data,
    isLoading,
    error,
    refresh: mutate,
  } as const;
}
