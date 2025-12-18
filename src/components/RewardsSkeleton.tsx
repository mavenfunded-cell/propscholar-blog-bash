import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { Navbar } from '@/components/Navbar';

export function RewardsSkeleton() {
  return (
    <div className="min-h-screen bg-[#030303]">
      <Navbar />
      
      <main className="pt-24 pb-16 px-4">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-center mb-6 md:mb-8">
            <div className="flex items-center justify-center gap-2 md:gap-3 mb-2">
              <Skeleton className="w-7 h-7 md:w-10 md:h-10 rounded bg-white/[0.06]" />
              <Skeleton className="h-8 md:h-10 w-40 bg-white/[0.06]" />
            </div>
            <Skeleton className="h-5 w-64 mx-auto bg-white/[0.04]" />
          </div>

          {/* Balance Card */}
          <Card className="p-4 md:p-6 bg-[#0a0a0a] border-white/[0.06]">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 text-center">
              <div className="pb-4 md:pb-0 border-b md:border-b-0 border-white/[0.06]">
                <Skeleton className="h-4 w-28 mx-auto mb-2 bg-white/[0.04]" />
                <Skeleton className="h-10 w-20 mx-auto mb-1 bg-white/[0.06]" />
              </div>
              <div className="pb-4 md:pb-0 border-b md:border-b-0 border-white/[0.06]">
                <Skeleton className="h-4 w-24 mx-auto mb-2 bg-white/[0.04]" />
                <Skeleton className="h-7 w-16 mx-auto bg-white/[0.06]" />
              </div>
              <div>
                <Skeleton className="h-4 w-24 mx-auto mb-2 bg-white/[0.04]" />
                <Skeleton className="h-7 w-16 mx-auto bg-white/[0.06]" />
              </div>
            </div>
          </Card>

          {/* Tabs */}
          <Skeleton className="h-10 w-full rounded-lg bg-white/[0.04]" />

          {/* Earn Coins Section */}
          <div className="space-y-6">
            {/* Signup Bonus */}
            <Card className="p-4 md:p-6 bg-[#0a0a0a] border-white/[0.06]">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3 md:gap-4">
                  <Skeleton className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/[0.06]" />
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-32 bg-white/[0.06]" />
                    <Skeleton className="h-4 w-40 bg-white/[0.04]" />
                  </div>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <Skeleton className="h-8 w-12 bg-white/[0.06]" />
                  <Skeleton className="h-10 w-28 bg-white/[0.06]" />
                </div>
              </div>
            </Card>

            {/* Social Follows */}
            <Card className="p-4 md:p-6 bg-[#0a0a0a] border-white/[0.06]">
              <div className="flex items-center gap-2 mb-4">
                <Skeleton className="w-5 h-5 bg-white/[0.06]" />
                <Skeleton className="h-6 w-36 bg-white/[0.06]" />
              </div>
              <Skeleton className="h-4 w-full max-w-md mb-4 bg-white/[0.04]" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="p-3 md:p-4 rounded-lg border border-white/[0.06] bg-[#080808]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 md:gap-3">
                        <Skeleton className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-white/[0.06]" />
                        <div className="space-y-1">
                          <Skeleton className="h-5 w-20 bg-white/[0.06]" />
                          <Skeleton className="h-3 w-16 bg-white/[0.04]" />
                        </div>
                      </div>
                      <Skeleton className="h-8 w-20 bg-white/[0.06]" />
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Referral */}
            <Card className="p-4 md:p-6 bg-[#0a0a0a] border-white/[0.06]">
              <div className="flex items-center gap-2 mb-4">
                <Skeleton className="w-5 h-5 bg-white/[0.06]" />
                <Skeleton className="h-6 w-28 bg-white/[0.06]" />
              </div>
              <Skeleton className="h-4 w-full max-w-lg mb-4 bg-white/[0.04]" />
              <div className="flex flex-col sm:flex-row gap-2 mb-4">
                <Skeleton className="flex-1 h-10 rounded-lg bg-white/[0.04]" />
                <Skeleton className="h-10 w-20 bg-white/[0.06]" />
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
