import { BarChart3, Clock, Mic2, Users } from 'lucide-react'

export default function AdminNav({ activeTab, onSelectTab, pendingCount = 0 }) {
  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'songs', label: 'Pending Songs', icon: Clock, badge: pendingCount },
    { id: 'artists', label: 'Artists', icon: Mic2 },
    { id: 'users', label: 'Users', icon: Users },
  ]

  return (
    <nav className="admin-nav">
      {tabs.map((tab) => {
        const Icon = tab.icon
        const isActive = activeTab === tab.id
        return (
          <button
            key={tab.id}
            className={`admin-nav-item ${isActive ? 'admin-nav-item--active' : ''}`}
            onClick={() => onSelectTab(tab.id)}
          >
            <Icon size={17} />
            <span>{tab.label}</span>
            {tab.badge !== undefined && tab.badge > 0 && (
              <span className="admin-nav-badge">{tab.badge}</span>
            )}
          </button>
        )
      })}
    </nav>
  )
}
