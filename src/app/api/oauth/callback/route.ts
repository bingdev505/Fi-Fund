import { getOAuth2Client } from "@/services/google-auth";
import { type NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase_client";
import { cookies } from 'next/headers'


export async function GET(request: NextRequest) {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const cookieStore = cookies();
    const supabaseClient = createServerClient(
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

    const { data: { user } } = await supabaseClient.auth.getUser();

    if (!user) {
        return NextResponse.redirect(new URL('/login?error=unauthenticated', request.url));
    }

    if (!code) {
        return NextResponse.redirect(new URL('/settings?error=oauth_failed', request.url));
    }

    try {
        const oauth2Client = getOAuth2Client();
        const { tokens } = await oauth2Client.getToken(code);
        
        if (!tokens.refresh_token) {
            console.warn("No refresh token received. User might have already granted consent.");
        }

        // Store tokens securely, associated with the user
        const { error } = await supabase
            .from('user_google_credentials')
            .upsert({ 
                user_id: user.id, 
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token, // This may be null on subsequent authorizations
                expiry_date: new Date(tokens.expiry_date!).toISOString()
            }, { onConflict: 'user_id' });

        if (error) throw error;
        
        // Redirect to a success page or back to settings
        return NextResponse.redirect(new URL('/business?success=google_connected', request.url));

    } catch (error) {
        console.error("Error exchanging auth code for tokens:", error);
        return NextResponse.redirect(new URL('/business?error=google_failed', request.url));
    }
}
