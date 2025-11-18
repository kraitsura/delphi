import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from "react";

interface HeaderContextValue {
	headerContent: ReactNode;
	setHeaderContent: (content: ReactNode) => void;
	clearHeaderContent: () => void;
}

const HeaderContext = createContext<HeaderContextValue | undefined>(undefined);

interface HeaderProviderProps {
	children: ReactNode;
}

export function HeaderProvider({ children }: HeaderProviderProps) {
	const [headerContent, setHeaderContent] = useState<ReactNode>(null);

	const clearHeaderContent = useCallback(() => {
		setHeaderContent(null);
	}, []);

	const value: HeaderContextValue = useMemo(
		() => ({
			headerContent,
			setHeaderContent,
			clearHeaderContent,
		}),
		[headerContent, clearHeaderContent]
	);

	return (
		<HeaderContext.Provider value={value}>{children}</HeaderContext.Provider>
	);
}

export function useHeader() {
	const context = useContext(HeaderContext);
	if (context === undefined) {
		throw new Error("useHeader must be used within a HeaderProvider");
	}
	return context;
}
