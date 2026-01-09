'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

type Confidence = 'Low' | 'Medium' | 'High';

type DecisionNote = {
  id: string;
  createdAt: number; // epoch ms
  updatedAt: number; // epoch ms
  decision: string; // 1 sentence
  assumptions: string[]; // bullets
  changeMind: string[]; // bullets
  confidence: Confidence;
  tags: string[]; // optional
};

const STORAGE_KEY = 'decision-layer:decision-notes:v1';

function uid() {
  // good enough for local-only notes
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function formatDate(ts: number) {
  const d = new Date(ts);
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function cleanLines(text: string): string[] {
  // Split on newlines, trim, drop empties, strip leading bullets.
  return text
    .split('\n')
    .map((l) => l.trim().replace(/^[-•\u2022]\s+/, '').trim())
    .filter(Boolean);
}

function serializeLines(lines: string[]): string {
  return lines.join('\n');
}

function normalizeTags(input: string): string[] {
  return input
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 8);
}

function readNotes(): DecisionNote[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as DecisionNote[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((n) => n && typeof n.id === 'string' && typeof n.createdAt === 'number')
      .map((n) => ({
        ...n,
        updatedAt: typeof n.updatedAt === 'number' ? n.updatedAt : n.createdAt,
        assumptions: Array.isArray(n.assumptions) ? n.assumptions : [],
        changeMind: Array.isArray(n.changeMind) ? n.changeMind : [],
        tags: Array.isArray(n.tags) ? n.tags : [],
        confidence: (n.confidence as Confidence) ?? 'Medium',
      }));
  } catch {
    return [];
  }
}

function writeNotes(notes: DecisionNote[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

export default function DecisionNotesPage() {
  // State: data
  const [notes, setNotes] = useState<DecisionNote[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // State: UI
  const [mode, setMode] = useState<'list' | 'view' | 'edit'>('list');
  const [query, setQuery] = useState('');
  const [showNew, setShowNew] = useState(false);

  // State: editor fields
  const [decision, setDecision] = useState('');
  const [assumptionsText, setAssumptionsText] = useState('');
  const [changeMindText, setChangeMindText] = useState('');
  const [confidence, setConfidence] = useState<Confidence>('Medium');
  const [tagsText, setTagsText] = useState('');

  // Load on mount
  useEffect(() => {
    const loaded = readNotes().sort((a, b) => b.updatedAt - a.updatedAt);
    setNotes(loaded);
    if (loaded.length > 0) setSelectedId(loaded[0].id);
  }, []);

  const selected = useMemo(
    () => notes.find((n) => n.id === selectedId) ?? null,
    [notes, selectedId]
  );

  // Filtered list
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return notes;

    return notes.filter((n) => {
      const haystack = [
        n.decision,
        n.assumptions.join(' '),
        n.changeMind.join(' '),
        n.confidence,
        n.tags.join(' '),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [notes, query]);

  // Styling primitives (match your site)
  const border = '1px solid rgba(0,0,0,0.10)';
  const shellBg = 'rgba(255,255,255,0.65)';
  const navLinkStyle: React.CSSProperties = { textDecoration: 'none', color: 'inherit' };
  const pillStyle: React.CSSProperties = {
    fontSize: 12,
    padding: '6px 10px',
    borderRadius: 999,
    border: '1px solid rgba(0,0,0,0.10)',
    background: 'rgba(255,255,255,0.7)',
    opacity: 0.85,
    whiteSpace: 'nowrap',
  };

  function resetEditor() {
    setDecision('');
    setAssumptionsText('');
    setChangeMindText('');
    setConfidence('Medium');
    setTagsText('');
  }

  function beginNew() {
    resetEditor();
    setShowNew(true);
    setMode('edit');
    setSelectedId(null);
  }

  function beginEdit(note: DecisionNote) {
    setDecision(note.decision);
    setAssumptionsText(serializeLines(note.assumptions));
    setChangeMindText(serializeLines(note.changeMind));
    setConfidence(note.confidence);
    setTagsText(note.tags.join(', '));
    setShowNew(false);
    setMode('edit');
  }

  function beginView(id: string) {
    setSelectedId(id);
    setMode('view');
  }

  function upsertNote() {
    const trimmedDecision = decision.trim();
    if (!trimmedDecision) {
      alert('Decision is required (one sentence).');
      return;
    }

    const now = Date.now();
    const newNote: DecisionNote = {
      id: selectedId ?? uid(),
      createdAt: selected?.createdAt ?? now,
      updatedAt: now,
      decision: trimmedDecision,
      assumptions: cleanLines(assumptionsText).slice(0, 10),
      changeMind: cleanLines(changeMindText).slice(0, 10),
      confidence,
      tags: normalizeTags(tagsText),
    };

    const next = (() => {
      const existingIndex = notes.findIndex((n) => n.id === newNote.id);
      if (existingIndex >= 0) {
        const copy = [...notes];
        copy[existingIndex] = newNote;
        return copy;
      }
      return [newNote, ...notes];
    })().sort((a, b) => b.updatedAt - a.updatedAt);

    setNotes(next);
    writeNotes(next);

    setSelectedId(newNote.id);
    setMode('view');
  }

  function deleteNote(id: string) {
    const note = notes.find((n) => n.id === id);
    if (!note) return;
    const ok = confirm('Delete this note? This cannot be undone.');
    if (!ok) return;

    const next = notes.filter((n) => n.id !== id);
    setNotes(next);
    writeNotes(next);

    if (selectedId === id) {
      setSelectedId(next[0]?.id ?? null);
      setMode(next.length ? 'view' : 'list');
    }
  }

  function exportAll() {
    const payload = JSON.stringify(notes, null, 2);
    navigator.clipboard.writeText(payload);
    alert('Copied JSON export to clipboard.');
  }

  function importAll() {
    const raw = prompt('Paste JSON export here:');
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) throw new Error('Invalid JSON (expected array).');

      const cleaned = (parsed as any[])
        .filter((n) => n && typeof n.id === 'string' && typeof n.createdAt === 'number')
        .map((n) => ({
          id: String(n.id),
          createdAt: Number(n.createdAt),
          updatedAt: typeof n.updatedAt === 'number' ? Number(n.updatedAt) : Number(n.createdAt),
          decision: String(n.decision ?? '').trim(),
          assumptions: Array.isArray(n.assumptions) ? n.assumptions.map(String).filter(Boolean) : [],
          changeMind: Array.isArray(n.changeMind) ? n.changeMind.map(String).filter(Boolean) : [],
          confidence: (['Low', 'Medium', 'High'].includes(n.confidence) ? n.confidence : 'Medium') as Confidence,
          tags: Array.isArray(n.tags) ? n.tags.map(String).filter(Boolean) : [],
        }))
        .filter((n) => n.decision);

      const merged = [...cleaned, ...notes]
        .reduce((acc: DecisionNote[], cur) => {
          // de-dupe by id (prefer newer updatedAt)
          const idx = acc.findIndex((x) => x.id === cur.id);
          if (idx === -1) return [...acc, cur as DecisionNote];
          return acc[idx].updatedAt < (cur as DecisionNote).updatedAt
            ? acc.map((x) => (x.id === cur.id ? (cur as DecisionNote) : x))
            : acc;
        }, [])
        .sort((a, b) => b.updatedAt - a.updatedAt);

      setNotes(merged);
      writeNotes(merged);
      setSelectedId(merged[0]?.id ?? null);
      setMode(merged.length ? 'view' : 'list');
      alert('Imported.');
    } catch {
      alert('Import failed. Make sure the JSON is valid.');
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f4f5f6', color: '#111' }}>
      <main style={{ maxWidth: 980, margin: '28px auto 60px', padding: '0 20px' }}>
        {/* Nav (matches your minimal 4) */}
        <header
  style={{
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 6,
  }}
>
  {/* LEFT: Home anchor */}
  <Link
    href="/"
    style={{
      textDecoration: 'none',
      color: 'inherit',
      fontWeight: 800,
      fontSize: 14,
      letterSpacing: 0.2,
      opacity: 0.9,
    }}
  >
    Decision Layer
  </Link>

  {/* RIGHT: Section nav */}
  <nav
    style={{
      display: 'flex',
      gap: 18,
      fontSize: 13,
      opacity: 0.62,
      fontWeight: 400,
    }}
  >
    <Link href="/decision-review" style={{ textDecoration: 'none', color: 'inherit' }}>
      Decision Review
    </Link>
    <Link href="/decision-notes" style={{ textDecoration: 'none', color: 'inherit' }}>
      Decision Notes
    </Link>
    <Link href="/walkthrough" style={{ textDecoration: 'none', color: 'inherit' }}>
      Walkthrough
    </Link>
    <Link href="/decision-library" style={{ textDecoration: 'none', color: 'inherit' }}>
      Decision Library
    </Link>
  </nav>
</header>


        {/* Header */}
        <section style={{ marginTop: 44 }}>
          <h1 style={{ fontSize: 36, margin: 0, letterSpacing: -0.6 }}>Decision Notes</h1>
          <p style={{ margin: '10px 0 0', fontSize: 14, opacity: 0.72, maxWidth: 820 }}>
            Short records for your future self. Capture what mattered at the moment of commitment —
            not what happened after.
          </p>
        </section>

        {/* Actions bar */}
        <section
          style={{
            marginTop: 16,
            border,
            borderRadius: 14,
            background: shellBg,
            padding: 14,
            boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
            display: 'flex',
            gap: 10,
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search notes (e.g., RSUs, lockup, sizing)…"
            style={{
              flex: '1 1 320px',
              borderRadius: 12,
              border: '1px solid rgba(0,0,0,0.15)',
              padding: '10px 12px',
              fontSize: 14,
              background: '#fff',
              outline: 'none',
            }}
          />

          <button
            onClick={beginNew}
            style={{
              borderRadius: 12,
              border: 'none',
              padding: '10px 12px',
              background: '#0b0b0b',
              color: '#fff',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            New note
          </button>

          <button
            onClick={exportAll}
            style={{
              borderRadius: 12,
              border: '1px solid rgba(0,0,0,0.10)',
              padding: '10px 12px',
              background: 'rgba(255,255,255,0.6)',
              color: '#111',
              fontSize: 13,
              fontWeight: 650,
              cursor: 'pointer',
              opacity: 0.9,
            }}
          >
            Export
          </button>

          <button
            onClick={importAll}
            style={{
              borderRadius: 12,
              border: '1px solid rgba(0,0,0,0.10)',
              padding: '10px 12px',
              background: 'rgba(255,255,255,0.6)',
              color: '#111',
              fontSize: 13,
              fontWeight: 650,
              cursor: 'pointer',
              opacity: 0.9,
            }}
          >
            Import
          </button>
        </section>

        {/* Two-column layout */}
        <section
          style={{
            marginTop: 14,
            display: 'grid',
            gridTemplateColumns: '1fr 1.7fr',
            gap: 14,
            alignItems: 'start',
          }}
        >
          {/* List */}
          <aside
            style={{
              border,
              borderRadius: 18,
              background: shellBg,
              padding: 12,
              boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, opacity: 0.85 }}>
              Notes ({filtered.length})
            </div>

            <div style={{ display: 'grid', gap: 8 }}>
              {filtered.map((n) => {
                const isActive = n.id === selectedId;
                return (
                  <button
                    key={n.id}
                    onClick={() => beginView(n.id)}
                    style={{
                      textAlign: 'left',
                      borderRadius: 14,
                      border: isActive
                        ? '1px solid rgba(0,0,0,0.20)'
                        : '1px solid rgba(0,0,0,0.10)',
                      background: isActive ? '#fff' : 'rgba(255,255,255,0.45)',
                      padding: '10px 10px',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontSize: 13.5, fontWeight: 700, opacity: 0.92 }}>
                      {n.decision.length > 72 ? `${n.decision.slice(0, 72)}…` : n.decision}
                    </div>

                    <div style={{ marginTop: 6, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <span style={pillStyle}>{n.confidence}</span>
                      {n.tags.slice(0, 2).map((t) => (
                        <span key={t} style={pillStyle}>
                          {t}
                        </span>
                      ))}
                    </div>

                    <div style={{ marginTop: 8, fontSize: 12.5, opacity: 0.62 }}>
                      Updated {formatDate(n.updatedAt)}
                    </div>
                  </button>
                );
              })}

              {filtered.length === 0 && (
                <div style={{ fontSize: 13, opacity: 0.65, padding: '10px 4px' }}>
                  No notes yet. Keep them short. Future-you will thank you.
                </div>
              )}
            </div>
          </aside>

          {/* Detail / Editor */}
          <article
            style={{
              border,
              borderRadius: 18,
              background: shellBg,
              padding: 16,
              boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
            }}
          >
            {/* Empty state */}
            {!selected && mode !== 'edit' && (
              <div style={{ padding: 8 }}>
                <div style={{ fontSize: 14, fontWeight: 700, opacity: 0.9 }}>No note selected</div>
                <div style={{ marginTop: 10, fontSize: 13.5, opacity: 0.7, lineHeight: 1.6 }}>
                  Create a note when a decision feels heavy.
                  <br />
                  Keep it simple: decision, assumptions, disconfirming evidence, confidence.
                </div>
              </div>
            )}

            {/* View mode */}
            {selected && mode !== 'edit' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 12.5, opacity: 0.6 }}>Decision note</div>
                    <h2 style={{ fontSize: 20, margin: '6px 0 0', letterSpacing: -0.3 }}>
                      {selected.decision}
                    </h2>
                    <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <span style={pillStyle}>{selected.confidence}</span>
                      {selected.tags.map((t) => (
                        <span key={t} style={pillStyle}>
                          {t}
                        </span>
                      ))}
                      <span style={pillStyle}>Created {formatDate(selected.createdAt)}</span>
                      <span style={pillStyle}>Updated {formatDate(selected.updatedAt)}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <button
                      onClick={() => beginEdit(selected)}
                      style={{
                        borderRadius: 12,
                        border: 'none',
                        padding: '10px 12px',
                        background: '#0b0b0b',
                        color: '#fff',
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteNote(selected.id)}
                      style={{
                        borderRadius: 12,
                        border: '1px solid rgba(0,0,0,0.10)',
                        padding: '10px 12px',
                        background: 'rgba(255,255,255,0.6)',
                        color: '#111',
                        fontSize: 13,
                        fontWeight: 650,
                        cursor: 'pointer',
                        opacity: 0.9,
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div style={{ marginTop: 16, display: 'grid', gap: 10 }}>
                  <Section title="Key assumptions" bullets={selected.assumptions} />
                  <Section title="What would change my mind" bullets={selected.changeMind} />
                </div>

                <div style={{ marginTop: 14, fontSize: 12.5, opacity: 0.62 }}>
                  Outcomes intentionally excluded. This is about decision quality at commitment time.
                </div>
              </div>
            )}

            {/* Edit mode (new or edit) */}
            {mode === 'edit' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 12.5, opacity: 0.6 }}>
                      {showNew ? 'New note' : 'Edit note'}
                    </div>
                    <h2 style={{ fontSize: 20, margin: '6px 0 0', letterSpacing: -0.3 }}>
                      Keep it short. Future-you will re-read this.
                    </h2>
                  </div>

                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <button
                      onClick={upsertNote}
                      style={{
                        borderRadius: 12,
                        border: 'none',
                        padding: '10px 12px',
                        background: '#0b0b0b',
                        color: '#fff',
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        // cancel: return to view if editing existing; otherwise go back to list
                        if (selected) {
                          setMode('view');
                        } else {
                          setMode('list');
                        }
                      }}
                      style={{
                        borderRadius: 12,
                        border: '1px solid rgba(0,0,0,0.10)',
                        padding: '10px 12px',
                        background: 'rgba(255,255,255,0.6)',
                        color: '#111',
                        fontSize: 13,
                        fontWeight: 650,
                        cursor: 'pointer',
                        opacity: 0.9,
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>

                {/* Editor form */}
                <div style={{ marginTop: 16, display: 'grid', gap: 12 }}>
                  <FieldLabel label="Decision (one sentence)" />
                  <input
                    value={decision}
                    onChange={(e) => setDecision(e.target.value)}
                    placeholder="Example: Increase NVIDIA exposure despite RSU concentration, with a 30% drawdown tolerance."
                    style={{
                      width: '100%',
                      borderRadius: 12,
                      border: '1px solid rgba(0,0,0,0.15)',
                      padding: '10px 12px',
                      fontSize: 14,
                      background: '#fff',
                      outline: 'none',
                    }}
                  />

                  <FieldLabel label="Key assumptions (1–5 lines)" hint="One per line." />
                  <textarea
                    value={assumptionsText}
                    onChange={(e) => setAssumptionsText(e.target.value)}
                    placeholder="Example:\n- Demand stays durable over the horizon\n- Volatility ≠ impairment\n- I can hold through a 30% drawdown"
                    rows={5}
                    style={{
                      width: '100%',
                      borderRadius: 14,
                      border: '1px solid rgba(0,0,0,0.15)',
                      padding: 14,
                      fontSize: 14,
                      lineHeight: 1.45,
                      resize: 'vertical',
                      background: '#fff',
                      outline: 'none',
                    }}
                  />

                  <FieldLabel label="What would change your mind (1–5 lines)" hint="Disconfirming evidence. One per line." />
                  <textarea
                    value={changeMindText}
                    onChange={(e) => setChangeMindText(e.target.value)}
                    placeholder="Example:\n- Revenue deceleration with margin pressure\n- Clear signal of product cycle break\n- My exposure exceeds pre-committed cap"
                    rows={5}
                    style={{
                      width: '100%',
                      borderRadius: 14,
                      border: '1px solid rgba(0,0,0,0.15)',
                      padding: 14,
                      fontSize: 14,
                      lineHeight: 1.45,
                      resize: 'vertical',
                      background: '#fff',
                      outline: 'none',
                    }}
                  />

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <FieldLabel label="Confidence" />
                      <select
                        value={confidence}
                        onChange={(e) => setConfidence(e.target.value as Confidence)}
                        style={{
                          width: '100%',
                          borderRadius: 12,
                          border: '1px solid rgba(0,0,0,0.15)',
                          padding: '10px 12px',
                          fontSize: 14,
                          background: '#fff',
                          outline: 'none',
                        }}
                      >
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                      </select>
                    </div>

                    <div>
                      <FieldLabel label="Tags (optional)" hint="Comma-separated. Max 8." />
                      <input
                        value={tagsText}
                        onChange={(e) => setTagsText(e.target.value)}
                        placeholder="RSUs, concentration, sizing"
                        style={{
                          width: '100%',
                          borderRadius: 12,
                          border: '1px solid rgba(0,0,0,0.15)',
                          padding: '10px 12px',
                          fontSize: 14,
                          background: '#fff',
                          outline: 'none',
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ fontSize: 12.5, opacity: 0.62, lineHeight: 1.6 }}>
                    Keep this free of outcomes and storytelling. You’re recording decision quality at the time of commitment.
                  </div>
                </div>
              </div>
            )}
          </article>
        </section>

        {/* Footer (quiet) */}
        <footer style={{ maxWidth: 980, margin: '18px auto 0', textAlign: 'center' }}>
          <div style={{ fontSize: 13, opacity: 0.55 }}>
            Local-only notes. Stored in your browser. Export if you want portability.
          </div>
        </footer>
      </main>
    </div>
  );
}

function FieldLabel({ label, hint }: { label: string; hint?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
      <div style={{ fontSize: 13, fontWeight: 700, opacity: 0.9 }}>{label}</div>
      {hint ? <div style={{ fontSize: 12.5, opacity: 0.6 }}>{hint}</div> : null}
    </div>
  );
}

function Section({ title, bullets }: { title: string; bullets: string[] }) {
  return (
    <div
      style={{
        border: '1px solid rgba(0,0,0,0.10)',
        borderRadius: 14,
        background: 'rgba(255,255,255,0.55)',
        padding: 12,
      }}
    >
      <div style={{ fontSize: 12.5, opacity: 0.62 }}>{title}</div>
      {bullets.length ? (
        <ul style={{ margin: '8px 0 0', paddingLeft: 18, opacity: 0.9, lineHeight: 1.55 }}>
          {bullets.map((b, i) => (
            <li key={i} style={{ marginBottom: 4, fontSize: 13.5 }}>
              {b}
            </li>
          ))}
        </ul>
      ) : (
        <div style={{ marginTop: 8, fontSize: 13.5, opacity: 0.75 }}>
          —
        </div>
      )}
    </div>
  );
}
