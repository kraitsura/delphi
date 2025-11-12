/**
 * Generates user initials from a full name
 * @param userName - The full name of the user
 * @returns Initials in uppercase (e.g., "John Doe" -> "JD")
 */
export const getUserInitials = (userName?: string): string => {
	if (!userName) return "??";

	const names = userName.trim().split(" ");

	// If we have at least 2 names, use first letter of first and last name
	if (names.length >= 2) {
		const firstName = names[0];
		const lastName = names[names.length - 1];
		return `${firstName[0]}${lastName[0]}`.toUpperCase();
	}

	// Otherwise, use first 2 characters of the single name
	return userName.slice(0, 2).toUpperCase();
};
