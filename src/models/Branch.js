import mongoose from "mongoose";

const { Schema } = mongoose;

const branchSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Branch name is required"],
      trim: true,
      maxlength: [150, "Branch name cannot exceed 150 characters"],
    },

    code: {
      type: String,
      required: [true, "Branch code is required"],
      trim: true,
      uppercase: true,
      maxlength: [50, "Branch code cannot exceed 50 characters"],
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
  },
);

branchSchema.pre("validate", function normalizeBranch() {
  const textFields = [
    "name",
    "code",
    "phoneNumber",
    "address",
    "description",
    "createdBy",
    "updatedBy",
  ];

  for (const field of textFields) {
    if (typeof this[field] === "string") {
      this[field] = this[field].trim();
    }
  }

  if (typeof this.code === "string") {
    this.code = this.code.toUpperCase();
  }
});

branchSchema.index(
  { code: 1 },
  {
    unique: true,
  },
);

branchSchema.index({
  name: 1,
});

branchSchema.index({
  status: 1,
  createdAt: -1,
});

const Branch =
  mongoose.models.Branch ||
  mongoose.model(
    "Branch",
    branchSchema,
  );

export default Branch;
