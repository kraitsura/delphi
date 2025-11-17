import { createContext, type ReactNode, useContext, useState } from "react";

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

	const clearHeaderContent = () => {
		setHeaderContent(null);
	};

	const value: HeaderContextValue = {
		headerContent,
		setHeaderContent,
		clearHeaderContent,
	};

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
