import mongoose from 'mongoose';

const getRatePercent = (value) => {
  const rate = Number(value || 0);
  return rate > 0 ? rate : 100;
};

const calculateAmountWithRate = (amount, rate) => {
  return (Number(amount || 0) * getRatePercent(rate)) / 100;
};

const toPlayResultNumber = (value) => {
  return Math.trunc(Math.abs(Number(value || 0)));
};

const TWO_DIGIT_WIN_MULTIPLIER = 100;
const THREE_DIGIT_WIN_MULTIPLIER = 600;

const lotteryPlayRowSchema = new mongoose.Schema(
  {
    rowTitle: {
      type: String,
      required: [true, 'Row title is required'],
      trim: true
    },

    twoDigitNumber: {
      type: Number,
      default: null,
      min: [0, 'Two digit number cannot be negative'],
      max: [99, 'Two digit number cannot be greater than 99']
    },

    threeDigitNumber: {
      type: Number,
      default: null,
      min: [0, 'Three digit number cannot be negative'],
      max: [999, 'Three digit number cannot be greater than 999']
    },

    winTwoNumberType: {
      type: Number,
      default: 0,
      min: [0, '2D type cannot be negative']
    },

    winThreeNumberType: {
      type: Number,
      default: 0,
      min: [0, '3D type cannot be negative']
    },

    twoDigitAmount: {
      type: Number,
      default: 0,
      min: [0, 'Two digit amount cannot be negative']
    },

    threeDigitAmount: {
      type: Number,
      default: 0,
      min: [0, 'Three digit amount cannot be negative']
    },

    isTwoNumber: {
      type: Boolean,
      default: false
    },

    isThreeNumber: {
      type: Boolean,
      default: false
    },

    totalAmount: {
      type: Number,
      default: 0
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

const lotteryPlaySchema = new mongoose.Schema(
  {
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Category ID is required']
    },

    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product ID is required']
    },

    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: [true, 'Customer ID is required']
    },

    playDate: {
      type: Date,
      required: [true, 'Play date is required'],
      default: Date.now
    },

    title: {
      type: String,
      required: [true, 'Play name is required'],
      trim: true
    },

    twoDigitRate: {
      type: Number,
      default: 100
    },

    threeDigitRate: {
      type: Number,
      default: 100
    },

    rows: {
      type: [lotteryPlayRowSchema],
      default: [],
      validate: {
        validator(value) {
          return Array.isArray(value) && value.length > 0;
        },
        message: 'At least one play row is required'
      }
    },

    totalAmount: {
      type: Number,
      default: 0
    },

    checkedStatus: {
      type: Boolean,
      default: false
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

lotteryPlaySchema.pre('validate', function () {
  let twoDigitBaseTotal = 0;
  let threeDigitBaseTotal = 0;
  let twoDigitCorrectTotal = 0;
  let threeDigitCorrectTotal = 0;

  this.rows.forEach((row) => {
    const twoDigitNumber = row.isTwoNumber ? Number(row.twoDigitNumber || 0) : 0;

    const threeDigitNumber = row.isThreeNumber
      ? Number(row.threeDigitNumber || 0)
      : 0;

    const twoDigitCorrect = row.isTwoNumber
      ? Number(row.winTwoNumberType || 0)
      : 0;

    const threeDigitCorrect = row.isThreeNumber
      ? Number(row.winThreeNumberType || 0)
      : 0;

    row.totalAmount = twoDigitNumber + threeDigitNumber;
    row.winTwoNumberType = twoDigitCorrect;
    row.winThreeNumberType = threeDigitCorrect;

    twoDigitBaseTotal += twoDigitNumber;
    threeDigitBaseTotal += threeDigitNumber;
    twoDigitCorrectTotal += twoDigitCorrect;
    threeDigitCorrectTotal += threeDigitCorrect;
  });

  const twoDigitGrandTotal = calculateAmountWithRate(
    twoDigitBaseTotal,
    this.twoDigitRate
  );

  const threeDigitGrandTotal = calculateAmountWithRate(
    threeDigitBaseTotal,
    this.threeDigitRate
  );

  const twoDigitResult = toPlayResultNumber(twoDigitGrandTotal);
  const threeDigitResult = toPlayResultNumber(threeDigitGrandTotal);

  const twoDigitCorrectDeduction =
    twoDigitCorrectTotal * TWO_DIGIT_WIN_MULTIPLIER;

  const threeDigitCorrectDeduction =
    threeDigitCorrectTotal * THREE_DIGIT_WIN_MULTIPLIER;

  const playResultTotal = twoDigitResult + threeDigitResult;

  const correctDeductionTotal =
    twoDigitCorrectDeduction + threeDigitCorrectDeduction;

  this.totalAmount = playResultTotal - correctDeductionTotal;
  this.checkedStatus = false;
});

const LotteryPlay =
  mongoose.models.LotteryPlay || mongoose.model('LotteryPlay', lotteryPlaySchema);

export default LotteryPlay;