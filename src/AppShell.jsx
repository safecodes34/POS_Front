import React from 'react'
import { Outlet, NavLink, useLocation } from 'react-router-dom'

const AppShell = ({ setIsLogoutModalOpen, tosAgreed, activeSettingsSection }) => {
  const location = useLocation()
  
  // Check if we should disable navigation (TOS not agreed)
  const isNavigationDisabled = location.pathname.startsWith('/settings') && 
    activeSettingsSection === 'Terms and Conditions' && 
    !tosAgreed

  return (
    <div className={`app-container ${location.pathname === '/Menu' || location.pathname === '/menu' ? 'route-menu' : ''} ${location.pathname === '/Transactions' || location.pathname === '/transactions' ? 'transaction-view' : ''}`}>
      <div className="main-content">
        <Outlet />
      </div>
      
      {/* Navigation Footer */}
      <div className="navigation-footer">
        <div className="nav-footer-left">
          <button 
            className="nav-footer-btn"
            onClick={() => setIsLogoutModalOpen(true)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            <span>Logout</span>
          </button>
          <NavLink 
            to="/Menu"
            className={({ isActive }) => `nav-footer-btn ${isActive ? 'active' : ''}`}
            style={isNavigationDisabled ? { opacity: 0.5, cursor: 'not-allowed', pointerEvents: 'none' } : {}}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
            <span>Menu</span>
          </NavLink>
          <NavLink 
            to="/Transactions"
            className={({ isActive }) => `nav-footer-btn ${isActive ? 'active' : ''}`}
            style={isNavigationDisabled ? { opacity: 0.5, cursor: 'not-allowed', pointerEvents: 'none' } : {}}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
              <line x1="1" y1="10" x2="23" y2="10"></line>
            </svg>
            <span>Transactions</span>
          </NavLink>
          <NavLink 
            to="/clock"
            className={({ isActive }) => `nav-footer-btn ${isActive ? 'active' : ''}`}
            style={isNavigationDisabled ? { opacity: 0.5, cursor: 'not-allowed', pointerEvents: 'none' } : {}}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
            <span>Clock in/out</span>
          </NavLink>
          <NavLink 
            to="/settings"
            className={({ isActive }) => `nav-footer-btn ${isActive ? 'active' : ''}`}
            style={isNavigationDisabled ? { opacity: 0.5, cursor: 'not-allowed', pointerEvents: 'none' } : {}}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
            <span>Settings</span>
          </NavLink>
        </div>
        <div className="nav-footer-right">
        </div>
      </div>
    </div>
  )
}

export default AppShell

