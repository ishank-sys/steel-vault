"use client";

import { SessionProvider } from "next-auth/react";
import { SWRConfig } from 'swr';

export default function Providers({ children }) {
  return (
    <SessionProvider>
      <SWRConfig value={{
        fetcher: (url) => fetch(url, { credentials: 'include' }).then(r => {
          if (!r.ok) throw new Error(`Request failed: ${r.status}`);
          return r.json();
        }),
        revalidateOnFocus: true,
        shouldRetryOnError: false,
        dedupingInterval: 5 * 60 * 1000, // 5 minutes
        keepPreviousData: true,
      }}>
        {children}
      </SWRConfig>
    </SessionProvider>
  );
}
