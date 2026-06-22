import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createApplication } from '../api/applications'
import { getOpportunity, type OpportunityDetail } from '../api/opportunity'
import {
  decideNearMiss,
  listScores,
  runScoring,
  type NearMissKeyword,
  type Score,
  type ScoringMode,
} from '../api/scoring'

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 85 ? '#059669' : score >= 70 ? '#d97706' : '#6b7280'
  return (
    <span style={{ padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 700, background: color, color: '#fff' }}>
      {score}
    </span>
  )
}

function KeywordChip({ kw }: { kw: NearMissKeyword }) {
  const color = kw.suitable === true ? '#059669' : kw.suitable === false ? '#dc2626' : '#d97706'
  const label = kw.suitable === true ? '✓ likely suitable' : kw.suitable === false ? '✗ outside your stack' : '? uncertain'
  return (
    <div style={{ padding: '0.5rem 0.75rem', border: `1px solid ${color}`, borderRadius: '6px', fontSize: '0.8rem' }}>
      <span style={{ fontWeight: 600 }}>{kw.keyword}</span>
      <span style={{ marginLeft: '0.5rem', color, fontSize: '0.75rem' }}>{label}</span>
      <p style={{ color: '#6b7280', margin: '0.2rem 0 0', fontSize: '0.75rem' }}>{kw.reason}</p>
    </div>
  )
}

