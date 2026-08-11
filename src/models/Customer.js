import mongoose from "mongoose";

const { Schema } = mongoose;

const customerSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      unique: true,
      sparse: true,
    },

    username: {
      type: String,
      required: [true, "Customer username is required"],
      trim: true,
      maxlength: [100, "Customer username cannot exceed 100 characters"],
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
      maxlength: [254, "Email cannot exceed 254 characters"],
      validate: {
        validator(value) {
          return (
            value === undefined ||
            value === null ||
            value === "" ||
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
          );
        },
        message: "Please provide a valid email address",
      },
    },

    /*
    |--------------------------------------------------------------------------
    | Branch
    |--------------------------------------------------------------------------
    |
    | `branch` is the new relational field.
    | `branchId` is kept for compatibility with older customer documents/UI.
    |
    */
    branch: {
      type: Schema.Types.ObjectId,
      ref: "Branch",
      default: null,
      index: true,
    },

    branchId: {
      type: String,
      trim: true,
      default: "",
      maxlength: [100, "Branch ID cannot exceed 100 characters"],
    },

    phoneNumber: {
      type: String,
      trim: true,
      default: "",
      maxlength: [50, "Phone number cannot exceed 50 characters"],
    },

    address: {
      type: String,
      trim: true,
      default: "",
      maxlength: [500, "Address cannot exceed 500 characters"],
    },

    description: {
      type: String,
      trim: true,
      default: "",
      maxlength: [1000, "Description cannot exceed 1000 characters"],
    },

    percentages: {
      type: [Number],
      default: [],
      validate: {
        validator(values) {
          return (
            Array.isArray(values) &&
            values.every(
              (value) => Number.isFinite(Number(value)) && Number(value) >= 0,
            )
          );
        },
        message: "Percentages must contain valid non-negative numbers",
      },
    },

    // Balance is signed because invoice results can move it below zero.
    // Example: 1000 + (-6000) = -5000.
    balance: {
      type: Number,
      default: 0,
      validate: {
        validator(value) {
          return Number.isFinite(Number(value));
        },
        message: "Customer balance must be a valid number",
      },
    },

    status: {
      type: Boolean,
      default: true,
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
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

customerSchema.pre("validate", function normalizeCustomerFields() {
  const fields = [
    "username",
    "email",
    "branchId",
    "phoneNumber",
    "address",
    "description",
    "createdBy",
    "updatedBy",
  ];

  for (const field of fields) {
    if (typeof this[field] === "string") {
      this[field] = this[field].trim();
    }
  }

  if (typeof this.email === "string") {
    this.email = this.email.toLowerCase();
  }

  this.balance = Number(this.balance || 0);

  if (Array.isArray(this.percentages)) {
    this.percentages = this.percentages.map(Number);
  }
});

customerSchema.index({ username: 1 });
customerSchema.index({ email: 1 });
customerSchema.index({ status: 1, createdAt: -1 });

const Customer =
  mongoose.models.Customer || mongoose.model("Customer", customerSchema);

export default Customer;
