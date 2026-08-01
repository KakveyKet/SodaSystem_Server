import mongoose from 'mongoose';

const lotteryChiefBalanceSchema = new mongoose.Schema(
  {
    branchId: {
      type: String,
      required: [true, 'Branch ID is required'],
      trim: true,
      unique: true
    },

    lastChiefExpenseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChiefExpense',
      default: null
    },

    invoiceIds: {
      type: [String],
      default: []
    },

    amount: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Lottery chief balance cannot be negative']
    },

    status: {
      type: Boolean,
      default: true
    },

    createdBy: {
      type: String,
      default: 'System'
    },

    updatedBy: {
      type: String,
      default: 'System'
    }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform(doc, ret) {
        ret.id = ret._id.toString();
        delete ret._id;
        return ret;
      }
    }
  }
);

const LotteryChiefBalance = mongoose.model(
  'LotteryChiefBalance',
  lotteryChiefBalanceSchema
);

export default LotteryChiefBalance;