function NearMissCard({ score, onDecide }: { score: Score; onDecide: () => void }) {
  const [opp, setOpp] = useState<OpportunityDetail | null>(null)
  const [selected, setSelected] = useState<string[]>([])
  const [deciding, setDeciding] = useState(false)
  const [promoted, setPromoted] = useState<{ newScore: number } | null>(null)

  useEffect(() => {
    getOpportunity(score.opportunity_id).then(setOpp).catch(() => null)
  }, [score.opportunity_id])

  const keywords = score.near_miss_keywords || []

  const toggleKeyword = (kw: string) =>
    setSelected(prev => prev.includes(kw) ? prev.filter(k => k !== kw) : [...prev, kw])

  const decide = async (action: 'keep' | 'dismiss' | 'keep_with_keywords') => {
    setDeciding(true)
    try {
      const updated = await decideNearMiss(score.id, action, action === 'keep_with_keywords' ? selected : [])
      if (action === 'keep_with_keywords' && updated.total_score >= 85) {
        setPromoted({ newScore: updated.total_score })
        setTimeout(() => onDecide(), 2500)
      } else {
        onDecide()
      }
    } finally {
      setDeciding(false)
    }
  }

  if (score.user_decision && score.user_decision !== 'pending_review') return null

  if (promoted) {
    return (
      <div style={{ border: '1px solid #bbf7d0', borderRadius: '8px', padding: '1.25rem', background: '#f0fdf4', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <span style={{ padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 700, background: '#059669', color: '#fff' }}>{promoted.newScore}</span>
        <div>
          <p style={{ fontWeight: 600, margin: 0, color: '#166534' }}>Promoted to Good Match!</p>
          <p style={{ fontSize: '0.8rem', color: '#166534', margin: '0.15rem 0 0' }}>
            {opp?.title} · {opp?.company_name} — moving to Good Matches tab…
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ border: '1px solid #fbbf24', borderRadius: '8px', padding: '1.25rem', background: '#fffbeb' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
        <div>
          <Link to={`/opportunities/${score.opportunity_id}`} style={{ fontWeight: 600, color: '#111827', textDecoration: 'none' }}>
            {opp?.title || 'Loading…'}
          </Link>
          <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: '0.15rem 0 0' }}>{opp?.company_name}</p>
        </div>
        <ScoreBadge score={score.total_score} />
      </div>

      {keywords.length > 0 && (
        <>
          <p style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            Gap keywords — adding these could push your score above 85:
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1rem' }}>
            {keywords.map(kw => (
              <div key={kw.keyword} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                {kw.suitable !== false && (
                  <input
                    type="checkbox"
                    checked={selected.includes(kw.keyword)}
                    onChange={() => toggleKeyword(kw.keyword)}
                    style={{ marginTop: '0.35rem', flexShrink: 0 }}
                  />
                )}
                <KeywordChip kw={kw} />
              </div>
            ))}
          </div>
        </>
      )}

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {selected.length > 0 && (
          <button
            onClick={() => decide('keep_with_keywords')}
            disabled={deciding}
            style={{ padding: '0.4rem 0.9rem', background: '#059669', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.875rem' }}
          >
            Add {selected.length} keyword{selected.length > 1 ? 's' : ''} + keep
          </button>
        )}
        <button
          onClick={() => decide('keep')}
          disabled={deciding}
          style={{ padding: '0.4rem 0.9rem', background: '#111827', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.875rem' }}
        >
          Keep without adding
        </button>
        <button
          onClick={() => decide('dismiss')}
          disabled={deciding}
          style={{ padding: '0.4rem 0.9rem', background: 'transparent', color: '#dc2626', border: '1px solid #dc2626', borderRadius: '6px', cursor: 'pointer', fontSize: '0.875rem' }}
        >
          Dismiss
        </button>
      </div>
    </div>
  )
}

function GoodMatchCard({ score }: { score: Score }) {
  const [opp, setOpp] = useState<OpportunityDetail | null>(null)
  const [starting, setStarting] = useState(false)
  const [applicationId, setApplicationId] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    getOpportunity(score.opportunity_id).then(setOpp).catch(() => null)
  }, [score.opportunity_id])

  const dims = score.explanation as Record<string, { score: number; max: number; explanation: string }>

  const startApplication = async () => {
    setStarting(true)
    try {
      const app = await createApplication(score.opportunity_id, score.id)
      setApplicationId(app.id)
    } catch (err: any) {
      if (err.response?.status === 409) {
        // already exists — navigate to applications
        navigate('/applications')
      }
    } finally {
      setStarting(false)
    }
  }

  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
        <div>
          <Link to={`/opportunities/${score.opportunity_id}`} style={{ fontWeight: 600, color: '#111827', textDecoration: 'none' }}>
            {opp?.title || 'Loading…'}
          </Link>
          <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: '0.15rem 0 0' }}>{opp?.company_name} · {opp?.location_raw}</p>
        </div>
        <ScoreBadge score={score.total_score} />
      </div>
      {dims && (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem', marginBottom: '0.75rem' }}>
          {Object.entries(dims).map(([key, d]) => (
            <span key={key} title={d.explanation} style={{ padding: '0.15rem 0.5rem', background: '#f3f4f6', borderRadius: '999px', fontSize: '0.75rem', cursor: 'help' }}>
              {key}: {d.score}/{d.max}
            </span>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <button
          onClick={() => navigate(`/documents/${score.opportunity_id}`)}
          style={{ padding: '0.35rem 0.9rem', background: 'transparent', border: '1px solid #111827', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}
        >
          Generate documents →
        </button>
        {applicationId ? (
          <Link
            to="/applications"
            style={{ padding: '0.35rem 0.9rem', background: '#059669', color: '#fff', borderRadius: '6px', textDecoration: 'none', fontSize: '0.8rem' }}
          >
            Application started ✓
          </Link>
        ) : (
          <button
            onClick={startApplication}
            disabled={starting}
            style={{ padding: '0.35rem 0.9rem', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', opacity: starting ? 0.7 : 1 }}
          >
            {starting ? 'Starting…' : 'Start application'}
          </button>
        )}
      </div>
    </div>
  )
}

export default function Scores() {
  const [tab, setTab] = useState<'good' | 'near_miss'>('good')
  const [mode, setMode] = useState<ScoringMode>('rule_based')
  const [scores, setScores] = useState<Score[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [runResult, setRunResult] = useState<string>('')

  const load = async () => {
    setLoading(true)
    try {
      const res = await listScores({ filter_type: tab, page: 1, page_size: 50 })
      setScores(res.items)
      setTotal(res.total)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [tab])

  const runScoringNow = async () => {
    setRunning(true)
    setRunResult('')
    try {
      const res = await runScoring(mode)
      setRunResult(`Scored ${res.scored} jobs — ${res.good_matches} good matches, ${res.near_misses} near misses (${res.mode})`)
      load()
    } catch (err: any) {
      setRunResult(err.response?.data?.detail ?? 'Scoring failed.')
    } finally {
      setRunning(false)
    }
  }

  const pendingNearMisses = scores.filter(s => !s.user_decision || s.user_decision === 'pending_review')

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Scores</h1>
          {total > 0 && <p style={{ color: '#6b7280', fontSize: '0.875rem', marginTop: '0.25rem' }}>{total} results</p>}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            value={mode}
            onChange={e => setMode(e.target.value as ScoringMode)}
            style={{ padding: '0.4rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.875rem', cursor: 'pointer' }}
          >
            <option value="rule_based">Rule-based</option>
            <option value="ai">AI (requires API key)</option>
          </select>
          <button
            onClick={runScoringNow}
            disabled={running}
            style={{ padding: '0.5rem 1.25rem', background: '#111827', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.875rem', opacity: running ? 0.7 : 1 }}
          >
            {running ? 'Scoring…' : 'Run scoring'}
          </button>
        </div>
      </div>

      {runResult && (
        <p style={{ padding: '0.75rem', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', color: '#166534', fontSize: '0.875rem', marginBottom: '1rem' }}>
          {runResult}
        </p>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: '1.25rem', borderBottom: '1px solid #e5e7eb' }}>
        {(['good', 'near_miss'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{ padding: '0.5rem 1.25rem', background: 'transparent', border: 'none', borderBottom: tab === t ? '2px solid #111827' : '2px solid transparent', cursor: 'pointer', fontWeight: tab === t ? 600 : 400, fontSize: '0.9rem', marginBottom: '-1px' }}
          >
            {t === 'good' ? 'Good matches (85+)' : 'Near misses (70–84)'}
          </button>
        ))}
      </div>

      {loading ? (
        <p style={{ color: '#6b7280' }}>Loading…</p>
      ) : scores.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', border: '1px dashed #d1d5db', borderRadius: '8px' }}>
          <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>No results yet</p>
          <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>Run discovery first, then click "Run scoring".</p>
        </div>
      ) : tab === 'near_miss' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {pendingNearMisses.length === 0 && (
            <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>All near misses have been reviewed.</p>
          )}
          {scores.map(s => (
            <NearMissCard key={s.id} score={s} onDecide={load} />
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {scores.map(s => <GoodMatchCard key={s.id} score={s} />)}
        </div>
      )}
    </div>
  )
}
