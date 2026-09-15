'use client';

import { useEffect } from 'react';

/**
 * Pings the visit beacon once per browser session.
 *
 * sessionStorage rather than a plain effect guard: without it a reload or a move
 * between the two pages would send another email, and the inbox stops being
 * useful within a day.
 */
export function VisitPing({ page }: { page: string }) {
  useEffect(() => {
    const key = 'augusta-visit-sent';
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
    } catch {
      // Private mode can throw on storage access; sending once is better than never.
    }
    void fetch('/api/visit', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ page }),
      keepalive: true,
    }).catch(() => {});
  }, [page]);

  return null;
}
