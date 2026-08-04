import mongoose from "mongoose";

const { Schema } = mongoose;

/*
|--------------------------------------------------------------------------
| Validation helpers
|--------------------------------------------------------------------------
*/

const isFiniteNonNegativeNumber = (value) => {
  return Number.isFinite(Number(value)) && Number(value) >= 0;
};

const uniqueObjectIds = (values = []) => {
  const uniqueMap = new Map();

  values.filter(Boolean).forEach((value) => {
    uniqueMap.set(String(value), value);
  });

  return Array.from(uniqueMap.values());
};

/*
|--------------------------------------------------------------------------
| Lottery play row schema
|--------------------------------------------------------------------------
|
| 2D and 3D numbers have no maximum limit.
|
| Valid:
|   100
|   1000
|   999999
|   50000000
|
| Invalid:
|   negative numbers
|   Infinity
|   NaN
|
*/

const lotteryPlayRowSchema = new Schema(
  {
    rowTitle: {
      type: String,

      required: [true, "Row title is required"],

      trim: true,

      maxlength: [250, "Row title cannot exceed 250 characters"],
    },

    /*
      |--------------------------------------------------------------------------
      | 2D fields
      |--------------------------------------------------------------------------
      */

    twoDigitNumber: {
      type: Number,

      default: null,

      validate: {
        validator(value) {
          if (!this.isTwoNumber) {
            return (
              value === null ||
              value === undefined ||
              isFiniteNonNegativeNumber(value)
            );
          }

          return (
            value !== null &&
            value !== undefined &&
            isFiniteNonNegativeNumber(value)
          );
        },

        message: "2D number must be a valid non-negative number",
      },
    },

    twoDigitAmount: {
      type: Number,

      default: 0,

      validate: {
        validator(value) {
          return isFiniteNonNegativeNumber(value);
        },

        message: "2D amount must be a valid non-negative number",
      },
    },

    winTwoNumberType: {
      type: Number,

      default: 0,

      validate: {
        validator(value) {
          return isFiniteNonNegativeNumber(value);
        },

        message: "Correct 2D value must be a valid non-negative number",
      },
    },

    isTwoNumber: {
      type: Boolean,
      default: false,
    },

    /*
      |--------------------------------------------------------------------------
      | 3D fields
      |--------------------------------------------------------------------------
      */

    threeDigitNumber: {
      type: Number,

      default: null,

      validate: {
        validator(value) {
          if (!this.isThreeNumber) {
            return (
              value === null ||
              value === undefined ||
              isFiniteNonNegativeNumber(value)
            );
          }

          return (
            value !== null &&
            value !== undefined &&
            isFiniteNonNegativeNumber(value)
          );
        },

        message: "3D number must be a valid non-negative number",
      },
    },

    threeDigitAmount: {
      type: Number,

      default: 0,

      validate: {
        validator(value) {
          return isFiniteNonNegativeNumber(value);
        },

        message: "3D amount must be a valid non-negative number",
      },
    },

    winThreeNumberType: {
      type: Number,

      default: 0,

      validate: {
        validator(value) {
          return isFiniteNonNegativeNumber(value);
        },

        message: "Correct 3D value must be a valid non-negative number",
      },
    },

    isThreeNumber: {
      type: Boolean,
      default: false,
    },

    checkedStatus: {
      type: Boolean,
      default: false,
    },
  },
  {
    _id: true,

    timestamps: false,
  },
);

/*
|--------------------------------------------------------------------------
| Normalize disabled row fields
|--------------------------------------------------------------------------
*/

lotteryPlayRowSchema.pre("validate", function normalizeRowBeforeValidation() {
  if (!this.isTwoNumber) {
    this.twoDigitNumber = null;
    this.twoDigitAmount = 0;
    this.winTwoNumberType = 0;
  }

  if (!this.isThreeNumber) {
    this.threeDigitNumber = null;
    this.threeDigitAmount = 0;
    this.winThreeNumberType = 0;
  }
});

/*
|--------------------------------------------------------------------------
| Main lottery play schema
|--------------------------------------------------------------------------
*/

