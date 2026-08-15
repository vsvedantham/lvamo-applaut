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

const STATUS_THEME: Record<ApplicationStatus, { color: string; bg: string; border: string }> = {
  pending_review: { color: 'var(--text-2)', bg: 'var(--bg-elevated)', border: 'var(--border-strong)' },
  approved:       { color: 'var(--blue)',   bg: 'var(--blue-bg)',     border: 'rgba(96,165,250,0.3)' },
  submitted:      { color: 'var(--success)',bg: 'var(--success-bg)',  border: 'var(--success-border)' },
  interviewing:   { color: 'var(--warn)',   bg: 'var(--warn-bg)',     border: 'var(--warn-border)' },
  offered:        { color: 'var(--purple)', bg: 'var(--purple-bg)',   border: 'rgba(192,132,252,0.3)' },
  rejected:       { color: 'var(--danger)', bg: 'var(--danger-bg)',   border: 'var(--danger-border)' },
  withdrawn:      { color: 'var(--text-3)', bg: 'var(--bg-elevated)', border: 'var(--border)' },
  closed:         { color: 'var(--text-3)', bg: 'var(--bg-elevated)', border: 'var(--border)' },
}

const NEXT_STATUSES: Record<ApplicationStatus, ApplicationStatus[]> = {
  pending_review: ['approved', 'rejected', 'withdrawn'],
  approved:       ['submitted', 'rejected', 'withdrawn'],
  submitted:      ['interviewing', 'rejected', 'withdrawn'],
  interviewing:   ['offered', 'rejected', 'withdrawn'],
  offered:        ['submitted', 'closed'],
  rejected:       [],
  withdrawn:      [],
  closed:         [],
}

function StatusBadge({ status }: { status: ApplicationStatus }) {
  const t = STATUS_THEME[status]
  return (
    <span style={{ padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 600, background: t.bg, border: `1px solid ${t.border}`, color: t.color, whiteSpace: 'nowrap' }}>
      {STATUS_LABELS[status]}
    </span>
  )
}

