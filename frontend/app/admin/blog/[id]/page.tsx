"use client";
import { useParams } from "next/navigation";
import BlogEditor from "@/components/admin/BlogEditor";

export default function EditBlogPost() {
  const { id } = useParams<{ id: string }>();
  return <BlogEditor postId={id} />;
}
