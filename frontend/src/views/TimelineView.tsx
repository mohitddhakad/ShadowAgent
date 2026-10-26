import React, { useState, useMemo } from 'react';
import {
  Search,
  CheckCircle,
  AlertTriangle,
  Clock,
  ListOrdered,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  Radio,
  ShieldCheck,
  Skull,
  X,
  SortAsc,
  SortDesc,
} from 'lucide-react';
import type { SimulationEvent } from '../types';
import { AgentBadge, SeverityBadge } from '../components/StatusBadge';

// ─── Props ────────────────────────────────────────────────────────────────────

interface TimelineViewProps {
  events: SimulationEvent[];
  runId?: string;
}

// ─── Event category classifier ────────────────────────────────────────────────

type EventCategory = 'attack' | 'detection' | 'containment' | 'honeypot' | 'recon';

function classifyEvent(e: SimulationEvent): EventCategory {
  const action = e.action.toLowerCase();
  const nodeId = (e.node_id || e.node_key || '').toLowerCase();

  if (nodeId.includes('honeypot') || action.includes('honeypot')) return 'honeypot';
  if (action.includes('block') || action.includes('contain') || action.includes('isolat') || action.includes('quarantin')) return 'containment';
  if (e.agent === 'Blue Team' && (action.includes('detect') || action.includes('alert') || action.includes('monitor') || action.includes('scan'))) return 'detection';
  if (action.includes('recon') || action.includes('scan') || action.includes('enum') || action.includes('discov')) return 'recon';
  return 'attack';
}

const CATEGORY_STYLE: Record<EventCategory, { color: string; bg: string; border: string; label: string }> = {
  attack:      { color: '#f87171', bg: '#2d1216', border: '#7f1d1d', label: 'Attack' },
  detection:   { color: '#34d399', bg: '#0b261d', border: '#065f46', label: 'Detection' },
  containment: { color: '#67e8f9', bg: '#082329', border: '#0e7490', label: 'Containment' },
  honeypot:    { color: '#fde047', bg: '#291e05', border: '#854d0e', label: 'Honeypot' },
  recon:       { color: '#fb923c', bg: '#361b0c', border: '#9a3412', label: 'Recon' },
};

function CategoryBadge({ category }: { category: EventCategory }) {
  const s = CATEGORY_STYLE[category];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 7px',
        borderRadius: 4,
        fontSize: 10,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        background: s.bg,
        color: s.color,
        border: `1px solid ${s.border}`,
        flexShrink: 0,
      }}
    >
      {category === 'honeypot' && <Radio size={9} />}
      {category === 'containment' && <ShieldCheck size={9} />}
      {category === 'attack' && <Skull size={9} />}
      {s.label}
    </span>
  );
}

// ─── Expanded Event Detail ────────────────────────────────────────────────────

