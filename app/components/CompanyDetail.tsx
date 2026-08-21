'use client';

import { useEffect, useState, useMemo } from 'react';
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
} from '../lib/lumen';
import { calculateFormulaMetadata, parseSecondaryValue, type FormulaMetadata } from '../lib/formula';

function getContributorId() {
  if (typeof window === 'undefined') return 'anonymous';
  let id = window.localStorage.getItem('lumen_contributor_id');
  if (!id) {
    id = `guest_${Math.random().toString(36).slice(2, 8)}`;
    window.localStorage.setItem('lumen_contributor_id', id);
  }
  return id;
}

function formatRelativeTime(timestamp: string | null | undefined): string {
  if (!timestamp) return 'never';
  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return then.toLocaleDateString();
}

type Contributor = { name: string; total: number; verified: number; rejected: number; accuracy: number | null };
type Comp = { name: string; ticker: string; multiple: number; sourceLabel: string; impliedValuation: number };
type CompsResult = {
  revenueBillions: number;
  revenueSource: { description: string; sourceLabel: string; date: string; isProjected?: boolean };
  comps: Comp[];
  ownMultiples: { lastRound: number | null; lastRoundConfirmed: boolean; aiFairValue: number | null };
};

const emptyForm = {
  category: CATEGORIES[0],
  description: '',
  value: '',
  sourceType: MANUAL_SOURCE_TYPES[0],
  sourceLabel: '',
  date: '',
};

