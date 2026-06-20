import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listOpportunities, runDiscovery, type Opportunity } from '../api/opportunity'

const SOURCE_LABELS: Record<string, string> = {
  greenhouse: 'Greenhouse',
  lever: 'Lever',
  ashby: 'Ashby',
  personio: 'Personio',
}

const REMOTE_LABELS: Record<string, string> = {
  remote: 'Remote',
  hybrid: 'Hybrid',
  onsite: 'On-site',
}

function Badge({ text, color }: { text: string; color: string }) {
  return (
    <span style={{ padding: '0.15rem 0.5rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 500, background: color, color: '#fff', whiteSpace: 'nowrap' }}>
      {text}
    </span>
  )
}

function OpportunityCard({ opp }: { opp: Opportunity }) {
  return (
    <Link
      to={`/opportunities/${opp.id}`}
      style={{ display: 'block', textDecoration: 'none', color: 'inherit', padding: '1rem', border: '1px solid #e5e7eb', borderRadius: '8px', transition: 'border-color 0.15s' }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = '#111827')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = '#e5e7eb')}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontWeight: 600, marginBottom: '0.2rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{opp.title}</p>
          <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.5rem' }}>{opp.company_name}</p>
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {opp.location_raw && (
              <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>📍 {opp.location_raw}</span>
            )}
            {opp.remote_option && (
              <Badge
                text={REMOTE_LABELS[opp.remote_option] ?? opp.remote_option}
                color={opp.remote_option === 'remote' ? '#059669' : opp.remote_option === 'hybrid' ? '#d97706' : '#6b7280'}
              />
            )}
            <Badge text={SOURCE_LABELS[opp.source] ?? opp.source} color="#4f46e5" />
          </div>
        </div>
        {opp.posted_at && (
          <p style={{ fontSize: '0.75rem', color: '#9ca3af', whiteSpace: 'nowrap' }}>
            {new Date(opp.posted_at).toLocaleDateString()}
          </p>
        )}
      </div>
    </Link>
  )
}

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
      const res = await listOpportunities({
        page: p,
        page_size: PAGE_SIZE,
        source: filterSource || undefined,
        country_code: filterCountry || undefined,
      })
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
      load(1)
      setPage(1)
    } catch (err: any) {
      setMessage(err.response?.data?.detail ?? 'Discovery failed.')
    } finally {
      setRunning(false)
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Opportunities</h1>
          {total > 0 && <p style={{ color: '#6b7280', fontSize: '0.875rem', marginTop: '0.25rem' }}>{total} jobs found</p>}
        </div>
        <button
          onClick={discover}
          disabled={running}
          style={{ padding: '0.5rem 1.25rem', background: '#111827', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.9rem', opacity: running ? 0.7 : 1, whiteSpace: 'nowrap' }}
        >
          {running ? 'Searching…' : 'Run discovery'}
        </button>
      </div>

      {message && (
        <p style={{ padding: '0.75rem', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', color: '#166534', fontSize: '0.875rem', marginBottom: '1rem' }}>
          {message}
        </p>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <select value={filterSource} onChange={e => setFilterSource(e.target.value)} style={{ padding: '0.4rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.875rem', cursor: 'pointer' }}>
          <option value="">All sources</option>
          <option value="greenhouse">Greenhouse</option>
          <option value="lever">Lever</option>
          <option value="ashby">Ashby</option>
          <option value="personio">Personio</option>
        </select>
        <select value={filterCountry} onChange={e => setFilterCountry(e.target.value)} style={{ padding: '0.4rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.875rem', cursor: 'pointer' }}>
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
        <p style={{ color: '#6b7280' }}>Loading…</p>
      ) : items.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', border: '1px dashed #d1d5db', borderRadius: '8px' }}>
          <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>No jobs found yet</p>
          <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1rem' }}>Click "Run discovery" to search across all job boards.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {items.map(opp => <OpportunityCard key={opp.id} opp={opp} />)}
        </div>
      )}

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1.5rem' }}>
          <button onClick={() => { const p = page - 1; setPage(p); load(p) }} disabled={page === 1} style={{ padding: '0.4rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', background: 'transparent', opacity: page === 1 ? 0.4 : 1 }}>←</button>
          <span style={{ padding: '0.4rem 0.75rem', fontSize: '0.875rem', color: '#6b7280' }}>Page {page} of {totalPages}</span>
          <button onClick={() => { const p = page + 1; setPage(p); load(p) }} disabled={page === totalPages} style={{ padding: '0.4rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', background: 'transparent', opacity: page === totalPages ? 0.4 : 1 }}>→</button>
        </div>
      )}
    </div>
  )
}
