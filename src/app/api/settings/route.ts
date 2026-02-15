import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    let settings = await db.settings.findFirst();
    
    if (!settings) {
      settings = await db.settings.create({
        data: {
          defaultQuality: 'best',
          defaultFormat: 'mp4',
          autoRename: true,
          downloadPath: '/downloads'
        }
      });
    }

    return NextResponse.json({ success: true, data: settings });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { defaultQuality, defaultFormat, autoRename, downloadPath, darkMode } = body;

    let settings = await db.settings.findFirst();
    
    if (!settings) {
      settings = await db.settings.create({
        data: {
          defaultQuality: defaultQuality || 'best',
          defaultFormat: defaultFormat || 'mp4',
          autoRename: autoRename ?? true,
          downloadPath: downloadPath || '/downloads',
          darkMode: darkMode ?? false
        }
      });
    } else {
      settings = await db.settings.update({
        where: { id: settings.id },
        data: {
          ...(defaultQuality !== undefined && { defaultQuality }),
          ...(defaultFormat !== undefined && { defaultFormat }),
          ...(autoRename !== undefined && { autoRename }),
          ...(downloadPath !== undefined && { downloadPath }),
          ...(darkMode !== undefined && { darkMode })
        }
      });
    }

    return NextResponse.json({ success: true, data: settings });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
