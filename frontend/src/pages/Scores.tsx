import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createApplication } from '../api/applications'
import { getOpportunity, type OpportunityDetail } from '../api/opportunity'
import { getMyProfile, type Profile } from '../api/profile'
import {
  decideNearMiss,
  listScores,
  runScoring,
  type NearMissKeyword,
  type Score,
  type ScoringMode,
} from '../api/scoring'

function ScoreBadge({ score, good, nearMiss }: { score: number; good: number; nearMiss: number }) {
  const color = score >= good ? 'var(--success)' : score >= nearMiss ? 'var(--warn)' : 'var(--text-3)'
  return (
    <span style={{
      padding: '0.2rem 0.625rem',
      borderRadius: '999px',
      fontSize: '0.8rem',
      fontWeight: 700,
      background: `${color}1a`,
      color,
      border: `1px solid ${color}40`,
      fontVariantNumeric: 'tabular-nums',
    }}>
      {score}
    </span>
  )
}

function KeywordChip({ kw }: { kw: NearMissKeyword }) {
  const color = kw.suitable === true ? 'var(--success)' : kw.suitable === false ? 'var(--danger)' : 'var(--warn)'
  const label = kw.suitable === true ? '✓ suitable' : kw.suitable === false ? '✗ outside stack' : '? uncertain'
  return (
    <div style={{ padding: '0.5rem 0.75rem', border: `1px solid ${color}30`, background: `${color}08`, borderRadius: 'var(--radius-xs)', fontSize: '0.8rem' }}>
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <span style={{ fontWeight: 600, color: 'var(--text-1)' }}>{kw.keyword}</span>
        <span style={{ color, fontSize: '0.72rem' }}>{label}</span>
      </div>
      <p style={{ color: 'var(--text-2)', margin: '0.2rem 0 0', fontSize: '0.72rem' }}>{kw.reason}</p>
    </div>
  )
}

