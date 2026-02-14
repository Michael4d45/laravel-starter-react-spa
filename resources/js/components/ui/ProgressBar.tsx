interface ProgressBarProps {
    percentage: number;
    processed: number;
    total: number;
    failed?: number;
    status: string;
    className?: string;
}

export function ProgressBar({
    percentage,
    processed,
    total,
    failed = 0,
    status,
    className = '',
}: ProgressBarProps) {
    const getStatusColor = () => {
        switch (status) {
            case 'progress':
                return 'bg-blue-500';
            case 'completed':
                return 'bg-green-500';
            case 'failed':
                return 'bg-red-500';
            default:
                return 'bg-gray-500';
        }
    };

    return (
        <div className={`w-full ${className}`}>
            <div className="mb-2 flex justify-between text-sm">
                <span>
                    {processed} / {total} processed
                    {failed > 0 && ` (${failed} failed)`}
                </span>
                <span>{Math.round(percentage)}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-200">
                <div
                    className={`h-2 rounded-full transition-all duration-300 ${getStatusColor()}`}
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                />
            </div>
            <div className="mt-1 text-xs text-gray-600 capitalize">
                {status}
            </div>
        </div>
    );
}