function EventDetail({
  event,
  category,
  onClose,
}: {
  event: SimulationEvent;
  category: EventCategory;
  onClose: () => void;
}) {
  const s = CATEGORY_STYLE[category];
  const ts = new Date(event.timestamp || event.occurred_at || '');
  const timeStr = isNaN(ts.getTime()) ? '—' : ts.toLocaleString();

  return (
    <div
      style={{
        background: '#0d121f',
        border: `1px solid ${s.border}`,
        borderRadius: 8,
        padding: 16,
        position: 'relative',
      }}
    >
      <button
        onClick={onClose}
        style={{
          position: 'absolute',
          top: 10,
          right: 10,
          background: 'transparent',
          border: 'none',
          color: '#475569',
          cursor: 'pointer',
          lineHeight: 1,
          padding: 4,
        }}
      >
        <X size={13} />
      </button>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12, alignItems: 'center' }}>
        <AgentBadge agent={event.agent} />
        <SeverityBadge severity={event.severity} />
        <CategoryBadge category={category} />
        <span
          style={{
            fontSize: 10,
            color: event.success ? '#10b981' : '#ef4444',
            fontWeight: 700,
            textTransform: 'uppercase',
            background: event.success ? '#0b261d' : '#2d1216',
            padding: '2px 7px',
            borderRadius: 4,
            border: `1px solid ${event.success ? '#065f46' : '#7f1d1d'}`,
          }}
        >
          {event.success ? '✓ Succeeded' : '✕ Contained'}
        </span>
      </div>

      <div
        style={{
          fontFamily: 'monospace',
          fontSize: 13,
          fontWeight: 700,
          color: '#f8fafc',
          marginBottom: 6,
        }}
      >
        {event.action}
      </div>

      <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 12, lineHeight: 1.5 }}>
        {event.message}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 8,
          fontSize: 11,
        }}
      >
        <div style={{ background: '#121929', borderRadius: 5, padding: '8px 10px', border: '1px solid #1c2638' }}>
          <div style={{ color: '#475569', marginBottom: 3 }}>Target Node</div>
          <div style={{ color: '#38bdf8', fontFamily: 'monospace', fontWeight: 600 }}>
            {event.node_id || event.node_key || '—'}
          </div>
        </div>
        <div style={{ background: '#121929', borderRadius: 5, padding: '8px 10px', border: '1px solid #1c2638' }}>
          <div style={{ color: '#475569', marginBottom: 3 }}>Phase</div>
          <div style={{ color: '#94a3b8', fontWeight: 600 }}>
            {event.phase ? `Phase ${event.phase}` : '—'}
          </div>
        </div>
        <div style={{ background: '#121929', borderRadius: 5, padding: '8px 10px', border: '1px solid #1c2638' }}>
          <div style={{ color: '#475569', marginBottom: 3 }}>Timestamp</div>
          <div style={{ color: '#94a3b8', fontSize: 10 }}>{timeStr}</div>
        </div>
      </div>

      {event.details && Object.keys(event.details).length > 0 && (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 10, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
            Additional Details
          </div>
          <div
            style={{
              background: '#070a12',
              border: '1px solid #1c2638',
              borderRadius: 5,
              padding: 10,
              fontFamily: 'monospace',
              fontSize: 11,
              color: '#64748b',
              overflowX: 'auto',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
            }}
          >
            {JSON.stringify(event.details, null, 2)}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#64748b',
        gap: 14,
        padding: 40,
      }}
    >
      {hasFilters ? (
        <>
          <Search size={32} color="#2a3852" />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 14, color: '#475569', fontWeight: 600 }}>No events match the current filters</div>
            <div style={{ fontSize: 12, color: '#334155', marginTop: 4 }}>
              Try adjusting the agent, severity, or search query filters.
            </div>
          </div>
        </>
      ) : (
        <>
          <Clock size={40} color="#1c2638" />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#475569' }}>No simulation events yet</div>
            <div style={{ fontSize: 12, color: '#334155', marginTop: 4 }}>
              Run a simulation in the Simulation Lab to populate the event audit trail.
            </div>
            <div style={{ fontSize: 11, color: '#1c2638', marginTop: 8 }}>
              Events are sorted chronologically and scoped to the active simulation run.
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

type SortField = 'time' | 'severity' | 'agent';
type SortDir = 'asc' | 'desc';

const SEVERITY_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };

