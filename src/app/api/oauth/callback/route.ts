import { getOAuth2Client } from '@/services/google-auth';
import { supabase } from '@/lib/supabase_client';
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const cookieStore = cookies();
  const supabaseServer = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  );

  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code) {
    return new Response("Authorization code not found.", { status: 400 });
  }

  try {
    const { data: { user } } = await supabaseServer.auth.getUser();
    if (!user) {
      return new Response("User not authenticated.", { status: 401 });
    }

    const oauth2Client = getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);
    
    if (!tokens.access_token || !tokens.refresh_token || !tokens.scope || !tokens.token_type || !tokens.expiry_date) {
        throw new Error('Failed to retrieve all necessary tokens from Google.');
    }

    const { error: upsertError } = await supabase
      .from('user_google_credentials')
      .upsert({
        user_id: user.id,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        scope: tokens.scope,
        token_type: tokens.token_type,
        expiry_date: tokens.expiry_date,
      }, { onConflict: 'user_id' });

    if (upsertError) throw upsertError;

    // Redirect user back to business settings page
    const redirectUrl = new URL('/business', request.url);
    return Response.redirect(redirectUrl);

  } catch (error: any) {
    console.error("OAuth callback error:", error);
    return new Response(`An error occurred during authentication: ${error.message}`, { status: 500 });
  }
}
