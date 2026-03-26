'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

type ArchivedReview = {
  id: string;
  title: string;
  status: string | null;
  summary_generated_at: string | null;
  dismissed_at: string | null;
  archived_at: string | null;
  created_at: string | null;
  deadline: string | null;
};

export default function ArchivePage() {
  const [user, setUser] = useState<{ id: string; email?: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ArchivedReview[]>([]);
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
          .select(
            'id, title, status, summary_generated_at, dismissed_at, archived_at, created_at, deadline'
          )
          .eq('created_by', authUser.id)
          .is('deleted_at', null)
          .or('dismissed_at.not.is.null,archived_at.not.is.null')
          .order('created_at', { ascending: false });

        if (queryError) {
          throw new Error(queryError.message);
        }

        if (!cancelled) {
          setItems((data || []) as ArchivedReview[]);
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

  const getStatusLabel = (item: ArchivedReview) => {
    if (item.summary_generated_at) return 'Summary Ready';
    if (item.status === 'open') return 'Open';
    return 'Closed';
  };

  const getStatusStyles = (item: ArchivedReview) => {
    if (item.summary_generated_at) {
      return {
        border: '1px solid rgba(16,185,129,0.20)',
        background: 'rgba(16,185,129,0.10)',
        color: '#047857',
      };
    }

    if (item.status === 'open') {
      return {
        border: '1px solid rgba(59,130,246,0.18)',
        background: 'rgba(59,130,246,0.08)',
        color: '#1d4ed8',
      };
    }

    return {
      border: '1px solid rgba(0,0,0,0.10)',
      background: 'rgba(0,0,0,0.04)',
      color: '#111',
    };
  };

  const handleDelete = async (sessionId: string) => {
    const confirmDelete = window.confirm('Delete this review permanently?');

    if (!confirmDelete) return;

    try {
      const { error } = await supabase
        .from('team_sessions')
        .update({
          deleted_at: new Date().toISOString(),
        })
        .eq('id', sessionId);

      if (error) {
        throw new Error(error.message);
      }

      setItems((prev) => prev.filter((item) => item.id !== sessionId));
    } catch (err: any) {
      window.alert(err?.message || 'Failed to delete review.');
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
            <div
              style={{
                borderRadius: 14,
                border: '1px dashed rgba(0,0,0,0.14)',
                background: 'rgba(255,255,255,0.72)',
                padding: 16,
              }}
            >
              <div style={{ fontSize: 13.5, fontWeight: 800, marginBottom: 4 }}>
                No archived reviews yet
              </div>
              <div style={{ fontSize: 12.5, lineHeight: 1.6, opacity: 0.68 }}>
                Reviews dismissed from home or older archived items will appear here.
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {items.map((item) => {
                const statusLabel = getStatusLabel(item);
                const statusStyles = getStatusStyles(item);

                return (
                  <div
                    key={item.id}
                    style={{
                      borderRadius: 16,
                      border: '1px solid rgba(0,0,0,0.08)',
                      background: '#fff',
                      padding: 16,
                      boxShadow: '0 10px 24px rgba(0,0,0,0.04)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        gap: 12,
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            borderRadius: 999,
                            padding: '6px 10px',
                            fontSize: 11,
                            fontWeight: 900,
                            letterSpacing: '0.08em',
                            ...statusStyles,
                          }}
                        >
                          {statusLabel.toUpperCase()}
                        </div>

                        <a
                          href={`/team/${item.id}/summary`}
                          style={{
                            display: 'block',
                            marginTop: 12,
                            color: '#111',
                            textDecoration: 'none',
                          }}
                        >
                          <div
                            style={{
                              fontSize: 16,
                              fontWeight: 900,
                              letterSpacing: -0.02,
                              lineHeight: 1.25,
                            }}
                          >
                            {item.title}
                          </div>
                        </a>

                        <div
                          style={{
                            marginTop: 12,
                            display: 'grid',
                            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                            gap: 10,
                          }}
                        >
                          <div
                            style={{
                              borderRadius: 12,
                              background: 'rgba(0,0,0,0.03)',
                              padding: '10px 12px',
                            }}
                          >
                            <div
                              style={{ fontSize: 11, fontWeight: 800, opacity: 0.5, marginBottom: 4 }}
                            >
                              CREATED
                            </div>
                            <div style={{ fontSize: 12.5, fontWeight: 700, lineHeight: 1.4 }}>
                              {formatShort(item.created_at)}
                            </div>
                          </div>

                          <div
                            style={{
                              borderRadius: 12,
                              background: 'rgba(0,0,0,0.03)',
                              padding: '10px 12px',
                            }}
                          >
                            <div
                              style={{ fontSize: 11, fontWeight: 800, opacity: 0.5, marginBottom: 4 }}
                            >
                              DEADLINE
                            </div>
                            <div style={{ fontSize: 12.5, fontWeight: 700, lineHeight: 1.4 }}>
                              {formatShort(item.deadline)}
                            </div>
                          </div>

                          <div
                            style={{
                              borderRadius: 12,
                              background: 'rgba(0,0,0,0.03)',
                              padding: '10px 12px',
                            }}
                          >
                            <div
                              style={{ fontSize: 11, fontWeight: 800, opacity: 0.5, marginBottom: 4 }}
                            >
                              GENERATED
                            </div>
                            <div style={{ fontSize: 12.5, fontWeight: 700, lineHeight: 1.4 }}>
                              {formatShort(item.summary_generated_at)}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button
                          onClick={() => handleDelete(item.id)}
                          style={{
                            borderRadius: 999,
                            border: '1px solid rgba(220,38,38,0.25)',
                            padding: '10px 14px',
                            fontSize: 12.5,
                            fontWeight: 800,
                            background: '#fff',
                            cursor: 'pointer',
                            color: '#dc2626',
                          }}
                        >
                          Delete
                        </button>
                      </div>
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