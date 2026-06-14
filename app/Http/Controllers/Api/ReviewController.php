<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Organization;
use Illuminate\Http\Request;

class ReviewController extends Controller
{
    public function index(Request $request)
    {
        $organization = Organization::query()
            ->where('user_id', $request->user()->id)
            ->latest()
            ->firstOrFail();

        $reviews = $organization->reviews()
            ->latest('review_date')
            ->paginate(50);

        return response()->json([
            'organization' => $organization,
            'reviews' => $reviews,
        ]);
    }
}
