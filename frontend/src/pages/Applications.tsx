import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  deleteApplication,
  listApplications,
  PIPELINE_STATUSES,
  STATUS_LABELS,
  TERMINAL_STATUSES,
  updateApplication,
  type Application,
  type ApplicationStatus,
} from '../api/applications'

const STATUS_COLORS: Record<ApplicationStatus, { bg: string; border: string; text: string }> = {
  pending_review: { bg: '#f9fafb', border: '#e5e7eb', text: '#374151' },
  approved: { bg: '#eff6ff', border: '#bfdbfe', text: '#1d4ed8' },
  submitted: { bg: '#f0fdf4', border: '#bbf7d0', text: '#15803d' },
  interviewing: { bg: '#fefce8', border: '#fde68a', text: '#92400e' },
  offered: { bg: '#fdf4ff', border: '#e9d5ff', text: '#7e22ce' },
  rejected: { bg: '#fef2f2', border: '#fecaca', text: '#b91c1c' },
  withdrawn: { bg: '#f9fafb', border: '#d1d5db', text: '#6b7280' },
  closed: { bg: '#f9fafb', border: '#d1d5db', text: '#6b7280' },
}

const NEXT_STATUSES: Record<ApplicationStatus, ApplicationStatus[]> = {
  pending_review: ['approved', 'rejected', 'withdrawn'],
  approved: ['submitted', 'rejected', 'withdrawn'],
  submitted: ['interviewing', 'rejected', 'withdrawn'],
  interviewing: ['offered', 'rejected', 'withdrawn'],
  offered: ['submitted', 'closed'],
  rejected: [],
  withdrawn: [],
  closed: [],
}

function StatusBadge({ status }: { status: ApplicationStatus }) {
  const c = STATUS_COLORS[status]
  return (
    <span style={{ padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600, background: c.bg, border: `1px solid ${c.border}`, color: c.text }}>
      {STATUS_LABELS[status]}
    </span>
  )
}

