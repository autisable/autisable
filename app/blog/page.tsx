import { Suspense } from "react";
import BlogListClient from "../components/blog/BlogListClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Stories",
  description: "Stories from parents, autistic individuals, and professionals across the autism community.",
};

export default function BlogPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-10">
        <h1 className="text-4xl font-bold text-zinc-900 tracking-tight">Stories</h1>
        <p className="mt-3 text-lg text-zinc-600">
          Perspectives from across the autism community — advocacy, personal stories, and more.
        </p>
      </div>
      <Suspense fallback={<div className="animate-pulse h-64 bg-zinc-100 rounded-2xl" />}>
        <BlogListClient />
      </Suspense>
    </div>
  );
}
