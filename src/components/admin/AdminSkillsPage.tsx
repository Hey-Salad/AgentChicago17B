import { useMemo, useState } from 'react'
import {
  loadSkills,
  resetSkillPrompts,
  saveSkillPrompt,
  type SkillId,
  type SkillNode,
} from '../../admin/skillStore'

export function AdminSkillsPage() {
  const [skills, setSkills] = useState<SkillNode[]>(() => loadSkills())
  const [selectedId, setSelectedId] = useState<SkillId>('deliver')
  const [draft, setDraft] = useState(
    () => loadSkills().find((s) => s.id === 'deliver')?.prompt ?? '',
  )
  const [flash, setFlash] = useState<string | null>(null)

  const selected = useMemo(
    () => skills.find((s) => s.id === selectedId) ?? skills[0],
    [skills, selectedId],
  )

  function selectSkill(id: SkillId) {
    const next = skills.find((s) => s.id === id)
    if (!next) return
    setSelectedId(id)
    setDraft(next.prompt)
    setFlash(null)
  }

  function savePrompt() {
    saveSkillPrompt(selected.id, draft)
    setSkills(loadSkills())
    setFlash('Saved')
    window.setTimeout(() => setFlash(null), 1800)
  }

  function resetPrompts() {
    resetSkillPrompts()
    const fresh = loadSkills()
    setSkills(fresh)
    const current = fresh.find((s) => s.id === selectedId) ?? fresh[0]
    setSelectedId(current.id)
    setDraft(current.prompt)
    setFlash('Reset done')
    window.setTimeout(() => setFlash(null), 1800)
  }

  return (
    <div className="ad-shell">
      <header className="ad-top">
        <div>
          <h1 className="ad-title">Edit prompts</h1>
          <p className="ad-sub">Choose a skill on the left, edit, then Save.</p>
        </div>
        <div className="ad-top-actions">
          {flash ? <p className="ad-flash">{flash}</p> : null}
          <button type="button" className="ad-btn ad-btn-ghost" onClick={resetPrompts}>
            Reset all
          </button>
        </div>
      </header>

      <div className="ad-split">
        <aside className="ad-rail" aria-label="Skills">
          {skills.map((skill) => (
            <button
              key={skill.id}
              type="button"
              className={`ad-rail-item ${skill.id === selectedId ? 'is-active' : ''}`}
              onClick={() => selectSkill(skill.id)}
            >
              <span className="ad-rail-name">{skill.label}</span>
              <span className="ad-rail-meta">{skill.description}</span>
            </button>
          ))}
        </aside>

        <div className="ad-editor">
          <div className="ad-editor-head">
            <div>
              <h2>{selected.label}</h2>
              <p>{selected.description}</p>
            </div>
            <button type="button" className="ad-btn ad-btn-primary ad-btn-lg" onClick={savePrompt}>
              Save
            </button>
          </div>
          <label className="ad-field">
            <span>Prompt text</span>
            <textarea
              className="ad-textarea"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              rows={18}
              spellCheck={false}
              style={{ minHeight: 340 }}
            />
          </label>
        </div>
      </div>
    </div>
  )
}
