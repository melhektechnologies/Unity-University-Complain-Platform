import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase/server';
import { getStudentAffairsContext } from '@/features/staff/auth/actions';

const SignInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request.' }, { status: 400 });
  }

  const parsed = SignInSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Invalid credentials format.' }, { status: 422 });
  }

  const supabase = await createServerClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    // Generic error message — don't reveal whether email exists
    return NextResponse.json(
      { success: false, error: 'Invalid email or password.' },
      { status: 401 }
    );
  }

  const staff = await getStudentAffairsContext();
  if (!staff) {
    await supabase.auth.signOut();
    return NextResponse.json(
      { success: false, error: 'This account is not authorized for the Student Affairs workspace.' },
      { status: 403 }
    );
  }

  return NextResponse.json({ success: true });
}

