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

    operation: {
      type: String,
      enum: ["deposit", "withdraw"],
      required: [true, "Transaction operation is required"],
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
      ],
      required: true,
      index: true,
    },

    requestedOperation: {
      type: String,
      enum: ["create", "update", "set", "deposit", "withdraw", "backfill"],
      required: true,
    },

    amount: {
      type: Number,
      required: [true, "Transaction amount is required"],
      min: [0, "Transaction amount cannot be negative"],
    },

    oldBalance: {
      type: Number,
      required: true,
      min: [0, "Old balance cannot be negative"],
    },

    newBalance: {
      type: Number,
      required: true,
      min: [0, "New balance cannot be negative"],
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
      maxlength: [500, "Description cannot exceed 500 characters"],
    },

    createdBy: {
      type: String,
      trim: true,
      default: "System",
      maxlength: [150, "Created by cannot exceed 150 characters"],
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

customerTransactionSchema.index({ operation: 1, transactionDate: -1 });
customerTransactionSchema.index({ customerId: 1, transactionDate: -1 });
customerTransactionSchema.index({
  customerId: 1,
  operation: 1,
  transactionDate: -1,
});

const CustomerTransaction =
  mongoose.models.CustomerTransaction ||
  mongoose.model("CustomerTransaction", customerTransactionSchema);

export default CustomerTransaction;
