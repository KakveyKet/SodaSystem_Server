import mongoose from "mongoose";

const { Schema } = mongoose;

const customerTransactionSchema = new Schema(
  {
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: [true, "Customer is required"],
      index: true,
    },

    // deposit/withdraw = manual customer balance movement
    // invoice = invoice result / invoice adjustment / invoice reversal
    operation: {
      type: String,
      enum: ["deposit", "withdraw", "invoice"],
      required: true,
      index: true,
    },

    source: {
      type: String,
      enum: [
        "customer_create",
        "customer_update",
        "balance_set",
        "balance_deposit",
        "balance_withdraw",
        "opening_balance_backfill",
        "invoice_create",
        "invoice_update",
        "invoice_update_apply",
        "invoice_customer_change_reverse",
        "invoice_customer_change_apply",
        "invoice_delete_reversal",
      ],
      required: true,
      index: true,
    },

    requestedOperation: {
      type: String,
      default: "",
      trim: true,
    },

    // Always positive magnitude for compatibility with old deposit rows.
    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    // Signed change applied to Customer.balance.
    // +5000 adds 5000, -6000 subtracts 6000.
    balanceDelta: {
      type: Number,
      default: null,
    },

    // These must support negative balances.
    oldBalance: {
      type: Number,
      required: true,
    },

    newBalance: {
      type: Number,
      required: true,
    },

    invoiceId: {
      type: Schema.Types.ObjectId,
      ref: "LotteryPlay",
      default: null,
      index: true,
    },

    invoiceTitle: {
      type: String,
      trim: true,
      default: "",
      maxlength: 200,
    },

    transactionDate: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },

    description: {
      type: String,
      trim: true,
      default: "",
      maxlength: 500,
    },

    createdBy: {
      type: String,
      trim: true,
      default: "System",
      maxlength: 150,
    },

    createdByUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

customerTransactionSchema.index({ customerId: 1, transactionDate: -1 });
customerTransactionSchema.index({ operation: 1, transactionDate: -1 });
customerTransactionSchema.index({ invoiceId: 1, createdAt: -1 });

const CustomerTransaction =
  mongoose.models.CustomerTransaction ||
  mongoose.model("CustomerTransaction", customerTransactionSchema);

export default CustomerTransaction;
