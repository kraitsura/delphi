import { Plus, Send, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { usePresence } from "@/hooks/usePresence";
import { cn } from "@/lib/utils";

interface MessageInputProps {
	onSend: (text: string) => void;
	onAgentInvoke?: (text: string) => Promise<void>;
	disabled?: boolean;
	isAgentInvoking?: boolean;
	placeholder?: string;
}

export function MessageInput({
	onSend,
	onAgentInvoke,
	disabled = false,
	isAgentInvoking = false,
	placeholder = "Type a message...",
}: MessageInputProps) {
	const [text, setText] = useState("");
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const { setTyping } = usePresence();

	// Check if message mentions @Delphi
	const mentionsDelphi = /@delphi/i.test(text);

	// Auto-resize textarea based on content
	useEffect(() => {
		const textarea = textareaRef.current;
		if (!textarea) return;

		// Reset to min-height to get accurate scrollHeight
		textarea.style.height = "48px";

		// Set height to content height (CSS max-height will cap it)
		textarea.style.height = `${textarea.scrollHeight}px`;
	}, []);

	// Cleanup: Clear typing status on unmount
	useEffect(() => {
		return () => {
			setTyping(false);
			if (typingTimeoutRef.current) {
				clearTimeout(typingTimeoutRef.current);
			}
		};
	}, [setTyping]);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		sendMessage();
	};

	const sendMessage = async () => {
		const trimmedText = text.trim();
		if (!trimmedText || disabled || isAgentInvoking) return;

		// Clear typing status before sending
		setTyping(false);
		if (typingTimeoutRef.current) {
			clearTimeout(typingTimeoutRef.current);
		}

		// Check if this is an @Delphi mention
		if (mentionsDelphi && onAgentInvoke) {
			// Clear input immediately for better UX
			setText("");
			// Invoke the agent
			await onAgentInvoke(trimmedText);
		} else {
			// Send regular message
			onSend(trimmedText);
			setText("");
		}
	};

	const handleTextChange = (value: string) => {
		setText(value);

		// Clear existing timeout
		if (typingTimeoutRef.current) {
			clearTimeout(typingTimeoutRef.current);
		}

		// If there's text, set typing to true
		if (value.length > 0) {
			setTyping(true);

			// Auto-clear typing status after 3 seconds of inactivity
			typingTimeoutRef.current = setTimeout(() => {
				setTyping(false);
			}, 3000);
		} else {
			// If text is cleared, immediately stop typing
			setTyping(false);
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		// Enter without Shift = send message
		// Shift + Enter = new line
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			sendMessage();
		}
	};

	return (
		<form onSubmit={handleSubmit} className="border-t bg-background px-4 py-2">
			<div className="flex flex-col gap-2">
				<div className="flex gap-3 items-center">
					{/* Plus button - left side for future attachments */}
					<Button
						type="button"
						variant="ghost"
						size="icon"
						className="rounded-full flex-shrink-0"
						disabled={disabled || isAgentInvoking}
					>
						<Plus className="h-5 w-5" />
					</Button>

					{/* Textarea wrapper with integrated send button */}
					<div className="relative flex-1">
						<Textarea
							ref={textareaRef}
							value={text}
							onChange={(e) => handleTextChange(e.target.value)}
							onKeyDown={handleKeyDown}
							placeholder={placeholder}
							disabled={disabled || isAgentInvoking}
							className={cn(
								"min-h-[48px] max-h-[200px] resize-none overflow-y-auto rounded-2xl py-3 px-4 pr-14",
								mentionsDelphi &&
									"border-purple-300 focus-visible:ring-purple-500",
							)}
							rows={1}
						/>
						<Button
							type="submit"
							disabled={!text.trim() || disabled || isAgentInvoking}
							size="icon"
							className={cn(
								"absolute right-1.5 bottom-1.5 rounded-full h-9 w-9",
								mentionsDelphi && "bg-purple-600 hover:bg-purple-700",
							)}
						>
							{mentionsDelphi ? (
								<Sparkles className="h-4 w-4" />
							) : (
								<Send className="h-4 w-4" />
							)}
						</Button>
					</div>
				</div>

				{/* Agent thinking indicator */}
				{isAgentInvoking && (
					<div className="flex items-center gap-2 text-sm text-purple-600 px-4 py-1">
						<Sparkles className="h-4 w-4 animate-pulse" />
						<span className="animate-pulse">Delphi is thinking...</span>
					</div>
				)}

				{/* @Delphi hint */}
				{mentionsDelphi && !isAgentInvoking && (
					<div className="flex items-center gap-2 text-sm text-purple-600 px-4 py-1">
						<Sparkles className="h-4 w-4" />
						<span>Press Enter to ask Delphi</span>
					</div>
				)}
			</div>
		</form>
	);
}
