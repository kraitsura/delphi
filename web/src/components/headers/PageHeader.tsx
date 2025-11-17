interface PageHeaderProps {
	title: string;
	description?: string;
}

export function PageHeader({ title, description }: PageHeaderProps) {
	return (
		<div className="flex items-center gap-3 flex-1 min-w-0">
			<div className="flex flex-col">
				<h1 className="text-2xl font-bold truncate">{title}</h1>
				{description && (
					<p className="text-sm text-muted-foreground">{description}</p>
				)}
			</div>
		</div>
	);
}
