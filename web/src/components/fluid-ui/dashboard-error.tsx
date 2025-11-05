import type { ValidationError } from "@/lib/fluid-ui/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface DashboardErrorProps {
	title: string;
	errors: ValidationError[];
}

export function DashboardError({ title, errors }: DashboardErrorProps) {
	return (
		<Card className="border-red-500">
			<CardHeader>
				<CardTitle className="text-red-600">{title}</CardTitle>
			</CardHeader>
			<CardContent>
				<ul className="space-y-2">
					{errors.map((error, index) => (
						<li key={index} className="text-sm">
							<span className="font-semibold">{error.code}:</span>{" "}
							{error.message}
							{error.path && (
								<span className="text-muted-foreground ml-2">
									(at {error.path.join(".")})
								</span>
							)}
						</li>
					))}
				</ul>
			</CardContent>
		</Card>
	);
}