const lotteryPlaySchema = new Schema(
  {
    title: {
      type: String,

      required: [true, "Invoice name is required"],

      trim: true,

      maxlength: [250, "Invoice name cannot exceed 250 characters"],

      index: true,
    },

    /*
      |--------------------------------------------------------------------------
      | Multiple categories
      |--------------------------------------------------------------------------
      */

    categoryIds: {
      type: [
        {
          type: Schema.Types.ObjectId,

          ref: "Category",
        },
      ],

      default: [],

      validate: {
        validator(values) {
          return Array.isArray(values) && values.length > 0;
        },

        message: "At least one category is required",
      },
    },

    /*
     * Legacy single-category field.
     *
     * Keep this temporarily so older invoice
     * documents continue working.
     */
    categoryId: {
      type: Schema.Types.ObjectId,

      ref: "Category",

      default: null,
    },

    /*
      |--------------------------------------------------------------------------
      | Multiple products
      |--------------------------------------------------------------------------
      */

    productIds: {
      type: [
        {
          type: Schema.Types.ObjectId,

          ref: "Product",
        },
      ],

      default: [],

      validate: {
        validator(values) {
          return Array.isArray(values) && values.length > 0;
        },

        message: "At least one product is required",
      },
    },

    /*
     * Legacy single-product field.
     *
     * Keep this temporarily so older invoice
     * documents continue working.
     */
    productId: {
      type: Schema.Types.ObjectId,

      ref: "Product",

      default: null,
    },

    /*
      |--------------------------------------------------------------------------
      | Customer
      |--------------------------------------------------------------------------
      */

    customerId: {
      type: Schema.Types.ObjectId,

      ref: "Customer",

      required: [true, "Customer is required"],

      index: true,
    },

    /*
      |--------------------------------------------------------------------------
      | Invoice date
      |--------------------------------------------------------------------------
      */

    playDate: {
      type: Date,

      required: [true, "Invoice date is required"],

      index: true,
    },

    /*
      |--------------------------------------------------------------------------
      | Rates
      |--------------------------------------------------------------------------
      */

    twoDigitRate: {
      type: Number,

      required: [true, "2D rate is required"],

      validate: {
        validator(value) {
          return Number.isFinite(Number(value)) && Number(value) > 0;
        },

        message: "2D rate must be greater than zero",
      },
    },

    threeDigitRate: {
      type: Number,

      required: [true, "3D rate is required"],

      validate: {
        validator(value) {
          return Number.isFinite(Number(value)) && Number(value) > 0;
        },

        message: "3D rate must be greater than zero",
      },
    },

    /*
      |--------------------------------------------------------------------------
      | Invoice rows
      |--------------------------------------------------------------------------
      */

    rows: {
      type: [lotteryPlayRowSchema],

      required: [true, "At least one play row is required"],

      validate: {
        validator(values) {
          return Array.isArray(values) && values.length > 0;
        },

        message: "At least one play row is required",
      },
    },

    /*
      |--------------------------------------------------------------------------
      | Calculated amount
      |--------------------------------------------------------------------------
      |
      | This stores the sum of:
      |
      | - twoDigitAmount
      | - threeDigitAmount
      |
      | for enabled rows.
      |
      */

    totalAmount: {
      type: Number,

      default: 0,

      validate: {
        validator(value) {
          return Number.isFinite(Number(value)) && Number(value) >= 0;
        },

        message: "Total amount cannot be negative",
      },
    },

    checkedStatus: {
      type: Boolean,
      default: false,
      index: true,
    },

    status: {
      type: Boolean,
      default: true,
      index: true,
    },

    createdBy: {
      type: String,

      trim: true,

      default: "System",
    },

    updatedBy: {
      type: String,

      trim: true,

      default: "System",
    },
  },
  {
    timestamps: true,

    versionKey: false,

    toJSON: {
      virtuals: true,
    },

    toObject: {
      virtuals: true,
    },
  },
);

/*
|--------------------------------------------------------------------------
| Normalize references and totals
|--------------------------------------------------------------------------
*/

lotteryPlaySchema.pre(
  "validate",
  function normalizeLotteryPlayBeforeValidation() {
    /*
     * Convert old categoryId into categoryIds.
     */
    if (
      (!Array.isArray(this.categoryIds) || this.categoryIds.length === 0) &&
      this.categoryId
    ) {
      this.categoryIds = [this.categoryId];
    }

    /*
     * Remove duplicate categories.
     */
    this.categoryIds = uniqueObjectIds(this.categoryIds);

    /*
     * Keep the legacy categoryId synchronized
     * with the first selected category.
     */
    if (this.categoryIds.length > 0) {
      this.categoryId = this.categoryIds[0];
    }

    /*
     * Convert old productId into productIds.
     */
    if (
      (!Array.isArray(this.productIds) || this.productIds.length === 0) &&
      this.productId
    ) {
      this.productIds = [this.productId];
    }

    /*
     * Remove duplicate products.
     */
    this.productIds = uniqueObjectIds(this.productIds);

    /*
     * Keep the legacy productId synchronized
     * with the first selected product.
     */
    if (this.productIds.length > 0) {
      this.productId = this.productIds[0];
    }

    /*
     * Recalculate totalAmount.
     */
    this.totalAmount = Array.isArray(this.rows)
      ? this.rows.reduce((total, row) => {
          const twoDigitAmount = row.isTwoNumber
            ? Number(row.twoDigitAmount || 0)
            : 0;

          const threeDigitAmount = row.isThreeNumber
            ? Number(row.threeDigitAmount || 0)
            : 0;

          return total + twoDigitAmount + threeDigitAmount;
        }, 0)
      : 0;
  },
);

/*
|--------------------------------------------------------------------------
| Indexes
|--------------------------------------------------------------------------
*/

lotteryPlaySchema.index({
  playDate: -1,
  createdAt: -1,
});

lotteryPlaySchema.index({
  categoryIds: 1,
});

lotteryPlaySchema.index({
  productIds: 1,
});

lotteryPlaySchema.index({
  customerId: 1,
  playDate: -1,
});

lotteryPlaySchema.index({
  status: 1,
  checkedStatus: 1,
});

/*
|--------------------------------------------------------------------------
| Model export
|--------------------------------------------------------------------------
*/

const LotteryPlay =
  mongoose.models.LotteryPlay ||
  mongoose.model("LotteryPlay", lotteryPlaySchema);

export default LotteryPlay;
