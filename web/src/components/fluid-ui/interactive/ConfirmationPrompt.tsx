/**
 * ConfirmationPrompt - AI-generated Yes/No confirmation prompt
 *
 * Features:
 * - Simple two-button confirmation UI
 * - Support for default, warning, and danger variants
 * - Auto-focus on primary action
 * - Keyboard shortcuts (Enter = confirm, Esc = cancel)
 * - Inline card format for chat integration
 */

import { AlertCircle, Check, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";

interface ConfirmationPromptProps {
	question: string;
	yesLabel?: string;
	noLabel?: string;
	variant?: "default" | "warning" | "danger";
	onConfirm: (confirmed: boolean) => void;
	description?: string;
}

export function ConfirmationPrompt({
	question,
	yesLabel = "Yes",
	noLabel = "No",
	variant = "default",
	onConfirm,
	description,
}: ConfirmationPromptProps) {
	const confirmButtonRef = useRef<HTMLButtonElement>(null);

	// Auto-focus on confirm button
	useEffect(() => {
		confirmButtonRef.current?.focus();
	}, []);

	// Keyboard shortcuts
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Enter") {
				e.preventDefault();
				onConfirm(true);
			} else if (e.key === "Escape") {
				e.preventDefault();
				onConfirm(false);
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [onConfirm]);

	// Styling based on variant
	const cardClassName =
		variant === "danger"
			? "border-red-300 bg-red-50"
			: variant === "warning"
				? "border-yellow-300 bg-yellow-50"
				: "border-purple-300 bg-purple-50";

	const iconColor =
		variant === "danger"
			? "text-red-600"
			: variant === "warning"
				? "text-yellow-600"
				: "text-purple-600";

	const confirmButtonClassName =
		variant === "danger"
			? "bg-red-600 hover:bg-red-700"
			: variant === "warning"
				? "bg-yellow-600 hover:bg-yellow-700"
				: "bg-purple-600 hover:bg-purple-700";

	return (
		<Card className={cardClassName}>
			<CardContent className="pt-4 pb-3">
				<div className="flex items-start gap-3">
					<AlertCircle
						className={`h-5 w-5 mt-0.5 flex-shrink-0 ${iconColor}`}
					/>
					<div className="flex-1 min-w-0 space-y-2">
						<div className="text-sm font-semibold text-gray-900">
							{question}
						</div>
						{description && (
							<div className="text-xs text-gray-600 leading-relaxed">
								{description}
							</div>
						)}
					</div>
				</div>
			</CardContent>

			<CardFooter className="pt-0 pb-3 flex gap-2">
				<Button
					ref={confirmButtonRef}
					size="sm"
					onClick={() => onConfirm(true)}
					className={`flex-1 h-8 ${confirmButtonClassName}`}
				>
					<Check className="h-3.5 w-3.5 mr-1" />
					{yesLabel}
				</Button>
				<Button
					size="sm"
					variant="outline"
					onClick={() => onConfirm(false)}
					className="flex-1 h-8 hover:bg-gray-100"
				>
					<X className="h-3.5 w-3.5 mr-1" />
					{noLabel}
				</Button>
			</CardFooter>
		</Card>
	);
}
