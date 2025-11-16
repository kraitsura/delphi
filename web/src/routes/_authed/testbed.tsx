import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useEffect, useRef } from "react";
import { LayoutController } from "@/components/fluid-ui/layout-controller";
import { generateMockDataSet, type DataScenario } from "@/lib/testbed/mock-data";
import { MockDataProvider } from "@/lib/testbed/wrapped-components";
import type { DashboardConfig, RowSection, ComponentConfig, TextSection } from "@/lib/fluid-ui/types";
import { getComponentRegistry } from "@/lib/fluid-ui/registry";
import { useDashboardStore, DashboardStoreProvider } from "@/lib/fluid-ui/DashboardStoreContext";
import type { Id } from "@/convex/_generated/dataModel";

// Import and register components immediately (module-level)
import "@/lib/testbed/register-components";
// Import testbed styles (scoped to this route only)
import "@/styles/fluid-ui-testbed.css";
// Import test configurations
import { TEST_CATEGORIES, ALL_TEST_CONFIGS, type TestCategory } from "@/lib/testbed/test-configs";

export const Route = createFileRoute("/_authed/testbed")({
  component: Testbed,
});

type LayoutRatio = "auto" | "1:1" | "2:1" | "3:1" | "sidebar" | "custom";

interface Section {
  id: string;
  type: "row" | "text";
  layout?: LayoutRatio;
  customLayout?: string;
  components?: Array<{
    id: string;
    type: string;
    props: Record<string, any>;
  }>;
  content?: string;
  spacing?: "tight" | "comfortable" | "spacious";
}

const MOCK_POLL_ID = "poll_0" as Id<"polls">;
const MOCK_TASK_ID = "task_0" as Id<"tasks">;

/**
 * Zustand State Inspector - Shows current store state in real-time
 */
