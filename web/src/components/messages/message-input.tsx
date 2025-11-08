import { Plus, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface MessageInputProps {
	onSend: (text: string) => void;
	disabled?: boolean;
	placeholder?: string;
}

export function MessageInput({
	onSend,
	disabled = false,
	placeholder = "Type a message...",
}: MessageInputProps) {
	const [text, setText] = useState("");
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	// Auto-resize textarea based on content
	useEffect(() => {
		const textarea = textareaRef.current;
		if (!textarea) return;

		// Reset to min-height to get accurate scrollHeight
		textarea.style.height = "48px";

		// Set height to content height (CSS max-height will cap it)
		textarea.style.height = `${textarea.scrollHeight}px`;
	}, []);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		sendMessage();
	};

	const sendMessage = () => {
		const trimmedText = text.trim();
		if (trimmedText && !disabled) {
			onSend(trimmedText);
			setText("");
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
			<div className="flex gap-3 items-center">
				{/* Plus button - left side for future attachments */}
				<Button
					type="button"
					variant="ghost"
					size="icon"
					className="rounded-full flex-shrink-0"
					disabled={disabled}
				>
					<Plus className="h-5 w-5" />
				</Button>

				{/* Textarea wrapper with integrated send button */}
				<div className="relative flex-1">
					<Textarea
						ref={textareaRef}
						value={text}
						onChange={(e) => setText(e.target.value)}
						onKeyDown={handleKeyDown}
						placeholder={placeholder}
						disabled={disabled}
						className="min-h-[48px] max-h-[200px] resize-none overflow-y-auto rounded-2xl py-3 px-4 pr-14"
						rows={1}
					/>
					<Button
						type="submit"
						disabled={!text.trim() || disabled}
						size="icon"
						className="absolute right-1.5 bottom-1.5 rounded-full h-9 w-9"
					>
						<Send className="h-4 w-4" />
					</Button>
				</div>
			</div>
		</form>
	);
}
