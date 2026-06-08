import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default async function HomePage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect('/dashboard');
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <div className="text-center space-y-6 max-w-2xl px-4">
        <h1 className="text-5xl font-bold tracking-tight">OrgCanvas</h1>
        <p className="text-xl text-muted-foreground">
          Purpose-built canvas for creating, maintaining, and sharing organizational
          structures and corporate ownership diagrams.
        </p>
        <div className="flex gap-4 justify-center">
          <Button asChild size="lg">
            <Link href="/auth/login">Sign In</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/auth/signup">Create Account</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
