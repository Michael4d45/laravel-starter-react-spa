import { Button } from '@/components/ui/Button';
import { useOfflineBlock } from '@/hooks/useOfflineBlock';
import { ActionResult, RunnableActions } from '@/lib/actions';
import { ContentItems } from '@/lib/schemas/generated-schema';
import toast from 'react-hot-toast';
import { Link, useLoaderData } from 'react-router-dom';

/**
 * React Router loader function that uses the Effect-based loader
 */
export async function contentLoader() {
    const result = await RunnableActions.getContent();
    return ActionResult.match(result, {
        onSuccess: (data) => {
            return data;
        },
        onFailure: (error) => {
            throw new Error(`Content loading failed: ${JSON.stringify(error)}`);
        },
    });
}

export function ContentPage() {
    const { content } = useLoaderData<ContentItems>();
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
        <div className="mx-auto max-w-4xl">
            <div className="mb-8 flex items-center justify-between">
                <h1 className="text-3xl font-bold">Content List</h1>
                <Link to="/">
                    <Button variant="secondary">Back to Home</Button>
                </Link>
            </div>

            <div className="mb-6 flex gap-4">
                <Button onClick={() => window.location.reload()} disabled={isBlocked}>
                    {isBlocked ? 'Refresh (Offline)' : 'Refresh Content'}
                </Button>
                <Button onClick={handleCreateContent}>Create New Content</Button>
            </div>

            {content && content.length > 0 ? (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {content.map((item) => (
                        <div key={item.id} className="rounded-lg bg-white p-6 shadow-md">
                            <h2 className="mb-2 text-xl font-semibold">{item.title}</h2>
                            <p className="text-gray-700">{item.body}</p>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="rounded-lg bg-white p-8 text-center shadow-md">
                    <p className="mb-4 text-gray-600">
                        No content available.
                        {isBlocked && ' Check your connection to fetch new content.'}
                    </p>
                </div>
            )}
        </div>
    );
}
