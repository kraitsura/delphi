import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Palette, Sun, Moon, Monitor } from "lucide-react"
import { AccentColor, ThemeMode, ThemeSet, useThemeSet } from "./theme-set-provider"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { SidebarMenuButton, useSidebar } from "@/components/ui/sidebar"
import { useState } from "react"

type ThemeSetOption = {
  value: ThemeSet
  label: string
  colors: string[]
}

const themeSetOptions: ThemeSetOption[] = [
  {
    value: "default",
    label: "Monochrome",
    colors: ["#FFFFFF", "#1C1C1C"]
  },
  {
    value: "patagonia",
    label: "Patagonia",
    colors: ["#F9F7E8", "#57B4BA", "#015551", "#FE4F2D"]
  },
  {
    value: "redwood",
    label: "Redwood",
    colors: ["#F5EDD1", "#D9B88F", "#A31D1D", "#6D2323"]
  }
]

type AccentOption = {
  value: AccentColor
  label: string
  colorClass: string
}

const accentOptions: AccentOption[] = [
  {
    value: "indigo",
    label: "Indigo",
    colorClass: "bg-[oklch(0.53_0.22_264)]"
  },
  {
    value: "rose",
    label: "Rose",
    colorClass: "bg-[oklch(0.58_0.20_16)]"
  },
  {
    value: "forest",
    label: "Forest",
    colorClass: "bg-[oklch(0.56_0.14_155)]"
  },
  {
    value: "amber",
    label: "Amber",
    colorClass: "bg-[oklch(0.79_0.17_80)]"
  },
  {
    value: "teal",
    label: "Teal",
    colorClass: "bg-[oklch(0.59_0.10_200)]"
  }
]

type ModeOption = {
  value: ThemeMode
  label: string
  icon: typeof Sun
}

const modeOptions: ModeOption[] = [
  {
    value: "light",
    label: "Light",
    icon: Sun
  },
  {
    value: "dark",
    label: "Dark",
    icon: Moon
  },
  {
    value: "system",
    label: "System",
    icon: Monitor
  }
]

interface ThemeSetToggleProps {
  className?: string
}

type ViewState = "theme" | "accent" | "mode"

export function ThemeSetToggle({ className }: ThemeSetToggleProps) {
  const { themeSet, setThemeSet, accent, setAccent, mode, setMode } = useThemeSet()
  const { state } = useSidebar()
  const [view, setView] = useState<ViewState>("theme")
  const isCollapsed = state === "collapsed"

  return (
    <Popover onOpenChange={() => setView("theme")}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <SidebarMenuButton tooltip="Theme" className={className}>
              <Palette className="h-4 w-4" />
              <span>Theme</span>
            </SidebarMenuButton>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side={isCollapsed ? "right" : "bottom"}>
          Theme
        </TooltipContent>
      </Tooltip>
      <PopoverContent className="w-56" align="end" side={isCollapsed ? "right" : "top"}>
        {view === "theme" && (
          <div className="grid gap-2">
            <div className="space-y-1">
              <h4 className="font-medium leading-none">Theme Set</h4>
              <p className="text-xs text-muted-foreground">
                Select a color palette for the application.
              </p>
            </div>
            <div className="grid gap-1">
              {themeSetOptions.map((option) => (
                <Button
                  key={option.value}
                  variant={option.value === themeSet ? "default" : "outline"}
                  className="justify-start gap-2"
                  onClick={() => {
                    setThemeSet(option.value);
                    if (option.value === "default") {
                      setView("accent");
                    } else {
                      setView("mode");
                    }
                  }}
                >
                  <div className="flex gap-1 items-center">
                    {option.colors.map((color, i) => (
                      <div
                        key={i}
                        className="w-3 h-3 rounded-full border border-border"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <span>{option.label}</span>
                </Button>
              ))}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="justify-start text-xs"
              onClick={() => setView("mode")}
            >
              <Monitor className="h-3 w-3 mr-2" />
              Light/Dark Mode
            </Button>
          </div>
        )}

        {view === "accent" && (
          <div className="grid gap-2">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <h4 className="font-medium leading-none">Accent Color</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-xs"
                  onClick={() => setView("theme")}
                >
                  Back
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Choose an accent color for the monochrome theme.
              </p>
            </div>
            <div className="grid gap-1">
              {accentOptions.map((option) => (
                <Button
                  key={option.value}
                  variant={option.value === accent ? "default" : "outline"}
                  className="justify-start gap-2"
                  onClick={() => setAccent(option.value)}
                >
                  <div
                    className={cn("w-4 h-4 rounded-full", option.colorClass)}
                  />
                  <span>{option.label}</span>
                </Button>
              ))}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="justify-start text-xs"
              onClick={() => setView("mode")}
            >
              <Monitor className="h-3 w-3 mr-2" />
              Light/Dark Mode
            </Button>
          </div>
        )}

        {view === "mode" && (
          <div className="grid gap-2">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <h4 className="font-medium leading-none">Appearance</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-xs"
                  onClick={() => setView("theme")}
                >
                  Back
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Select light, dark, or system preference.
              </p>
            </div>
            <div className="grid gap-1">
              {modeOptions.map((option) => {
                const Icon = option.icon
                return (
                  <Button
                    key={option.value}
                    variant={option.value === mode ? "default" : "outline"}
                    className="justify-start gap-2"
                    onClick={() => setMode(option.value)}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{option.label}</span>
                  </Button>
                )
              })}
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
