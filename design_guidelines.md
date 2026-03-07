# Design Guidelines: Storybook-Style Component Explorer

## Design Approach

**System-Based Approach**: Drawing from developer tools like Storybook, VS Code, and Linear. This is a utility-focused application where clarity, efficiency, and information density are paramount. The design prioritizes a clean, professional developer experience with excellent readability and intuitive controls.

## Typography System

**Font Family**: 
- UI Text: Inter or System UI (-apple-system, BlinkMacSystemFont)
- Code Display: JetBrains Mono or Fira Code (monospace with ligatures)

**Type Scale**:
- Panel Headers: text-sm font-semibold uppercase tracking-wide
- Component Names: text-base font-medium
- Body Text: text-sm
- Code: text-xs font-mono
- Labels: text-xs font-medium
- Metadata/Helper Text: text-xs opacity-60

## Layout & Spacing System

**Spacing Primitives**: Tailwind units of 2, 4, 6, and 8 (e.g., p-4, gap-6, m-8)

**Three-Panel Grid Structure**:
- Left Sidebar (Component List): Fixed width 280px on desktop, collapsible on tablet/mobile
- Middle Panel (Preview + Code): Flexible width, min 400px
- Right Sidebar (Controls): Fixed width 320px on desktop, collapsible on tablet/mobile

**Responsive Breakpoints**:
- Desktop (lg+): Three-panel layout side by side
- Tablet (md): Collapsible sidebars with toggle buttons, main panel takes priority
- Mobile: Single panel view with bottom sheet navigation for component list and controls

**Panel Padding**: Consistent p-6 for all panel interiors, p-4 for nested sections

## Component Library

### Left Panel: Component List
- **Header**: Search input (full width) with filter icon, p-4 bottom spacing
- **List Items**: Organized by category with collapsible sections
  - Category headers: py-2 px-4 with chevron indicator
  - Component items: py-2 px-4 with hover state, active state for selected component
  - Nested indentation: pl-8 for sub-items
- **Scrollable Area**: Overflow-y auto with custom minimal scrollbar

### Middle Panel: Preview + Code Display
- **Layout**: Vertical split with resizable divider
  - Top: Live Preview Area (60% default height)
  - Bottom: Code Display (40% default height)
  
- **Preview Section**:
  - Toolbar: Component name (text-lg font-semibold), responsive viewport toggles (mobile/tablet/desktop icons), copy code button
  - Canvas: Centered component with adjustable background (checkerboard/solid toggle)
  - Padding: p-8 around rendered component
  
- **Code Section**:
  - Syntax-highlighted code block with line numbers
  - Copy button positioned top-right
  - Tabs for: React Code, Props Interface, Usage Example
  - Font: font-mono text-xs with 1.5 line-height for readability

### Right Panel: Control Panel
- **Header**: "Props" title with reset button
- **Control Groups**: Grouped by prop type with mb-6 spacing
  - Group Label: text-xs font-semibold uppercase mb-3
  - Individual Controls: mb-4 spacing

**Control Types** (auto-generated based on prop types):
- **Text Input**: Label above, full-width input field with border, h-10
- **Number Input**: Label above, input with increment/decrement buttons
- **Boolean Toggle**: Label left, toggle switch right, flex justify-between
- **Select Dropdown**: Label above, full-width select with custom arrow icon
- **Color Picker**: Label above, color swatch preview with hex input
- **Range Slider**: Label with current value, full-width slider

**Control Layout**:
- Label: text-xs font-medium mb-2
- Input height: h-10 for text/number/select inputs
- Toggle switches: h-6 w-11 standard size
- Spacing between controls: mb-4
- Section dividers: border-b with my-6

### Common UI Elements
- **Borders**: 1px solid for panels, inputs, and dividers
- **Border Radius**: rounded-lg for panels, rounded-md for inputs, rounded for toggles
- **Focus States**: 2px outline offset for keyboard navigation
- **Scrollbars**: Minimal, semi-transparent design that appears on hover

### Responsive Behavior
- **Desktop**: All three panels visible, resizable dividers between panels
- **Tablet**: Left/right panels collapse to slide-out drawers, toggle buttons in header
- **Mobile**: Bottom sheet for component list, floating action button for controls panel

## Interactive States
- **Hover**: Subtle opacity or background shift on interactive elements
- **Active/Selected**: Distinct treatment for active component in list
- **Focus**: Clear outline for keyboard navigation
- **Disabled**: Reduced opacity (opacity-50) for unavailable controls

## Panel Headers
All panels include:
- Title (left-aligned, text-sm font-semibold)
- Action buttons (right-aligned, icon buttons with tooltips)
- Bottom border separator
- Height: h-14 with flex items-center px-6

## Code Syntax Highlighting
Use a syntax highlighting library (Prism.js or Highlight.js) with a developer-friendly theme. Display with proper indentation and line numbers for readability.

---

**No Images Required**: This is a developer tool interface with no hero sections or marketing imagery. All visual elements are UI components and code displays.