export const TimelineView: React.FC<TimelineViewProps> = ({ events, runId }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAgent, setSelectedAgent] = useState('all');
  const [selectedSeverity, setSelectedSeverity] = useState('all');
  const [selectedPhase, setSelectedPhase] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortField, setSortField] = useState<SortField>('time');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

  // Classify events once
  const categorizedEvents = useMemo(
    () => events.map((e) => ({ event: e, category: classifyEvent(e) })),
    [events]
  );

  // Unique phases
  const phases = useMemo(() => {
    const ps = new Set<number>();
    events.forEach((e) => { if (e.phase) ps.add(e.phase); });
    return Array.from(ps).sort();
  }, [events]);

  const filteredAndSorted = useMemo(() => {
    let filtered = categorizedEvents.filter(({ event: e, category }) => {
      if (selectedAgent !== 'all' && e.agent.toLowerCase() !== selectedAgent.toLowerCase()) return false;
      if (selectedSeverity !== 'all' && e.severity !== selectedSeverity) return false;
      if (selectedPhase !== 'all' && (e.phase ?? 1).toString() !== selectedPhase) return false;
      if (selectedCategory !== 'all' && category !== selectedCategory) return false;
      if (searchTerm.trim() !== '') {
        const q = searchTerm.toLowerCase();
        if (
          !e.action.toLowerCase().includes(q) &&
          !(e.node_id || e.node_key || '').toLowerCase().includes(q) &&
          !e.message.toLowerCase().includes(q) &&
          !e.agent.toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });

    filtered.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'time') {
        const ta = new Date(a.event.timestamp || a.event.occurred_at || '').getTime();
        const tb = new Date(b.event.timestamp || b.event.occurred_at || '').getTime();
        cmp = ta - tb;
      } else if (sortField === 'severity') {
        cmp = (SEVERITY_ORDER[a.event.severity] ?? 99) - (SEVERITY_ORDER[b.event.severity] ?? 99);
      } else if (sortField === 'agent') {
        cmp = a.event.agent.localeCompare(b.event.agent);
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return filtered;
  }, [categorizedEvents, selectedAgent, selectedSeverity, selectedPhase, selectedCategory, searchTerm, sortField, sortDir]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const SortBtn = ({ field, label }: { field: SortField; label: string }) => (
    <button
      onClick={() => toggleSort(field)}
      style={{
        background: sortField === field ? '#121929' : 'transparent',
        border: `1px solid ${sortField === field ? '#2a3852' : 'transparent'}`,
        color: sortField === field ? '#94a3b8' : '#475569',
        borderRadius: 4,
        padding: '3px 8px',
        fontSize: 10,
        fontWeight: 600,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
      }}
    >
      {sortField === field ? (
        sortDir === 'asc' ? <SortAsc size={11} /> : <SortDesc size={11} />
      ) : (
        <ArrowUpDown size={11} />
      )}
      {label}
    </button>
  );

  const hasFilters =
    selectedAgent !== 'all' ||
    selectedSeverity !== 'all' ||
    selectedPhase !== 'all' ||
    selectedCategory !== 'all' ||
    searchTerm.trim() !== '';

  const selStyle: React.CSSProperties = {
    background: '#121929',
    border: '1px solid #2a3852',
    color: '#f8fafc',
    borderRadius: 6,
    padding: '5px 10px',
    fontSize: 12,
    cursor: 'pointer',
    outline: 'none',
  };

  return (
    <div
      style={{
        padding: 24,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        height: '100%',
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      {/* ── Header & Filters ── */}
      <div
        style={{
          background: '#0d121f',
          border: '1px solid #1c2638',
          borderRadius: 8,
          padding: '12px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          flexShrink: 0,
        }}
      >
        {/* Title row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ListOrdered size={16} color="#06b6d4" />
            <span style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc' }}>Event Audit Trail</span>
            {runId && (
              <span style={{ fontSize: 11, color: '#475569', fontFamily: 'monospace' }}>
                [Run: {runId.slice(0, 8)}…]
              </span>
            )}
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: 4,
                background: '#121929',
                color: '#94a3b8',
                border: '1px solid #1c2638',
              }}
            >
              {filteredAndSorted.length} / {events.length} events
            </span>
          </div>

          {/* Sort controls */}
          <div style={{ display: 'flex', gap: 4 }}>
            <SortBtn field="time" label="Time" />
            <SortBtn field="severity" label="Severity" />
            <SortBtn field="agent" label="Agent" />
          </div>
        </div>

        {/* Filter row */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: '#121929',
              border: '1px solid #2a3852',
              borderRadius: 6,
              padding: '4px 10px',
              flex: '1 1 180px',
              maxWidth: 260,
            }}
          >
            <Search size={12} color="#64748b" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search action / node / message…"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#f8fafc',
                fontSize: 12,
                outline: 'none',
                width: '100%',
              }}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                style={{ background: 'transparent', border: 'none', color: '#475569', cursor: 'pointer', lineHeight: 1, padding: 0 }}
              >
                <X size={11} />
              </button>
            )}
          </div>

          <select value={selectedAgent} onChange={(e) => setSelectedAgent(e.target.value)} style={selStyle}>
            <option value="all">All Agents</option>
            <option value="red team">Red Team</option>
            <option value="blue team">Blue Team</option>
          </select>

          <select value={selectedSeverity} onChange={(e) => setSelectedSeverity(e.target.value)} style={selStyle}>
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} style={selStyle}>
            <option value="all">All Categories</option>
            <option value="attack">Attack</option>
            <option value="detection">Detection</option>
            <option value="containment">Containment</option>
            <option value="honeypot">Honeypot</option>
            <option value="recon">Recon</option>
          </select>

          {phases.length > 0 && (
            <select value={selectedPhase} onChange={(e) => setSelectedPhase(e.target.value)} style={selStyle}>
              <option value="all">All Phases</option>
              {phases.map((p) => (
                <option key={p} value={p.toString()}>
                  Phase {p}
                </option>
              ))}
            </select>
          )}

          {hasFilters && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedAgent('all');
                setSelectedSeverity('all');
                setSelectedPhase('all');
                setSelectedCategory('all');
              }}
              style={{
                background: 'transparent',
                border: '1px solid #2a3852',
                color: '#64748b',
                borderRadius: 6,
                padding: '5px 10px',
                fontSize: 11,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <X size={11} /> Clear
            </button>
          )}
        </div>
      </div>

      {/* ── Event List ── */}
      <div
        style={{
          flex: 1,
          background: '#0d121f',
          border: '1px solid #1c2638',
          borderRadius: 8,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {filteredAndSorted.length === 0 ? (
          <EmptyState hasFilters={hasFilters} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {/* Table Header */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '120px 90px 80px 130px 100px 70px 80px 1fr 36px',
                gap: 0,
                background: '#121929',
                borderBottom: '1px solid #1c2638',
                padding: '8px 16px',
                position: 'sticky',
                top: 0,
                zIndex: 2,
              }}
            >
              {['Time', 'Agent', 'Phase', 'Category', 'Target', 'Severity', 'Outcome', 'Message', ''].map((h) => (
                <div
                  key={h}
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: '#475569',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    padding: '0 4px',
                  }}
                >
                  {h}
                </div>
              ))}
            </div>

            {/* Rows */}
            {filteredAndSorted.map(({ event: e, category }, idx) => {
              const isExpanded = expandedEventId === (e.id || String(idx));
              const ts = new Date(e.timestamp || e.occurred_at || '');
              const timeStr = isNaN(ts.getTime()) ? '—' : ts.toLocaleTimeString();
              const catStyle = CATEGORY_STYLE[category];

              return (
                <div key={e.id || idx}>
                  {/* Row */}
                  <div
                    onClick={() =>
                      setExpandedEventId(isExpanded ? null : (e.id || String(idx)))
                    }
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '120px 90px 80px 130px 100px 70px 80px 1fr 36px',
                      gap: 0,
                      padding: '9px 16px',
                      borderBottom: '1px solid #141b2a',
                      background: isExpanded
                        ? `${catStyle.bg}`
                        : idx % 2 === 0
                        ? 'transparent'
                        : '#0b0f1a',
                      cursor: 'pointer',
                      borderLeft: `3px solid ${isExpanded ? catStyle.color : 'transparent'}`,
                      transition: 'background 0.1s',
                      alignItems: 'center',
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        color: '#64748b',
                        fontFamily: 'monospace',
                        padding: '0 4px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {timeStr}
                    </div>
                    <div style={{ padding: '0 4px' }}>
                      <AgentBadge agent={e.agent} />
                    </div>
                    <div style={{ padding: '0 4px', fontSize: 11, color: '#64748b' }}>
                      {e.phase ? `P${e.phase}` : '—'}
                    </div>
                    <div style={{ padding: '0 4px' }}>
                      <CategoryBadge category={category} />
                    </div>
                    <div
                      style={{
                        padding: '0 4px',
                        fontSize: 11,
                        color: '#38bdf8',
                        fontFamily: 'monospace',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {e.node_id || e.node_key || '—'}
                    </div>
                    <div style={{ padding: '0 4px' }}>
                      <SeverityBadge severity={e.severity} />
                    </div>
                    <div style={{ padding: '0 4px' }}>
                      {e.success ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 3,
                            color: '#10b981',
                            fontSize: 10,
                            fontWeight: 700,
                          }}
                        >
                          <CheckCircle size={11} /> Succeed
                        </span>
                      ) : (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 3,
                            color: '#06b6d4',
                            fontSize: 10,
                            fontWeight: 700,
                          }}
                        >
                          <AlertTriangle size={11} /> Blocked
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        padding: '0 4px',
                        fontSize: 11,
                        color: '#94a3b8',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {e.message}
                    </div>
                    <div style={{ padding: '0 4px', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </div>
                  </div>

                  {/* Expanded Detail */}
                  {isExpanded && (
                    <div style={{ padding: '0 16px 12px', background: '#0a0f1c' }}>
                      <EventDetail
                        event={e}
                        category={category}
                        onClose={() => setExpandedEventId(null)}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
