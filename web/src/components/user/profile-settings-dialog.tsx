import { LogOut, Monitor, Moon, Palette, Sun, User } from "lucide-react";
import { useState } from "react";
import {
	type AccentColor,
	type ThemeMode,
	type ThemeSet,
	useThemeSet,
} from "@/components/theme-set-provider";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { signOut, useSession } from "@/lib/auth";
import { cn } from "@/lib/utils";

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

export function ProfileSettingsDialog() {
	const { data: session } = useSession();
	const { themeSet, setThemeSet, accent, setAccent, mode, setMode } =
		useThemeSet();
	const [view, setView] = useState<"main" | "theme" | "accent" | "mode">(
		"main",
	);

	const handleSignOut = async () => {
		await signOut();
	};

	return (
		<Dialog onOpenChange={() => setView("main")}>
			<Tooltip>
				<TooltipTrigger asChild>
					<DialogTrigger asChild>
						<Button variant="ghost" size="icon" className="h-8 w-8">
							<User className="h-4 w-4" />
						</Button>
					</DialogTrigger>
				</TooltipTrigger>
				<TooltipContent side="bottom">
					<p>Profile & Settings</p>
				</TooltipContent>
			</Tooltip>

			<DialogContent className="sm:max-w-md">
				{view === "main" && (
					<>
						<DialogHeader>
							<DialogTitle>Profile & Settings</DialogTitle>
							<DialogDescription>
								{session?.user?.name && (
									<div className="flex flex-col gap-1 pt-2">
										<p className="text-sm font-medium text-foreground">
											{session.user.name}
										</p>
										{session.user.email && (
											<p className="text-xs text-muted-foreground">
												{session.user.email}
											</p>
										)}
									</div>
								)}
							</DialogDescription>
						</DialogHeader>

						<Separator />

						<div className="space-y-2">
							<h3 className="text-sm font-medium">Appearance</h3>
							<Button
								variant="outline"
								className="w-full justify-start gap-2"
								onClick={() => setView("theme")}
							>
								<Palette className="h-4 w-4" />
								<span>Theme Settings</span>
							</Button>
						</div>

						<Separator />

						<div className="space-y-2">
							<Button
								variant="destructive"
								className="w-full justify-start gap-2"
								onClick={handleSignOut}
							>
								<LogOut className="h-4 w-4" />
								<span>Sign Out</span>
							</Button>
						</div>
					</>
				)}

				{view === "theme" && (
					<>
						<DialogHeader>
							<div className="flex items-center gap-2">
								<Button
									variant="ghost"
									size="sm"
									onClick={() => setView("main")}
								>
									← Back
								</Button>
								<DialogTitle>Theme Set</DialogTitle>
							</div>
							<DialogDescription>
								Select a color palette for the application.
							</DialogDescription>
						</DialogHeader>

						<div className="grid gap-2">
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
							className="justify-start text-sm"
							onClick={() => setView("mode")}
						>
							<Monitor className="h-4 w-4 mr-2" />
							Light/Dark Mode
						</Button>
					</>
				)}

				{view === "accent" && (
					<>
						<DialogHeader>
							<div className="flex items-center gap-2">
								<Button
									variant="ghost"
									size="sm"
									onClick={() => setView("theme")}
								>
									← Back
								</Button>
								<DialogTitle>Accent Color</DialogTitle>
							</div>
							<DialogDescription>
								Choose an accent color for the monochrome theme.
							</DialogDescription>
						</DialogHeader>

						<div className="grid gap-2">
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
							className="justify-start text-sm"
							onClick={() => setView("mode")}
						>
							<Monitor className="h-4 w-4 mr-2" />
							Light/Dark Mode
						</Button>
					</>
				)}

				{view === "mode" && (
					<>
						<DialogHeader>
							<div className="flex items-center gap-2">
								<Button
									variant="ghost"
									size="sm"
									onClick={() => setView("theme")}
								>
									← Back
								</Button>
								<DialogTitle>Appearance</DialogTitle>
							</div>
							<DialogDescription>
								Select light, dark, or system preference.
							</DialogDescription>
						</DialogHeader>

						<div className="grid gap-2">
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
					</>
				)}
			</DialogContent>
		</Dialog>
	);
}
