import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import { Toaster } from '@/components/ui/sonner';

export default async function CanvasLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {children}
      <Toaster />
    </div>
  );
}
