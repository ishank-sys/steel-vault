import { loadingAPI } from '@/stores/loadingStore';

export async function fetchWithLoading(input, init) {
  try {
    loadingAPI.inc();
    const res = await fetch(input, init);
    return res;
  } finally {
    loadingAPI.dec();
  }
}
