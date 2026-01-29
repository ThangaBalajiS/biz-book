import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Settings from '@/models/Settings';

// GET settings
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    let settings = await Settings.findOne({ userId: session.user.id });

    // Create default settings if none exist
    if (!settings) {
      settings = await Settings.create({
        userId: session.user.id,
        openingBankBalance: 0,
        openingBalanceDate: new Date(),
        openingAachiMasalaBalance: 0,
        openingAachiMasalaBalanceDate: new Date(),
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

// PUT update settings
export async function PUT(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { openingBankBalance, openingBalanceDate, openingAachiMasalaBalance, openingAachiMasalaBalanceDate, businessName } = await request.json();

    await dbConnect();

    const settings = await Settings.findOneAndUpdate(
      { userId: session.user.id },
      {
        ...(businessName !== undefined && { businessName }),
        openingBankBalance: openingBankBalance ?? 0,
        openingBalanceDate: openingBalanceDate ? new Date(openingBalanceDate) : new Date(),
        openingAachiMasalaBalance: openingAachiMasalaBalance ?? 0,
        openingAachiMasalaBalanceDate: openingAachiMasalaBalanceDate ? new Date(openingAachiMasalaBalanceDate) : new Date(),
      },
      { new: true, upsert: true }
    );

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
