import { useNavigate } from "@tanstack/react-router";
import { Calendar, Home, LogOut, Palette, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { signOut } from "@/lib/auth";
import {
  AccentColor,
  ThemeMode,
  ThemeSet,
  useThemeSet,
} from "@/components/theme-set-provider";
import { cn } from "@/lib/utils";
import { useEvent } from "@/contexts/EventContext";
import { useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";

const themeSetOptions = [
  {
    value: "default" as ThemeSet,
    label: "Monochrome",
    colors: ["#FFFFFF", "#1C1C1C"],
  },
  {
    value: "patagonia" as ThemeSet,
    label: "Patagonia",
    colors: ["#F9F7E8", "#57B4BA", "#015551", "#FE4F2D"],
  },
  {
    value: "redwood" as ThemeSet,
    label: "Redwood",
    colors: ["#F5EDD1", "#D9B88F", "#A31D1D", "#6D2323"],
  },
];

const accentOptions = [
  {
    value: "indigo" as AccentColor,
    label: "Indigo",
    colorClass: "bg-[oklch(0.53_0.22_264)]",
  },
  {
    value: "rose" as AccentColor,
    label: "Rose",
    colorClass: "bg-[oklch(0.58_0.20_16)]",
  },
  {
    value: "forest" as AccentColor,
    label: "Forest",
    colorClass: "bg-[oklch(0.56_0.14_155)]",
  },
  {
    value: "amber" as AccentColor,
    label: "Amber",
    colorClass: "bg-[oklch(0.79_0.17_80)]",
  },
  {
    value: "teal" as AccentColor,
    label: "Teal",
    colorClass: "bg-[oklch(0.59_0.10_200)]",
  },
];

const modeOptions = [
  { value: "light" as ThemeMode, label: "Light", icon: Sun },
  { value: "dark" as ThemeMode, label: "Dark", icon: Moon },
  { value: "system" as ThemeMode, label: "System", icon: Monitor },
];

/**
 * EventSidebarToolbar Component
 *
 * Horizontal toolbar with icon buttons for navigation when in event context.
 * Displays: Profile, Dashboard, Events, Theme Toggle, Sign Out
 *
 * Clicking Dashboard or Events exits the event context and navigates away.
 */
export function EventSidebarToolbar() {
  const navigate = useNavigate();
  const { exitEventContext } = useEvent();
  const { themeSet, setThemeSet, accent, setAccent, mode, setMode } =
    useThemeSet();
  const [view, setView] = useState<"theme" | "accent" | "mode">("theme");

  const handleSignOut = async () => {
    await signOut();
  };

  const handleNavigateToProfile = () => {
    navigate({ to: "/profile" });
  };

  const handleNavigateToDashboard = () => {
    exitEventContext();
    navigate({ to: "/dashboard" });
  };

  const handleNavigateToEvents = () => {
    exitEventContext();
    navigate({ to: "/events" });
  };

  return (
    <div className="flex items-center justify-between gap-1 px-2 py-2">
      <TooltipProvider delayDuration={0}>
        <div className="flex items-center gap-1">
          {/* Profile */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleNavigateToProfile}
              >
                <User className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Profile</p>
            </TooltipContent>
          </Tooltip>

          {/* Dashboard */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleNavigateToDashboard}
              >
                <Home className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Dashboard</p>
            </TooltipContent>
          </Tooltip>

          {/* Events */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleNavigateToEvents}
              >
                <Calendar className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Events</p>
            </TooltipContent>
          </Tooltip>
        </div>

        <div className="flex items-center gap-1">
          {/* Theme Toggle */}
          <Popover onOpenChange={() => setView("theme")}>
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Palette className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Theme</p>
              </TooltipContent>
            </Tooltip>
            <PopoverContent className="w-56" align="end" side="bottom">
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
                      const Icon = option.icon;
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
                      );
                    })}
                  </div>
                </div>
              )}
            </PopoverContent>
          </Popover>

          {/* Sign Out */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleSignOut}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Sign Out</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    </div>
  );
}
