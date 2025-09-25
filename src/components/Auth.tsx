'use client';

import { useAuth, useUser } from '@/firebase';
import { initiateAnonymousSignIn } from '@/firebase/non-blocking-login';
import { Button } from '@/components/ui/button';
import { Loader2, LogIn } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';

export default function Auth({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();

  const handleAnonymousSignIn = () => {
    initiateAnonymousSignIn(auth);
  };

  if (isUserLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background p-4">
        <Card className="max-w-sm w-full">
            <CardHeader className="text-center">
                <CardTitle>Welcome to FinanceFlow AI</CardTitle>
                <CardDescription>Sign in to continue to your dashboard.</CardDescription>
            </CardHeader>
            <CardContent>
                <Button onClick={handleAnonymousSignIn} className="w-full" >
                    <LogIn className="mr-2 h-4 w-4" />
                    Sign In Anonymously
                </Button>
            </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
