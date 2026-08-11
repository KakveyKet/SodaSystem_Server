import mongoose from 'mongoose';

const { Schema } = mongoose;

const lotteryPlayRowSchema = new Schema(
  {
    rowTitle: {
      type: String,
      required: [true, 'Row name is required'],
      trim: true,
      maxlength: [200, 'Row name cannot exceed 200 characters']
    },

    // One row = one category.
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Category is required for each row'],
      index: true
    },

    twoDigitNumber: {
      type: Number,
      default: null,
      min: [0, '2D number cannot be negative']
    },

    threeDigitNumber: {
      type: Number,
      default: null,
      min: [0, '3D number cannot be negative']
    },

    winTwoNumberType: {
      type: Number,
      default: 0,
      min: [0, 'Correct 2D value cannot be negative']
    },

    winThreeNumberType: {
      type: Number,
      default: 0,
      min: [0, 'Correct 3D value cannot be negative']
    },

    isTwoNumber: {
      type: Boolean,
      default: false
    },

    isThreeNumber: {
      type: Boolean,
      default: false
    },

    checkedStatus: {
      type: Boolean,
      default: false
    }
  },
  {
    _id: true
  }
);

const lotteryPlaySchema = new Schema(
  {
    title: {
      type: String,
      required: [true, 'Invoice name is required'],
      trim: true,
      maxlength: [200, 'Invoice name cannot exceed 200 characters']
    },

    productIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Product',
        required: true
      }
    ],

    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      required: [true, 'Customer is required']
    },

    playDate: {
      type: Date,
      required: [true, 'Invoice date is required'],
      default: Date.now
    },

    twoDigitRate: {
      type: Number,
      default: 100,
      min: 0
    },

    threeDigitRate: {
      type: Number,
      default: 65,
      min: 0
    },

    rows: {
      type: [lotteryPlayRowSchema],
      validate: {
        validator(value) {
          return Array.isArray(value) && value.length > 0;
        },
        message: 'At least one invoice row is required'
      }
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },

    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },

    status: {
      type: Boolean,
      default: true
    },

    /*
    |--------------------------------------------------------------------------
    | Customer balance integration
    |--------------------------------------------------------------------------
    |
    | totalResult is the same final result shown on the invoice printout.
    |
    | Customer balance rule:
    |   New Balance = Latest Balance + Invoice Total Result
    |
    */
    totalResult: {
      type: Number,
      default: 0
    },

    balanceBefore: {
      type: Number,
      default: null
    },

    balanceAfter: {
      type: Number,
      default: null
    },

    balanceApplied: {
      type: Boolean,
      default: false,
      index: true
    },

    balanceAppliedResult: {
      type: Number,
      default: 0
    },

    balanceAppliedCustomerId: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      default: null
    },

    balanceAppliedAt: {
      type: Date,
      default: null
    },


    // Legacy invoice-level category fields are kept only so old data remains readable.
    // New create/update logic does not save categories here.
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      default: null
    },

    categoryIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Category'
      }
    ]
  },
  {
    timestamps: true,
    versionKey: false
  }
);

lotteryPlaySchema.index({ playDate: -1 });
lotteryPlaySchema.index({ customerId: 1 });
lotteryPlaySchema.index({ productIds: 1 });
lotteryPlaySchema.index({ 'rows.categoryId': 1 });
lotteryPlaySchema.index({ title: 'text', 'rows.rowTitle': 'text' });

const LotteryPlay =
  mongoose.models.LotteryPlay ||
  mongoose.model('LotteryPlay', lotteryPlaySchema);

export default LotteryPlay;
