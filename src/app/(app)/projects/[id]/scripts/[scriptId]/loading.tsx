import { ContentSkeleton, TopSkeleton } from "@/components/nav/skeletons";

export default function Loading() {
  return (
    <>
      <TopSkeleton />
      <ContentSkeleton />
    </>
  );
}
