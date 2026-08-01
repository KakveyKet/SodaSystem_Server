import mongoose from 'mongoose';

const chiefExpenseSchema = new mongoose.Schema(
  {
    branchId: {
      type: String,
      required: [true, 'Branch ID is required'],
      trim: true
    },

    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: [true, 'Customer ID is required']
    },

    paymentDate: {
      type: Date,
      required: [true, 'Payment date is required'],
      default: Date.now
    },

    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0.01, 'Amount must be greater than 0']
    },

    description: {
      type: String,
      default: '',
      trim: true
    },

    createdBy: {
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

const ChiefExpense = mongoose.model('ChiefExpense', chiefExpenseSchema);

export default ChiefExpense;