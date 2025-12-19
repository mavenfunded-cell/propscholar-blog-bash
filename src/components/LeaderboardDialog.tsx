import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Crown, Medal, ThumbsUp, Trophy, Eye } from "lucide-react";

export type LeaderboardEntry = {
  id: string;
  name: string;
  subtitle?: string | null;
  vote_count: number;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle?: string;
  entries: LeaderboardEntry[];
  loading?: boolean;
  emptyText?: string;
  onView?: (entry: LeaderboardEntry) => void;
  className?: string;
};

const getInitials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

const rowClasses = (rank: number) =>
  rank === 1
    ? "bg-yellow-500/5 border-yellow-500/20"
    : rank === 2
      ? "bg-gray-400/5 border-gray-400/20"
      : rank === 3
        ? "bg-amber-600/5 border-amber-600/20"
        : "bg-white/5 border-white/10";

const badgeClasses = (rank: number) =>
  rank === 1
    ? "bg-yellow-500/20"
    : rank === 2
      ? "bg-gray-400/20"
      : rank === 3
        ? "bg-amber-600/20"
        : "bg-white/10";

export function LeaderboardDialog({
  open,
  onOpenChange,
  title,
  subtitle,
  entries,
  loading,
  emptyText = "No submissions yet",
  onView,
  className,
}: Props) {
  const totalVotes = entries.reduce((sum, e) => sum + (e.vote_count || 0), 0);
  const sorted = [...entries].sort((a, b) => b.vote_count - a.vote_count);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "w-[calc(100vw-2rem)] max-w-lg max-h-[85vh] !bg-[#111111] border-white/10 p-0 overflow-hidden",
          className,
        )}
      >
        <DialogHeader className="p-4 sm:p-6 pb-3 sm:pb-4 border-b border-white/10">
          <DialogTitle className="text-white flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-yellow-500/20 to-amber-600/20 flex items-center justify-center flex-shrink-0">
              <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="block text-base sm:text-lg truncate">{title}</span>
              <span className="text-xs sm:text-sm font-normal text-white/50">
                {subtitle ?? `${entries.length} participants • ${totalVotes} votes`}
              </span>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-pulse text-white/50">Loading leaderboard...</div>
            </div>
          ) : entries.length === 0 ? (
            <div className="p-8 text-center text-white/50">{emptyText}</div>
          ) : (
            <div className="p-3 sm:p-4 pr-6 space-y-2">
              {sorted.map((entry, index) => {
                const rank = index + 1;

                return (
                  <div
                    key={entry.id}
                    className={cn(
                      "flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg border transition-all",
                      rowClasses(rank),
                    )}
                  >
                    <div
                      className={cn(
                        "w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center flex-shrink-0",
                        badgeClasses(rank),
                      )}
                    >
                      {rank <= 3 ? (
                        rank === 1 ? (
                          <Crown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-yellow-500" />
                        ) : rank === 2 ? (
                          <Medal className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400" />
                        ) : (
                          <Medal className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600" />
                        )
                      ) : (
                        <span className="text-xs sm:text-sm font-bold text-white/60">#{rank}</span>
                      )}
                    </div>

                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs sm:text-sm font-semibold text-white">
                        {getInitials(entry.name)}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white text-sm sm:text-base truncate">{entry.name}</p>
                      {entry.subtitle ? (
                        <p className="text-xs sm:text-sm text-white/50 truncate">{entry.subtitle}</p>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0 ml-1">
                      {onView ? (
                        <button
                          onClick={() => onView(entry)}
                          className="p-1.5 sm:p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                          title="View"
                        >
                          <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white/60" />
                        </button>
                      ) : null}
                      <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-white/5">
                        <ThumbsUp className="w-3 h-3 text-white/40" />
                        <span className="text-xs sm:text-sm font-bold text-white">{entry.vote_count}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