function NearMissCard({ score, goodThreshold, onDecide }: { score: Score; goodThreshold: number; onDecide: () => void }) {
  const [opp, setOpp] = useState<OpportunityDetail | null>(null)
  const [selected, setSelected] = useState<string[]>([])
  const [deciding, setDeciding] = useState(false)
  const [promoted, setPromoted] = useState<{ newScore: number } | null>(null)
  const nearMiss = goodThreshold - 15

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
      if (action === 'keep_with_keywords' && updated.total_score >= goodThreshold) {
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
      <div style={{ border: '1px solid var(--success-border)', borderRadius: 'var(--radius)', padding: '1.25rem', background: 'var(--success-bg)', display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
        <span style={{ padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 700, background: 'var(--success)', color: '#fff' }}>{promoted.newScore}</span>
        <div>
          <p style={{ fontWeight: 600, margin: 0, color: 'var(--success)' }}>Promoted to Good Match!</p>
          <p style={{ fontSize: '0.8rem', color: 'var(--success)', margin: '0.15rem 0 0', opacity: 0.8 }}>
            {opp?.title} · {opp?.company_name} — moving to Good Matches tab…
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ border: '1px solid var(--warn-border)', borderRadius: 'var(--radius)', padding: '1.25rem', background: 'var(--warn-bg)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.875rem' }}>
        <div>
          <Link to={`/opportunities/${score.opportunity_id}`} style={{ fontWeight: 600, color: 'var(--text-1)', textDecoration: 'none', fontSize: '0.9rem' }}>
            {opp?.title || 'Loading…'}
          </Link>
          <p style={{ color: 'var(--text-2)', fontSize: '0.825rem', margin: '0.15rem 0 0' }}>{opp?.company_name}</p>
        </div>
        <ScoreBadge score={score.total_score} good={goodThreshold} nearMiss={nearMiss} />
      </div>

      {keywords.length > 0 && (
        <>
          <p style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-1)' }}>
            Gap keywords — adding these could push your score above {goodThreshold}:
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', marginBottom: '1rem' }}>
            {keywords.map(kw => (
              <div key={kw.keyword} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                {kw.suitable !== false && (
                  <input type="checkbox" checked={selected.includes(kw.keyword)} onChange={() => toggleKeyword(kw.keyword)} style={{ marginTop: '0.5rem', flexShrink: 0 }} />
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
            style={{ padding: '0.4rem 0.875rem', background: 'var(--success)', color: '#fff', border: 'none', borderRadius: 'var(--radius-xs)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500 }}
          >
            Add {selected.length} keyword{selected.length > 1 ? 's' : ''} + keep
          </button>
        )}
        <button
          onClick={() => decide('keep')}
          disabled={deciding}
          style={{ padding: '0.4rem 0.875rem', background: 'var(--bg-elevated)', color: 'var(--text-1)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-xs)', cursor: 'pointer', fontSize: '0.8rem' }}
        >
          Keep without adding
        </button>
        <button
          onClick={() => decide('dismiss')}
          disabled={deciding}
          style={{ padding: '0.4rem 0.875rem', background: 'var(--danger-bg)', color: 'var(--danger)', border: '1px solid var(--danger-border)', borderRadius: 'var(--radius-xs)', cursor: 'pointer', fontSize: '0.8rem' }}
        >
          Dismiss
        </button>
      </div>
    </div>
  )
}

function GoodMatchCard({ score, good, nearMiss }: { score: Score; good: number; nearMiss: number }) {
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
      if (err.response?.status === 409) navigate('/applications')
    } finally {
      setStarting(false)
    }
  }

  return (
    <div style={{ padding: '1.125rem 1.25rem', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', transition: 'border-color 0.15s' }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-strong)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.625rem' }}>
        <div>
          <Link to={`/opportunities/${score.opportunity_id}`} style={{ fontWeight: 600, color: 'var(--text-1)', textDecoration: 'none', fontSize: '0.9rem' }}>
            {opp?.title || 'Loading…'}
          </Link>
          <p style={{ color: 'var(--text-2)', fontSize: '0.8rem', margin: '0.15rem 0 0' }}>
            {opp?.company_name}{opp?.location_raw ? ` · ${opp.location_raw}` : ''}
          </p>
        </div>
        <ScoreBadge score={score.total_score} good={good} nearMiss={nearMiss} />
      </div>

      {dims && (
        <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap', marginBottom: '0.875rem' }}>
          {Object.entries(dims).map(([key, d]) => (
            <span key={key} title={d.explanation} style={{ padding: '0.15rem 0.55rem', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '999px', fontSize: '0.72rem', color: 'var(--text-2)', cursor: 'help' }}>
              {key}: {d.score}/{d.max}
            </span>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <button
          onClick={() => navigate(`/documents/${score.opportunity_id}`)}
          style={{ padding: '0.35rem 0.875rem', background: 'transparent', border: '1px solid var(--border-strong)', color: 'var(--text-1)', borderRadius: 'var(--radius-xs)', cursor: 'pointer', fontSize: '0.8rem' }}
        >
          Generate documents →
        </button>
        {applicationId ? (
          <Link to="/applications" style={{ padding: '0.35rem 0.875rem', background: 'var(--success-bg)', color: 'var(--success)', border: '1px solid var(--success-border)', borderRadius: 'var(--radius-xs)', fontSize: '0.8rem' }}>
            Application started ✓
          </Link>
        ) : (
          <button
            onClick={startApplication}
            disabled={starting}
            style={{ padding: '0.35rem 0.875rem', background: 'var(--blue-bg)', color: 'var(--blue)', border: '1px solid var(--blue-border)', borderRadius: 'var(--radius-xs)', cursor: 'pointer', fontSize: '0.8rem', opacity: starting ? 0.7 : 1 }}
          >
            {starting ? 'Starting…' : 'Start application'}
          </button>
        )}
      </div>
    </div>
  )
}

const selectStyle: React.CSSProperties = { width: 'auto', fontSize: '0.8rem', padding: '0.4rem 2rem 0.4rem 0.75rem' }

export default function Scores() {
  const [tab, setTab] = useState<'good' | 'near_miss'>('good')
  const [mode, setMode] = useState<ScoringMode>('rule_based')
  const [scores, setScores] = useState<Score[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [runResult, setRunResult] = useState<string>('')
  const [profile, setProfile] = useState<Profile | null>(null)

  useEffect(() => { getMyProfile().then(setProfile).catch(() => null) }, [])

  const goodThreshold = profile?.good_threshold ?? 85
  const nearMissThreshold = profile?.near_miss_threshold ?? 70

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
    <div style={{ maxWidth: '760px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: 'var(--text-1)' }}>Scores</h1>
          {total > 0 && <p style={{ color: 'var(--text-2)', fontSize: '0.825rem', marginTop: '0.2rem' }}>{total} results</p>}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <select value={mode} onChange={e => setMode(e.target.value as ScoringMode)} style={selectStyle}>
            <option value="rule_based">Rule-based</option>
            <option value="ai">AI (requires API key)</option>
          </select>
          <button
            onClick={runScoringNow}
            disabled={running}
            style={{ padding: '0.5rem 1.25rem', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-xs)', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500, opacity: running ? 0.7 : 1 }}
          >
            {running ? 'Scoring…' : 'Run scoring'}
          </button>
        </div>
      </div>

      {runResult && (
        <div style={{ padding: '0.75rem 1rem', background: 'var(--success-bg)', border: '1px solid var(--success-border)', borderRadius: 'var(--radius-xs)', marginBottom: '1.25rem' }}>
          <p style={{ color: 'var(--success)', fontSize: '0.85rem', margin: 0 }}>{runResult}</p>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '1.25rem', gap: '0.125rem' }}>
        {(['good', 'near_miss'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '0.5rem 1.125rem',
              background: 'transparent',
              border: 'none',
              borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent',
              cursor: 'pointer',
              fontWeight: tab === t ? 600 : 400,
              color: tab === t ? 'var(--accent)' : 'var(--text-2)',
              fontSize: '0.875rem',
              marginBottom: '-1px',
              transition: 'color 0.15s',
            }}
          >
            {t === 'good' ? `Good matches (${goodThreshold}+)` : `Near misses (${nearMissThreshold}–${goodThreshold - 1})`}
          </button>
        ))}
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-2)' }}>Loading…</p>
      ) : scores.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', border: '1px dashed var(--border-strong)', borderRadius: 'var(--radius)' }}>
          <p style={{ fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-1)' }}>No results yet</p>
          <p style={{ color: 'var(--text-2)', fontSize: '0.85rem' }}>Run discovery first, then click "Run scoring".</p>
        </div>
      ) : tab === 'near_miss' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          {pendingNearMisses.length === 0 && (
            <p style={{ color: 'var(--text-2)', fontSize: '0.875rem' }}>All near misses have been reviewed.</p>
          )}
          {scores.map(s => (
            <NearMissCard key={s.id} score={s} goodThreshold={goodThreshold} onDecide={load} />
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          {scores.map(s => <GoodMatchCard key={s.id} score={s} good={goodThreshold} nearMiss={nearMissThreshold} />)}
        </div>
      )}
    </div>
  )
}
