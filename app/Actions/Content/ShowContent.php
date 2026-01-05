<?php

declare(strict_types=1);

namespace App\Actions\Content;

use App\Data\Models\ContentData;
use App\Data\Response\ContentItems;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ShowContent
{
    /**
     * Display the content list.
     */
    public function __invoke(Request $request): JsonResponse
    {
        // For now, return sample content data
        $sampleContent = [
            [
                'id' => 1,
                'title' => 'Welcome to the Content Page',
                'body' => 'This is a sample content item to demonstrate the content listing functionality.',
            ],
            [
                'id' => 2,
                'title' => 'Another Content Item',
                'body' => 'Here is another piece of content that shows how multiple items are displayed.',
            ],
            [
                'id' => 3,
                'title' => 'Third Content Item',
                'body' => 'This demonstrates how the grid layout works with multiple content items.',
            ],
        ];

        return response()->json(ContentItems::from([
            'content' => ContentData::collect($sampleContent),
        ]));
    }
}
