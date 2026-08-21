'use client';

import { useEffect, useState, useMemo } from 'react';
import { Search, TrendingUp } from 'lucide-react';

type OverviewCompany = {
  id: string;
  name: string;
  slug: string;
  symbol: string | null;
  sector: string | null;
  valuation: number | null;
  bear_case: number | null;
  base_case: number | null;
  bull_case: number | null;
  confidence_score: number | null;
  revenue: number | null;
  revenue_source: string | null;
  revenue_date: string | null;
  multiple: number | null;
};

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

function fmtB(val: number | null): string {
  if (val === null) return 'N/D';
  if (val >= 1) return `$${val.toFixed(1)}B`;
  return `$${(val * 1000).toFixed(0)}M`;
}

function fmtMultiple(val: number | null): string {
  if (val === null) return 'N/A';
  if (val >= 100) return `${Math.round(val)}x`;
  if (val >= 10) return `${val.toFixed(1)}x`;
  return `${val.toFixed(2)}x`;
}

// Shared logarithmic scale: $10M to $1T
const DOMAIN_MIN = 0.01; // $10M in billions
const DOMAIN_MAX = 1000; // $1T in billions

function logPct(v: number | null): number {
  if (v === null || v <= 0) return 0;
  const lo = Math.log10(DOMAIN_MIN);
  const hi = Math.log10(DOMAIN_MAX);
  const p = (Math.log10(Math.max(v, DOMAIN_MIN)) - lo) / (hi - lo);
  return Math.max(0, Math.min(1, p)) * 100;
}

