import { useEffect, useState } from "react";

/**
 * useDebounce Hook
 *
 * Returns a debounced value that only updates after the specified delay
 * has passed without the value changing.
 *
 * @param value - The value to debounce
 * @param delay - Delay in milliseconds (default: 300)
 */
export function useDebounce<T>(value: T, delay = 300): T {
	const [debouncedValue, setDebouncedValue] = useState<T>(value);

	useEffect(() => {
		// Set up a timeout to update the debounced value
		const handler = setTimeout(() => {
			setDebouncedValue(value);
		}, delay);

		// Clean up the timeout if value changes before delay
		return () => {
			clearTimeout(handler);
		};
	}, [value, delay]);

	return debouncedValue;
}