function ApplicationCard({
  app,
  onUpdate,
  onDelete,
}: {
  app: Application
  onUpdate: (updated: Application) => void
  onDelete: (id: string) => void
}) {
  const [moving, setMoving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const nexts = NEXT_STATUSES[app.status]

  const move = async (s: ApplicationStatus) => {
    setMoving(true)
    try {
      const updated = await updateApplication(app.id, { status: s })
      onUpdate(updated)
    } finally {
      setMoving(false)
    }
  }

  const remove = async () => {
    if (!confirm('Remove this application?')) return
    setDeleting(true)
    try {
      await deleteApplication(app.id)
      onDelete(app.id)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '1rem', background: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontWeight: 600, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {app.opportunity_title || 'Unknown role'}
          </p>
          <p style={{ color: '#6b7280', fontSize: '0.8rem', margin: '0.1rem 0 0' }}>
            {app.opportunity_company}
            {app.opportunity_location ? ` · ${app.opportunity_location}` : ''}
          </p>
        </div>
        <StatusBadge status={app.status} />
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.75rem', alignItems: 'center' }}>
        {nexts.map(s => (
          <button
            key={s}
            onClick={() => move(s)}
            disabled={moving}
            style={{
              padding: '0.25rem 0.7rem',
              background: 'transparent',
              border: `1px solid ${STATUS_COLORS[s].border}`,
              color: STATUS_COLORS[s].text,
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.75rem',
              fontWeight: 500,
            }}
          >
            → {STATUS_LABELS[s]}
          </button>
        ))}

        {app.opportunity_url && (
          <a
            href={app.opportunity_url}
            target="_blank"
            rel="noreferrer"
            style={{ fontSize: '0.75rem', color: '#2563eb', textDecoration: 'none', marginLeft: 'auto' }}
          >
            Job posting ↗
          </a>
        )}

        <Link
          to={`/documents/${app.opportunity_id}`}
          style={{ fontSize: '0.75rem', color: '#6b7280', textDecoration: 'none' }}
        >
          Documents
        </Link>

        <button
          onClick={remove}
          disabled={deleting}
          style={{ fontSize: '0.75rem', color: '#dc2626', background: 'transparent', border: 'none', cursor: 'pointer', padding: '0.25rem 0' }}
        >
          Remove
        </button>
      </div>

      {app.applied_at && (
        <p style={{ fontSize: '0.75rem', color: '#9ca3af', margin: '0.5rem 0 0' }}>
          Applied {new Date(app.applied_at).toLocaleDateString()}
        </p>
      )}
    </div>
  )
}

function Column({
  status,
  apps,
  onUpdate,
  onDelete,
}: {
  status: ApplicationStatus
  apps: Application[]
  onUpdate: (a: Application) => void
  onDelete: (id: string) => void
}) {
  const c = STATUS_COLORS[status]
  return (
    <div style={{ flex: '1 1 220px', minWidth: '200px', maxWidth: '320px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{STATUS_LABELS[status]}</span>
        <span style={{ padding: '0.1rem 0.45rem', background: c.bg, border: `1px solid ${c.border}`, borderRadius: '999px', fontSize: '0.75rem', color: c.text }}>
          {apps.length}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', minHeight: '60px' }}>
        {apps.map(a => (
          <ApplicationCard key={a.id} app={a} onUpdate={onUpdate} onDelete={onDelete} />
        ))}
        {apps.length === 0 && (
          <div style={{ border: '1px dashed #e5e7eb', borderRadius: '8px', padding: '1.5rem 1rem', textAlign: 'center' }}>
            <p style={{ color: '#d1d5db', fontSize: '0.8rem', margin: 0 }}>Empty</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function Applications() {
  const [apps, setApps] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [showTerminal, setShowTerminal] = useState(false)

  useEffect(() => {
    listApplications().then(setApps).finally(() => setLoading(false))
  }, [])

  const handleUpdate = (updated: Application) =>
    setApps(prev => prev.map(a => (a.id === updated.id ? updated : a)))

  const handleDelete = (id: string) =>
    setApps(prev => prev.filter(a => a.id !== id))

  const pipeline = apps.filter(a => PIPELINE_STATUSES.includes(a.status))
  const terminal = apps.filter(a => TERMINAL_STATUSES.includes(a.status))

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Applications</h1>
          {!loading && <p style={{ color: '#6b7280', fontSize: '0.875rem', marginTop: '0.25rem' }}>{apps.length} total</p>}
        </div>
        <Link
          to="/scores"
          style={{ padding: '0.5rem 1.25rem', background: '#111827', color: '#fff', borderRadius: '6px', textDecoration: 'none', fontSize: '0.875rem' }}
        >
          Find good matches →
        </Link>
      </div>

      {loading ? (
        <p style={{ color: '#6b7280' }}>Loading…</p>
      ) : apps.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', border: '1px dashed #d1d5db', borderRadius: '8px' }}>
          <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>No applications yet</p>
          <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1rem' }}>
            Start an application from any good match on the Scores page.
          </p>
          <Link
            to="/scores"
            style={{ display: 'inline-block', padding: '0.4rem 1rem', background: '#111827', color: '#fff', borderRadius: '6px', textDecoration: 'none', fontSize: '0.875rem' }}
          >
            View scores →
          </Link>
        </div>
      ) : (
        <>
          {/* Pipeline columns */}
          <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '1rem' }}>
            {PIPELINE_STATUSES.map(s => (
              <Column
                key={s}
                status={s}
                apps={pipeline.filter(a => a.status === s)}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
              />
            ))}
          </div>

          {/* Terminal section */}
          {terminal.length > 0 && (
            <div style={{ marginTop: '2rem' }}>
              <button
                onClick={() => setShowTerminal(v => !v)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: '0.875rem', padding: 0, marginBottom: '0.75rem' }}
              >
                {showTerminal ? '▾' : '▸'} Closed / Rejected / Withdrawn ({terminal.length})
              </button>
              {showTerminal && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {terminal.map(a => (
                    <ApplicationCard key={a.id} app={a} onUpdate={handleUpdate} onDelete={handleDelete} />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