function ApplicationCard({ app, onUpdate, onDelete }: { app: Application; onUpdate: (a: Application) => void; onDelete: (id: string) => void }) {
  const [moving, setMoving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const nexts = NEXT_STATUSES[app.status]

  const move = async (s: ApplicationStatus) => {
    setMoving(true)
    try { onUpdate(await updateApplication(app.id, { status: s })) }
    finally { setMoving(false) }
  }

  const remove = async () => {
    if (!confirm('Remove this application?')) return
    setDeleting(true)
    try { await deleteApplication(app.id); onDelete(app.id) }
    finally { setDeleting(false) }
  }

  return (
    <div style={{ padding: '0.875rem 1rem', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', transition: 'border-color 0.15s' }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-strong)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem', gap: '0.5rem' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontWeight: 600, fontSize: '0.85rem', margin: 0, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {app.opportunity_title || 'Unknown role'}
          </p>
          <p style={{ color: 'var(--text-2)', fontSize: '0.775rem', margin: '0.1rem 0 0' }}>
            {app.opportunity_company}{app.opportunity_location ? ` · ${app.opportunity_location}` : ''}
          </p>
        </div>
        <StatusBadge status={app.status} />
      </div>

      <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap', alignItems: 'center', marginTop: '0.625rem' }}>
        {nexts.map(s => {
          const t = STATUS_THEME[s]
          return (
            <button
              key={s}
              onClick={() => move(s)}
              disabled={moving}
              style={{ padding: '0.2rem 0.625rem', background: t.bg, border: `1px solid ${t.border}`, color: t.color, borderRadius: 'var(--radius-xs)', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 500 }}
            >
              → {STATUS_LABELS[s]}
            </button>
          )
        })}

        <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.625rem', alignItems: 'center' }}>
          {app.opportunity_url && (
            <a href={app.opportunity_url} target="_blank" rel="noreferrer" style={{ fontSize: '0.72rem', color: 'var(--accent)' }}>
              Job ↗
            </a>
          )}
          <Link to={`/applaut/documents/${app.opportunity_id}`} style={{ fontSize: '0.72rem', color: 'var(--text-2)' }}>
            Docs
          </Link>
          <button onClick={remove} disabled={deleting} style={{ fontSize: '0.72rem', color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            Remove
          </button>
        </div>
      </div>

      {app.applied_at && (
        <p style={{ fontSize: '0.7rem', color: 'var(--text-3)', margin: '0.5rem 0 0' }}>
          Applied {new Date(app.applied_at).toLocaleDateString()}
        </p>
      )}
    </div>
  )
}

function Column({ status, apps, onUpdate, onDelete }: { status: ApplicationStatus; apps: Application[]; onUpdate: (a: Application) => void; onDelete: (id: string) => void }) {
  const t = STATUS_THEME[status]
  return (
    <div style={{ flex: '1 1 200px', minWidth: '190px', maxWidth: '280px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.625rem' }}>
        <span style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-1)' }}>{STATUS_LABELS[status]}</span>
        <span style={{ padding: '0.1rem 0.45rem', background: t.bg, border: `1px solid ${t.border}`, color: t.color, borderRadius: '999px', fontSize: '0.7rem', fontWeight: 600 }}>
          {apps.length}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', minHeight: '60px' }}>
        {apps.map(a => <ApplicationCard key={a.id} app={a} onUpdate={onUpdate} onDelete={onDelete} />)}
        {apps.length === 0 && (
          <div style={{ border: '1px dashed var(--border)', borderRadius: 'var(--radius-sm)', padding: '1.25rem 1rem', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-3)', fontSize: '0.775rem', margin: 0 }}>Empty</p>
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

  const handleUpdate = (updated: Application) => setApps(prev => prev.map(a => a.id === updated.id ? updated : a))
  const handleDelete = (id: string) => setApps(prev => prev.filter(a => a.id !== id))

  const pipeline = apps.filter(a => PIPELINE_STATUSES.includes(a.status))
  const terminal = apps.filter(a => TERMINAL_STATUSES.includes(a.status))

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: 'var(--text-1)' }}>Applications</h1>
          {!loading && <p style={{ color: 'var(--text-2)', fontSize: '0.825rem', marginTop: '0.2rem' }}>{apps.length} total</p>}
        </div>
        <Link
          to="/applaut/opportunities?match=good"
          style={{ padding: '0.5rem 1.25rem', background: 'var(--accent)', color: '#fff', borderRadius: 'var(--radius-xs)', fontSize: '0.875rem', fontWeight: 500 }}
        >
          Find good matches →
        </Link>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-2)' }}>Loading…</p>
      ) : apps.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', border: '1px dashed var(--border-strong)', borderRadius: 'var(--radius)' }}>
          <p style={{ fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-1)' }}>No applications yet</p>
          <p style={{ color: 'var(--text-2)', fontSize: '0.875rem', marginBottom: '1rem' }}>
            Start an application from any good match on the Opportunities page.
          </p>
          <Link to="/applaut/opportunities?match=good" style={{ display: 'inline-block', padding: '0.4rem 1rem', background: 'var(--accent)', color: '#fff', borderRadius: 'var(--radius-xs)', fontSize: '0.875rem' }}>
            View good matches →
          </Link>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: '0.875rem', overflowX: 'auto', paddingBottom: '1rem' }}>
            {PIPELINE_STATUSES.map(s => (
              <Column key={s} status={s} apps={pipeline.filter(a => a.status === s)} onUpdate={handleUpdate} onDelete={handleDelete} />
            ))}
          </div>

          {terminal.length > 0 && (
            <div style={{ marginTop: '2rem' }}>
              <button
                onClick={() => setShowTerminal(v => !v)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-2)', fontSize: '0.825rem', padding: 0, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}
              >
                <span>{showTerminal ? '▾' : '▸'}</span>
                <span>Closed / Rejected / Withdrawn ({terminal.length})</span>
              </button>
              {showTerminal && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {terminal.map(a => <ApplicationCard key={a.id} app={a} onUpdate={handleUpdate} onDelete={handleDelete} />)}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
