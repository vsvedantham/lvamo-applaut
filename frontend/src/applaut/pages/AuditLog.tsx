import { useEffect, useState } from 'react'
import { getAuditLogs, type AuditEntry } from '../api/audit'

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  'discovery.run':           { label: 'Discovery',         color: '#2563eb' },
  'scoring.run':             { label: 'Scoring',           color: '#7c3aed' },
  'document.generate':       { label: 'Document',          color: '#059669' },
  'application.create':      { label: 'Application',       color: '#d97706' },
  'application.status_change': { label: 'Status change',  color: '#6b7280' },
}

const FILTERS = [
  { label: 'All',           value: '' },
  { label: 'Discovery',     value: 'profile' },
  { label: 'Documents',     value: 'opportunity' },
  { label: 'Applications',  value: 'application' },
]

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function ActionBadge({ action }: { action: string }) {
  const cfg = ACTION_LABELS[action] ?? { label: action, color: '#9ca3af' }
  return (
    <span style={{ padding: '0.15rem 0.55rem', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 600, background: cfg.color + '18', color: cfg.color, whiteSpace: 'nowrap' }}>
      {cfg.label}
    </span>
  )
}

function StateDetail({ state }: { state: Record<string, unknown> }) {
  const entries = Object.entries(state).filter(([, v]) => v !== null && v !== undefined)
  if (!entries.length) return null
  return (
    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.35rem' }}>
      {entries.map(([k, v]) => (
        <span key={k} style={{ fontSize: '0.72rem', color: '#6b7280' }}>
          <span style={{ color: '#374151', fontWeight: 500 }}>{k}:</span> {String(v)}
        </span>
      ))}
    </div>
  )
}

export default function AuditLog() {
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [filter, setFilter] = useState('')
  const [loading, setLoading] = useState(true)

  const PAGE_SIZE = 50

  const load = async (p = 1, f = filter) => {
    setLoading(true)
    try {
      const res = await getAuditLogs({ entity_type: f || undefined, page: p, page_size: PAGE_SIZE })
      setEntries(res.items)
      setTotal(res.total)
      setPage(p)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load(1, filter) }, [filter])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Audit Log</h1>
          {!loading && <p style={{ color: '#6b7280', fontSize: '0.875rem', marginTop: '0.25rem' }}>{total} events</p>}
        </div>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          {FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              style={{ padding: '0.35rem 0.75rem', background: filter === f.value ? '#111827' : 'transparent', color: filter === f.value ? '#fff' : '#6b7280', border: '1px solid', borderColor: filter === f.value ? '#111827' : '#e5e7eb', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p style={{ color: '#6b7280' }}>Loading…</p>
      ) : entries.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', border: '1px dashed #d1d5db', borderRadius: '8px' }}>
          <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>No events yet</p>
          <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>Actions like running discovery, scoring, and generating documents will appear here.</p>
        </div>
      ) : (
        <>
          <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
            {entries.map((entry, i) => (
              <div
                key={entry.id}
                style={{ padding: '0.875rem 1rem', borderBottom: i < entries.length - 1 ? '1px solid #f3f4f6' : 'none', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}
              >
                <div style={{ flexShrink: 0, paddingTop: '1px' }}>
                  <ActionBadge action={entry.action} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: '#111827' }}>
                    {entry.action}
                    {entry.entity_type && <span style={{ color: '#9ca3af', fontSize: '0.8rem', marginLeft: '0.4rem' }}>· {entry.entity_type}</span>}
                  </p>
                  {entry.after_state && <StateDetail state={entry.after_state} />}
                </div>
                <span style={{ fontSize: '0.75rem', color: '#9ca3af', flexShrink: 0, paddingTop: '2px' }}>{timeAgo(entry.created_at)}</span>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1.25rem' }}>
              <button
                onClick={() => load(page - 1)}
                disabled={page === 1}
                style={{ padding: '0.35rem 0.75rem', border: '1px solid #e5e7eb', borderRadius: '6px', cursor: 'pointer', background: 'transparent', fontSize: '0.8rem', opacity: page === 1 ? 0.4 : 1 }}
              >
                ← Prev
              </button>
              <span style={{ fontSize: '0.8rem', color: '#6b7280', display: 'flex', alignItems: 'center' }}>
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => load(page + 1)}
                disabled={page === totalPages}
                style={{ padding: '0.35rem 0.75rem', border: '1px solid #e5e7eb', borderRadius: '6px', cursor: 'pointer', background: 'transparent', fontSize: '0.8rem', opacity: page === totalPages ? 0.4 : 1 }}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
