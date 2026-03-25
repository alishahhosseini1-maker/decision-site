'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

type ArchivedSummary = {
  id: string;
  title: string;
  summary_generated_at: string | null;
  dismissed_at: string | null;
  archived_at: string | null;
};

export default function ArchivePage() {
  const [user, setUser] = useState<{ id: string; email?: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ArchivedSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadArchive() {
      try {
        setLoading(true);
        setError(null);

        const {
          data: { session },
          error: authError,
        } = await supabase.auth.getSession();

        if (authError) {
          throw new Error(authError.message);
        }

        const authUser = session?.user ?? null;

        if (!authUser) {
          throw new Error('You must be signed in to view archive.');
        }

        if (!cancelled) {
          setUser({
            id: authUser.id,
            email: authUser.email ?? null,
          });
        }

        const { data, error: queryError } = await supabase
          .from('team_sessions')
          .select('id, title, summary_generated_at, dismissed_at, archived_at')
          .eq('created_by', authUser.id)
          .not('summary_generated_at', 'is', null)
          .or('dismissed_at.not.is.null,archived_at.not.is.null')
          .order('summary_generated_at', { ascending: false });

        if (queryError) {
          throw new Error(queryError.message);
        }

        if (!cancelled) {
          setItems((data || []) as ArchivedSummary[]);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || 'Failed to load archive.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadArchive();

    return () => {
      cancelled = true;
    };
  }, []);

  const formatShort = (iso?: string | null) => {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString(undefined, {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const handleRestore = async (sessionId: string) => {
    try {
      const { error } = await supabase
        .from('team_sessions')
        .update({
          dismissed_at: null,
          archived_at: null,
        })
        .eq('id', sessionId);

      if (error) {
        throw new Error(error.message);
      }

      setItems((prev) => prev.filter((item) => item.id !== sessionId));
    } catch (err: any) {
      window.alert(err?.message || 'Failed to restore summary.');
    }
  };

  const handleArchive = async (sessionId: string) => {
    try {
      const { error } = await supabase
        .from('team_sessions')
        .update({
          archived_at: new Date().toISOString(),
        })
        .eq('id', sessionId);

      if (error) {
        throw new Error(error.message);
      }

      setItems((prev) =>
        prev.map((item) =>
          item.id === sessionId
            ? { ...item, archived_at: new Date().toISOString() }
            : item
        )
      );
    } catch (err: any) {
      window.alert(err?.message || 'Failed to archive summary.');
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f4f5f6', color: '#111' }}>
      <main style={{ maxWidth: 900, margin: '28px auto 60px', padding: '0 20px' }}>
        <header
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
            marginBottom: 24,
          }}
        >
          <div>
            <div style={{ fontSize: 12, opacity: 0.5 }}>Decision Layer</div>
            <h1 style={{ fontSize: 34, margin: '6px 0 0', letterSpacing: -0.8 }}>Archive</h1>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {user?.email ? (
              <div style={{ fontSize: 12.5, opacity: 0.62 }}>{user.email}</div>
            ) : null}

            <a
              href="/"
              style={{
                borderRadius: 999,
                border: '1px solid rgba(0,0,0,0.12)',
                padding: '10px 14px',
                background: '#fff',
                color: '#111',
                fontSize: 12.5,
                fontWeight: 800,
                textDecoration: 'none',
              }}
            >
              Back Home
            </a>
          </div>
        </header>

        <section
          style={{
            border: '1px solid rgba(0,0,0,0.10)',
            borderRadius: 18,
            background: 'rgba(255,255,255,0.72)',
            padding: 18,
            boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
          }}
        >
          {loading ? (
            <div style={{ fontSize: 13.5, opacity: 0.72 }}>Loading archive...</div>
          ) : error ? (
            <div style={{ fontSize: 13.5, color: '#dc2626', fontWeight: 700 }}>{error}</div>
          ) : items.length === 0 ? (
            <div style={{ fontSize: 13.5, opacity: 0.72 }}>No archived or dismissed summaries yet.</div>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {items.map((item) => {
                const status = item.archived_at ? 'Archived' : 'Dismissed';

                return (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 12,
                      borderRadius: 14,
                      border: '1px solid rgba(0,0,0,0.08)',
                      background: '#fff',
                      padding: '14px 16px',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <a
                        href={`/team/${item.id}/summary`}
                        style={{
                          color: '#111',
                          textDecoration: 'none',
                        }}
                      >
                        <div style={{ fontSize: 14, fontWeight: 900 }}>{item.title}</div>
                      </a>

                      <div style={{ marginTop: 5, fontSize: 12.5, opacity: 0.65 }}>
                        {status} • Summary ready {formatShort(item.summary_generated_at)}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {!item.archived_at && (
                        <button
                          onClick={() => handleArchive(item.id)}
                          style={{
                            borderRadius: 999,
                            border: '1px solid rgba(0,0,0,0.12)',
                            padding: '8px 12px',
                            fontSize: 12,
                            fontWeight: 700,
                            background: '#fff',
                            cursor: 'pointer',
                          }}
                        >
                          Archive
                        </button>
                      )}

                      <button
                        onClick={() => handleRestore(item.id)}
                        style={{
                          borderRadius: 999,
                          border: '1px solid rgba(0,0,0,0.12)',
                          padding: '8px 12px',
                          fontSize: 12,
                          fontWeight: 700,
                          background: '#fff',
                          cursor: 'pointer',
                        }}
                      >
                        Restore
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}