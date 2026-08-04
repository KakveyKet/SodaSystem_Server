import mongoose from "mongoose";

const { Schema } = mongoose;

const productSchema = new Schema(
  {
    name: {
      type: String,
      required: [
        true,
        "Product name is required",
      ],
      trim: true,
      maxlength: [
        150,
        "Product name cannot exceed 150 characters",
      ],
    },

    description: {
      type: String,
      trim: true,
      default: "",
      maxlength: [
        1000,
        "Product description cannot exceed 1000 characters",
      ],
    },

    winMultiplier: {
      type: Number,
      required: [
        true,
        "Win multiplier is required",
      ],
      default: 1,
      min: [
        0,
        "Win multiplier cannot be negative",
      ],
      validate: {
        validator(value) {
          return Number.isFinite(
            Number(value),
          );
        },
        message:
          "Win multiplier must be a valid number",
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
  },
);

productSchema.pre(
  "validate",
  function normalizeProduct() {
    if (
      typeof this.name ===
      "string"
    ) {
      this.name =
        this.name
          .replace(/\s+/g, " ")
          .trim();
    }

    if (
      typeof this.description ===
      "string"
    ) {
      this.description =
        this.description.trim();
    }

    if (
      this.winMultiplier !==
        null &&
      this.winMultiplier !==
        undefined
    ) {
      this.winMultiplier =
        Number(
          this.winMultiplier,
        );
    }

    if (
      typeof this.createdBy ===
      "string"
    ) {
      this.createdBy =
        this.createdBy.trim();
    }

    if (
      typeof this.updatedBy ===
      "string"
    ) {
      this.updatedBy =
        this.updatedBy.trim();
    }
  },
);

productSchema.index({
  name: 1,
});

productSchema.index({
  status: 1,
  createdAt: -1,
});

const Product =
  mongoose.models.Product ||
  mongoose.model(
    "Product",
    productSchema,
  );

export default Product;