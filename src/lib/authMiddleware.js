import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function withAuth(handler) {
  return async function(request, context) {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    return handler(request, context, session);
  };
}

// Helper to get the user ID from session
export async function getUserId() {
  const session = await auth();
  return session?.user?.id || null;
}
