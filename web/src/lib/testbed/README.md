# Fluid UI Testbed

Comprehensive UI testing system for the Fluid UI components library.

## Overview

The Fluid UI Testbed provides a dedicated environment for testing and exploring all dashboard component combinations with various data scenarios. It features an ultra-minimal aesthetic inspired by hexta.ui with sharp edges, thin accent lines, and precise spacing.

## Features

### Data Scenarios
- **Empty**: No data
- **Minimal**: 1-3 items
- **Normal**: 10-15 items (default)
- **Heavy**: 100-500 items for performance testing
- **Edge**: Edge cases and unusual states

### Test Categories

#### Single Components (13 tests)
- EventDetails
- TasksList, TasksKanban
- ExpensesSummary, ExpensesList, UpcomingPayments
- Timeline, MilestoneTracker
- RoomActivity, PollsList, PollResults
- CalendarView, UpcomingEvents

#### Layout Tests (6 tests)
- Two Equal (1:1)
- Two Thirds One Third (2:1)
- Three Quarters One Quarter (3:1)
- Sidebar Layout
- Three Columns
- Custom Ratio

#### Multi-Row Tests (3 tests)
- Two Rows Equal
- Full Width Plus Split
- Mixed Layouts

#### Text + Component Tests (3 tests)
- With Header
- With Section Headers
- Multiple Text Sections

#### Real-World Scenarios (5 tests)
- Executive Overview
- Project Manager View
- Financial Dashboard
- Collaboration Hub
- Comprehensive Dashboard

## Usage

Navigate to `/testbed` while authenticated.

### Control Panel

**Configuration Selector**
- Browse test configs by category
- Click any config to preview

**Data Scenario**
- Select data volume: empty, minimal, normal, heavy, edge
- Changes apply immediately to all components

**Display Options**
- Show Grid Lines: Overlay 24px grid for alignment checking
- Show Boundaries: Highlight component boundaries with dashed lines

**Mock Data Summary**
- Real-time count of generated mock data
- Events, Tasks, Expenses, Polls, Rooms

## Design System

### Ultra-Minimal Aesthetic
- ✅ Sharp edges (border-radius: 0)
- ✅ Thin accent-colored divider lines (1px)
- ✅ Precise 4px/8px/12px/16px spacing grid
- ✅ Clean monochrome + accent pops
- ✅ Subtle inset shadows for depth

### What We Avoid
- ❌ Rounded corners
- ❌ Generic card shadows
- ❌ Chunky elements
- ❌ AI-generated UI patterns

## Files

### Core Files
- `mock-data.ts` - Mock data generators for all component types
- `test-configs.ts` - Pre-built dashboard configurations
- `register-components.ts` - Component registration for testbed
- `README.md` - This file

### Route
- `/routes/_authed/testbed.tsx` - Main testbed interface

### Styles
- `/styles/fluid-ui.css` - Base fluid UI system styles
- `/styles/fluid-ui-testbed.css` - Testbed-specific styles

## Architecture

### Mock Data System
```typescript
// Generate full mock dataset
const mockData = generateMockDataSet("normal");

// Individual generators
const tasks = generateMockTasks("heavy");  // 500 tasks
const expenses = generateMockExpenses("minimal");  // 3 expenses
```

### Test Configurations
```typescript
// Access all configs
ALL_TEST_CONFIGS.executiveOverview
ALL_TEST_CONFIGS.tasksList

// Browse by category
TEST_CATEGORIES["Single Components"]  // Array of config keys
TEST_CATEGORIES["Real-World"]
```

### Component Registration
```typescript
// Automatically registers all 13 dashboard components
registerDashboardComponents();

// Individual registration
registerComponent("TasksList", TasksList, TasksListMetadata);
```

## Development

### Adding New Components

1. Create component in `/components/dashboard/`
2. Export component + metadata
3. Add to `register-components.ts`
4. Create test config in `test-configs.ts`

### Adding New Test Scenarios

Edit `test-configs.ts`:

