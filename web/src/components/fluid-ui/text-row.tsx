import DOMPurify from "dompurify";
import { marked } from "marked";
import { useMemo } from "react";
import type { TextSection } from "@/lib/fluid-ui/types";

interface TextRowProps {
	section: TextSection;
}

export function TextRow({ section }: TextRowProps) {
	// Parse and sanitize HTML/Markdown
	const html = useMemo(() => {
		const raw = marked.parse(section.content) as string | Promise<string>;
		// marked.parse can return a Promise or string, ensure it's a string
		const htmlContent = typeof raw === "string" ? raw : "";
		return DOMPurify.sanitize(htmlContent);
	}, [section.content]);

	const spacing = section.spacing || "comfortable";

	return (
		<div
			className={`fluid-text-row fluid-text-row--${spacing}`}
			dangerouslySetInnerHTML={{ __html: html }}
		/>
	);
}
