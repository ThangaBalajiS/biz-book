import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Transaction from '@/models/Transaction';
import '@/models/Customer'; // Required for populate() to work

// GET transactions with filters
export async function GET(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const affectsBank = searchParams.get('affectsBank');
    const fromDate = searchParams.get('fromDate');
    const toDate = searchParams.get('toDate');
    const customerId = searchParams.get('customerId');

    await dbConnect();

    // Build query
    const query = { userId: session.user.id };

    if (type) {
      query.type = type;
    }

    if (affectsBank === 'true') {
      query.affectsBank = true;
    }

    if (customerId) {
      query.customerId = customerId;
    }

    const affectsAachiMasala = searchParams.get('affectsAachiMasala');
    if (affectsAachiMasala === 'true') {
      query.affectsAachiMasala = true;
    }

    if (fromDate || toDate) {
      query.date = {};
      if (fromDate) {
        query.date.$gte = new Date(fromDate);
      }
      if (toDate) {
        // Set to end of day
        const endDate = new Date(toDate);
        endDate.setHours(23, 59, 59, 999);
        query.date.$lte = endDate;
      }
    }

    const transactions = await Transaction.find(query)
      .populate('customerId', 'name')
      .sort({ date: -1, createdAt: -1 });

    return NextResponse.json(transactions);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
  }
}

// POST create new transaction
export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { type, amount, date, description, customerId } = await request.json();

    // Validate required fields
    if (!type || !amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Type and positive amount are required' },
        { status: 400 }
      );
    }

    // Validate transaction type
    const validTypes = ['CUSTOMER_PURCHASE', 'PAYMENT_RECEIVED', 'OWN_PURCHASE', 'BANK_CREDIT', 'BANK_DEBIT', 'AACHI_MASALA_CREDIT', 'AACHI_MASALA_PURCHASE'];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: 'Invalid transaction type' }, { status: 400 });
    }

    // Customer-related types require customerId
    if (['CUSTOMER_PURCHASE', 'PAYMENT_RECEIVED'].includes(type) && !customerId) {
      return NextResponse.json({ error: 'Customer is required for this transaction type' }, { status: 400 });
    }

    await dbConnect();

    const transaction = await Transaction.create({
      type,
      amount,
      date: date ? new Date(date) : new Date(),
      description: description?.trim() || '',
      customerId: customerId || null,
      userId: session.user.id,
    });

    const populated = await Transaction.findById(transaction._id).populate('customerId', 'name');

    return NextResponse.json(populated, { status: 201 });
  } catch (error) {
    console.error('Error creating transaction:', error);
    return NextResponse.json({ error: 'Failed to create transaction' }, { status: 500 });
  }
}