export default function CompanyDetail({ companyId, onRefreshNeeded }: { companyId: string; onRefreshNeeded?: () => void }) {
  const [contributor, setContributor] = useState('anonymous');
  useEffect(() => {
    setContributor(getContributorId());
  }, []);

  const [company, setCompany] = useState<Company | null>(null);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [valuation, setValuation] = useState<Valuation | null>(null);
  const [loading, setLoading] = useState(true);

  const [contributors, setContributors] = useState<Contributor[]>([]);

  const [loadingValuation, setLoadingValuation] = useState(false);
  const [valuationError, setValuationError] = useState<string | null>(null);

  const [comps, setComps] = useState<CompsResult | null>(null);
  const [loadingComps, setLoadingComps] = useState(false);
  const [compsError, setCompsError] = useState<string | null>(null);
  const [whyOpen, setWhyOpen] = useState(false);
  const [methodologyOpen, setMethodologyOpen] = useState(false);

  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const [researching, setResearching] = useState(false);
  const [researchError, setResearchError] = useState<string | null>(null);

  const [disputingId, setDisputingId] = useState<string | null>(null);
  const [disputeNoteDraft, setDisputeNoteDraft] = useState('');

  async function refreshDetail() {
    setLoading(true);
    try {
      const res = await fetch(`/api/lumen/companies/${companyId}`);
      const data = await res.json();
      if (data.company) {
        setCompany(data.company);
        setEvidence(data.evidence || []);
        setValuation(data.valuation || null);
      }
    } finally {
      setLoading(false);
    }
  }

  async function refreshContributors() {
    const res = await fetch('/api/lumen/contributors');
    const data = await res.json();
    if (data.contributors) setContributors(data.contributors);
  }

  useEffect(() => {
    refreshDetail();
    refreshContributors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  const sortedEvidence = useMemo(
    () => [...evidence].sort((a, b) => (a.date < b.date ? 1 : -1)),
    [evidence]
  );

  function updateForm(field: string, val: string) {
    setForm((f) => ({ ...f, [field]: val }));
  }

  async function researchCompany() {
    setResearching(true);
    setResearchError(null);
    try {
      const res = await fetch(`/api/lumen/companies/${companyId}/research`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Research failed.');
      await refreshDetail();
      onRefreshNeeded?.();
    } catch (err: any) {
      setResearchError(err.message || 'Research failed. Try again.');
    } finally {
      setResearching(false);
    }
  }

  async function generateCompanyValuation() {
    setLoadingValuation(true);
    setValuationError(null);
    try {
      const res = await fetch(`/api/lumen/companies/${companyId}/valuation`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Valuation generation failed.');
      setValuation(data.valuation);
      onRefreshNeeded?.();
    } catch (err: any) {
      setValuationError(err.message || 'Failed to generate valuation.');
    } finally {
      setLoadingValuation(false);
    }
  }

  async function findCompsForCompany() {
    setLoadingComps(true);
    setComps(null);
    setCompsError(null);
    try {
      const res = await fetch(`/api/lumen/companies/${companyId}/comps`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to find comps.');
      setComps(data);
    } catch (err: any) {
      setCompsError(err.message || "Couldn't find comparable companies. Try again.");
    } finally {
      setLoadingComps(false);
    }
  }

  async function submitEvidence(e: React.FormEvent) {
    e.preventDefault();
    if (!form.description.trim() || !form.value.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/lumen/companies/${companyId}/evidence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, contributor }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit evidence.');

      setEvidence((prev) => [data.evidence, ...prev]);
      setForm(emptyForm);
      setShowAddForm(false);
      onRefreshNeeded?.();
    } catch (err: any) {
      alert(err.message || 'Failed to submit evidence.');
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmEvidence(id: string) {
    const res = await fetch(`/api/lumen/evidence/${id}/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contributor }),
    });
    const data = await res.json();
    if (data.evidence) {
      setEvidence((prev) => prev.map((e) => (e.id === id ? data.evidence : e)));
      onRefreshNeeded?.();
    }
  }

  async function disputeEvidence(id: string) {
    if (!disputeNoteDraft.trim()) return;

    const res = await fetch(`/api/lumen/evidence/${id}/dispute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contributor, note: disputeNoteDraft }),
    });
    const data = await res.json();
    if (data.evidence) {
      setEvidence((prev) => prev.map((e) => (e.id === id ? data.evidence : e)));
      setDisputingId(null);
      setDisputeNoteDraft('');
      onRefreshNeeded?.();
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center', color: '#8B95A1', fontSize: '14px' }}>
        Loading company details…
      </div>
    );
  }

  if (!company) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center', color: '#8B95A1', fontSize: '14px' }}>
        Company not found.
      </div>
    );
  }

  return (
    <div style={{ padding: '20px 0', borderTop: '1px solid #26303C' }}>
      {/* Company header - minimal since name/sector already shown in row */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          {company.symbol && (
            <span style={{ fontSize: '12px', color: '#8B95A1', padding: '4px 10px', background: '#141C26', borderRadius: '4px', border: '1px solid #26303C' }}>
              {company.symbol}
            </span>
          )}
          <button
            onClick={researchCompany}
            disabled={researching}
            className="overview-btn"
            style={{
              padding: '6px 12px',
              background: researching ? '#141C26' : '#C9A227',
              color: researching ? '#8B95A1' : '#0B0F14',
              border: '1px solid #26303C',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: researching ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            {researching ? (
              <>
                <Loader2 size={14} className="spin" />
                Researching...
              </>
            ) : (
              <>
                <TrendingUp size={14} />
                Research latest evidence
              </>
            )}
          </button>
        </div>
        {researchError && (
          <div style={{ fontSize: '12px', color: '#ef4444', marginBottom: '12px' }}>{researchError}</div>
        )}
      </div>

      {/* AI Valuation Card */}
      {valuation && (
        <div
          style={{
            border: '1px solid #26303C',
            borderRadius: '8px',
            background: valuation.base_case !== null
              ? 'linear-gradient(135deg, rgba(212,169,74,0.04), rgba(212,169,74,0.0))'
              : '#0E1319',
            padding: '18px 22px',
            marginBottom: '20px',
          }}
        >
          {valuation.base_case !== null ? (
            <>
              <div style={{ textAlign: 'center', fontSize: '11px', letterSpacing: '0.14em', color: '#5A6470', marginBottom: '10px', textTransform: 'uppercase' }}>
                CURRENT VALUATION
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px', marginBottom: '6px' }}>
                <span style={{ fontSize: '40px', fontWeight: 700, color: '#C9A227', letterSpacing: '-0.02em', lineHeight: 1 }}>
                  {fmtB(valuation.base_case)}
                </span>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    border: '1px solid rgba(74,222,128,0.35)',
                    background: 'rgba(74,222,128,0.08)',
                    color: '#4ADE80',
                    textTransform: 'uppercase',
                  }}
                >
                  {valuation.confidence_score}/100
                </span>
              </div>
              <div style={{ textAlign: 'center', color: '#5A6470', fontSize: '11px', marginTop: '8px' }}>
                AI fair value · formula-weighted
              </div>

              {/* Range bar */}
              <div style={{ margin: '20px auto 0', maxWidth: '500px' }}>
                <div style={{ position: 'relative', height: '6px', background: '#16161A', borderRadius: '3px', border: '1px solid #26303C' }}>
                  {(() => {
                    const markerPosition = ((valuation.base_case - valuation.bear_case) / (valuation.bull_case - valuation.bear_case)) * 100;
                    return (
                      <>
                        <div
                          style={{
                            position: 'absolute',
                            top: '-1px',
                            bottom: '-1px',
                            left: '10%',
                            right: '10%',
                            background: 'rgba(212,169,74,0.2)',
                            borderRadius: '3px',
                          }}
                        />
                        <div
                          style={{
                            position: 'absolute',
                            top: '-4px',
                            left: `${markerPosition}%`,
                            width: '2px',
                            height: '14px',
                            background: '#C9A227',
                            borderRadius: '1px',
                          }}
                        />
                      </>
                    );
                  })()}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', marginTop: '8px' }}>
                  <span style={{ color: '#8B95A1' }}>Bear {fmtB(valuation.bear_case)}</span>
                  <span style={{ color: '#C9A227', fontWeight: 600 }}>Base {fmtB(valuation.base_case)}</span>
                  <span style={{ color: '#8B95A1' }}>Bull {fmtB(valuation.bull_case)}</span>
                </div>
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '12px 0' }}>
              <div style={{ fontSize: '12px', color: '#8B95A1', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Insufficient Evidence
              </div>
              <div style={{ fontSize: '12px', color: '#5A6470', lineHeight: 1.5, maxWidth: '400px', margin: '0 auto' }}>
                {valuation.explanation || 'Need at least one confirmed funding round and supporting evidence.'}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Evidence Ledger */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#E8EAED', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>
            Evidence Ledger ({evidence.length})
          </h3>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="overview-btn"
            style={{
              padding: '6px 12px',
              background: showAddForm ? '#141C26' : '#C9A227',
              color: showAddForm ? '#8B95A1' : '#0B0F14',
              border: '1px solid #26303C',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            {showAddForm ? <X size={14} /> : <Plus size={14} />}
            {showAddForm ? 'Cancel' : 'Add evidence'}
          </button>
        </div>

        {/* Add evidence form */}
        {showAddForm && (
          <form onSubmit={submitEvidence} style={{ background: '#0E1319', border: '1px solid #26303C', borderRadius: '6px', padding: '14px', marginBottom: '14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginBottom: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#8B95A1', marginBottom: '4px' }}>
                  Category
                </label>
                <select
                  value={form.category}
                  onChange={(e) => updateForm('category', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    background: '#0B0F14',
                    border: '1px solid #26303C',
                    borderRadius: '4px',
                    color: '#E8EAED',
                    fontSize: '12px',
                  }}
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#8B95A1', marginBottom: '4px' }}>
                  Value *
                </label>
                <input
                  type="text"
                  value={form.value}
                  onChange={(e) => updateForm('value', e.target.value)}
                  placeholder="e.g. $5B, Series D"
                  required
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    background: '#0B0F14',
                    border: '1px solid #26303C',
                    borderRadius: '4px',
                    color: '#E8EAED',
                    fontSize: '12px',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#8B95A1', marginBottom: '4px' }}>
                  Date
                </label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => updateForm('date', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    background: '#0B0F14',
                    border: '1px solid #26303C',
                    borderRadius: '4px',
                    color: '#E8EAED',
                    fontSize: '12px',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#8B95A1', marginBottom: '4px' }}>
                  Source Type
                </label>
                <select
                  value={form.sourceType}
                  onChange={(e) => updateForm('sourceType', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    background: '#0B0F14',
                    border: '1px solid #26303C',
                    borderRadius: '4px',
                    color: '#E8EAED',
                    fontSize: '12px',
                  }}
                >
                  {MANUAL_SOURCE_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#8B95A1', marginBottom: '4px' }}>
                  Source Label
                </label>
                <input
                  type="text"
                  value={form.sourceLabel}
                  onChange={(e) => updateForm('sourceLabel', e.target.value)}
                  placeholder="e.g. TechCrunch, Form D"
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    background: '#0B0F14',
                    border: '1px solid #26303C',
                    borderRadius: '4px',
                    color: '#E8EAED',
                    fontSize: '12px',
                  }}
                />
              </div>
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#8B95A1', marginBottom: '4px' }}>
                Description *
              </label>
              <textarea
                value={form.description}
                onChange={(e) => updateForm('description', e.target.value)}
                placeholder="Describe the evidence..."
                required
                rows={2}
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  background: '#0B0F14',
                  border: '1px solid #26303C',
                  borderRadius: '4px',
                  color: '#E8EAED',
                  fontSize: '12px',
                  resize: 'vertical',
                }}
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="overview-btn"
              style={{
                padding: '6px 14px',
                background: '#C9A227',
                color: '#0B0F14',
                border: 'none',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: submitting ? 'not-allowed' : 'pointer',
                opacity: submitting ? 0.6 : 1,
              }}
            >
              {submitting ? 'Submitting...' : 'Submit evidence'}
            </button>
          </form>
        )}

        {/* Evidence list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {sortedEvidence.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 20px', color: '#5A6470', fontSize: '12px' }}>
              No evidence yet. Be the first to contribute!
            </div>
          ) : (
            sortedEvidence.map((ev) => {
              const needsConfirmations = confirmationsNeededFor(ev.contributor);
              const canConfirm = !ev.verified_by.includes(contributor);

              return (
                <div
                  key={ev.id}
                  style={{
                    background: ev.status === 'verified' ? '#0E1319' : '#141C26',
                    border: '1px solid #26303C',
                    borderRadius: '6px',
                    padding: '12px 14px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '6px' }}>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        padding: '3px 7px',
                        borderRadius: '3px',
                        background: '#1F2833',
                        color: '#8B95A1',
                      }}
                    >
                      {ev.category}
                    </span>
                    {ev.status === 'verified' && (
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 600,
                          padding: '3px 7px',
                          borderRadius: '3px',
                          background: 'rgba(74,222,128,0.12)',
                          color: '#4ADE80',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <CheckCircle2 size={10} /> VERIFIED
                      </span>
                    )}
                    <span style={{ fontSize: '11px', color: '#5A6470', marginLeft: 'auto' }}>{ev.date || 'No date'}</span>
                  </div>
                  <div style={{ fontSize: '13px', color: '#E8EAED', marginBottom: '6px', fontWeight: 500 }}>
                    {ev.value}
                  </div>
                  <div style={{ fontSize: '12px', color: '#8B95A1', lineHeight: 1.5, marginBottom: '8px' }}>
                    {ev.description}
                  </div>
                  {ev.source_label && (
                    <div style={{ fontSize: '11px', color: '#5A6470' }}>
                      Source: {ev.source_label}
                    </div>
                  )}

                  {/* Confirmation/dispute buttons */}
                  {ev.status !== 'verified' && needsConfirmations > 0 && (
                    <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ fontSize: '11px', color: '#8B95A1' }}>
                        Needs {needsConfirmations} more confirmation{needsConfirmations === 1 ? '' : 's'}
                      </div>
                      {canConfirm && (
                        <>
                          <button
                            onClick={() => confirmEvidence(ev.id)}
                            className="overview-btn"
                            style={{
                              padding: '4px 8px',
                              background: 'rgba(74,222,128,0.12)',
                              color: '#4ADE80',
                              border: '1px solid rgba(74,222,128,0.3)',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <CheckCircle2 size={12} /> Confirm
                          </button>
                          <button
                            onClick={() => setDisputingId(disputingId === ev.id ? null : ev.id)}
                            className="overview-btn"
                            style={{
                              padding: '4px 8px',
                              background: 'rgba(239,68,68,0.12)',
                              color: '#ef4444',
                              border: '1px solid rgba(239,68,68,0.3)',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <Flag size={12} /> Dispute
                          </button>
                        </>
                      )}
                    </div>
                  )}

                  {disputingId === ev.id && (
                    <div style={{ marginTop: '10px', padding: '10px', background: '#0B0F14', borderRadius: '4px', border: '1px solid #26303C' }}>
                      <textarea
                        value={disputeNoteDraft}
                        onChange={(e) => setDisputeNoteDraft(e.target.value)}
                        placeholder="Explain why this evidence is incorrect..."
                        rows={2}
                        style={{
                          width: '100%',
                          padding: '6px 8px',
                          background: '#141C26',
                          border: '1px solid #26303C',
                          borderRadius: '4px',
                          color: '#E8EAED',
                          fontSize: '11px',
                          marginBottom: '6px',
                        }}
                      />
                      <button
                        onClick={() => disputeEvidence(ev.id)}
                        disabled={!disputeNoteDraft.trim()}
                        className="overview-btn"
                        style={{
                          padding: '4px 10px',
                          background: '#ef4444',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 600,
                          cursor: disputeNoteDraft.trim() ? 'pointer' : 'not-allowed',
                          opacity: disputeNoteDraft.trim() ? 1 : 0.5,
                        }}
                      >
                        Submit dispute
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Contributors */}
      {contributors.length > 0 && (
        <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #26303C' }}>
          <h4 style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#8B95A1', marginBottom: '10px' }}>
            Top Contributors
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '8px' }}>
            {contributors.slice(0, 6).map((c) => (
              <div
                key={c.name}
                style={{
                  background: '#0E1319',
                  border: '1px solid #26303C',
                  borderRadius: '4px',
                  padding: '8px',
                }}
              >
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#E8EAED', marginBottom: '3px' }}>
                  {c.name}
                </div>
                <div style={{ fontSize: '10px', color: '#8B95A1' }}>
                  {c.verified} verified · {c.accuracy !== null ? `${Math.round(c.accuracy)}% accuracy` : 'New'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
