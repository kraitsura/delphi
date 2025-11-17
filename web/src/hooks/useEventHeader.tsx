import { useEffect } from "react";
import { EventHeader } from "@/components/headers/EventHeader";
import { useEvent } from "@/contexts/EventContext";
import { useHeader } from "@/contexts/HeaderContext";

/**
 * Hook to automatically set the event header when on event routes
 * Uses EventContext to get event data and HeaderContext to set header content
 */
export function useEventHeader() {
	const { setHeaderContent, clearHeaderContent } = useHeader();
	const { event, isInEventContext } = useEvent();

	useEffect(() => {
		if (isInEventContext && event) {
			setHeaderContent(<EventHeader name={event.name} status={event.status} />);
		} else {
			clearHeaderContent();
		}

		// Cleanup on unmount
		return () => {
			clearHeaderContent();
		};
	}, [isInEventContext, event, setHeaderContent, clearHeaderContent]);
}
