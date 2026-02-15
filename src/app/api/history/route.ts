import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const downloads = await db.download.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset
    });

    const total = await db.download.count();

    return NextResponse.json({
      success: true,
      data: downloads,
      pagination: { total, limit, offset }
    });
  } catch (error) {
    console.error('Error fetching history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch download history' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    await db.download.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting download:', error);
    return NextResponse.json(
      { error: 'Failed to delete download' },
      { status: 500 }
    );
  }
       }
