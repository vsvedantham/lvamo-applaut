import { type FormEvent, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import BrandedPage from '../../components/BrandedPage'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import {
  acceptReferralRequest,
  getReferralRequestDetail,
  rejectReferralRequest,
  type ReferralRequestDetail as Detail,
} from '../api/referralRequests'
import { STATUS_COLOR, STATUS_LABEL } from '../constants'

const REJECTION_SUGGESTIONS = [
  'Already referred others for the same role',
  'Needs CV optimization',
  'Needs cover letter optimization',
  'Not a strong fit for this role',
]
const REJECTION_MAX = 150
const EVIDENCE_ACCEPT = 'image/jpeg,image/png,image/webp,application/pdf'

type DecisionStep = 'none' | 'accept-evidence-choice' | 'accept-file' | 'reject-form'

export default function JobrefReferralRequestDetail() {
  useDocumentTitle('Referral request | Jobref')
  const { id } = useParams<{ id: string }>()

  const [request, setRequest] = useState<Detail | null>(null)
  const [loadError, setLoadError] = useState('')
  const [actionError, setActionError] = useState('')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<DecisionStep>('none')

  const [evidenceFile, setEvidenceFile] = useState<File | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')

  useEffect(() => {
    if (!id) return
    getReferralRequestDetail(id)
      .then(setRequest)
      .catch((err) => {
        const detail = err.response?.data?.detail
        setLoadError(typeof detail === 'string' ? detail : 'Could not load this request.')
      })
  }, [id])

  if (loadError) {
    return (
      <BrandedPage>
        <div style={{ width: '100%', maxWidth: '420px', textAlign: 'center' }}>
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1.75rem' }}>
            <p style={{ color: 'var(--danger)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>{loadError}</p>
            <Link to="/jobref/dashboard" style={{ color: 'var(--accent)', fontWeight: 600 }}>Back to dashboard</Link>
          </div>
        </div>
      </BrandedPage>
    )
  }

  if (!request) {
    return (
      <BrandedPage>
        <p style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>Loading…</p>
      </BrandedPage>
    )
  }

  const decided = request.status === 'accepted' || request.status === 'rejected'
  const color = STATUS_COLOR[request.status]

  const handleAcceptNoEvidence = async () => {
    if (!id) return
    setActionError('')
    setLoading(true)
    try {
      setRequest(await acceptReferralRequest(id, null))
      setStep('none')
    } catch (err: any) {
      setActionError(err.response?.data?.detail ?? 'Could not accept this request.')
    } finally {
      setLoading(false)
    }
  }

  const handleAcceptWithEvidence = async (e: FormEvent) => {
    e.preventDefault()
    if (!id) return
    setActionError('')
    setLoading(true)
    try {
      setRequest(await acceptReferralRequest(id, evidenceFile))
      setStep('none')
    } catch (err: any) {
      setActionError(err.response?.data?.detail ?? 'Could not accept this request.')
    } finally {
      setLoading(false)
    }
  }

  const handleReject = async (e: FormEvent) => {
    e.preventDefault()
    if (!id) return
    setActionError('')
    setLoading(true)
    try {
      setRequest(await rejectReferralRequest(id, rejectionReason))
      setStep('none')
    } catch (err: any) {
      setActionError(err.response?.data?.detail ?? 'Could not reject this request.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <BrandedPage>
      <div style={{ width: '100%', maxWidth: '520px' }}>
        <div style={{ marginBottom: '1.25rem', textAlign: 'center' }}>
          <div style={{
            display: 'inline-block', padding: '0.3rem 0.8rem', background: color.bg,
            border: `1px solid ${color.border}`, borderRadius: '999px', fontSize: '0.75rem',
            fontWeight: 500, color: color.fg, letterSpacing: '0.04em', marginBottom: '1rem',
          }}>
            {STATUS_LABEL[request.status]}
          </div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700 }}>
            {request.first_name} {request.last_name}
          </h1>
        </div>

        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Row
            label="From this seeker"
            value={`${request.seeker_request_count} ${request.seeker_request_count === 1 ? 'request' : 'requests'} total`}
          />
          <Row
            label="For this job posting"
            value={`${request.job_posting_request_count} ${request.job_posting_request_count === 1 ? 'request' : 'requests'} total`}
          />
          <Row label="Job posting" value={request.job_link} link />
          <Row label="CV" value={request.cv_drive_link} link />
          <Row label="Cover letter" value={request.cover_letter_drive_link} link />

          <div>
            <div style={{ color: 'var(--text-2)', fontSize: '0.85rem', marginBottom: '0.35rem' }}>Message</div>
            <p style={{ color: 'var(--text-1)', fontSize: '0.9rem', margin: 0, fontStyle: 'italic' }}>
              "{request.message}"
            </p>
          </div>

          {decided && request.status === 'accepted' && (
            <div style={{ padding: '0.7rem 0.875rem', background: 'var(--success-bg)', border: '1px solid var(--success-border)', borderRadius: 'var(--radius-xs)' }}>
              <p style={{ color: 'var(--success)', fontSize: '0.83rem', margin: 0 }}>
                Marked as accepted and sent for referral.
                {request.evidence_file_name
                  ? ` Evidence shared: ${request.evidence_file_name}`
                  : ' No evidence was shared.'}
              </p>
            </div>
          )}
          {decided && request.status === 'rejected' && (
            <div style={{ padding: '0.7rem 0.875rem', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: 'var(--radius-xs)' }}>
              <p style={{ color: 'var(--danger)', fontSize: '0.83rem', margin: 0 }}>
                Rejected — response sent to the seeker: "{request.rejection_reason}"
              </p>
            </div>
          )}

          {!decided && (
            <>
              {actionError && (
                <div style={{ padding: '0.7rem 0.875rem', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: 'var(--radius-xs)' }}>
                  <p style={{ color: 'var(--danger)', fontSize: '0.825rem', margin: 0 }}>{actionError}</p>
                </div>
              )}

              {step === 'none' && (
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    onClick={() => setStep('accept-evidence-choice')}
                    disabled={loading}
                    style={{
                      flex: 1, padding: '0.625rem', background: 'var(--success)', color: '#04140c', border: 'none',
                      borderRadius: 'var(--radius-xs)', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer',
                    }}
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => setStep('reject-form')}
                    disabled={loading}
                    style={{
                      flex: 1, padding: '0.625rem', background: 'transparent', color: 'var(--danger)',
                      border: '1px solid var(--danger-border)', borderRadius: 'var(--radius-xs)', fontWeight: 600,
                      fontSize: '0.9rem', cursor: 'pointer',
                    }}
                  >
                    Reject
                  </button>
                </div>
              )}

              {step === 'accept-evidence-choice' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <p style={{ color: 'var(--text-1)', fontSize: '0.88rem', margin: 0 }}>
                    Are you okay to share some evidence of the referral — a photo of the email you sent, a form you
                    filled, a response you got, anything that captures it?
                  </p>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button
                      onClick={() => setStep('accept-file')}
                      style={{
                        flex: 1, padding: '0.6rem', background: 'var(--accent)', color: '#fff', border: 'none',
                        borderRadius: 'var(--radius-xs)', fontWeight: 600, fontSize: '0.87rem', cursor: 'pointer',
                      }}
                    >
                      Yes
                    </button>
                    <button
                      onClick={handleAcceptNoEvidence}
                      disabled={loading}
                      style={{
                        flex: 1, padding: '0.6rem', background: 'transparent', color: 'var(--text-2)',
                        border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-xs)', fontWeight: 600,
                        fontSize: '0.87rem', cursor: loading ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {loading ? 'Saving…' : 'No'}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep('none')}
                    style={{ background: 'none', border: 'none', color: 'var(--text-3)', fontSize: '0.78rem', cursor: 'pointer', alignSelf: 'center' }}
                  >
                    ← Back
                  </button>
                </div>
              )}

              {step === 'accept-file' && (
                <form onSubmit={handleAcceptWithEvidence} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-2)', display: 'block', marginBottom: '0.4rem' }}>
                      Evidence file <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(image or PDF, up to 5 MB)</span>
                    </label>
                    <input
                      type="file"
                      accept={EVIDENCE_ACCEPT}
                      onChange={e => setEvidenceFile(e.target.files?.[0] ?? null)}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button
                      type="button"
                      onClick={() => setStep('accept-evidence-choice')}
                      style={{
                        flex: 1, padding: '0.6rem', background: 'transparent', color: 'var(--text-2)',
                        border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-xs)', fontWeight: 600,
                        fontSize: '0.87rem', cursor: 'pointer',
                      }}
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={loading || !evidenceFile}
                      style={{
                        flex: 1, padding: '0.6rem', background: 'var(--success)', color: '#04140c', border: 'none',
                        borderRadius: 'var(--radius-xs)', fontWeight: 600, fontSize: '0.87rem',
                        opacity: loading || !evidenceFile ? 0.5 : 1,
                        cursor: loading || !evidenceFile ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {loading ? 'Uploading…' : 'Submit evidence & accept'}
                    </button>
                  </div>
                </form>
              )}

              {step === 'reject-form' && (
                <form onSubmit={handleReject} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                    {REJECTION_SUGGESTIONS.map(s => (
                      <button
                        type="button"
                        key={s}
                        onClick={() => setRejectionReason(s)}
                        style={{
                          padding: '0.3rem 0.65rem', background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)',
                          borderRadius: '999px', fontSize: '0.72rem', color: 'var(--text-2)', cursor: 'pointer',
                        }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-2)', display: 'block', marginBottom: '0.4rem' }}>
                      Response to the seeker
                    </label>
                    <textarea
                      value={rejectionReason}
                      onChange={e => setRejectionReason(e.target.value.slice(0, REJECTION_MAX))}
                      required
                      rows={3}
                      placeholder="Let them know why…"
                      style={{ resize: 'vertical', fontFamily: 'inherit', width: '100%' }}
                    />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-3)', display: 'block', textAlign: 'right', marginTop: '0.25rem' }}>
                      {rejectionReason.length}/{REJECTION_MAX}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button
                      type="button"
                      onClick={() => setStep('none')}
                      style={{
                        flex: 1, padding: '0.6rem', background: 'transparent', color: 'var(--text-2)',
                        border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-xs)', fontWeight: 600,
                        fontSize: '0.87rem', cursor: 'pointer',
                      }}
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={loading || rejectionReason.trim() === ''}
                      style={{
                        flex: 1, padding: '0.6rem', background: 'var(--danger)', color: '#fff', border: 'none',
                        borderRadius: 'var(--radius-xs)', fontWeight: 600, fontSize: '0.87rem',
                        opacity: loading || rejectionReason.trim() === '' ? 0.5 : 1,
                        cursor: loading || rejectionReason.trim() === '' ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {loading ? 'Sending…' : 'Send response & reject'}
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>

        <p style={{ marginTop: '1.25rem', textAlign: 'center' }}>
          <Link to="/jobref/dashboard" style={{ color: 'var(--text-3)', fontSize: '0.8rem' }}>← Back to dashboard</Link>
        </p>
      </div>
    </BrandedPage>
  )
}

function Row({ label, value, link }: { label: string; value: string; link?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', fontSize: '0.85rem' }}>
      <span style={{ color: 'var(--text-2)' }}>{label}</span>
      {link ? (
        <a href={value} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '260px' }}>
          {value}
        </a>
      ) : (
        <span style={{ color: 'var(--text-1)', fontWeight: 500, textAlign: 'right' }}>{value}</span>
      )}
    </div>
  )
}
