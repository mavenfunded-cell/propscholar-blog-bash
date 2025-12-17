import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';

export function RewardsSkeleton() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center mb-6 md:mb-8">
        <div className="flex items-center justify-center gap-2 md:gap-3 mb-2">
          <Skeleton className="w-7 h-7 md:w-10 md:h-10 rounded" />
          <Skeleton className="h-8 md:h-10 w-40" />
        </div>
        <Skeleton className="h-5 w-64 mx-auto" />
      </div>

      {/* Balance Card */}
      <Card className="p-4 md:p-6 bg-gradient-to-br from-yellow-500/10 via-card to-orange-500/10 backdrop-blur-xl border-yellow-500/20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 text-center">
          <div className="pb-4 md:pb-0 border-b md:border-b-0 border-border/30">
            <Skeleton className="h-4 w-28 mx-auto mb-2" />
            <Skeleton className="h-10 w-20 mx-auto mb-1" />
            <Skeleton className="h-3 w-20 mx-auto" />
          </div>
          <div className="pb-4 md:pb-0 border-b md:border-b-0 border-border/30">
            <Skeleton className="h-4 w-24 mx-auto mb-2" />
            <Skeleton className="h-7 w-16 mx-auto" />
          </div>
          <div>
            <Skeleton className="h-4 w-24 mx-auto mb-2" />
            <Skeleton className="h-7 w-16 mx-auto" />
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <Skeleton className="h-10 w-full rounded-lg" />

      {/* Earn Coins Section */}
      <div className="space-y-6">
        {/* Signup Bonus */}
        <Card className="p-4 md:p-6 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/20">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 md:gap-4">
              <Skeleton className="w-10 h-10 md:w-12 md:h-12 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-40" />
              </div>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Skeleton className="h-8 w-12" />
              <Skeleton className="h-10 w-28" />
            </div>
          </div>
        </Card>

        {/* Social Follows */}
        <Card className="p-4 md:p-6 bg-card/50 backdrop-blur-xl border-border/50">
          <div className="flex items-center gap-2 mb-4">
            <Skeleton className="w-5 h-5" />
            <Skeleton className="h-6 w-36" />
          </div>
          <Skeleton className="h-4 w-full max-w-md mb-4" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="p-3 md:p-4 rounded-lg border border-border/30 bg-background/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 md:gap-3">
                    <Skeleton className="w-8 h-8 md:w-10 md:h-10 rounded-lg" />
                    <div className="space-y-1">
                      <Skeleton className="h-5 w-20" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                  <Skeleton className="h-8 w-20" />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Referral */}
        <Card className="p-4 md:p-6 bg-card/50 backdrop-blur-xl border-border/50">
          <div className="flex items-center gap-2 mb-4">
            <Skeleton className="w-5 h-5" />
            <Skeleton className="h-6 w-28" />
          </div>
          <Skeleton className="h-4 w-full max-w-lg mb-4" />
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <Skeleton className="flex-1 h-10 rounded-lg" />
            <Skeleton className="h-10 w-20" />
          </div>
        </Card>
      </div>
    </div>
  );
}
