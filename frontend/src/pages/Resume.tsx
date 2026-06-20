import { type ChangeEvent, type DragEvent, type KeyboardEvent, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  type CertificationEntry,
  type EducationEntry,
  type ExperienceEntry,
  type ExtractedContent,
  getMyResume,
  type Resume,
  updateExtractedContent,
  uploadResume,
} from '../api/resume'

const inputStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '0.5rem 0.75rem',
  border: '1px solid #d1d5db',
  borderRadius: '6px',
  fontSize: '0.9rem',
  boxSizing: 'border-box',
}

function TagInput({ tags, onChange }: { tags: string[]; onChange: (t: string[]) => void }) {
  const [val, setVal] = useState('')
  const add = () => {
    const v = val.trim()
    if (v && !tags.includes(v)) onChange([...tags, v])
    setVal('')
  }
  return (
    <div>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <input value={val} onChange={e => setVal(e.target.value)} onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') { e.preventDefault(); add() } }} style={{ ...inputStyle, flex: 1 }} placeholder="Type and press Enter" />
        <button type="button" onClick={add} style={{ padding: '0.4rem 0.75rem', background: '#111827', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.875rem' }}>Add</button>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.5rem' }}>
        {tags.map(t => (
          <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.2rem 0.6rem', background: '#f3f4f6', borderRadius: '999px', fontSize: '0.8rem' }}>
            {t}
            <button type="button" onClick={() => onChange(tags.filter(x => x !== t))} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#6b7280', lineHeight: 1 }}>×</button>
          </span>
        ))}
      </div>
    </div>
  )
}

