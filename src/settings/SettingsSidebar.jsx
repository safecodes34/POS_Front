import { NavLink } from 'react-router-dom'

const SidebarItem = ({ to, children, icon }) => {
  return (
    <NavLink
      to={to}
      end={to === '/settings/account' || to === '/settings'}
      className={({ isActive }) => `settings-sidebar-btn ${isActive ? 'active' : ''}`}
      onClick={(e) => {
        // Prevent navigation if on Terms and Conditions and TOS not agreed
        // This check will need to be passed as a prop or handled differently
        // For now, we'll let it navigate and handle the check in the component
      }}
    >
      {icon}
      <span>{children}</span>
    </NavLink>
  )
}

export default function SettingsSidebar() {
  return (
    <div className="settings-sidebar">
      <div className="settings-sidebar-content" style={{ flex: 1, overflowY: 'auto', padding: '1rem', paddingBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <SidebarItem 
          to="/settings/account"
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
          }
        >
          Account
        </SidebarItem>
        
        <SidebarItem 
          to="/settings/team-members"
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
          }
        >
          Team members
        </SidebarItem>
        
        <SidebarItem 
          to="/settings/schedule"
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
          }
        >
          Schedule
        </SidebarItem>
        
        <SidebarItem 
          to="/settings/edit-timesheets"
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
          }
        >
          Edit time-sheets
        </SidebarItem>
        
        <SidebarItem 
          to="/settings/payroll"
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="1" x2="12" y2="23"></line>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
            </svg>
          }
        >
          Payroll
        </SidebarItem>
        
        <SidebarItem 
          to="/settings/compliance"
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
              <path d="M9 12l2 2 4-4"></path>
            </svg>
          }
        >
          Compliance
        </SidebarItem>
        
        <SidebarItem 
          to="/settings/terms-and-conditions"
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <line x1="10" y1="9" x2="8" y2="9"></line>
              <line x1="16" y1="9" x2="12" y2="9"></line>
            </svg>
          }
        >
          Terms and Conditions
        </SidebarItem>
        
        <SidebarItem 
          to="/settings/inventory"
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 7h-4V4c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v3H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2z"></path>
              <path d="M12 11v6"></path>
              <path d="M9 14h6"></path>
            </svg>
          }
        >
          Inventory Management
        </SidebarItem>
      </div>
    </div>
  )
}

