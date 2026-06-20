import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { generateDocuments, getOpportunityDocuments, type DocumentItem, type GenerationMode, type OpportunityDocuments } from '../api/documents'
import { getOpportunity, type OpportunityDetail } from '../api/opportunity'

function MarkdownBlock({ content }: { content: string }) {
  return (
    <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'inherit', fontSize: '0.875rem', lineHeight: 1.6, background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '1.25rem', margin: 0 }}>
      {content}
    </pre>
  )
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }
  return (
    <button onClick={copy} style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', background: 'transparent' }}>
      {copied ? 'Copied!' : 'Copy'}
    </button>
  )
}

function DownloadButton({ content, filename }: { content: string; filename: string }) {
  const download = () => {
    const blob = new Blob([content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }
  return (
    <button onClick={download} style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', background: 'transparent' }}>
      Download .md
    </button>
  )
}

export default function DocumentDetail() {
  const { opportunityId } = useParams<{ opportunityId: string }>()
  const [opp, setOpp] = useState<OpportunityDetail | null>(null)
  const [docs, setDocs] = useState<OpportunityDocuments | null>(null)
  const [activeTab, setActiveTab] = useState<'resume' | 'cover_letter'>('resume')
  const [mode, setMode] = useState<GenerationMode>('template')
  const [generating, setGenerating] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!opportunityId) return
    Promise.all([
      getOpportunity(opportunityId),
      getOpportunityDocuments(opportunityId),
    ]).then(([o, d]) => {
      setOpp(o)
      setDocs(d)
    }).catch(() => setError('Failed to load.')).finally(() => setLoading(false))
  }, [opportunityId])

  const generate = async () => {
    if (!opportunityId) return
    setGenerating(true)
    setError('')
    try {
      const result = await generateDocuments(opportunityId, mode)
      setDocs({
        opportunity_id: opportunityId,
        tailored_resume: result.tailored_resume,
        cover_letter: result.cover_letter,
      })
    } catch (err: any) {
      setError(err.response?.data?.detail ?? 'Generation failed.')
    } finally {
      setGenerating(false)
    }
  }

  const activeDoc: DocumentItem | null | undefined =
    activeTab === 'resume' ? docs?.tailored_resume : docs?.cover_letter

  const filename = activeTab === 'resume'
    ? `${opp?.company_name ?? 'resume'}_tailored_resume.md`
    : `${opp?.company_name ?? 'cover'}_cover_letter.md`

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      {/* Back link */}
      <Link to="/scores" style={{ fontSize: '0.875rem', color: '#6b7280', textDecoration: 'none' }}>
        ← Back to scores
      </Link>

      {/* Header */}
      <div style={{ margin: '1rem 0 1.5rem' }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>
          Documents
        </h1>
        {opp && (
          <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: '0.25rem 0 0' }}>
            {opp.title} · {opp.company_name}
          </p>
        )}
      </div>

      {/* Generate controls */}
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <select
          value={mode}
          onChange={e => setMode(e.target.value as GenerationMode)}
          style={{ padding: '0.4rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.875rem' }}
        >
          <option value="template">Template-based</option>
          <option value="ai">AI (requires API key)</option>
        </select>
        <button
          onClick={generate}
          disabled={generating || loading}
          style={{ padding: '0.5rem 1.25rem', background: '#111827', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.875rem', opacity: generating ? 0.7 : 1 }}
        >
          {generating ? 'Generating…' : docs?.tailored_resume ? 'Regenerate' : 'Generate documents'}
        </button>
        {activeDoc && (
          <>
            <CopyButton text={activeDoc.content} />
            <DownloadButton content={activeDoc.content} filename={filename} />
          </>
        )}
      </div>

      {error && (
        <p style={{ padding: '0.75rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', color: '#991b1b', fontSize: '0.875rem', marginBottom: '1rem' }}>
          {error}
        </p>
      )}

      {loading ? (
        <p style={{ color: '#6b7280' }}>Loading…</p>
      ) : !docs?.tailored_resume && !docs?.cover_letter ? (
        <div style={{ padding: '3rem', textAlign: 'center', border: '1px dashed #d1d5db', borderRadius: '8px' }}>
          <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>No documents yet</p>
          <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>Click "Generate documents" to create a tailored resume and cover letter.</p>
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', marginBottom: '1rem' }}>
            {([['resume', 'Tailored Resume'], ['cover_letter', 'Cover Letter']] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                style={{ padding: '0.5rem 1.25rem', background: 'transparent', border: 'none', borderBottom: activeTab === key ? '2px solid #111827' : '2px solid transparent', cursor: 'pointer', fontWeight: activeTab === key ? 600 : 400, fontSize: '0.9rem', marginBottom: '-1px' }}
              >
                {label}
              </button>
            ))}
          </div>

          {activeDoc ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                  Mode: {activeDoc.generation_mode} · {new Date(activeDoc.created_at).toLocaleString()}
                </span>
              </div>
              <MarkdownBlock content={activeDoc.content} />
            </>
          ) : (
            <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>Not generated yet — click "Generate documents".</p>
          )}
        </>
      )}
    </div>
  )
}