function ZustandStateInspector() {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Read all state from Zustand store
  const selections = useDashboardStore((state) => state.selections);
  const highlightedComponents = useDashboardStore((state) => state.highlightedComponents);
  const animatingComponents = useDashboardStore((state) => state.animatingComponents);
  const expandedPanels = useDashboardStore((state) => state.expandedPanels);
  const activePrompts = useDashboardStore((state) => state.activePrompts);
  const errors = useDashboardStore((state) => state.errors);
  const toasts = useDashboardStore((state) => state.toasts);
  const modals = useDashboardStore((state) => state.modals);
  const isLoading = useDashboardStore((state) => state.isLoading);

  // Count active selections
  const activeSelectionCount = Object.values(selections).filter(v => v !== null).length;

  return (
    <div className="testbed-event-log">
      <button
        className="testbed-panel-toggle"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <span className="testbed-label">
          Zustand Store State ({activeSelectionCount} active selections)
        </span>
        <span>{isCollapsed ? "▶" : "▼"}</span>
      </button>

      {!isCollapsed && (
        <div className="testbed-event-log-content">
          {/* Selections */}
          <div className="testbed-state-section">
            <h4 className="testbed-state-section-title">Selections</h4>
            <div className="testbed-event-log-payload">
              {activeSelectionCount === 0 ? (
                <span className="text-muted-foreground">No active selections</span>
              ) : (
                <pre>{JSON.stringify(
                  Object.fromEntries(
                    Object.entries(selections).filter(([_, v]) => v !== null)
                  ),
                  null,
                  2
                )}</pre>
              )}
            </div>
          </div>

          {/* Visual States */}
          {(highlightedComponents.size > 0 || animatingComponents.size > 0 || expandedPanels.size > 0) && (
            <div className="testbed-state-section">
              <h4 className="testbed-state-section-title">Visual States</h4>
              <div className="testbed-event-log-payload">
                {highlightedComponents.size > 0 && (
                  <div>
                    <strong>Highlighted:</strong> {Array.from(highlightedComponents).join(", ")}
                  </div>
                )}
                {animatingComponents.size > 0 && (
                  <div>
                    <strong>Animating:</strong> {JSON.stringify(Array.from(animatingComponents.entries()))}
                  </div>
                )}
                {expandedPanels.size > 0 && (
                  <div>
                    <strong>Expanded Panels:</strong> {Array.from(expandedPanels).join(", ")}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* AI Prompts */}
          {activePrompts.size > 0 && (
            <div className="testbed-state-section">
              <h4 className="testbed-state-section-title">Active Prompts ({activePrompts.size})</h4>
              <div className="testbed-event-log-payload">
                <pre>{JSON.stringify(Array.from(activePrompts.values()), null, 2)}</pre>
              </div>
            </div>
          )}

          {/* Errors */}
          {errors.length > 0 && (
            <div className="testbed-state-section">
              <h4 className="testbed-state-section-title text-destructive">Errors ({errors.length})</h4>
              <div className="testbed-event-log-payload">
                <pre>{JSON.stringify(errors, null, 2)}</pre>
              </div>
            </div>
          )}

          {/* Toasts */}
          {toasts.length > 0 && (
            <div className="testbed-state-section">
              <h4 className="testbed-state-section-title">Toasts ({toasts.length})</h4>
              <div className="testbed-event-log-payload">
                <pre>{JSON.stringify(toasts, null, 2)}</pre>
              </div>
            </div>
          )}

          {/* Modals */}
          {modals.size > 0 && (
            <div className="testbed-state-section">
              <h4 className="testbed-state-section-title">Modals ({modals.size})</h4>
              <div className="testbed-event-log-payload">
                <pre>{JSON.stringify(Array.from(modals.entries()), null, 2)}</pre>
              </div>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="testbed-state-section">
              <h4 className="testbed-state-section-title">Loading...</h4>
            </div>
          )}

          {activeSelectionCount === 0 && highlightedComponents.size === 0 && !isLoading && (
            <div className="testbed-event-log-empty">
              <span>No active state. Interact with components to see state changes.</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Testbed() {
  const [sections, setSections] = useState<Section[]>([
    {
      id: "section_0",
      type: "row",
      layout: "auto",
      components: [
        {
          id: "comp_0",
          type: "EventDetails",
          props: { showStatus: true, showBudget: true, showLocation: true },
        },
      ],
    },
  ]);

  const [dataScenario, setDataScenario] = useState<DataScenario>("normal");
  const [showGrid, setShowGrid] = useState(false);
  const [showBoundaries, setShowBoundaries] = useState(false);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);
  const [collapsedPanels, setCollapsedPanels] = useState<Set<string>>(new Set());
  const [expandedPresetCategories, setExpandedPresetCategories] = useState<Set<TestCategory>>(new Set());

  // Generate mock data based on scenario
  const mockData = generateMockDataSet(dataScenario);
  const registry = getComponentRegistry();
  const availableComponents = Array.from(registry.keys());

  // Build config from sections
  const currentConfig: DashboardConfig = useMemo(() => {
    return {
      sections: sections.map(section => {
        if (section.type === "text") {
          return {
            type: "text" as const,
            content: section.content || "<p>Empty text section</p>",
            spacing: section.spacing || "comfortable",
          } as TextSection;
        } else {
          let layout: RowSection["layout"];
          if (section.layout === "custom" && section.customLayout) {
            try {
              layout = JSON.parse(section.customLayout) as string[];
            } catch {
              layout = "auto";
            }
          } else {
            layout = (section.layout || "auto") as RowSection["layout"];
          }

          return {
            type: "row" as const,
            layout,
            components: (section.components || []).map(comp => ({
              type: comp.type,
              props: comp.props,
              id: comp.id,
            })) as ComponentConfig[],
          } as RowSection;
        }
      }),
    };
  }, [sections]);

  const togglePanel = (panelName: string) => {
    setCollapsedPanels(prev => {
      const newSet = new Set(prev);
      if (newSet.has(panelName)) {
        newSet.delete(panelName);
      } else {
        newSet.add(panelName);
      }
      return newSet;
    });
  };

  const togglePresetCategory = (category: TestCategory) => {
    setExpandedPresetCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  const loadPreset = (presetKey: string) => {
    const config = ALL_TEST_CONFIGS[presetKey];
    if (!config) return;

    // Convert config to sections format
    const newSections: Section[] = config.sections.map((section, idx) => {
      if (section.type === "text") {
        return {
          id: `section_${Date.now()}_${idx}`,
          type: "text" as const,
          content: section.content,
          spacing: section.spacing,
        };
      } else {
        return {
          id: `section_${Date.now()}_${idx}`,
          type: "row" as const,
          layout: Array.isArray(section.layout) ? "custom" : (section.layout as LayoutRatio),
          customLayout: Array.isArray(section.layout) ? JSON.stringify(section.layout) : undefined,
          components: section.components.map((comp, compIdx) => ({
            id: comp.id || `comp_${Date.now()}_${compIdx}`,
            type: comp.type,
            props: comp.props,
          })),
        };
      }
    });
    setSections(newSections);
    setSelectedSectionId(null);
    setSelectedComponentId(null);
  };

  const addSection = (type: "row" | "text") => {
    const newSection: Section = {
      id: `section_${Date.now()}`,
      type,
      ...(type === "row"
        ? { layout: "auto" as LayoutRatio, components: [] }
        : { content: "<p>New text section</p>", spacing: "comfortable" as const }
      ),
    };
    setSections(prev => [...prev, newSection]);
  };

  const removeSection = (sectionId: string) => {
    setSections(prev => prev.filter(s => s.id !== sectionId));
    if (selectedSectionId === sectionId) setSelectedSectionId(null);
  };

  const moveSectionUp = (sectionId: string) => {
    setSections(prev => {
      const idx = prev.findIndex(s => s.id === sectionId);
      if (idx <= 0) return prev;
      const newSections = [...prev];
      [newSections[idx - 1], newSections[idx]] = [newSections[idx], newSections[idx - 1]];
      return newSections;
    });
  };

  const moveSectionDown = (sectionId: string) => {
    setSections(prev => {
      const idx = prev.findIndex(s => s.id === sectionId);
      if (idx === -1 || idx >= prev.length - 1) return prev;
      const newSections = [...prev];
      [newSections[idx], newSections[idx + 1]] = [newSections[idx + 1], newSections[idx]];
      return newSections;
    });
  };

  const updateSectionLayout = (sectionId: string, layout: LayoutRatio, customLayout?: string) => {
    setSections(prev =>
      prev.map(s =>
        s.id === sectionId ? { ...s, layout, customLayout } : s
      )
    );
  };

  const updateSectionText = (sectionId: string, content: string, spacing?: "tight" | "comfortable" | "spacious") => {
    setSections(prev =>
      prev.map(s =>
        s.id === sectionId ? { ...s, content, spacing: spacing || s.spacing } : s
      )
    );
  };

  const addComponentToSection = (sectionId: string, componentType: string) => {
    setSections(prev =>
      prev.map(s => {
        if (s.id === sectionId && s.type === "row") {
          const newComp = {
            id: `comp_${Date.now()}`,
            type: componentType,
            props: getDefaultPropsForComponent(componentType),
          };
          return { ...s, components: [...(s.components || []), newComp] };
        }
        return s;
      })
    );
  };

  const removeComponent = (sectionId: string, componentId: string) => {
    setSections(prev =>
      prev.map(s => {
        if (s.id === sectionId && s.type === "row") {
          return { ...s, components: (s.components || []).filter(c => c.id !== componentId) };
        }
        return s;
      })
    );
    if (selectedComponentId === componentId) setSelectedComponentId(null);
  };

  const updateComponentProps = (sectionId: string, componentId: string, props: Record<string, any>) => {
    setSections(prev =>
      prev.map(s => {
        if (s.id === sectionId && s.type === "row") {
          return {
            ...s,
            components: (s.components || []).map(c =>
              c.id === componentId ? { ...c, props } : c
            ),
          };
        }
        return s;
      })
    );
  };

  const getDefaultPropsForComponent = (componentType: string): Record<string, any> => {
    // Special cases for components with required props
    if (componentType === "PollResults") {
      return { pollId: MOCK_POLL_ID, showVoters: true, showPercentages: true };
    }
    return { eventId: mockData.event._id };
  };

  const saveConfiguration = () => {
    const configJson = JSON.stringify(currentConfig, null, 2);
    const blob = new Blob([configJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fluid-ui-config-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const loadConfiguration = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const config = JSON.parse(e.target?.result as string) as DashboardConfig;
        // Convert config back to sections
        const newSections: Section[] = config.sections.map((section, idx) => {
          if (section.type === "text") {
            return {
              id: `section_${Date.now()}_${idx}`,
              type: "text" as const,
              content: section.content,
              spacing: section.spacing,
            };
          } else {
            return {
              id: `section_${Date.now()}_${idx}`,
              type: "row" as const,
              layout: Array.isArray(section.layout) ? "custom" : (section.layout as LayoutRatio),
              customLayout: Array.isArray(section.layout) ? JSON.stringify(section.layout) : undefined,
              components: section.components.map((comp, compIdx) => ({
                id: comp.id || `comp_${Date.now()}_${compIdx}`,
                type: comp.type,
                props: comp.props,
              })),
            };
          }
        });
        setSections(newSections);
      } catch (error) {
        alert("Failed to load configuration: " + error);
      }
    };
    reader.readAsText(file);
  };

  const resetConfiguration = () => {
    if (confirm("Reset to default configuration?")) {
      setSections([
        {
          id: "section_0",
          type: "row",
          layout: "auto",
          components: [
            {
              id: "comp_0",
              type: "EventDetails",
              props: { showStatus: true, showBudget: true, showLocation: true },
            },
          ],
        },
      ]);
      setSelectedSectionId(null);
      setSelectedComponentId(null);
    }
  };

  const selectedSection = sections.find(s => s.id === selectedSectionId);
  const selectedComponent = selectedSection?.type === "row"
    ? selectedSection.components?.find(c => c.id === selectedComponentId)
    : null;

  const componentMetadata = selectedComponent
    ? registry.get(selectedComponent.type)?.metadata
    : null;

  return (
    <div className="testbed-container">
      {/* Advanced Controls Panel */}
      <div className="testbed-controls">
        <div className="testbed-controls-header">
          <h2>■ Advanced Testbed</h2>
        </div>

        <div className="testbed-controls-content">
          {/* Comprehensive Presets */}
          <div className="testbed-control-group">
            <button
              className="testbed-panel-toggle"
              onClick={() => togglePanel("presets")}
            >
              <span className="testbed-label">Comprehensive Presets</span>
              <span>{collapsedPanels.has("presets") ? "▶" : "▼"}</span>
            </button>

            {!collapsedPanels.has("presets") && (
              <div className="testbed-panel-content">
                <div className="space-y-2">
                  {(Object.entries(TEST_CATEGORIES) as [TestCategory, string[]][]).map(([category, presetKeys]) => (
                    <div key={category} className="testbed-preset-category">
                      <button
                        className="testbed-category-toggle"
                        onClick={() => togglePresetCategory(category)}
                      >
                        <span className="testbed-category-icon">
                          {expandedPresetCategories.has(category) ? "▼" : "▶"}
                        </span>
                        <span className="testbed-category-label">{category}</span>
                        <span className="testbed-category-count">({presetKeys.length})</span>
                      </button>

                      {expandedPresetCategories.has(category) && (
                        <div className="testbed-preset-list">
                          {presetKeys.map(presetKey => {
                            const config = ALL_TEST_CONFIGS[presetKey];
                            const sectionCount = config.sections.length;
                            const componentCount = config.sections
                              .filter(s => s.type === "row")
                              .reduce((acc, s) => acc + (s.type === "row" ? s.components.length : 0), 0);

                            // Format preset name (camelCase to readable)
                            const presetName = presetKey
                              .replace(/([A-Z])/g, ' $1')
                              .replace(/^./, str => str.toUpperCase())
                              .trim();

                            return (
                              <button
                                key={presetKey}
                                className="testbed-preset-btn"
                                onClick={() => loadPreset(presetKey)}
                                title={`${sectionCount} sections, ${componentCount} components`}
                              >
                                <span className="testbed-preset-name">{presetName}</span>
                                <div className="testbed-preset-meta">
                                  <span className="testbed-preset-badge">{sectionCount}s</span>
                                  <span className="testbed-preset-badge">{componentCount}c</span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Section Management */}
          <div className="testbed-control-group">
            <button
              className="testbed-panel-toggle"
              onClick={() => togglePanel("sections")}
            >
              <span className="testbed-label">Sections ({sections.length})</span>
              <span>{collapsedPanels.has("sections") ? "▶" : "▼"}</span>
            </button>

            {!collapsedPanels.has("sections") && (
              <div className="testbed-panel-content">
                <div className="flex gap-2 mb-3">
                  <button
                    onClick={() => addSection("row")}
                    className="testbed-btn-sm"
                  >
                    + Row
                  </button>
                  <button
                    onClick={() => addSection("text")}
                    className="testbed-btn-sm"
                  >
                    + Text
                  </button>
                </div>

                <div className="space-y-2">
                  {sections.map((section, idx) => (
                    <div
                      key={section.id}
                      className={`testbed-section-item ${selectedSectionId === section.id ? "selected" : ""}`}
                      onClick={() => setSelectedSectionId(section.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="testbed-section-icon">
                            {section.type === "row" ? "━" : "T"}
                          </span>
                          <span className="testbed-section-label">
                            {section.type === "row"
                              ? `Row ${idx + 1} (${section.components?.length || 0} comp)`
                              : `Text ${idx + 1}`
                            }
                          </span>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); moveSectionUp(section.id); }}
                            className="testbed-icon-btn"
                            title="Move up"
                          >
                            ▲
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); moveSectionDown(section.id); }}
                            className="testbed-icon-btn"
                            title="Move down"
                          >
                            ▼
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); removeSection(section.id); }}
                            className="testbed-icon-btn-danger"
                            title="Remove"
                          >
                            ✕
                          </button>
                        </div>
                      </div>

                      {selectedSectionId === section.id && section.type === "row" && (
                        <div className="mt-2 space-y-2" onClick={(e) => e.stopPropagation()}>
                          {/* Layout selector */}
                          <div>
                            <label className="testbed-mini-label">Layout</label>
                            <select
                              value={section.layout}
                              onChange={(e) => updateSectionLayout(section.id, e.target.value as LayoutRatio)}
                              className="testbed-select"
                            >
                              <option value="auto">Auto</option>
                              <option value="1:1">1:1 (Equal)</option>
                              <option value="2:1">2:1 (Two-thirds)</option>
                              <option value="3:1">3:1 (Three-quarters)</option>
                              <option value="sidebar">Sidebar (300px)</option>
                              <option value="custom">Custom</option>
                            </select>
                          </div>

                          {section.layout === "custom" && (
                            <div>
                              <label className="testbed-mini-label">Custom Layout (JSON array)</label>
                              <input
                                type="text"
                                value={section.customLayout || '["1fr", "1fr"]'}
                                onChange={(e) => updateSectionLayout(section.id, "custom", e.target.value)}
                                className="testbed-input"
                                placeholder='["2fr", "1fr", "1fr"]'
                              />
                            </div>
                          )}

                          {/* Add component */}
                          <div>
                            <label className="testbed-mini-label">Add Component</label>
                            <select
                              onChange={(e) => {
                                if (e.target.value) {
                                  addComponentToSection(section.id, e.target.value);
                                  e.target.value = "";
                                }
                              }}
                              className="testbed-select"
                            >
                              <option value="">Select component...</option>
                              {availableComponents.map(comp => {
                                const metadata = registry.get(comp)?.metadata;
                                const sizeIndicator = metadata?.layoutRules.mustSpanFull
                                  ? "⬛ "
                                  : metadata?.layoutRules.preferredRatio === "2fr"
                                    ? "▬ "
                                    : "▪ ";
                                const sizeInfo = metadata?.layoutRules.mustSpanFull
                                  ? "Full Width"
                                  : metadata?.layoutRules.preferredRatio === "2fr"
                                    ? "Wide"
                                    : "Standard";
                                const minWidth = metadata?.layoutRules.minWidth || "";
                                return (
                                  <option key={comp} value={comp}>
                                    {sizeIndicator}{comp} ({sizeInfo}{minWidth ? `, min: ${minWidth}` : ""})
                                  </option>
                                );
                              })}
                            </select>
                          </div>

                          {/* Component list */}
                          {section.components && section.components.length > 0 && (
                            <div className="space-y-1">
                              <div className="testbed-mini-label">Components</div>
                              {section.components.map(comp => (
                                <div
                                  key={comp.id}
                                  className={`testbed-component-item ${selectedComponentId === comp.id ? "selected" : ""}`}
                                  onClick={(e) => { e.stopPropagation(); setSelectedComponentId(comp.id); }}
                                >
                                  <div className="flex flex-col gap-1 flex-1">
                                    <span className="testbed-component-name">{comp.type}</span>
                                    {(() => {
                                      const metadata = registry.get(comp.type)?.metadata;
                                      if (!metadata) return null;
                                      const canShare = metadata.layoutRules.canShare ? "Can share" : "Solo";
                                      const ratio = metadata.layoutRules.preferredRatio || "1fr";
                                      const minWidth = metadata.layoutRules.minWidth;
                                      return (
                                        <span className="text-xs text-muted-foreground">
                                          {ratio} • {canShare}{minWidth ? ` • min: ${minWidth}` : ""}
                                        </span>
                                      );
                                    })()}
                                  </div>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      removeComponent(section.id, comp.id);
                                    }}
                                    className="testbed-icon-btn-danger"
                                    title="Remove"
                                  >
                                    ✕
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {selectedSectionId === section.id && section.type === "text" && (
                        <div className="mt-2 space-y-2" onClick={(e) => e.stopPropagation()}>
                          <div>
                            <label className="testbed-mini-label">Spacing</label>
                            <select
                              value={section.spacing || "comfortable"}
                              onChange={(e) => updateSectionText(section.id, section.content || "", e.target.value as any)}
                              className="testbed-select"
                            >
                              <option value="tight">Tight</option>
                              <option value="comfortable">Comfortable</option>
                              <option value="spacious">Spacious</option>
                            </select>
                          </div>
                          <div>
                            <label className="testbed-mini-label">HTML Content</label>
                            <textarea
                              value={section.content || ""}
                              onChange={(e) => updateSectionText(section.id, e.target.value, section.spacing)}
                              className="testbed-textarea"
                              rows={4}
                              placeholder="<h1>■ Title</h1><p>Content here</p>"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Component Props Editor */}
          {selectedComponent && componentMetadata && (
            <div className="testbed-control-group">
              <button
                className="testbed-panel-toggle"
                onClick={() => togglePanel("props")}
              >
                <span className="testbed-label">Props: {selectedComponent.type}</span>
                <span>{collapsedPanels.has("props") ? "▶" : "▼"}</span>
              </button>

              {!collapsedPanels.has("props") && (
                <div className="testbed-panel-content space-y-3">
                  {Object.entries(componentMetadata.props).map(([propName, propDef]) => (
                    <div key={propName}>
                      <label className="testbed-mini-label">
                        {propName}
                        {propDef.required && <span className="text-red-500"> *</span>}
                      </label>
                      <div className="text-xs text-gray-500 mb-1">{propDef.description}</div>

                      {propDef.type === "boolean" && (
                        <label className="testbed-checkbox">
                          <input
                            type="checkbox"
                            checked={selectedComponent.props[propName] || false}
                            onChange={(e) => updateComponentProps(
                              selectedSectionId!,
                              selectedComponent.id,
                              { ...selectedComponent.props, [propName]: e.target.checked }
                            )}
                          />
                          <span>Enabled</span>
                        </label>
                      )}

                      {propDef.type === "enum" && "values" in propDef && (
                        <select
                          value={selectedComponent.props[propName] || ""}
                          onChange={(e) => updateComponentProps(
                            selectedSectionId!,
                            selectedComponent.id,
                            { ...selectedComponent.props, [propName]: e.target.value }
                          )}
                          className="testbed-select"
                        >
                          {!propDef.required && <option value="">None</option>}
                          {propDef.values.map(val => (
                            <option key={val} value={val}>{val}</option>
                          ))}
                        </select>
                      )}

                      {propDef.type === "number" && (
                        <input
                          type="number"
                          value={selectedComponent.props[propName] || ""}
                          onChange={(e) => updateComponentProps(
                            selectedSectionId!,
                            selectedComponent.id,
                            { ...selectedComponent.props, [propName]: parseInt(e.target.value) || 0 }
                          )}
                          className="testbed-input"
                        />
                      )}

                      {propDef.type === "string" && (
                        <input
                          type="text"
                          value={selectedComponent.props[propName] || ""}
                          onChange={(e) => updateComponentProps(
                            selectedSectionId!,
                            selectedComponent.id,
                            { ...selectedComponent.props, [propName]: e.target.value }
                          )}
                          className="testbed-input"
                          placeholder={propName === "pollId" ? MOCK_POLL_ID : propName === "taskId" ? MOCK_TASK_ID : mockData.event._id}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Component Info Panel */}
          {selectedComponent && componentMetadata && (
            <div className="testbed-control-group">
              <button
                className="testbed-panel-toggle"
                onClick={() => togglePanel("componentInfo")}
              >
                <span className="testbed-label">Component Info</span>
                <span>{collapsedPanels.has("componentInfo") ? "▶" : "▼"}</span>
              </button>

              {!collapsedPanels.has("componentInfo") && (
                <div className="testbed-panel-content space-y-3">
                  {/* Description */}
                  <div>
                    <div className="testbed-mini-label">Description</div>
                    <div className="text-xs text-muted-foreground">
                      {componentMetadata.description}
                    </div>
                  </div>

                  {/* Layout Rules */}
                  <div>
                    <div className="testbed-mini-label">Layout Rules</div>
                    <div className="testbed-data-summary">
                      <div className="testbed-data-item">
                        <span className="testbed-data-label">Preferred Ratio</span>
                        <span className="testbed-data-value">{componentMetadata.layoutRules.preferredRatio || "1fr"}</span>
                      </div>
                      <div className="testbed-data-item">
                        <span className="testbed-data-label">Must Span Full</span>
                        <span className="testbed-data-value">{componentMetadata.layoutRules.mustSpanFull ? "Yes" : "No"}</span>
                      </div>
                      <div className="testbed-data-item">
                        <span className="testbed-data-label">Can Share Row</span>
                        <span className="testbed-data-value">{componentMetadata.layoutRules.canShare ? "Yes" : "No"}</span>
                      </div>
                      {componentMetadata.layoutRules.minWidth && (
                        <div className="testbed-data-item">
                          <span className="testbed-data-label">Min Width</span>
                          <span className="testbed-data-value">{componentMetadata.layoutRules.minWidth}</span>
                        </div>
                      )}
                      {componentMetadata.layoutRules.minHeight && (
                        <div className="testbed-data-item">
                          <span className="testbed-data-label">Min Height</span>
                          <span className="testbed-data-value">{componentMetadata.layoutRules.minHeight}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Connection Capabilities */}
                  <div>
                    <div className="testbed-mini-label">Communication</div>
                    <div className="testbed-data-summary">
                      <div className="testbed-data-item">
                        <span className="testbed-data-label">Can Be Master</span>
                        <span className="testbed-data-value">{componentMetadata.connections.canBeMaster ? "Yes" : "No"}</span>
                      </div>
                      <div className="testbed-data-item">
                        <span className="testbed-data-label">Can Be Detail</span>
                        <span className="testbed-data-value">{componentMetadata.connections.canBeDetail ? "Yes" : "No"}</span>
                      </div>
                      {componentMetadata.connections.emits && componentMetadata.connections.emits.length > 0 && (
                        <div className="testbed-data-item">
                          <span className="testbed-data-label">Emits Events</span>
                          <span className="testbed-data-value text-xs">{componentMetadata.connections.emits.join(", ")}</span>
                        </div>
                      )}
                      {componentMetadata.connections.listensTo && componentMetadata.connections.listensTo.length > 0 && (
                        <div className="testbed-data-item">
                          <span className="testbed-data-label">Listens To</span>
                          <span className="testbed-data-value text-xs">{componentMetadata.connections.listensTo.join(", ")}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Data Scenario */}
          <div className="testbed-control-group">
            <button
              className="testbed-panel-toggle"
              onClick={() => togglePanel("data")}
            >
              <span className="testbed-label">Data Scenario</span>
              <span>{collapsedPanels.has("data") ? "▶" : "▼"}</span>
            </button>

            {!collapsedPanels.has("data") && (
              <div className="testbed-panel-content">
                <div className="testbed-radio-group">
                  {(["empty", "minimal", "normal", "heavy", "edge"] as DataScenario[]).map((scenario) => (
                    <label key={scenario} className="testbed-radio">
                      <input
                        type="radio"
                        name="scenario"
                        value={scenario}
                        checked={dataScenario === scenario}
                        onChange={(e) => setDataScenario(e.target.value as DataScenario)}
                      />
                      <span>{scenario}</span>
                    </label>
                  ))}
                </div>

                <div className="testbed-data-summary mt-3">
                  <div className="testbed-data-item">
                    <span className="testbed-data-label">Events</span>
                    <span className="testbed-data-value">{mockData.events.length}</span>
                  </div>
                  <div className="testbed-data-item">
                    <span className="testbed-data-label">Tasks</span>
                    <span className="testbed-data-value">{mockData.tasks.length}</span>
                  </div>
                  <div className="testbed-data-item">
                    <span className="testbed-data-label">Expenses</span>
                    <span className="testbed-data-value">{mockData.expenses.length}</span>
                  </div>
                  <div className="testbed-data-item">
                    <span className="testbed-data-label">Polls</span>
                    <span className="testbed-data-value">{mockData.polls.length}</span>
                  </div>
                  <div className="testbed-data-item">
                    <span className="testbed-data-label">Rooms</span>
                    <span className="testbed-data-value">{mockData.rooms.length}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Visual Debug Tools */}
          <div className="testbed-control-group">
            <button
              className="testbed-panel-toggle"
              onClick={() => togglePanel("visual")}
            >
              <span className="testbed-label">Visual Debug</span>
              <span>{collapsedPanels.has("visual") ? "▶" : "▼"}</span>
            </button>

            {!collapsedPanels.has("visual") && (
              <div className="testbed-panel-content">
                <div className="testbed-checkbox-group">
                  <label className="testbed-checkbox">
                    <input
                      type="checkbox"
                      checked={showGrid}
                      onChange={(e) => setShowGrid(e.target.checked)}
                    />
                    <span>Show Grid Lines</span>
                  </label>
                  <label className="testbed-checkbox">
                    <input
                      type="checkbox"
                      checked={showBoundaries}
                      onChange={(e) => setShowBoundaries(e.target.checked)}
                    />
                    <span>Show Boundaries</span>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Configuration Management */}
          <div className="testbed-control-group">
            <button
              className="testbed-panel-toggle"
              onClick={() => togglePanel("config")}
            >
              <span className="testbed-label">Configuration</span>
              <span>{collapsedPanels.has("config") ? "▶" : "▼"}</span>
            </button>

            {!collapsedPanels.has("config") && (
              <div className="testbed-panel-content space-y-2">
                <button
                  onClick={saveConfiguration}
                  className="testbed-btn-full"
                >
                  → Export JSON
                </button>
                <label className="testbed-btn-full cursor-pointer">
                  ← Load JSON
                  <input
                    type="file"
                    accept=".json"
                    onChange={loadConfiguration}
                    className="hidden"
                  />
                </label>
                <button
                  onClick={resetConfiguration}
                  className="testbed-btn-full testbed-btn-danger"
                >
                  Reset to Default
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Preview Area */}
      <div className="testbed-preview">
        <div className="testbed-preview-header">
          <h2>■ Preview</h2>
          <span className="testbed-preview-subtitle">
            {sections.length} sections · {sections.filter(s => s.type === "row").reduce((acc, s) => acc + (s.components?.length || 0), 0)} components
          </span>
        </div>

        <div
          className={`testbed-preview-content ${showGrid ? "show-grid" : ""} ${showBoundaries ? "show-boundaries" : ""}`}
        >
          {/* Wrap both LayoutController and State Inspector in same provider for shared state */}
          <DashboardStoreProvider>
            <MockDataProvider data={mockData}>
              <LayoutController
                config={currentConfig}
                eventId={mockData.event._id}
                validationOptions={{ disableRowLimit: true }}
              />
            </MockDataProvider>

            {/* Zustand State Inspector - shares the same store instance */}
            <ZustandStateInspector />
          </DashboardStoreProvider>
        </div>
      </div>
    </div>
  );
}
