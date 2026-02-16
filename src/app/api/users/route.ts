import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getServiceSupabase } from '@/lib/supabase';
import bcrypt from 'bcryptjs';

// GET /api/users
export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('users')
    .select('id, username, full_name, email, role, created_at')
    .order('created_at', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data || []);
}

// POST /api/users (create user)
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { username, full_name, email, role, password } = body;

  if (!username || !full_name || !role || !password) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const supabase = getServiceSupabase();

  const { data, error } = await supabase
    .from('users')
    .insert({
      username,
      full_name,
      email: email || null,
      role,
      password_hash: passwordHash,
    })
    .select('id, username, full_name, email, role, created_at')
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Username already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

// PUT /api/users (update user)
export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { id, full_name, email, role, password } = body;

  if (!id) {
    return NextResponse.json({ error: 'User ID required' }, { status: 400 });
  }

  const supabase = getServiceSupabase();

  const updates: Record<string, unknown> = {};
  if (full_name) updates.full_name = full_name;
  if (email !== undefined) updates.email = email || null;
  if (role) updates.role = role;
  if (password) updates.password_hash = await bcrypt.hash(password, 10);

  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', id)
    .select('id, username, full_name, email, role, created_at')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// DELETE /api/users?id=xxx
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'User ID required' }, { status: 400 });
  }

  // Prevent self-deletion
  if (id === session.user.id) {
    return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 });
  }

  const supabase = getServiceSupabase();
  const { error } = await supabase.from('users').delete().eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
