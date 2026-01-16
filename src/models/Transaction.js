import mongoose from 'mongoose';

const TransactionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['CUSTOMER_PURCHASE', 'PAYMENT_RECEIVED', 'OWN_PURCHASE', 'BANK_CREDIT', 'BANK_DEBIT'],
    required: true,
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount must be positive'],
  },
  date: {
    type: Date,
    required: [true, 'Date is required'],
    default: Date.now,
  },
  description: {
    type: String,
    trim: true,
    default: '',
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    default: null,
  },
  // Computed flags based on transaction type
  affectsBank: {
    type: Boolean,
    default: false,
  },
  affectsOutstanding: {
    type: Boolean,
    default: false,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Pre-save hook to set flags based on transaction type
TransactionSchema.pre('save', function() {
  switch (this.type) {
    case 'CUSTOMER_PURCHASE':
      this.affectsBank = false;
      this.affectsOutstanding = true;
      break;
    case 'PAYMENT_RECEIVED':
      this.affectsBank = true;
      this.affectsOutstanding = true;
      break;
    case 'OWN_PURCHASE':
      this.affectsBank = true;
      this.affectsOutstanding = false;
      break;
    case 'BANK_CREDIT':
    case 'BANK_DEBIT':
      this.affectsBank = true;
      this.affectsOutstanding = false;
      break;
  }
});

// Index for efficient queries
TransactionSchema.index({ userId: 1, date: -1 });
TransactionSchema.index({ userId: 1, type: 1 });
TransactionSchema.index({ userId: 1, customerId: 1 });

export default mongoose.models.Transaction || mongoose.model('Transaction', TransactionSchema);
