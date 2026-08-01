import mongoose from 'mongoose';

const customerTransactionSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: [true, 'Customer ID is required']
    },

    type: {
      type: String,
      enum: ['deposit', 'withdraw'],
      required: [true, 'Transaction type is required']
    },

    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0.01, 'Amount must be greater than 0']
    },

    beforeBalance: {
      type: Number,
      required: true
    },

    afterBalance: {
      type: Number,
      required: true
    },

    note: {
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

const CustomerTransaction = mongoose.model(
  'CustomerTransaction',
  customerTransactionSchema
);

export default CustomerTransaction;