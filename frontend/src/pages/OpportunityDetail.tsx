import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getOpportunity, type OpportunityDetail } from '../api/opportunity'

export default function OpportunityDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [opp, setOpp] = useState<OpportunityDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return
    getOpportunity(id)
      .then(setOpp)
      .catch(() => setError('Opportunity not found.'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <p style={{ color: '#6b7280' }}>Loading…</p>
  if (error || !opp) return <p style={{ color: '#dc2626' }}>{error || 'Not found.'}</p>

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto' }}>
      <Link to="/opportunities" style={{ fontSize: '0.875rem', color: '#6b7280', textDecoration: 'none', display: 'inline-block', marginBottom: '1.25rem' }}>← Back to opportunities</Link>

      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem' }}>{opp.title}</h1>
      <p style={{ color: '#6b7280', marginBottom: '1rem' }}>{opp.company_name}</p>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        {opp.location_raw && <Chip label={`📍 ${opp.location_raw}`} />}
        {opp.remote_option && <Chip label={opp.remote_option} />}
        {opp.employment_type && <Chip label={opp.employment_type} />}
        {opp.source && <Chip label={opp.source} />}
        {opp.posted_at && <Chip label={`Posted ${new Date(opp.posted_at).toLocaleDateString()}`} />}
      </div>

      {(opp.salary_min || opp.salary_max) && (
        <p style={{ marginBottom: '1rem', fontWeight: 500 }}>
          Salary: {opp.salary_currency || ''} {opp.salary_min?.toLocaleString() ?? '?'} – {opp.salary_max?.toLocaleString() ?? '?'}
        </p>
      )}

      {opp.description && (
        <div style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>Description</h2>
          <div style={{ fontSize: '0.9rem', lineHeight: 1.7, color: '#374151', whiteSpace: 'pre-wrap' }}>
            {opp.description.replace(/<[^>]+>/g, '')}
          </div>
        </div>
      )}

      {opp.application_url && (
        <a
          href={opp.application_url}
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: 'inline-block', padding: '0.625rem 1.5rem', background: '#111827', color: '#fff', borderRadius: '6px', textDecoration: 'none', fontSize: '0.9rem' }}
        >
          View & apply →
        </a>
      )}
    </div>
  )
}

function Chip({ label }: { label: string }) {
  return (
    <span style={{ padding: '0.25rem 0.75rem', border: '1px solid #e5e7eb', borderRadius: '999px', fontSize: '0.8rem', color: '#374151' }}>
      {label}
    </span>
  )
}
