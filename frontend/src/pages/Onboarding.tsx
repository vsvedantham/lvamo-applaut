import { type KeyboardEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createProfile } from '../api/profile'

const COUNTRIES = [
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'AT', name: 'Austria' },
  { code: 'BE', name: 'Belgium' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'ES', name: 'Spain' },
  { code: 'IT', name: 'Italy' },
  { code: 'PT', name: 'Portugal' },
  { code: 'PL', name: 'Poland' },
  { code: 'SE', name: 'Sweden' },
  { code: 'NO', name: 'Norway' },
  { code: 'DK', name: 'Denmark' },
  { code: 'FI', name: 'Finland' },
  { code: 'IE', name: 'Ireland' },
  { code: 'CZ', name: 'Czech Republic' },
  { code: 'RO', name: 'Romania' },
  { code: 'HU', name: 'Hungary' },
  { code: 'US', name: 'United States' },
]

const EMPLOYMENT_TYPES = [
  { value: 'full_time', label: 'Full-time' },
  { value: 'part_time', label: 'Part-time' },
  { value: 'contract', label: 'Contract' },
  { value: 'freelance', label: 'Freelance' },
  { value: 'internship', label: 'Internship' },
]

const REMOTE_OPTIONS = [
  { value: 'remote', label: 'Remote only' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'onsite', label: 'On-site only' },
  { value: 'any', label: 'Any' },
]

const inputStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '0.5rem 0.75rem',
  marginTop: '0.25rem',
  border: '1px solid #d1d5db',
  borderRadius: '6px',
  fontSize: '1rem',
  boxSizing: 'border-box',
}

