import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Customer from '@/models/Customer';
import Transaction from '@/models/Transaction';
import Settings from '@/models/Settings';

// GET pre-calculated PDF data for all customers with outstanding
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    // Fetch business name
    let businessName = 'YOUR BUSINESS NAME';
    const settings = await Settings.findOne({ userId: session.user.id });
    if (settings?.businessName) {
      businessName = settings.businessName;
    }

    // Fetch all customers
    const customers = await Customer.find({ userId: session.user.id });

    // Process each customer
    const customerData = await Promise.all(
      customers.map(async (customer) => {
        const transactions = await Transaction.find({
          userId: session.user.id,
          customerId: customer._id,
        }).sort({ date: 1 }); // ascending for FIFO calculation

        // Calculate outstanding
        let outstanding = 0;
        transactions.forEach(txn => {
          if (txn.type === 'CUSTOMER_PURCHASE') {
            outstanding += txn.amount;
          } else if (txn.type === 'PAYMENT_RECEIVED') {
            outstanding -= txn.amount;
          }
        });

        if (outstanding <= 0) return null;

        // Find last purchase date (most recent)
        const lastPurchase = [...transactions]
          .reverse()
          .find(t => t.type === 'CUSTOMER_PURCHASE');
        const billDate = lastPurchase?.date || customer.createdAt || new Date();

        // FIFO: determine which purchases contribute to the outstanding
        const purchases = [];
        for (const txn of transactions) {
          if (txn.type === 'CUSTOMER_PURCHASE') {
            purchases.push({
              date: txn.date,
              description: txn.description || '-',
              originalAmount: txn.amount,
              remaining: txn.amount,
            });
          } else if (txn.type === 'PAYMENT_RECEIVED') {
            let paymentLeft = txn.amount;
            for (const purchase of purchases) {
              if (paymentLeft <= 0) break;
              if (purchase.remaining <= 0) continue;
              const applied = Math.min(paymentLeft, purchase.remaining);
              purchase.remaining -= applied;
              paymentLeft -= applied;
            }
          }
        }

        const contributingPurchases = purchases
          .filter(p => p.remaining > 0.01)
          .map(p => ({
            date: p.date,
            originalAmount: p.originalAmount,
            remaining: p.remaining,
          }));

        return {
          name: customer.name,
          outstanding,
          billDate,
          contributingPurchases,
        };
      })
    );

    // Filter out nulls (customers with no outstanding) and sort by outstanding descending
    const result = customerData
      .filter(Boolean)
      .sort((a, b) => b.outstanding - a.outstanding);

    const totalOutstanding = result.reduce((sum, c) => sum + c.outstanding, 0);

    return NextResponse.json({
      businessName,
      totalOutstanding,
      customers: result,
    });
  } catch (error) {
    console.error('Error generating PDF data:', error);
    return NextResponse.json({ error: 'Failed to generate PDF data' }, { status: 500 });
  }
}
