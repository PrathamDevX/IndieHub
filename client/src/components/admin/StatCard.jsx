export default function StatCard({ label, value, icon: Icon, color = '#8b5cf6', highlight = false }) {
  return (
    <div className={`admin-stat-card ${highlight ? 'admin-stat-card--highlight' : ''}`}>
      <div className="admin-stat-icon" style={{ background: `${color}20`, color }}>
        <Icon size={22} />
      </div>
      <div className="admin-stat-info">
        <span className="admin-stat-label">{label}</span>
        <strong className="admin-stat-value">{value.toLocaleString()}</strong>
      </div>
    </div>
  )
}