```typescript
export const MY_NEW_TEST: Record<string, DashboardConfig> = {
  myTest: {
    sections: [
      {
        type: "row",
        layout: "1:1",
        components: [
          { type: "TasksList", props: { eventId: MOCK_EVENT_ID } },
          { type: "ExpensesList", props: { eventId: MOCK_EVENT_ID } },
        ],
      },
    ],
  },
};

// Add to ALL_TEST_CONFIGS
export const ALL_TEST_CONFIGS = {
  ...EXISTING_TESTS,
  ...MY_NEW_TEST,
};
```

## Performance

### Targets
- Dashboard render: <500ms
- Component load: <1s
- 60fps animations
- Smooth scrolling with 500+ items (virtualization)

### Monitoring
- Use "heavy" scenario to stress test
- Check browser DevTools Performance tab
- Watch for layout shifts
- Monitor memory usage

## Theme Integration

All fluid-ui components use CSS variables from the theme system:
- `hsl(var(--background))`
- `hsl(var(--foreground))`
- `hsl(var(--accent))`
- `hsl(var(--border))`
- `hsl(var(--muted-foreground))`

Test with all theme sets:
- default, patagonia, redwood, flare, ocean, twilight, moss

Test with all accent colors:
- indigo, rose, forest, amber, teal

## CSS Classes

### Fluid UI Base Classes
```css
.fluid-dashboard          /* Dashboard container */
.fluid-component          /* Component cell */
.fluid-table              /* Tables with thin lines */
.fluid-button             /* Sharp buttons */
.fluid-input              /* Sharp inputs */
.fluid-divider            /* Thin dividers */
.status-badge             /* Status indicators */
.priority-indicator       /* Priority markers */
```

### Utility Classes
```css
.fluid-space-{4|8|12|16}  /* Precise spacing */
.fluid-mono                /* Monospace font */
.fluid-caps                /* Uppercase with tracking */
.fluid-accent-text         /* Accent text color */
.fluid-accent-border       /* Accent border color */
.fluid-accent-bg           /* Accent background */
.fluid-hover-lift          /* Subtle lift on hover */
.fluid-inset               /* Inset shadow */
```

## Testbed Classes
```css
.testbed-container         /* Main layout */
.testbed-controls          /* Left panel */
.testbed-preview           /* Right panel */
.testbed-config-btn        /* Config selector buttons */
.testbed-radio             /* Radio inputs */
.testbed-checkbox          /* Checkbox inputs */
```

## Keyboard Shortcuts

Currently none implemented. Consider adding:
- `/` - Focus config search
- `g` - Toggle grid overlay
- `b` - Toggle boundaries
- `1-5` - Quick switch data scenarios
- `r` - Refresh/reset

## Future Enhancements

### Phase 1 (Current)
- ✅ Mock data system
- ✅ Test configurations
- ✅ Testbed UI
- ✅ Component registration
- ✅ Ultra-minimal styles

### Phase 2 (Planned)
- [ ] Performance metrics display
- [ ] Screenshot capture
- [ ] Export configurations as JSON
- [ ] Component prop editors
- [ ] Real-time layout editing
- [ ] A11y testing panel
- [ ] Keyboard shortcuts
- [ ] Dark mode toggle in testbed

### Phase 3 (Future)
- [ ] Visual regression testing
- [ ] Component isolation mode
- [ ] State management debugging
- [ ] Network simulation
- [ ] Responsive preview modes
- [ ] Component documentation viewer

## Troubleshooting

### Components Not Rendering
- Check console for registration errors
- Verify component is imported in `register-components.ts`
- Ensure metadata is exported from component file

### Styles Not Applied
- Verify CSS imports in `styles.css`
- Check theme class is applied to root
- Ensure CSS variable names match theme system

### Mock Data Issues
- Check data scenario is valid: empty|minimal|normal|heavy|edge
- Verify eventId is passed correctly
- Console log mockData to inspect generated data

## Contributing

When adding new features:
1. Maintain ultra-minimal aesthetic
2. Use sharp edges (border-radius: 0)
3. Leverage accent color CSS variables
4. Follow 4px spacing grid
5. Test with all theme sets
6. Test with all data scenarios
7. Update this README

## License

Part of the Delphi Fluid UI system.
