import type { AdminPageId } from '../../admin/pages'

interface AdminDashboardPageProps {
  onNavigate: (page: AdminPageId) => void
}

const ACTIONS: {
  id: AdminPageId
  title: string
  help: string
  cta: string
}[] = [
  {
    id: 'playground',
    title: 'Test a model',
    help: 'Chat with Cloudflare or NVIDIA models before you use them in research.',
    cta: 'Open playground',
  },
  {
    id: 'eve',
    title: 'Eve desk (durable)',
    help: 'Run research on Eve with Vercel Workflows + Sandbox isolation.',
    cta: 'Open Eve',
  },
  {
    id: 'skills',
    title: 'Edit prompts',
    help: 'Change how Intent, Deliver, and Critique behave.',
    cta: 'Open prompts',
  },
  {
    id: 'users',
    title: 'Manage users',
    help: 'Add or remove local operators for demos.',
    cta: 'Open users',
  },
]

export function AdminDashboardPage({ onNavigate }: AdminDashboardPageProps) {
  return (
    <div className="ad-shell ad-shell-simple">
      <header className="ad-top">
        <div>
          <h1 className="ad-title">Admin</h1>
          <p className="ad-sub">Pick one thing to do.</p>
        </div>
      </header>

      <section className="ad-actions" aria-label="Admin actions">
        {ACTIONS.map((action, index) => (
          <button
            key={action.id}
            type="button"
            className="ad-action"
            onClick={() => onNavigate(action.id)}
          >
            <span className="ad-action-num">{String(index + 1).padStart(2, '0')}</span>
            <span className="ad-action-copy">
              <strong>{action.title}</strong>
              <span>{action.help}</span>
            </span>
            <span className="ad-btn ad-btn-primary ad-action-cta">{action.cta}</span>
          </button>
        ))}
      </section>
    </div>
  )
}
