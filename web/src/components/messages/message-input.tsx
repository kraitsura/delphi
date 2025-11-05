import { useState } from "react";
import { Send } from "lucide-react";
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
		<form onSubmit={handleSubmit} className="border-t bg-background p-4">
			<div className="flex gap-2 items-end">
				<div className="flex-1">
					<Textarea
						value={text}
						onChange={(e) => setText(e.target.value)}
						onKeyDown={handleKeyDown}
						placeholder={placeholder}
						disabled={disabled}
						className="min-h-[60px] max-h-[200px] resize-none"
						rows={2}
					/>
					<p className="text-xs text-muted-foreground mt-1">
						Press <kbd className="px-1 py-0.5 bg-muted rounded">Enter</kbd> to
						send,{" "}
						<kbd className="px-1 py-0.5 bg-muted rounded">Shift+Enter</kbd>{" "}
						for new line
					</p>
				</div>
				<Button
					type="submit"
					disabled={!text.trim() || disabled}
					size="lg"
					className="px-6"
				>
					<Send className="h-4 w-4 mr-2" />
					Send
				</Button>
			</div>
		</form>
	);
}
