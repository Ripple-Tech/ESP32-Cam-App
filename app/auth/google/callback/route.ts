import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { oauth2Client } from "@/utils/google-auth"

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
        return NextResponse.json({error: 'Google OAuth Error: ' + error});
    }
    if (!code) {
        return NextResponse.json({error: 'Authorization code not found'});
    }
    try {
        const { tokens } = await oauth2Client.getToken(code);
        console.log(tokens);
        cookies().set({
            name: 'google_access_token',
            value: tokens.access_token || '',
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            path: '/',
            maxAge: 60 * 60 * 24 * 7,
            
        })

        return NextResponse.redirect(new URL("/dashboard", req.url))
    } catch (error) {
        return NextResponse.json({error: 'Google OAuth Error Failed to exchange code: ' + error});
    }
}