function TagInput({
  tags,
  onChange,
  placeholder,
}: {
  tags: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
}) {
  const [input, setInput] = useState('')

  const add = () => {
    const val = input.trim()
    if (val && !tags.includes(val)) onChange([...tags, val])
    setInput('')
  }

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); add() }
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={onKey}
          placeholder={placeholder}
          style={{ ...inputStyle, marginTop: 0, flex: 1 }}
        />
        <button
          type="button"
          onClick={add}
          style={{ padding: '0.5rem 1rem', background: '#111827', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', whiteSpace: 'nowrap' }}
        >
          Add
        </button>
      </div>
      {tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
          {tags.map(tag => (
            <span
              key={tag}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.25rem 0.75rem', background: '#f3f4f6', borderRadius: '999px', fontSize: '0.875rem' }}
            >
              {tag}
              <button
                type="button"
                onClick={() => onChange(tags.filter(t => t !== tag))}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1, color: '#6b7280' }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Onboarding() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Step 1
  const [displayName, setDisplayName] = useState('')
  const [experienceYears, setExperienceYears] = useState('')
  const [targetRoles, setTargetRoles] = useState<string[]>([])

  // Step 2
  const [targetCountries, setTargetCountries] = useState<string[]>([])
  const [remotePreference, setRemotePreference] = useState('any')
  const [employmentTypes, setEmploymentTypes] = useState<string[]>([])

  // Step 3
  const [skills, setSkills] = useState<string[]>([])
  const [languages, setLanguages] = useState<string[]>([])
  const [discoveryFrequency, setDiscoveryFrequency] = useState(24)

  const toggleCountry = (code: string) =>
    setTargetCountries(prev =>
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code],
    )

  const toggleEmploymentType = (val: string) =>
    setEmploymentTypes(prev =>
      prev.includes(val) ? prev.filter(e => e !== val) : [...prev, val],
    )

  const validateStep = () => {
    if (step === 1) {
      if (!displayName.trim()) return 'Profile name is required.'
      if (targetRoles.length === 0) return 'Add at least one target role.'
    }
    if (step === 2) {
      if (targetCountries.length === 0) return 'Select at least one country.'
      if (employmentTypes.length === 0) return 'Select at least one employment type.'
    }
    return ''
  }

  const next = () => {
    const err = validateStep()
    if (err) { setError(err); return }
    setError('')
    setStep(s => s + 1)
  }

  const submit = async () => {
    setError('')
    setLoading(true)
    try {
      await createProfile({
        display_name: displayName.trim(),
        total_experience_years: experienceYears ? parseInt(experienceYears) : undefined,
        target_roles: targetRoles,
        target_countries: targetCountries,
        remote_preference: remotePreference,
        employment_types: employmentTypes,
        skills,
        languages,
        discovery_frequency_hours: discoveryFrequency as 6 | 12 | 24,
      })
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.detail ?? 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: '560px', margin: '0 auto' }}>
      {/* Progress */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem' }}>
        {[1, 2, 3].map(s => (
          <div
            key={s}
            style={{
              flex: 1,
              height: '4px',
              borderRadius: '2px',
              background: s <= step ? '#111827' : '#e5e7eb',
            }}
          />
        ))}
      </div>

      {error && (
        <p style={{ color: '#dc2626', background: '#fef2f2', padding: '0.75rem', borderRadius: '6px', marginBottom: '1rem' }}>
          {error}
        </p>
      )}

      {/* Step 1 — About you */}
      {step === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>About you</h1>
          <div>
            <label>Profile name <span style={{ color: '#6b7280', fontWeight: 400 }}>e.g. Data Engineer – DACH</span></label>
            <input value={displayName} onChange={e => setDisplayName(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label>Years of experience</label>
            <input type="number" min={0} max={50} value={experienceYears} onChange={e => setExperienceYears(e.target.value)} style={inputStyle} placeholder="e.g. 5" />
          </div>
          <div>
            <label>Target roles <span style={{ color: '#6b7280', fontWeight: 400 }}>type and press Enter or Add</span></label>
            <TagInput tags={targetRoles} onChange={setTargetRoles} placeholder="e.g. Data Engineer" />
          </div>
          <button onClick={next} style={{ padding: '0.625rem', background: '#111827', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '1rem' }}>
            Next →
          </button>
        </div>
      )}

      {/* Step 2 — Job preferences */}
      {step === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Job preferences</h1>
          <div>
            <p style={{ fontWeight: 600, margin: '0 0 0.5rem' }}>Target countries</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
              {COUNTRIES.map(c => (
                <label key={c.code} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.375rem 0.5rem', border: `1px solid ${targetCountries.includes(c.code) ? '#111827' : '#e5e7eb'}`, borderRadius: '6px', background: targetCountries.includes(c.code) ? '#f3f4f6' : 'transparent' }}>
                  <input type="checkbox" checked={targetCountries.includes(c.code)} onChange={() => toggleCountry(c.code)} style={{ margin: 0 }} />
                  <span style={{ fontSize: '0.875rem' }}>{c.name}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <p style={{ fontWeight: 600, margin: '0 0 0.5rem' }}>Remote preference</p>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {REMOTE_OPTIONS.map(o => (
                <label key={o.value} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.375rem 0.75rem', border: `1px solid ${remotePreference === o.value ? '#111827' : '#e5e7eb'}`, borderRadius: '6px', background: remotePreference === o.value ? '#f3f4f6' : 'transparent' }}>
                  <input type="radio" name="remote" value={o.value} checked={remotePreference === o.value} onChange={() => setRemotePreference(o.value)} style={{ margin: 0 }} />
                  <span style={{ fontSize: '0.875rem' }}>{o.label}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <p style={{ fontWeight: 600, margin: '0 0 0.5rem' }}>Employment type</p>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {EMPLOYMENT_TYPES.map(e => (
                <label key={e.value} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.375rem 0.75rem', border: `1px solid ${employmentTypes.includes(e.value) ? '#111827' : '#e5e7eb'}`, borderRadius: '6px', background: employmentTypes.includes(e.value) ? '#f3f4f6' : 'transparent' }}>
                  <input type="checkbox" checked={employmentTypes.includes(e.value)} onChange={() => toggleEmploymentType(e.value)} style={{ margin: 0 }} />
                  <span style={{ fontSize: '0.875rem' }}>{e.label}</span>
                </label>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button onClick={() => { setError(''); setStep(1) }} style={{ flex: 1, padding: '0.625rem', background: 'transparent', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', fontSize: '1rem' }}>
              ← Back
            </button>
            <button onClick={next} style={{ flex: 1, padding: '0.625rem', background: '#111827', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '1rem' }}>
              Next →
            </button>
          </div>
        </div>
      )}

      {/* Step 3 — Skills & schedule */}
      {step === 3 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Skills & schedule</h1>
          <div>
            <label>Skills <span style={{ color: '#6b7280', fontWeight: 400 }}>optional</span></label>
            <TagInput tags={skills} onChange={setSkills} placeholder="e.g. Python, SQL, dbt" />
          </div>
          <div>
            <label>Languages <span style={{ color: '#6b7280', fontWeight: 400 }}>optional</span></label>
            <TagInput tags={languages} onChange={setLanguages} placeholder="e.g. English, German" />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Discovery frequency</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {([6, 12, 24] as const).map(h => (
                <label key={h} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.375rem 0.75rem', border: `1px solid ${discoveryFrequency === h ? '#111827' : '#e5e7eb'}`, borderRadius: '6px', background: discoveryFrequency === h ? '#f3f4f6' : 'transparent' }}>
                  <input type="radio" name="freq" value={h} checked={discoveryFrequency === h} onChange={() => setDiscoveryFrequency(h)} style={{ margin: 0 }} />
                  <span style={{ fontSize: '0.875rem' }}>Every {h}h</span>
                </label>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button onClick={() => { setError(''); setStep(2) }} style={{ flex: 1, padding: '0.625rem', background: 'transparent', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', fontSize: '1rem' }}>
              ← Back
            </button>
            <button onClick={submit} disabled={loading} style={{ flex: 1, padding: '0.625rem', background: '#111827', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '1rem', opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Saving…' : 'Finish setup'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