function ExperienceEditor({ entries, onChange }: { entries: ExperienceEntry[]; onChange: (e: ExperienceEntry[]) => void }) {
  const update = (i: number, field: keyof ExperienceEntry, value: string) => {
    const next = entries.map((e, idx) => idx === i ? { ...e, [field]: value } : e)
    onChange(next)
  }
  const remove = (i: number) => onChange(entries.filter((_, idx) => idx !== i))
  const add = () => onChange([...entries, { title: '', company: '', location: '', start_date: '', end_date: '', description: '' }])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {entries.map((e, i) => (
        <div key={i} style={{ padding: '1rem', border: '1px solid #e5e7eb', borderRadius: '6px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <div><label style={{ fontSize: '0.8rem', color: '#6b7280' }}>Title</label><input value={e.title} onChange={ev => update(i, 'title', ev.target.value)} style={inputStyle} /></div>
            <div><label style={{ fontSize: '0.8rem', color: '#6b7280' }}>Company</label><input value={e.company} onChange={ev => update(i, 'company', ev.target.value)} style={inputStyle} /></div>
            <div><label style={{ fontSize: '0.8rem', color: '#6b7280' }}>Location</label><input value={e.location ?? ''} onChange={ev => update(i, 'location', ev.target.value)} style={inputStyle} /></div>
            <div><label style={{ fontSize: '0.8rem', color: '#6b7280' }}>Start</label><input value={e.start_date ?? ''} onChange={ev => update(i, 'start_date', ev.target.value)} placeholder="YYYY-MM" style={inputStyle} /></div>
            <div><label style={{ fontSize: '0.8rem', color: '#6b7280' }}>End</label><input value={e.end_date ?? ''} onChange={ev => update(i, 'end_date', ev.target.value)} placeholder="YYYY-MM or leave blank" style={inputStyle} /></div>
          </div>
          <div><label style={{ fontSize: '0.8rem', color: '#6b7280' }}>Description</label><textarea value={e.description ?? ''} onChange={ev => update(i, 'description', ev.target.value)} rows={2} style={{ ...inputStyle, resize: 'vertical' }} /></div>
          <button type="button" onClick={() => remove(i)} style={{ alignSelf: 'flex-end', fontSize: '0.8rem', color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Remove</button>
        </div>
      ))}
      <button type="button" onClick={add} style={{ alignSelf: 'flex-start', fontSize: '0.875rem', color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>+ Add entry</button>
    </div>
  )
}

function EducationEditor({ entries, onChange }: { entries: EducationEntry[]; onChange: (e: EducationEntry[]) => void }) {
  const update = (i: number, field: keyof EducationEntry, value: string) => onChange(entries.map((e, idx) => idx === i ? { ...e, [field]: value } : e))
  const remove = (i: number) => onChange(entries.filter((_, idx) => idx !== i))
  const add = () => onChange([...entries, { degree: '', institution: '', field: '', start_date: '', end_date: '' }])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {entries.map((e, i) => (
        <div key={i} style={{ padding: '1rem', border: '1px solid #e5e7eb', borderRadius: '6px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <div><label style={{ fontSize: '0.8rem', color: '#6b7280' }}>Degree</label><input value={e.degree} onChange={ev => update(i, 'degree', ev.target.value)} style={inputStyle} /></div>
            <div><label style={{ fontSize: '0.8rem', color: '#6b7280' }}>Institution</label><input value={e.institution} onChange={ev => update(i, 'institution', ev.target.value)} style={inputStyle} /></div>
            <div><label style={{ fontSize: '0.8rem', color: '#6b7280' }}>Field of study</label><input value={e.field ?? ''} onChange={ev => update(i, 'field', ev.target.value)} style={inputStyle} /></div>
            <div><label style={{ fontSize: '0.8rem', color: '#6b7280' }}>Start</label><input value={e.start_date ?? ''} onChange={ev => update(i, 'start_date', ev.target.value)} placeholder="YYYY" style={inputStyle} /></div>
            <div><label style={{ fontSize: '0.8rem', color: '#6b7280' }}>End</label><input value={e.end_date ?? ''} onChange={ev => update(i, 'end_date', ev.target.value)} placeholder="YYYY or leave blank" style={inputStyle} /></div>
          </div>
          <button type="button" onClick={() => remove(i)} style={{ alignSelf: 'flex-end', fontSize: '0.8rem', color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Remove</button>
        </div>
      ))}
      <button type="button" onClick={add} style={{ alignSelf: 'flex-start', fontSize: '0.875rem', color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>+ Add entry</button>
    </div>
  )
}

function CertEditor({ entries, onChange }: { entries: CertificationEntry[]; onChange: (e: CertificationEntry[]) => void }) {
  const update = (i: number, field: keyof CertificationEntry, value: string) => onChange(entries.map((e, idx) => idx === i ? { ...e, [field]: value } : e))
  const remove = (i: number) => onChange(entries.filter((_, idx) => idx !== i))
  const add = () => onChange([...entries, { name: '', issuer: '', date: '' }])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {entries.map((e, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '0.5rem', alignItems: 'end' }}>
          <div><label style={{ fontSize: '0.8rem', color: '#6b7280' }}>Name</label><input value={e.name} onChange={ev => update(i, 'name', ev.target.value)} style={inputStyle} /></div>
          <div><label style={{ fontSize: '0.8rem', color: '#6b7280' }}>Issuer</label><input value={e.issuer ?? ''} onChange={ev => update(i, 'issuer', ev.target.value)} style={inputStyle} /></div>
          <div><label style={{ fontSize: '0.8rem', color: '#6b7280' }}>Date</label><input value={e.date ?? ''} onChange={ev => update(i, 'date', ev.target.value)} placeholder="YYYY-MM" style={inputStyle} /></div>
          <button type="button" onClick={() => remove(i)} style={{ fontSize: '0.8rem', color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem 0' }}>×</button>
        </div>
      ))}
      <button type="button" onClick={add} style={{ alignSelf: 'flex-start', fontSize: '0.875rem', color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>+ Add entry</button>
    </div>
  )
}

export default function ResumePage() {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [existing, setExisting] = useState<Resume | null>(null)
  const [checking, setChecking] = useState(true)
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Verification state
  const [skills, setSkills] = useState<string[]>([])
  const [languages, setLanguages] = useState<string[]>([])
  const [experience, setExperience] = useState<ExperienceEntry[]>([])
  const [education, setEducation] = useState<EducationEntry[]>([])
  const [certifications, setCertifications] = useState<CertificationEntry[]>([])

  useEffect(() => {
    getMyResume()
      .then(r => {
        setExisting(r)
        populateFromResume(r)
      })
      .catch(() => setExisting(null))
      .finally(() => setChecking(false))
  }, [])

  const populateFromResume = (r: Resume) => {
    const c = r.content_extracted
    if (!c) return
    setSkills(c.skills ?? [])
    setLanguages(c.languages ?? [])
    setExperience(c.experience ?? [])
    setEducation(c.education ?? [])
    setCertifications(c.certifications ?? [])
  }

  const handleFile = async (file: File) => {
    setError('')
    setUploading(true)
    try {
      const r = await uploadResume(file)
      setExisting(r)
      populateFromResume(r)
    } catch (err: any) {
      setError(err.response?.data?.detail ?? 'Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  const save = async () => {
    setSaving(true)
    setError('')
    try {
      await updateExtractedContent({ skills, languages, experience, education, certifications })
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.detail ?? 'Save failed. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (checking) return <p style={{ color: '#6b7280' }}>Loading…</p>

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem' }}>Master Resume</h1>
      <p style={{ color: '#6b7280', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
        {existing ? `Currently using: ${existing.file_name} (v${existing.version}). Upload a new file to replace it.` : 'Upload your resume and we\'ll extract your profile automatically.'}
      </p>

      {error && (
        <p style={{ color: '#dc2626', background: '#fef2f2', padding: '0.75rem', borderRadius: '6px', marginBottom: '1rem' }}>
          {error}
        </p>
      )}

      {/* Upload zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${dragging ? '#111827' : '#d1d5db'}`,
          borderRadius: '8px',
          padding: '2rem',
          textAlign: 'center',
          cursor: uploading ? 'not-allowed' : 'pointer',
          background: dragging ? '#f9fafb' : 'transparent',
          marginBottom: '2rem',
          transition: 'border-color 0.15s',
        }}
      >
        <input ref={fileInputRef} type="file" accept=".pdf,.docx" onChange={onFileChange} style={{ display: 'none' }} disabled={uploading} />
        {uploading ? (
          <p style={{ color: '#6b7280', margin: 0 }}>Uploading and extracting… this may take a few seconds.</p>
        ) : (
          <>
            <p style={{ fontWeight: 600, margin: '0 0 0.25rem' }}>Drop your resume here or click to browse</p>
            <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: 0 }}>PDF or DOCX, max 5 MB</p>
          </>
        )}
      </div>

      {/* Verification */}
      {existing && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
          <Section title="Skills">
            <TagInput tags={skills} onChange={setSkills} />
          </Section>

          <Section title="Languages">
            <TagInput tags={languages} onChange={setLanguages} />
          </Section>

          <Section title="Experience">
            <ExperienceEditor entries={experience} onChange={setExperience} />
          </Section>

          <Section title="Education">
            <EducationEditor entries={education} onChange={setEducation} />
          </Section>

          <Section title="Certifications">
            <CertEditor entries={certifications} onChange={setCertifications} />
          </Section>

          <div style={{ display: 'flex', gap: '0.75rem', paddingTop: '0.5rem' }}>
            <button onClick={() => navigate('/dashboard')} style={{ flex: 1, padding: '0.625rem', background: 'transparent', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', fontSize: '1rem' }}>
              Cancel
            </button>
            <button onClick={save} disabled={saving} style={{ flex: 1, padding: '0.625rem', background: '#111827', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '1rem', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Saving…' : 'Confirm & save'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem', paddingBottom: '0.4rem', borderBottom: '1px solid #e5e7eb' }}>{title}</h2>
      {children}
    </div>
  )
}
