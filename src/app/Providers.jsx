"use client";

import { SessionProvider } from "next-auth/react";
import { SWRConfig } from 'swr';
import { loadingAPI } from '@/stores/loadingStore';
import GlobalLoadingOverlay from './components/GlobalLoadingOverlay';

export default function Providers({ children }) {
  return (
    <SessionProvider>
      <SWRConfig value={{
        fetcher: async (url) => {
          try {
            loadingAPI.inc();
            const r = await fetch(url, { credentials: 'include' });
            if (!r.ok) throw new Error(`Request failed: ${r.status}`);
            return await r.json();
          } finally {
            loadingAPI.dec();
          }
        },
        revalidateOnFocus: true,
        shouldRetryOnError: false,
        dedupingInterval: 5 * 60 * 1000, // 5 minutes
        keepPreviousData: true,
      }}>
        <>
          <GlobalLoadingOverlay />
          {children}
        </>
      </SWRConfig>
    </SessionProvider>
  );
}
