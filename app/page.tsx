'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Flag,
  ChevronDown,
  Plus,
  Loader2,
  ShieldCheck,
  X,
} from 'lucide-react';
import {
  CATEGORIES,
  CONFIDENCE_MAP,
  MANUAL_SOURCE_TYPES,
  confidenceColor,
  confirmationsNeededFor,
  fmtB,
  type Company,
  type Evidence,
  type Valuation,
} from './lib/lumen';

const FONTS_URL =
  'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap';

function getContributorId() {
  if (typeof window === 'undefined') return 'anonymous';
  let id = window.localStorage.getItem('lumen_contributor_id');
  if (!id) {
    id = `guest_${Math.random().toString(36).slice(2, 8)}`;
    window.localStorage.setItem('lumen_contributor_id', id);
  }
  return id;
}

type CompanyWithValuation = Company & { valuation: { base_case: number; confidence_score: number } | null };
type Contributor = { name: string; total: number; verified: number; rejected: number; accuracy: number | null };

const emptyForm = {
  category: CATEGORIES[0],
  description: '',
  value: '',
  sourceType: MANUAL_SOURCE_TYPES[0],
  sourceLabel: '',
  date: '',
};

const emptyCompanyForm = {
  name: '',
};

export default function App() {
  useEffect(() => {
    if (!document.getElementById('lumen-fonts')) {
      const link = document.createElement('link');
      link.id = 'lumen-fonts';
      link.rel = 'stylesheet';
      link.href = FONTS_URL;
      document.head.appendChild(link);
    }
  }, []);

  const [contributor, setContributor] = useState('anonymous');
  useEffect(() => {
    setContributor(getContributorId());
  }, []);

  const [companies, setCompanies] = useState<CompanyWithValuation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);

  const [company, setCompany] = useState<Company | null>(null);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [valuation, setValuation] = useState<Valuation | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [contributors, setContributors] = useState<Contributor[]>([]);

  const [loadingValuation, setLoadingValuation] = useState(false);
  const [valuationError, setValuationError] = useState<string | null>(null);
  const [whyOpen, setWhyOpen] = useState(false);

  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const [researching, setResearching] = useState(false);
  const [researchError, setResearchError] = useState<string | null>(null);

  const [showAddCompany, setShowAddCompany] = useState(false);
  const [companyForm, setCompanyForm] = useState(emptyCompanyForm);
  const [addingCompany, setAddingCompany] = useState(false);
  const [addCompanyError, setAddCompanyError] = useState<string | null>(null);

  const [disputingId, setDisputingId] = useState<string | null>(null);
  const [disputeNoteDraft, setDisputeNoteDraft] = useState('');

  async function refreshCompanies(selectId?: string) {
    const res = await fetch('/api/lumen/companies');
    const data = await res.json();
    if (data.companies) {
      setCompanies(data.companies);
      if (selectId) {
        setActiveId(selectId);
      } else if (!activeId && data.companies.length > 0) {
        setActiveId(data.companies[0].id);
      }
    }
  }

  async function refreshContributors() {
    const res = await fetch('/api/lumen/contributors');
    const data = await res.json();
    if (data.contributors) setContributors(data.contributors);
  }

  useEffect(() => {
    (async () => {
      await Promise.all([refreshCompanies(), refreshContributors()]);
      setInitializing(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refreshDetail(id: string) {
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/lumen/companies/${id}`);
      const data = await res.json();
      if (data.company) {
        setCompany(data.company);
        setEvidence(data.evidence || []);
        setValuation(data.valuation || null);
      }
    } finally {
      setLoadingDetail(false);
    }
  }

  useEffect(() => {
    if (!activeId) return;
    setWhyOpen(false);
    setValuationError(null);
    setResearchError(null);
    refreshDetail(activeId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  const sortedEvidence = useMemo(
    () => [...evidence].sort((a, b) => (a.date < b.date ? 1 : -1)),
    [evidence]
  );

  function updateForm(field: string, val: string) {
    setForm((f) => ({ ...f, [field]: val }));
  }

  async function researchCompany() {
    if (!activeId) return;
    setResearching(true);
    setResearchError(null);
    try {
      const res = await fetch(`/api/lumen/companies/${activeId}/research`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Research failed.');
      if (data.evidence && data.evidence.length > 0) {
        setEvidence((prev) => [...data.evidence, ...prev]);
        refreshContributors();
      } else {
        setResearchError('No new verifiable evidence found.');
      }
    } catch (err: any) {
      setResearchError(err.message || 'Research failed. Try again.');
    } finally {
      setResearching(false);
    }
  }

  async function submitEvidence(e: React.FormEvent) {
    e.preventDefault();
    if (!activeId || !form.description.trim() || !form.sourceLabel.trim() || !form.date) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/lumen/companies/${activeId}/evidence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, contributor }),
      });
      const data = await res.json();
      if (data.evidence) {
        setEvidence((prev) => [data.evidence, ...prev]);
        setForm(emptyForm);
        setShowAddForm(false);
        refreshContributors();
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function submitCompany(e: React.FormEvent) {
    e.preventDefault();
    if (!companyForm.name.trim()) {
      setAddCompanyError('Company name is required.');
      return;
    }
    setAddingCompany(true);
    setAddCompanyError(null);
    try {
      const res = await fetch('/api/lumen/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...companyForm, contributor }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAddCompanyError(data.error || 'Failed to add company.');
        return;
      }
      setCompanyForm(emptyCompanyForm);
      setShowAddCompany(false);
      await refreshCompanies(data.company.id);
    } finally {
      setAddingCompany(false);
    }
  }

  function openDispute(id: string) {
    setDisputingId(id);
    setDisputeNoteDraft('');
  }

  async function submitDispute(id: string) {
    if (!disputeNoteDraft.trim()) return;
    const res = await fetch(`/api/lumen/evidence/${id}/dispute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note: disputeNoteDraft.trim() }),
    });
    const data = await res.json();
    if (data.evidence) {
      setEvidence((prev) => prev.map((ev) => (ev.id === id ? data.evidence : ev)));
    }
    setDisputingId(null);
    setDisputeNoteDraft('');
  }

  async function confirmEvidence(id: string) {
    const res = await fetch(`/api/lumen/evidence/${id}/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contributor }),
    });
    const data = await res.json();
    if (data.evidence) {
      setEvidence((prev) => prev.map((ev) => (ev.id === id ? data.evidence : ev)));
      refreshContributors();
    }
  }

  async function resolveDispute(id: string, action: 'uphold' | 'dismiss') {
    const res = await fetch(`/api/lumen/evidence/${id}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    const data = await res.json();
    if (data.evidence) {
      setEvidence((prev) => prev.map((ev) => (ev.id === id ? data.evidence : ev)));
      refreshContributors();
    }
  }

  async function runValuation() {
    if (!activeId) return;
    setLoadingValuation(true);
    setValuationError(null);
    setWhyOpen(false);
    try {
      const res = await fetch(`/api/lumen/companies/${activeId}/valuation`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate valuation.');
      setValuation(data.valuation);
      setCompanies((prev) =>
        prev.map((c) =>
          c.id === activeId
            ? { ...c, valuation: { base_case: data.valuation.base_case, confidence_score: data.valuation.confidence_score } }
            : c
        )
      );
    } catch (err: any) {
      setValuationError(err.message || "Couldn't generate a valuation. Try again.");
    } finally {
      setLoadingValuation(false);
    }
  }

  if (initializing || !company) {
    return (
      <div
        style={{
          fontFamily: 'Inter, sans-serif',
          background: '#0B0F14',
          minHeight: '600px',
          color: '#8B95A1',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        Loading ledger…
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', background: '#0B0F14', minHeight: '600px', color: '#E8EAED' }}>
      <style>{`
        .mono { font-family: 'IBM Plex Mono', monospace; }
        .display { font-family: 'Space Grotesk', sans-serif; }
        .lumen-scroll::-webkit-scrollbar { height: 4px; }
        .lumen-scroll::-webkit-scrollbar-thumb { background: #26303C; border-radius: 2px; }
        button.lumen-btn:hover { filter: brightness(1.15); }
        .ev-row:hover { background: #161D26; }
      `}</style>

      {/* Ticker bar */}
      <div
        className="lumen-scroll"
        style={{
          display: 'flex',
          gap: '1px',
          borderBottom: '1px solid #1F2833',
          overflowX: 'auto',
          background: '#0E1319',
        }}
      >
        <div
          className="display"
          style={{
            padding: '14px 18px',
            fontSize: '15px',
            fontWeight: 600,
            letterSpacing: '0.04em',
            color: '#C9A227',
            whiteSpace: 'nowrap',
            borderRight: '1px solid #1F2833',
          }}
        >
          LUMEN
        </div>
        {companies.map((c) => {
          const isActive = c.id === activeId;
          return (
            <button
              key={c.id}
              onClick={() => setActiveId(c.id)}
              className="lumen-btn"
              style={{
                padding: '10px 18px',
                background: isActive ? '#141C26' : 'transparent',
                border: 'none',
                borderBottom: isActive ? '2px solid #C9A227' : '2px solid transparent',
                cursor: 'pointer',
                textAlign: 'left',
                whiteSpace: 'nowrap',
                minWidth: '140px',
              }}
            >
              <div style={{ fontSize: '12px', color: '#8B95A1' }} className="mono">
                {c.symbol}
              </div>
              <div style={{ fontSize: '13px', fontWeight: 500, color: isActive ? '#E8EAED' : '#B5BDC6' }}>{c.name}</div>
              <div className="mono" style={{ fontSize: '12px', color: c.valuation ? '#3FBF7F' : '#5A6470' }}>
                {c.valuation ? fmtB(c.valuation.base_case) : 'unvalued'}
              </div>
            </button>
          );
        })}
        <button
          onClick={() => setShowAddCompany((s) => !s)}
          className="lumen-btn"
          title="Add a company to the ledger"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '0 16px',
            background: 'transparent',
            border: 'none',
            color: '#8B95A1',
            cursor: 'pointer',
            fontSize: '13px',
            whiteSpace: 'nowrap',
          }}
        >
          <Plus size={14} /> Add company
        </button>
      </div>

      <div style={{ padding: '24px', maxWidth: '1040px', margin: '0 auto' }}>
        {showAddCompany && (
          <form
            onSubmit={submitCompany}
            style={{
              background: '#101620',
              border: '1px solid #26303C',
              borderRadius: '6px',
              padding: '14px',
              marginBottom: '20px',
              display: 'grid',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="display" style={{ fontSize: '13px', fontWeight: 600 }}>
                Add a company
              </span>
              <button
                type="button"
                onClick={() => setShowAddCompany(false)}
                style={{ background: 'none', border: 'none', color: '#8B95A1', cursor: 'pointer' }}
              >
                <X size={14} />
              </button>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <Field label="Company name">
                  <input
                    value={companyForm.name}
                    onChange={(e) => setCompanyForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. OpenAI"
                    style={inputStyle}
                    autoFocus
                  />
                </Field>
              </div>
              <button type="submit" disabled={addingCompany} style={{ ...primaryBtnStyle, opacity: addingCompany ? 0.6 : 1 }}>
                {addingCompany ? 'Researching…' : 'Add company'}
              </button>
            </div>
            <div style={{ fontSize: '11px', color: '#5A6470' }}>
              Sector, symbol, and known funding data are looked up automatically.
            </div>
            {addCompanyError && <div style={{ fontSize: '12px', color: '#E5484D' }}>{addCompanyError}</div>}
          </form>
        )}

        {/* Hero */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', flexWrap: 'wrap' }}>
            <h1 className="display" style={{ fontSize: '26px', fontWeight: 600, margin: 0 }}>
              {company.name}
            </h1>
            <span
              className="mono"
              style={{
                fontSize: '12px',
                color: '#8B95A1',
                border: '1px solid #26303C',
                borderRadius: '3px',
                padding: '2px 6px',
              }}
            >
              {company.symbol}
            </span>
            <span style={{ fontSize: '13px', color: '#8B95A1' }}>{company.sector}</span>
          </div>

          {/* Three-value strip */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1px',
              background: '#1F2833',
              marginTop: '18px',
              border: '1px solid #1F2833',
            }}
          >
            <ValueCell label="Last round" sub={company.last_round_date || '—'} value={fmtB(company.last_round_value)} />
            <ValueCell label="Secondary implied" sub={company.secondary_date || '—'} value={fmtB(company.secondary_value)} />
            <ValueCell
              label="AI / community fair value"
              sub={valuation ? `confidence ${valuation.confidence_score}/100` : 'not yet run'}
              value={valuation ? fmtB(valuation.base_case) : '—'}
              accent
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '20px', alignItems: 'start' }}>
          {/* Left: evidence ledger */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h2 className="display" style={{ fontSize: '15px', fontWeight: 600, margin: 0, letterSpacing: '0.02em' }}>
                Evidence ledger
              </h2>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={researchCompany}
                  disabled={researching}
                  className="lumen-btn"
                  title="Search the web for recent developments and add them as pending evidence"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'transparent',
                    border: '1px solid #26303C',
                    color: '#B5BDC6',
                    borderRadius: '4px',
                    padding: '6px 10px',
                    fontSize: '12px',
                    cursor: researching ? 'default' : 'pointer',
                    opacity: researching ? 0.6 : 1,
                  }}
                >
                  {researching && <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />}
                  {researching ? 'Researching…' : 'Research this company'}
                </button>
                <button
                  onClick={() => setShowAddForm((s) => !s)}
                  className="lumen-btn"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: '#141C26',
                    border: '1px solid #26303C',
                    color: '#E8EAED',
                    borderRadius: '4px',
                    padding: '6px 10px',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  <Plus size={13} /> Add evidence
                </button>
              </div>
            </div>
            <div style={{ fontSize: '11px', color: '#5A6470', marginBottom: '10px' }}>
              {loadingDetail ? 'Loading ledger…' : 'Evidence and valuations here are shared with everyone using this ledger.'}
            </div>
            {researchError && (
              <div style={{ fontSize: '11px', color: '#E5484D', marginBottom: '10px' }}>{researchError}</div>
            )}

            {showAddForm && (
              <form
                onSubmit={submitEvidence}
                style={{
                  background: '#101620',
                  border: '1px solid #26303C',
                  borderRadius: '6px',
                  padding: '14px',
                  marginBottom: '14px',
                  display: 'grid',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <Field label="Category">
                    <select value={form.category} onChange={(e) => updateForm('category', e.target.value)} style={selectStyle}>
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Value (optional)">
                    <input
                      value={form.value}
                      onChange={(e) => updateForm('value', e.target.value)}
                      placeholder="e.g. $50M ARR"
                      style={inputStyle}
                    />
                  </Field>
                </div>
                <Field label="Description">
                  <textarea
                    value={form.description}
                    onChange={(e) => updateForm('description', e.target.value)}
                    placeholder="What did you learn, and where from?"
                    rows={2}
                    style={{ ...inputStyle, resize: 'vertical' }}
                  />
                </Field>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                  <Field label="Source type">
                    <select value={form.sourceType} onChange={(e) => updateForm('sourceType', e.target.value)} style={selectStyle}>
                      {MANUAL_SOURCE_TYPES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Source label">
                    <input
                      value={form.sourceLabel}
                      onChange={(e) => updateForm('sourceLabel', e.target.value)}
                      placeholder="e.g. Bloomberg article"
                      style={inputStyle}
                    />
                  </Field>
                  <Field label="Date">
                    <input type="date" value={form.date} onChange={(e) => updateForm('date', e.target.value)} style={inputStyle} />
                  </Field>
                </div>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '4px' }}>
                  <span className="mono" style={{ fontSize: '11px', color: '#8B95A1', alignSelf: 'center', marginRight: 'auto' }}>
                    Assigned confidence: {CONFIDENCE_MAP[form.sourceType]}/100
                  </span>
                  <button type="submit" disabled={submitting} style={{ ...primaryBtnStyle, opacity: submitting ? 0.6 : 1 }}>
                    {submitting ? 'Submitting…' : 'Submit for review'}
                  </button>
                </div>
              </form>
            )}

            <div style={{ border: '1px solid #1F2833', borderRadius: '6px', overflow: 'hidden' }}>
              {sortedEvidence.length === 0 && (
                <div style={{ padding: '20px', fontSize: '13px', color: '#8B95A1' }}>No evidence yet.</div>
              )}
              {sortedEvidence.map((ev) => {
                const conf = CONFIDENCE_MAP[ev.source_type] ?? 50;
                return (
                  <div
                    key={ev.id}
                    className="ev-row"
                    style={{
                      display: 'flex',
                      gap: '10px',
                      padding: '10px 12px',
                      borderTop: '1px solid #1A222D',
                      opacity: ev.status === 'rejected' ? 0.5 : 1,
                    }}
                  >
                    <div
                      title={`Confidence ${conf}/100`}
                      style={{
                        width: '4px',
                        borderRadius: '2px',
                        background: '#1A222D',
                        alignSelf: 'stretch',
                        position: 'relative',
                        flexShrink: 0,
                      }}
                    >
                      <div
                        style={{
                          position: 'absolute',
                          bottom: 0,
                          left: 0,
                          right: 0,
                          height: `${conf}%`,
                          background: confidenceColor(conf),
                          borderRadius: '2px',
                        }}
                      />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <span
                          className="mono"
                          style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#C9A227' }}
                        >
                          {ev.category}
                        </span>
                        {ev.status === 'verified' && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#3FBF7F', fontSize: '11px' }}>
                            <CheckCircle2 size={11} /> verified
                          </span>
                        )}
                        {ev.status === 'pending' && (
                          <span style={{ fontSize: '11px', color: '#8B95A1' }}>
                            pending · {(ev.verified_by || []).length}/{confirmationsNeededFor(ev.source_type)} confirmations
                          </span>
                        )}
                        {ev.status === 'disputed' && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#E5484D', fontSize: '11px' }}>
                            <Flag size={11} /> disputed
                          </span>
                        )}
                        {ev.status === 'rejected' && (
                          <span style={{ fontSize: '11px', color: '#5A6470' }}>removed after dispute</span>
                        )}
                      </div>
                      <div
                        style={{
                          fontSize: '13px',
                          marginTop: '2px',
                          color: ev.status === 'rejected' ? '#5A6470' : 'inherit',
                          textDecoration: ev.status === 'rejected' ? 'line-through' : 'none',
                        }}
                      >
                        {ev.description}
                        {ev.value && (
                          <span className="mono" style={{ color: ev.status === 'rejected' ? '#5A6470' : '#C9A227', marginLeft: '6px' }}>
                            {ev.value}
                          </span>
                        )}
                      </div>
                      {ev.status === 'disputed' && ev.dispute_note && (
                        <div style={{ fontSize: '12px', color: '#E5A34D', marginTop: '3px' }}>{ev.dispute_note}</div>
                      )}
                      <div className="mono" style={{ fontSize: '11px', color: '#5A6470', marginTop: '3px' }}>
                        {ev.source_type} · {ev.source_label} · {ev.date} · by {ev.contributor}
                      </div>
                      {disputingId === ev.id ? (
                        <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                          <input
                            autoFocus
                            value={disputeNoteDraft}
                            onChange={(e) => setDisputeNoteDraft(e.target.value)}
                            placeholder="Why is this wrong? Cite a newer source."
                            style={{ ...inputStyle, flex: 1, fontSize: '12px' }}
                          />
                          <button onClick={() => submitDispute(ev.id)} style={{ ...primaryBtnStyle, padding: '5px 10px' }}>
                            Flag
                          </button>
                          <button
                            onClick={() => setDisputingId(null)}
                            style={{ background: 'none', border: 'none', color: '#8B95A1', cursor: 'pointer' }}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: '12px', marginTop: '4px', flexWrap: 'wrap' }}>
                          {ev.status === 'pending' && (
                            <button
                              onClick={() => confirmEvidence(ev.id)}
                              disabled={ev.contributor === contributor || (ev.verified_by || []).includes(contributor)}
                              title={ev.contributor === contributor ? "You can't confirm your own submission" : undefined}
                              style={{
                                background: 'none',
                                border: 'none',
                                color:
                                  ev.contributor === contributor || (ev.verified_by || []).includes(contributor)
                                    ? '#3A4048'
                                    : '#3FBF7F',
                                fontSize: '11px',
                                cursor: ev.contributor === contributor ? 'not-allowed' : 'pointer',
                                padding: 0,
                              }}
                            >
                              {(ev.verified_by || []).includes(contributor) ? 'You confirmed this' : 'Confirm this'}
                            </button>
                          )}
                          {ev.status === 'disputed' && (
                            <>
                              <button
                                onClick={() => resolveDispute(ev.id, 'dismiss')}
                                style={{ background: 'none', border: 'none', color: '#3FBF7F', fontSize: '11px', cursor: 'pointer', padding: 0 }}
                              >
                                Dismiss dispute
                              </button>
                              <button
                                onClick={() => resolveDispute(ev.id, 'uphold')}
                                style={{ background: 'none', border: 'none', color: '#E5484D', fontSize: '11px', cursor: 'pointer', padding: 0 }}
                              >
                                Uphold dispute
                              </button>
                            </>
                          )}
                          {(ev.status === 'pending' || ev.status === 'verified') && (
                            <button
                              onClick={() => openDispute(ev.id)}
                              style={{ background: 'none', border: 'none', color: '#5A6470', fontSize: '11px', cursor: 'pointer', padding: 0 }}
                            >
                              Dispute this
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right column */}
          <div style={{ display: 'grid', gap: '16px' }}>
            {/* AI valuation panel */}
            <div style={{ border: '1px solid #1F2833', borderRadius: '6px', padding: '14px', background: '#0E1319' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 className="display" style={{ fontSize: '13px', fontWeight: 600, margin: 0 }}>
                  AI valuation
                </h3>
                <button
                  onClick={runValuation}
                  disabled={loadingValuation}
                  style={{ ...primaryBtnStyle, opacity: loadingValuation ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  {loadingValuation && <Loader2 size={12} className="spin" style={{ animation: 'spin 1s linear infinite' }} />}
                  {valuation ? 'Re-run' : 'Run analysis'}
                </button>
              </div>

              {valuationError && <div style={{ fontSize: '12px', color: '#E5484D', marginTop: '8px' }}>{valuationError}</div>}

              {!valuation && !loadingValuation && !valuationError && (
                <div style={{ fontSize: '12px', color: '#8B95A1', marginTop: '8px' }}>
                  Runs the verified evidence below through an AI analyst to produce an explainable fair-value range.
                </div>
              )}

              {valuation && (
                <div style={{ marginTop: '12px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', textAlign: 'center' }}>
                    <CaseCell label="Bear" value={valuation.bear_case} />
                    <CaseCell label="Base" value={valuation.base_case} highlight />
                    <CaseCell label="Bull" value={valuation.bull_case} />
                  </div>

                  <div style={{ marginTop: '12px', display: 'grid', gap: '6px' }}>
                    {(valuation.key_drivers || []).map((d, i) => (
                      <div key={i} style={{ display: 'flex', gap: '6px', fontSize: '12px' }}>
                        {d.impact === '+' ? (
                          <TrendingUp size={13} color="#3FBF7F" style={{ flexShrink: 0, marginTop: '2px' }} />
                        ) : (
                          <TrendingDown size={13} color="#E5484D" style={{ flexShrink: 0, marginTop: '2px' }} />
                        )}
                        <div>
                          <span style={{ fontWeight: 500 }}>{d.label}</span>
                          <span style={{ color: '#8B95A1' }}> — {d.note}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => setWhyOpen((o) => !o)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#C9A227',
                      fontSize: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: 0,
                      marginTop: '12px',
                    }}
                  >
                    Why {fmtB(valuation.base_case)}?
                    <ChevronDown size={13} style={{ transform: whyOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
                  </button>
                  {whyOpen && <div style={{ fontSize: '12px', color: '#B5BDC6', marginTop: '6px', lineHeight: 1.5 }}>{valuation.explanation}</div>}
                </div>
              )}
            </div>

            {/* Contributors */}
            <div style={{ border: '1px solid #1F2833', borderRadius: '6px', padding: '14px' }}>
              <h3 className="display" style={{ fontSize: '13px', fontWeight: 600, margin: '0 0 10px' }}>
                Top contributors
              </h3>
              {contributors.length === 0 ? (
                <div style={{ fontSize: '12px', color: '#8B95A1' }}>No contributions yet.</div>
              ) : (
                <div style={{ display: 'grid', gap: '8px' }}>
                  {contributors.map((c) => (
                    <div key={c.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        {(c.accuracy ?? 0) >= 90 && <ShieldCheck size={12} color="#C9A227" />}
                        {c.name}
                      </span>
                      <span className="mono" style={{ color: (c.accuracy ?? 0) >= 90 ? '#3FBF7F' : '#8B95A1' }}>
                        {c.accuracy === null ? 'new' : `${c.accuracy}%`} · {c.total}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function ValueCell({ label, sub, value, accent }: { label: string; sub: string; value: string; accent?: boolean }) {
  return (
    <div style={{ background: accent ? '#141405' : '#0E1319', padding: '14px 16px' }}>
      <div style={{ fontSize: '11px', color: '#8B95A1', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      <div className="mono" style={{ fontSize: '22px', fontWeight: 500, color: accent ? '#C9A227' : '#E8EAED', marginTop: '2px' }}>
        {value}
      </div>
      <div style={{ fontSize: '11px', color: '#5A6470', marginTop: '2px' }}>{sub}</div>
    </div>
  );
}

function CaseCell({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div
      style={{
        padding: '8px 4px',
        borderRadius: '4px',
        background: highlight ? '#1A1608' : 'transparent',
        border: highlight ? '1px solid #3A2F0E' : '1px solid #1F2833',
      }}
    >
      <div style={{ fontSize: '10px', color: '#8B95A1', textTransform: 'uppercase' }}>{label}</div>
      <div className="mono" style={{ fontSize: '16px', fontWeight: 500, color: highlight ? '#C9A227' : '#E8EAED' }}>
        {fmtB(value)}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'grid', gap: '3px', fontSize: '11px', color: '#8B95A1' }}>
      {label}
      {children}
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  background: '#0B0F14',
  border: '1px solid #26303C',
  borderRadius: '4px',
  color: '#E8EAED',
  padding: '6px 8px',
  fontSize: '13px',
  fontFamily: 'Inter, sans-serif',
};

const selectStyle: React.CSSProperties = { ...inputStyle };

const primaryBtnStyle: React.CSSProperties = {
  background: '#C9A227',
  color: '#1A1608',
  border: 'none',
  borderRadius: '4px',
  padding: '6px 12px',
  fontSize: '12px',
  fontWeight: 600,
  cursor: 'pointer',
};
