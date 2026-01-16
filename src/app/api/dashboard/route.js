import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Transaction from '@/models/Transaction';
import Customer from '@/models/Customer';
import Settings from '@/models/Settings';

// GET dashboard data
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    // Get settings
    const settings = await Settings.findOne({ userId: session.user.id });
    const openingBalance = settings?.openingBankBalance || 0;

    // Get all bank transactions
    const bankTransactions = await Transaction.find({
      userId: session.user.id,
      affectsBank: true,
    });

    // Calculate current bank balance
    let bankBalance = openingBalance;
    bankTransactions.forEach(txn => {
      if (['PAYMENT_RECEIVED', 'BANK_CREDIT'].includes(txn.type)) {
        bankBalance += txn.amount;
      } else if (['BANK_DEBIT', 'AACHI_MASALA_CREDIT'].includes(txn.type)) {
        bankBalance -= txn.amount;
      }
    });

    // Get total outstanding across all customers
    const outstandingTransactions = await Transaction.find({
      userId: session.user.id,
      affectsOutstanding: true,
    });

    let totalOutstanding = 0;
    outstandingTransactions.forEach(txn => {
      if (txn.type === 'CUSTOMER_PURCHASE') {
        totalOutstanding += txn.amount;
      } else if (txn.type === 'PAYMENT_RECEIVED') {
        totalOutstanding -= txn.amount;
      }
    });

    // Get total purchases (CUSTOMER_PURCHASE + AACHI_MASALA_PURCHASE)
    const allPurchases = await Transaction.find({
      userId: session.user.id,
      type: { $in: ['CUSTOMER_PURCHASE', 'AACHI_MASALA_PURCHASE'] },
    });
    const totalPurchases = allPurchases.reduce((sum, txn) => sum + txn.amount, 0);

    // Get customer count
    const customerCount = await Customer.countDocuments({ userId: session.user.id });

    // Get recent transactions
    const recentTransactions = await Transaction.find({ userId: session.user.id })
      .populate('customerId', 'name')
      .sort({ date: -1, createdAt: -1 })
      .limit(5);

    // Get Aachi Masala balance
    const openingAachiMasalaBalance = settings?.openingAachiMasalaBalance || 0;
    const aachiMasalaTransactions = await Transaction.find({
      userId: session.user.id,
      affectsAachiMasala: true,
    });

    let aachiMasalaBalance = openingAachiMasalaBalance;
    aachiMasalaTransactions.forEach(txn => {
      if (txn.type === 'AACHI_MASALA_CREDIT') {
        aachiMasalaBalance += txn.amount;
      } else if (txn.type === 'AACHI_MASALA_PURCHASE') {
        aachiMasalaBalance -= txn.amount;
      }
    });

    return NextResponse.json({
      bankBalance,
      totalOutstanding,
      totalPurchases,
      customerCount,
      aachiMasalaBalance,
      recentTransactions,
    });
  } catch (error) {
    console.error('Error fetching dashboard:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}
