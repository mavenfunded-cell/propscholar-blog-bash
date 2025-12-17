import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';

export function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center mb-8">
        <Skeleton className="h-10 w-48 mx-auto mb-2" />
        <Skeleton className="h-5 w-64 mx-auto" />
      </div>

      {/* Profile Section */}
      <Card className="p-4 md:p-6 bg-card/50 backdrop-blur-xl border-border/50">
        <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6">
          <Skeleton className="w-16 h-16 md:w-20 md:h-20 rounded-full" />
          <div className="flex-1 text-center md:text-left space-y-2">
            <Skeleton className="h-7 w-48 mx-auto md:mx-0" />
            <Skeleton className="h-5 w-64 mx-auto md:mx-0" />
          </div>
          <Skeleton className="h-10 w-40" />
        </div>
      </Card>

      {/* Space Coins Card */}
      <Card className="p-4 md:p-6 bg-gradient-to-br from-yellow-500/10 via-card to-orange-500/10 backdrop-blur-xl border-yellow-500/20">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 md:gap-4">
            <Skeleton className="w-12 h-12 md:w-14 md:h-14 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-7 w-16" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
          <Skeleton className="h-10 w-44" />
        </div>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="p-4 md:p-6 bg-card/50 backdrop-blur-xl border-border/50 text-center">
            <Skeleton className="w-6 h-6 md:w-8 md:h-8 mx-auto mb-2 rounded" />
            <Skeleton className="h-7 w-12 mx-auto mb-1" />
            <Skeleton className="h-4 w-24 mx-auto" />
          </Card>
        ))}
      </div>

      {/* Submissions Section */}
      <Card className="p-4 md:p-6 bg-card/50 backdrop-blur-xl border-border/50">
        <Skeleton className="h-6 w-40 mb-4" />
        <Skeleton className="h-10 w-full mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between p-4 rounded-lg bg-background/50 border border-border/30">
              <div className="space-y-2">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-8 w-28 rounded-full" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
