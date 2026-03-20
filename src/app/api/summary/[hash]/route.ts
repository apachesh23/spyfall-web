import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ hash: string }> }
) {
  const { hash } = await params;
  if (!hash) {
    return NextResponse.json({ error: 'Missing hash' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('game_history')
    .select('*')
    .eq('share_hash', hash)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(data);
}
