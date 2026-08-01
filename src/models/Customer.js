import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema(
  {
    branchId: {
      type: String,
      required: [true, 'Branch ID is required'],
      trim: true
    },

    username: {
      type: String,
      required: [true, 'Username is required'],
      trim: true
    },

    phoneNumber: {
      type: String,
      default: '',
      trim: true
    },

    address: {
      type: String,
      default: '',
      trim: true
    },

    description: {
      type: String,
      default: '',
      trim: true
    },

    percentages: {
      type: [mongoose.Schema.Types.Mixed],
      default: []
    },

    balance: {
      type: Number,
      default: 0,
      min: [0, 'Balance cannot be negative']
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

const Customer = mongoose.model('Customer', customerSchema);

export default Customer;