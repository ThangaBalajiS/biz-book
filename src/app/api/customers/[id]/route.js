import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Customer from '@/models/Customer';
import Transaction from '@/models/Transaction';

// GET single customer with outstanding (paginated transactions)
export async function GET(request, { params }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit')) || 10;
    const skip = parseInt(searchParams.get('skip')) || 0;

    await dbConnect();

    const customer = await Customer.findOne({ _id: id, userId: session.user.id });
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Calculate outstanding from all transactions using aggregation
    const outstandingResult = await Transaction.aggregate([
      { $match: { userId: customer.userId, customerId: customer._id } },
      {
        $group: {
          _id: null,
          purchases: {
            $sum: { $cond: [{ $eq: ['$type', 'CUSTOMER_PURCHASE'] }, '$amount', 0] },
          },
          payments: {
            $sum: { $cond: [{ $eq: ['$type', 'PAYMENT_RECEIVED'] }, '$amount', 0] },
          },
          total: { $sum: 1 },
        },
      },
    ]);

    const outstanding = outstandingResult.length > 0
      ? outstandingResult[0].purchases - outstandingResult[0].payments
      : 0;
    const total = outstandingResult.length > 0 ? outstandingResult[0].total : 0;

    // Get paginated transactions
    const transactions = await Transaction.find({
      userId: session.user.id,
      customerId: id,
    }).sort({ date: -1 }).skip(skip).limit(limit);

    return NextResponse.json({
      customer,
      transactions,
      outstanding,
      total,
    });
  } catch (error) {
    console.error('Error fetching customer:', error);
    return NextResponse.json({ error: 'Failed to fetch customer' }, { status: 500 });
  }
}


// PUT update customer
export async function PUT(request, { params }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { name, phone } = await request.json();

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Customer name is required' }, { status: 400 });
    }

    await dbConnect();

    const customer = await Customer.findOneAndUpdate(
      { _id: id, userId: session.user.id },
      { name: name.trim(), phone: phone?.trim() || '' },
      { new: true }
    );

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    return NextResponse.json(customer);
  } catch (error) {
    if (error.code === 11000) {
      return NextResponse.json({ error: 'Customer with this name already exists' }, { status: 400 });
    }
    console.error('Error updating customer:', error);
    return NextResponse.json({ error: 'Failed to update customer' }, { status: 500 });
  }
}

// DELETE customer
export async function DELETE(request, { params }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await dbConnect();

    // Check if customer has transactions
    const hasTransactions = await Transaction.findOne({
      userId: session.user.id,
      customerId: id,
    });

    if (hasTransactions) {
      return NextResponse.json(
        { error: 'Cannot delete customer with existing transactions' },
        { status: 400 }
      );
    }

    const customer = await Customer.findOneAndDelete({ _id: id, userId: session.user.id });

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    console.error('Error deleting customer:', error);
    return NextResponse.json({ error: 'Failed to delete customer' }, { status: 500 });
  }
}