export default function OverviewPage() {
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

  const [companies, setCompanies] = useState<OverviewCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sectorFilter, setSectorFilter] = useState('');
  const [sortBy, setSortBy] = useState('valuation-desc');
  const [groupBySector, setGroupBySector] = useState(false);
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());

  const [showAddForm, setShowAddForm] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [addingCompany, setAddingCompany] = useState(false);
  const [addError, setAddError] = useState('');

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/lumen/companies/overview');
      const data = await res.json();
      if (data.companies) setCompanies(data.companies);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem('lumen_pinned_companies');
    if (stored) {
      try {
        const arr = JSON.parse(stored);
        setPinnedIds(new Set(arr));
      } catch {}
    }
  }, []);

  function togglePin(id: string) {
    setPinnedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (next.size >= 4) return prev; // Max 4
        next.add(id);
      }
      localStorage.setItem('lumen_pinned_companies', JSON.stringify(Array.from(next)));
      return next;
    });
  }

  function clearPins() {
    setPinnedIds(new Set());
    localStorage.removeItem('lumen_pinned_companies');
  }

  const sectors = useMemo(() => {
    const set = new Set<string>();
    companies.forEach((c) => {
      if (c.sector) set.add(c.sector);
    });
    return Array.from(set).sort();
  }, [companies]);

  const filtered = useMemo(() => {
    let list = companies.filter((c) => {
      const matchSearch =
        search === '' ||
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.sector?.toLowerCase().includes(search.toLowerCase());
      const matchSector = sectorFilter === '' || c.sector === sectorFilter;
      return matchSearch && matchSector;
    });

    // Sort
    list.sort((a, b) => {
      if (sortBy === 'valuation-desc') return (b.valuation || 0) - (a.valuation || 0);
      if (sortBy === 'valuation-asc') return (a.valuation || 0) - (b.valuation || 0);
      if (sortBy === 'multiple-desc') return (b.multiple || 0) - (a.multiple || 0);
      if (sortBy === 'multiple-asc') return (a.multiple || 0) - (b.multiple || 0);
      if (sortBy === 'revenue-desc') return (b.revenue || 0) - (a.revenue || 0);
      if (sortBy === 'revenue-asc') return (a.revenue || 0) - (b.revenue || 0);
      return 0;
    });

    return list;
  }, [companies, search, sectorFilter, sortBy]);

  const grouped = useMemo(() => {
    if (!groupBySector) return null;

    const map = new Map<string, OverviewCompany[]>();
    filtered.forEach((c) => {
      const sector = c.sector || 'Unknown';
      if (!map.has(sector)) map.set(sector, []);
      map.get(sector)!.push(c);
    });

    const groups = Array.from(map.entries()).map(([sector, comps]) => {
      const totalVal = comps.reduce((sum, c) => sum + (c.valuation || 0), 0);
      const multiples = comps.map((c) => c.multiple).filter((m): m is number => m !== null);
      const medianMultiple =
        multiples.length > 0
          ? multiples.sort((a, b) => a - b)[Math.floor(multiples.length / 2)]
          : null;

      return { sector, companies: comps, totalValuation: totalVal, medianMultiple };
    });

    groups.sort((a, b) => b.totalValuation - a.totalValuation);
    return groups;
  }, [filtered, groupBySector]);

  const pinned = useMemo(() => {
    return companies.filter((c) => pinnedIds.has(c.id));
  }, [companies, pinnedIds]);

  async function handleAddCompany(e: React.FormEvent) {
    e.preventDefault();
    if (!companyName.trim()) return;

    setAddingCompany(true);
    setAddError('');

    try {
      const res = await fetch('/api/lumen/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: companyName, contributor }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add company.');

      // Refresh companies
      const refreshRes = await fetch('/api/lumen/companies/overview');
      const refreshData = await refreshRes.json();
      if (refreshData.companies) setCompanies(refreshData.companies);

      setCompanyName('');
      setShowAddForm(false);
    } catch (err: any) {
      setAddError(err.message || 'Failed to add company.');
    } finally {
      setAddingCompany(false);
    }
  }

  if (loading) {
    return (
      <div style={{ fontFamily: 'Inter, sans-serif', background: '#0B0F14', minHeight: '100vh', color: '#8B95A1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Loading overview…
      </div>
    );
  }

  const CompanyRow = ({ c, showPin = true }: { c: OverviewCompany; showPin?: boolean }) => {
    const revPct = logPct(c.revenue);
    const valPct = logPct(c.valuation);

    // Multiple chip color
    let chipColor = '#5A6470';
    let chipBg = '#1A2129';
    if (c.multiple !== null) {
      const allMultiples = companies.map((co) => co.multiple).filter((m): m is number => m !== null).sort((a, b) => a - b);
      const tercile1 = allMultiples[Math.floor(allMultiples.length / 3)];
      const tercile2 = allMultiples[Math.floor((allMultiples.length * 2) / 3)];

      if (c.multiple <= tercile1) {
        chipColor = '#4ade80';
        chipBg = 'rgba(74,222,128,0.12)';
      } else if (c.multiple >= tercile2) {
        chipColor = '#ef4444';
        chipBg = 'rgba(239,68,68,0.12)';
      } else {
        chipColor = '#fbbf24';
        chipBg = 'rgba(251,191,36,0.12)';
      }
    }

    return (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: showPin ? '40px 1fr 100px' : '1fr 100px',
          gap: '14px',
          alignItems: 'center',
          background: '#15181b',
          border: '1px solid #26303C',
          borderRadius: '8px',
          padding: '12px 14px',
          cursor: 'pointer',
        }}
        onClick={() => window.location.href = `/?company=${c.id}`}
      >
        {showPin && (
          <div style={{ display: 'flex', justifyContent: 'center' }} onClick={(e) => e.stopPropagation()}>
            <input
              type="checkbox"
              checked={pinnedIds.has(c.id)}
              onChange={() => togglePin(c.id)}
              style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#C9A227' }}
            />
          </div>
        )}

        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '6px' }}>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#E8EAED' }}>{c.name}</div>
            {c.symbol && <div style={{ fontSize: '11px', color: '#5A6470' }}>({c.symbol})</div>}
          </div>
          {c.sector && <div style={{ fontSize: '11px', color: '#5A6470', marginBottom: '10px' }}>{c.sector}</div>}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            {/* Revenue bar */}
            <div style={{ position: 'relative', height: '10px' }}>
              {c.revenue !== null ? (
                <>
                  <div style={{ position: 'absolute', left: 0, top: 0, width: `${revPct}%`, height: '100%', background: '#3b82f6', borderRadius: '0 3px 3px 0', minWidth: '2px' }} />
                  <div style={{ position: 'absolute', left: `${revPct + 1}%`, top: '50%', transform: 'translateY(-50%)', fontSize: '10px', fontWeight: 600, color: '#E8EAED', whiteSpace: 'nowrap' }}>
                    {fmtB(c.revenue)} revenue
                  </div>
                </>
              ) : (
                <div style={{ fontSize: '10px', color: '#5A6470', fontStyle: 'italic' }}>Revenue not disclosed</div>
              )}
            </div>

            {/* Valuation bar */}
            <div style={{ position: 'relative', height: '10px' }}>
              {c.valuation !== null ? (
                <>
                  <div style={{ position: 'absolute', left: 0, top: 0, width: `${valPct}%`, height: '100%', background: '#C9A227', borderRadius: '0 3px 3px 0', minWidth: '2px' }} />
                  <div style={{ position: 'absolute', left: `${valPct + 1}%`, top: '50%', transform: 'translateY(-50%)', fontSize: '10px', fontWeight: 600, color: '#E8EAED', whiteSpace: 'nowrap' }}>
                    {fmtB(c.valuation)} valuation
                  </div>
                </>
              ) : (
                <div style={{ fontSize: '10px', color: '#5A6470', fontStyle: 'italic' }}>Valuation not disclosed</div>
              )}
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: chipColor, background: chipBg, padding: '4px 10px', borderRadius: '999px', display: 'inline-block' }}>
            {fmtMultiple(c.multiple)}
          </div>
          <div style={{ fontSize: '9px', color: '#5A6470', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Val / Rev</div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', background: '#0B0F14', minHeight: '100vh', color: '#E8EAED' }}>
      <style>{`
        .display { font-family: 'Space Grotesk', sans-serif; }
        .overview-btn:hover { filter: brightness(1.15); }
      `}</style>

      {/* Header */}
      <div style={{ borderBottom: '1px solid #1F2833', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '20px', background: '#0E1319' }}>
        <div className="display" style={{ fontSize: '15px', fontWeight: 600, letterSpacing: '0.04em', color: '#C9A227' }}>
          LUMEN
        </div>
        <a href="/" style={{ fontSize: '13px', color: '#8B95A1', textDecoration: 'none' }}>
          Deep Dive
        </a>
        <div style={{ fontSize: '13px', color: '#C9A227', fontWeight: 600 }}>Overview</div>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 20px' }}>
        <div style={{ marginBottom: '24px' }}>
          <h1 className="display" style={{ fontSize: '28px', fontWeight: 600, margin: '0 0 8px', color: '#E8EAED' }}>
            Company Overview
          </h1>
          <div style={{ fontSize: '14px', color: '#8B95A1' }}>
            {companies.length} companies · Revenue vs. Valuation on a shared scale
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '20px', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1 1 240px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#5A6470' }} />
            <input
              type="text"
              placeholder="Search companies or sectors…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px 9px 36px',
                background: '#15181b',
                border: '1px solid #26303C',
                borderRadius: '6px',
                color: '#E8EAED',
                fontSize: '13px',
                outline: 'none',
              }}
            />
          </div>

          <select
            value={sectorFilter}
            onChange={(e) => setSectorFilter(e.target.value)}
            style={{
              padding: '9px 12px',
              background: '#15181b',
              border: '1px solid #26303C',
              borderRadius: '6px',
              color: '#E8EAED',
              fontSize: '13px',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="">All sectors</option>
            {sectors.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{
              padding: '9px 12px',
              background: '#15181b',
              border: '1px solid #26303C',
              borderRadius: '6px',
              color: '#E8EAED',
              fontSize: '13px',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="valuation-desc">Highest valuation</option>
            <option value="valuation-asc">Lowest valuation</option>
            <option value="multiple-desc">Highest multiple</option>
            <option value="multiple-asc">Lowest multiple</option>
            <option value="revenue-desc">Highest revenue</option>
            <option value="revenue-asc">Lowest revenue</option>
          </select>

          <button
            className="overview-btn"
            onClick={() => setGroupBySector(!groupBySector)}
            style={{
              padding: '9px 14px',
              background: groupBySector ? '#C9A227' : '#15181b',
              color: groupBySector ? '#0B0F14' : '#E8EAED',
              border: '1px solid #26303C',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Group by sector
          </button>

          <button
            className="overview-btn"
            onClick={() => setShowAddForm(!showAddForm)}
            style={{
              padding: '9px 14px',
              background: '#C9A227',
              color: '#0B0F14',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            + Add company
          </button>
        </div>

        {/* Add company form */}
        {showAddForm && (
          <div style={{ background: '#15181b', border: '1px solid #26303C', borderRadius: '8px', padding: '16px', marginBottom: '20px' }}>
            <form onSubmit={handleAddCompany}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#8B95A1', marginBottom: '6px' }}>
                  Company Name *
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Mistral AI"
                  required
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: '#0B0F14',
                    border: '1px solid #26303C',
                    borderRadius: '6px',
                    color: '#E8EAED',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                />
              </div>
              <div style={{ fontSize: '12px', color: '#8B95A1', marginBottom: '12px' }}>
                This will trigger automatic research to find funding, revenue, and other evidence for this company.
              </div>
              {addError && (
                <div style={{ fontSize: '12px', color: '#ef4444', marginBottom: '12px' }}>{addError}</div>
              )}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="submit"
                  disabled={addingCompany}
                  className="overview-btn"
                  style={{
                    padding: '8px 16px',
                    background: '#C9A227',
                    color: '#0B0F14',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: addingCompany ? 'not-allowed' : 'pointer',
                    opacity: addingCompany ? 0.6 : 1,
                  }}
                >
                  {addingCompany ? 'Adding…' : 'Add company'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setAddError('');
                    setCompanyName('');
                  }}
                  style={{
                    padding: '8px 16px',
                    background: 'transparent',
                    color: '#8B95A1',
                    border: '1px solid #26303C',
                    borderRadius: '6px',
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Pinned companies panel */}
        {pinned.length > 0 && (
          <div style={{ background: '#15181b', border: '1px solid #26303C', borderRadius: '8px', padding: '16px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#E8EAED' }}>
                Comparing {pinned.length} compan{pinned.length === 1 ? 'y' : 'ies'}
              </div>
              <button
                onClick={clearPins}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#8B95A1',
                  fontSize: '12px',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                }}
              >
                Clear all
              </button>
            </div>
            <div style={{ fontSize: '11px', color: '#8B95A1', marginBottom: '12px' }}>
              Pin up to 4 companies to compare side-by-side
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
              {pinned.map((c) => (
                <CompanyRow key={c.id} c={c} showPin={false} />
              ))}
            </div>
          </div>
        )}

        {/* Company list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {groupBySector && grouped ? (
            grouped.map((group) => (
              <div key={group.sector}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', padding: '12px 4px 8px', borderBottom: '1px solid #26303C', marginBottom: '8px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#E8EAED' }}>{group.sector}</div>
                  <div style={{ fontSize: '11px', color: '#8B95A1' }}>
                    {group.companies.length} compan{group.companies.length === 1 ? 'y' : 'ies'} · {fmtB(group.totalValuation)} combined · {fmtMultiple(group.medianMultiple)} median multiple
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                  {group.companies.map((c) => (
                    <CompanyRow key={c.id} c={c} />
                  ))}
                </div>
              </div>
            ))
          ) : (
            filtered.map((c) => <CompanyRow key={c.id} c={c} />)
          )}
        </div>

        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#5A6470', fontSize: '14px' }}>
            No companies match your search.
          </div>
        )}
      </div>
    </div>
  );
}
