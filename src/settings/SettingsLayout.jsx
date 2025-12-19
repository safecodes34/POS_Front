import { Outlet } from 'react-router-dom'
import SettingsSidebar from './SettingsSidebar'
import { SettingsContext } from './SettingsContext'

export default function SettingsLayout({ settingsProps }) {
  return (
    <SettingsContext.Provider value={settingsProps}>
      <div className="settings-view" style={{ width: '100%', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, position: 'relative' }}>
        <SettingsSidebar />
        <div className="settings-content-wrapper" style={{ display: 'flex', flexDirection: 'row', flex: 1, minHeight: 0 }}>
          <div className="settings-main-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0, position: 'relative', zIndex: 10, overflow: 'visible' }}>
            <Outlet />
          </div>
        </div>
      </div>
    </SettingsContext.Provider>
  )
}

