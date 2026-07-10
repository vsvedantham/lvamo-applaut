import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listOpportunities, runDiscovery, type Opportunity } from '../api/opportunity'

const SOURCE_LABELS: Record<string, string> = {
  greenhouse: 'Greenhouse',
  lever: 'Lever',
  ashby: 'Ashby',
  personio: 'Personio',
}

const REMOTE_COLORS: Record<string, string> = {
  remote: 'var(--success)',
  hybrid: 'var(--warn)',
  onsite: 'var(--text-3)',
}

function Badge({ text, color }: { text: string; color: string }) {
  return (
    <span style={{
      padding: '0.15rem 0.55rem',
      borderRadius: '999px',
      fontSize: '0.7rem',
      fontWeight: 500,
      background: `${color}1a`,
      color,
      border: `1px solid ${color}40`,
      whiteSpace: 'nowrap',
    }}>
      {text}
    </span>
  )
}

function OpportunityCard({ opp }: { opp: Opportunity }) {
  return (
    <Link
      to={`/opportunities/${opp.id}`}
      style={{
        display: 'block',
        textDecoration: 'none',
        padding: '1rem 1.25rem',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        transition: 'border-color 0.15s',
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-strong)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-1)', margin: '0 0 0.2rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {opp.title}
          </p>
          <p style={{ color: 'var(--text-2)', fontSize: '0.825rem', margin: '0 0 0.6rem' }}>{opp.company_name}</p>
          <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {opp.location_raw && (
              <span style={{ fontSize: '0.775rem', color: 'var(--text-2)' }}>📍 {opp.location_raw}</span>
            )}
            {opp.remote_option && (
              <Badge
                text={{ remote: 'Remote', hybrid: 'Hybrid', onsite: 'On-site' }[opp.remote_option] ?? opp.remote_option}
                color={REMOTE_COLORS[opp.remote_option] ?? 'var(--text-2)'}
              />
            )}
            <Badge text={SOURCE_LABELS[opp.source] ?? opp.source} color="var(--accent)" />
          </div>
        </div>
        {opp.posted_at && (
          <p style={{ fontSize: '0.72rem', color: 'var(--text-3)', whiteSpace: 'nowrap', flexShrink: 0 }}>
            {new Date(opp.posted_at).toLocaleDateString()}
          </p>
        )}
      </div>
    </Link>
  )
}

const selectStyle: React.CSSProperties = { width: 'auto', fontSize: '0.8rem', padding: '0.4rem 2rem 0.4rem 0.75rem' }

export default function Opportunities() {
  const [items, setItems] = useState<Opportunity[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [message, setMessage] = useState('')
  const [filterSource, setFilterSource] = useState('')
  const [filterCountry, setFilterCountry] = useState('')
  const PAGE_SIZE = 20

  const load = async (p = page) => {
    setLoading(true)
    try {
      const res = await listOpportunities({ page: p, page_size: PAGE_SIZE, source: filterSource || undefined, country_code: filterCountry || undefined })
      setItems(res.items)
      setTotal(res.total)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load(1); setPage(1) }, [filterSource, filterCountry])

  const discover = async () => {
    setRunning(true)
    setMessage('')
    try {
      const res = await runDiscovery()
      setMessage(res.message)
      load(1); setPage(1)
    } catch (err: any) {
      setMessage(err.response?.data?.detail ?? 'Discovery failed.')
    } finally {
      setRunning(false)
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div style={{ maxWidth: '760px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: 'var(--text-1)' }}>Opportunities</h1>
          {total > 0 && <p style={{ color: 'var(--text-2)', fontSize: '0.825rem', marginTop: '0.2rem' }}>{total} jobs found</p>}
        </div>
        <button
          onClick={discover}
          disabled={running}
          style={{ padding: '0.5rem 1.25rem', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-xs)', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500, opacity: running ? 0.7 : 1, whiteSpace: 'nowrap' }}
        >
          {running ? 'Searching…' : 'Run discovery'}
        </button>
      </div>

      {message && (
        <div style={{ padding: '0.75rem 1rem', background: 'var(--success-bg)', border: '1px solid var(--success-border)', borderRadius: 'var(--radius-xs)', marginBottom: '1.25rem' }}>
          <p style={{ color: 'var(--success)', fontSize: '0.85rem', margin: 0 }}>{message}</p>
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.625rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <select value={filterSource} onChange={e => setFilterSource(e.target.value)} style={selectStyle}>
          <option value="">All sources</option>
          <option value="greenhouse">Greenhouse</option>
          <option value="lever">Lever</option>
          <option value="ashby">Ashby</option>
          <option value="personio">Personio</option>
        </select>
        <select value={filterCountry} onChange={e => setFilterCountry(e.target.value)} style={selectStyle}>
          <option value="">All countries</option>
          <option value="DE">Germany</option>
          <option value="NL">Netherlands</option>
          <option value="FR">France</option>
          <option value="AT">Austria</option>
          <option value="CH">Switzerland</option>
          <option value="BE">Belgium</option>
          <option value="ES">Spain</option>
          <option value="IT">Italy</option>
          <option value="PT">Portugal</option>
          <option value="PL">Poland</option>
          <option value="SE">Sweden</option>
          <option value="NO">Norway</option>
          <option value="DK">Denmark</option>
          <option value="FI">Finland</option>
          <option value="IE">Ireland</option>
          <option value="CZ">Czech Republic</option>
          <option value="RO">Romania</option>
          <option value="HU">Hungary</option>
          <option value="US">United States</option>
        </select>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-2)' }}>Loading…</p>
      ) : items.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', border: '1px dashed var(--border-strong)', borderRadius: 'var(--radius)' }}>
          <p style={{ fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-1)' }}>No jobs found yet</p>
          <p style={{ color: 'var(--text-2)', fontSize: '0.85rem' }}>Click "Run discovery" to search across all job boards.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {items.map(opp => <OpportunityCard key={opp.id} opp={opp} />)}
        </div>
      )}

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.75rem', marginTop: '1.5rem' }}>
          <button
            onClick={() => { const p = page - 1; setPage(p); load(p) }}
            disabled={page === 1}
            style={{ padding: '0.375rem 0.875rem', background: 'var(--bg-surface)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-xs)', cursor: 'pointer', color: 'var(--text-1)', opacity: page === 1 ? 0.4 : 1 }}
          >
            ←
          </button>
          <span style={{ fontSize: '0.825rem', color: 'var(--text-2)' }}>Page {page} of {totalPages}</span>
          <button
            onClick={() => { const p = page + 1; setPage(p); load(p) }}
            disabled={page === totalPages}
            style={{ padding: '0.375rem 0.875rem', background: 'var(--bg-surface)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-xs)', cursor: 'pointer', color: 'var(--text-1)', opacity: page === totalPages ? 0.4 : 1 }}
          >
            →
          </button>
        </div>
      )}
    </div>
  )
}
