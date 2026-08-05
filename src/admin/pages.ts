export type AdminPageId = 'dashboard' | 'playground' | 'skills' | 'users' | 'eve'

export const ADMIN_PAGES: {
  id: AdminPageId
  label: string
}[] = [
  { id: 'dashboard', label: 'Home' },
  { id: 'playground', label: 'Test models' },
  { id: 'eve', label: 'Eve desk' },
  { id: 'skills', label: 'Edit prompts' },
  { id: 'users', label: 'Manage users' },
]

export function isAdminPageId(value: string): value is AdminPageId {
  return ADMIN_PAGES.some((page) => page.id === value)
}
