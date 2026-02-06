// Force dynamic rendering for all dashboard pages
export const dynamic = 'force-dynamic';

import { Shell } from '@/components/layout/shell';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Shell title="Dashboard">{children}</Shell>;
}
