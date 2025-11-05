import { Skeleton } from "@/components/ui/skeleton";

interface ComponentSkeletonProps {
	type: string;
}

export function ComponentSkeleton({ type: _type }: ComponentSkeletonProps) {
	// Customize skeleton based on component type
	// For now, generic skeleton
	// TODO: Use _type to customize skeleton per component type

	return (
		<div className="fluid-component-skeleton">
			<Skeleton className="h-8 w-1/3 mb-4" />
			<Skeleton className="h-4 w-full mb-2" />
			<Skeleton className="h-4 w-full mb-2" />
			<Skeleton className="h-4 w-2/3 mb-4" />
			<Skeleton className="h-32 w-full" />
		</div>
	);
}
