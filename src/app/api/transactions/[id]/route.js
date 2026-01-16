import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Transaction from '@/models/Transaction';

// DELETE transaction
export async function DELETE(request, { params }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await dbConnect();

    const transaction = await Transaction.findOneAndDelete({
      _id: id,
      userId: session.user.id,
    });

    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Transaction deleted successfully' });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    return NextResponse.json({ error: 'Failed to delete transaction' }, { status: 500 });
  }
}

// PUT update transaction
export async function PUT(request, { params }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { amount, date, description } = await request.json();

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Positive amount is required' }, { status: 400 });
    }

    await dbConnect();

    const transaction = await Transaction.findOneAndUpdate(
      { _id: id, userId: session.user.id },
      {
        amount,
        date: date ? new Date(date) : undefined,
        description: description?.trim() || '',
      },
      { new: true }
    ).populate('customerId', 'name');

    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    return NextResponse.json(transaction);
  } catch (error) {
    console.error('Error updating transaction:', error);
    return NextResponse.json({ error: 'Failed to update transaction' }, { status: 500 });
  }
}
