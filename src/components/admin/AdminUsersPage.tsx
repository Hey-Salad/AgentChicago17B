import { useState } from 'react'
import {
  loadOperators,
  resetOperators,
  saveOperators,
  type Operator,
  type OperatorRole,
} from '../../admin/skillStore'

export function AdminUsersPage() {
  const [operators, setOperators] = useState<Operator[]>(() => loadOperators())
  const [flash, setFlash] = useState<string | null>(null)

  function notify(text: string) {
    setFlash(text)
    window.setTimeout(() => setFlash(null), 1800)
  }

  function updateOperator(id: string, patch: Partial<Operator>) {
    const next = operators.map((op) => (op.id === id ? { ...op, ...patch } : op))
    setOperators(next)
    saveOperators(next)
  }

  function addOperator() {
    const next: Operator = {
      id: `op-${Date.now()}`,
      name: 'New person',
      email: 'person@heysalad.local',
      role: 'operator',
      active: true,
    }
    const list = [...operators, next]
    setOperators(list)
    saveOperators(list)
  }

  function removeOperator(id: string) {
    const list = operators.filter((op) => op.id !== id)
    setOperators(list)
    saveOperators(list)
  }

  function resetUsers() {
    resetOperators()
    setOperators(loadOperators())
    notify('Reset done')
  }

  return (
    <div className="ad-shell">
      <header className="ad-top">
        <div>
          <h1 className="ad-title">Manage users</h1>
          <p className="ad-sub">Add people, set a role, turn them on or off.</p>
        </div>
        <div className="ad-top-actions">
          {flash ? <p className="ad-flash">{flash}</p> : null}
          <button type="button" className="ad-btn ad-btn-ghost" onClick={resetUsers}>
            Reset
          </button>
          <button type="button" className="ad-btn ad-btn-primary ad-btn-lg" onClick={addOperator}>
            Add person
          </button>
        </div>
      </header>

      <div className="ad-table" role="table" aria-label="Users">
        <div className="ad-table-head" role="row">
          <span>Name</span>
          <span>Email</span>
          <span>Role</span>
          <span>On?</span>
          <span />
        </div>
        {operators.map((op) => (
          <div key={op.id} className="ad-table-row" role="row">
            <label>
              <span className="sr-only">Name</span>
              <input
                className="ad-input"
                value={op.name}
                onChange={(event) =>
                  updateOperator(op.id, { name: event.target.value })
                }
              />
            </label>
            <label>
              <span className="sr-only">Email</span>
              <input
                className="ad-input"
                value={op.email}
                onChange={(event) =>
                  updateOperator(op.id, { email: event.target.value })
                }
              />
            </label>
            <label>
              <span className="sr-only">Role</span>
              <select
                className="ad-select"
                value={op.role}
                onChange={(event) =>
                  updateOperator(op.id, {
                    role: event.target.value as OperatorRole,
                  })
                }
              >
                <option value="admin">Admin</option>
                <option value="operator">Operator</option>
                <option value="viewer">Viewer</option>
              </select>
            </label>
            <label className="ad-check">
              <input
                type="checkbox"
                checked={op.active}
                onChange={(event) =>
                  updateOperator(op.id, { active: event.target.checked })
                }
              />
              <span>{op.active ? 'Yes' : 'No'}</span>
            </label>
            <button
              type="button"
              className="ad-btn ad-btn-ghost"
              onClick={() => removeOperator(op.id)}
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
