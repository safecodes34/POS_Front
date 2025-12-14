/**
 * UI Layout Constants
 * 
 * These constants define the fixed design-space layout dimensions for the 1920px desktop canvas.
 * All positioning should reference these values to maintain consistency and proportional scaling.
 * 
 * The ScaleToFit wrapper handles scaling across all devices, so these values stay in design-space pixels.
 */

export const UI = {
  // Design canvas
  designWidth: 1920,
  designHeight: 1080,
  
  // Navigation
  leftNavW: 280,        // Left navigation panel width (if used)
  
  // Spacing
  gutter: 24,           // Standard gutter/spacing between major sections
  gap: 16,              // Standard gap between related elements
  gapSmall: 8,          // Small gap for tightly related elements
  gapLarge: 32,         // Large gap for major section separation
  
  // Padding
  topPad: 24,           // Standard top padding
  sidePad: 24,          // Standard side padding
  pad: 16,              // Standard padding
  padSmall: 8,          // Small padding
  padLarge: 32,         // Large padding
  
  // Header/Footer
  headerHeight: 70,     // Header height
  footerHeight: 60,     // Footer height (if used)
  
  // Panels
  rightPanelW: 400,     // Right panel width (cart, etc.)
  sidebarW: 300,        // Sidebar width (settings, etc.)
  
  // Modals
  modalWidth: 600,      // Standard modal width
  modalHeight: 600,     // Standard modal height
  modalPad: 24,         // Modal padding
  
  // Buttons
  btnHeight: 40,        // Standard button height
  btnHeightSmall: 32,   // Small button height
  btnHeightLarge: 48,   // Large button height
  btnPadX: 16,          // Button horizontal padding
  btnPadY: 8,           // Button vertical padding
  
  // Borders
  borderWidth: 2,       // Standard border width
  borderRadius: 8,      // Standard border radius
  borderRadiusSmall: 4, // Small border radius
  borderRadiusLarge: 12,// Large border radius
  
  // Icons
  iconSize: 24,         // Standard icon size
  iconSizeSmall: 16,    // Small icon size
  iconSizeLarge: 32,    // Large icon size
}

/**
 * Helper functions for common positioning calculations
 */

/**
 * Calculate left position after left nav
 */
export const afterLeftNav = () => UI.leftNavW + UI.gutter

/**
 * Calculate right position before right panel
 */
export const beforeRightPanel = () => UI.designWidth - UI.rightPanelW - UI.gutter

/**
 * Calculate centered horizontal position for a given width
 */
export const centerX = (width) => (UI.designWidth - width) / 2

/**
 * Calculate centered vertical position for a given height
 */
export const centerY = (height) => (UI.designHeight - height) / 2

/**
 * Calculate position for grid columns (useful for CSS grid layouts)
 */
export const gridColumn = (start, end) => `${start} / ${end}`

/**
 * Calculate position for grid rows (useful for CSS grid layouts)
 */
export const gridRow = (start, end) => `${start} / ${end}`







