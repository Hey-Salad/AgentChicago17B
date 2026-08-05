import type { AdminPageId } from '../admin/pages'
import '../admin/dashboard.css'
import { AdminDashboardPage } from './admin/AdminDashboardPage'
import { AdminPlaygroundPage } from './admin/AdminPlaygroundPage'
import { AdminSkillsPage } from './admin/AdminSkillsPage'
import { AdminUsersPage } from './admin/AdminUsersPage'

interface AdminPanelProps {
  page: AdminPageId
  onNavigate: (page: AdminPageId) => void
}

/** Admin dashboard shell — DaisyUI/studio look, scoped CSS (no new packages). */
export function AdminPanel({ page, onNavigate }: AdminPanelProps) {
  return (
    <div className="admin-dash">
      {page === 'dashboard' ? (
        <AdminDashboardPage onNavigate={onNavigate} />
      ) : null}
      {page === 'playground' ? <AdminPlaygroundPage /> : null}
      {page === 'skills' ? <AdminSkillsPage /> : null}
      {page === 'users' ? <AdminUsersPage /> : null}
    </div>
  )
}
