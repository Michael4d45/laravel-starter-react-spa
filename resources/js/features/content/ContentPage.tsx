import { Link, useLoaderData } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { useOfflineBlock } from '@/hooks/useOfflineBlock';
import toast from 'react-hot-toast';
import { ContentResponse } from './contentLoader';

export function ContentPage() {
    const { content } = useLoaderData<ContentResponse>();
    const { isBlocked, blockReason } = useOfflineBlock();

    const handleCreateContent = () => {
        if (isBlocked) {
            toast.error(blockReason || 'Cannot create content while offline');
            return;
        }
        // In a real app, this would be an API call
        toast.success('Content created successfully (online simulation)!');
    };

    return (
        <div className="max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">Content List</h1>
                <Link to="/">
                    <Button variant="secondary">Back to Home</Button>
                </Link>
            </div>

            <div className="flex gap-4 mb-6">
                <Button onClick={() => window.location.reload()} disabled={isBlocked}>
                    {isBlocked ? 'Refresh (Offline)' : 'Refresh Content'}
                </Button>
                <Button onClick={handleCreateContent}>
                    Create New Content
                </Button>
            </div>

            {content && content.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {content.map((item) => (
                        <div key={item.id} className="bg-white p-6 rounded-lg shadow-md">
                            <h2 className="text-xl font-semibold mb-2">{item.title}</h2>
                            <p className="text-gray-700">{item.body}</p>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center p-8 bg-white rounded-lg shadow-md">
                    <p className="text-gray-600 mb-4">
                        No content available.
                        {isBlocked && ' Check your connection to fetch new content.'}
                    </p>
                </div>
            )}
        </div>
    );
}
