import mongoose from 'mongoose';

const SettingsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  openingBankBalance: {
    type: Number,
    default: 0,
  },
  openingBalanceDate: {
    type: Date,
    default: Date.now,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

SettingsSchema.pre('save', function() {
  this.updatedAt = new Date();
});

export default mongoose.models.Settings || mongoose.model('Settings', SettingsSchema);
