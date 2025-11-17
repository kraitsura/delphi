import { useEffect } from "react";
import { PageHeader } from "@/components/headers/PageHeader";
import { useHeader } from "@/contexts/HeaderContext";

interface UsePageHeaderProps {
	title: string;
	description?: string;
}

/**
 * Hook to set a simple page header with title and optional description
 * Automatically cleans up on unmount
 */
export function usePageHeader({ title, description }: UsePageHeaderProps) {
	const { setHeaderContent, clearHeaderContent } = useHeader();

	useEffect(() => {
		setHeaderContent(<PageHeader title={title} description={description} />);

		// Cleanup on unmount
		return () => {
			clearHeaderContent();
		};
	}, [title, description, setHeaderContent, clearHeaderContent]);
}
