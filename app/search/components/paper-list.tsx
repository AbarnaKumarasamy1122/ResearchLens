import type {
  NormalizedPaper,
} from "@/lib/papers";

import PaperCard from "./paper-card";

interface PaperListProps {
  papers: NormalizedPaper[];
}

export default function PaperList({
  papers,
}: PaperListProps) {
  if (papers.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-12 text-center">
        <h2 className="text-lg font-semibold">
          No papers found
        </h2>

        <p className="mt-2 text-sm text-gray-800">
          Try changing your search terms or
          filters.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {papers.map((paper) => (
        <PaperCard
          key={paper.openAlexId}
          paper={paper}
        />
      ))}
    </div>
  );
}