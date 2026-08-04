import mongoose from "mongoose";

const { Schema } = mongoose;

/*
|--------------------------------------------------------------------------
| Percentage normalization
|--------------------------------------------------------------------------
*/

const normalizePercentageItems = (
  value,
) => {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return [];
  }

  let source = value;

  /*
   * Repair legacy string values when possible.
   */
  if (
    typeof source ===
    "string"
  ) {
    const text =
      source.trim();

    if (!text) {
      return [];
    }

    try {
      source =
        JSON.parse(text);
    } catch {
      const extracted = [];

      const pattern =
        /productId\s*:\s*['"]([a-fA-F0-9]{24})['"][\s\S]*?percentage\s*:\s*(-?\d+(?:\.\d+)?)/g;

      let match;

      while (
        (
          match =
            pattern.exec(text)
        ) !== null
      ) {
        extracted.push({
          productId:
            match[1],

          percentage:
            Number(match[2]),
        });
      }

      source = extracted;
    }
  }

  if (
    !Array.isArray(source)
  ) {
    return [];
  }

  const normalized = [];

  for (const item of source) {
    if (
      !item ||
      typeof item !==
        "object" ||
      Array.isArray(item)
    ) {
      continue;
    }

    const productId =
      item.productId?._id ||
      item.productId ||
      item.product?._id ||
      item.product ||
      null;

    const percentage =
      Number(
        item.percentage ??
        item.value ??
        item.rate,
      );

    if (
      !mongoose.isValidObjectId(
        productId,
      )
    ) {
      continue;
    }

    if (
      !Number.isFinite(
        percentage,
      ) ||
      percentage < 0
    ) {
      continue;
    }

    normalized.push({
      productId,
      percentage,
    });
  }

  return normalized;
};

/*
|--------------------------------------------------------------------------
| Percentage subdocument
|--------------------------------------------------------------------------
*/

const customerPercentageSchema =
  new Schema(
    {
      productId: {
        type:
          Schema.Types.ObjectId,
        ref: "Product",
        required: [
          true,
          "Product is required",
        ],
      },

      percentage: {
        type: Number,
        required: [
          true,
          "Percentage is required",
        ],
        min: [
          0,
          "Percentage cannot be negative",
        ],
        validate: {
          validator(value) {
            return Number.isFinite(
              Number(value),
            );
          },

          message:
            "Percentage must be a valid number",
        },
      },
    },
    {
      _id: false,
    },
  );

/*
|--------------------------------------------------------------------------
| Customer schema
|--------------------------------------------------------------------------
*/

const customerSchema =
  new Schema(
    {
      /*
      |--------------------------------------------------------------------------
      | Linked customer login account
      |--------------------------------------------------------------------------
      */

      userId: {
        type:
          Schema.Types.ObjectId,
        ref: "User",
        default: null,
        unique: true,
        sparse: true,
      },

      username: {
        type: String,
        required: [
          true,
          "Customer username is required",
        ],
        trim: true,
        maxlength: [
          100,
          "Customer username cannot exceed 100 characters",
        ],
      },

      /*
      |--------------------------------------------------------------------------
      | Optional customer email
      |--------------------------------------------------------------------------
      */

      email: {
        type: String,
        trim: true,
        lowercase: true,
        default: undefined,
        maxlength: [
          254,
          "Email cannot exceed 254 characters",
        ],
        validate: {
          validator(value) {
            if (
              value === undefined ||
              value === null ||
              value === ""
            ) {
              return true;
            }

            return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
              value,
            );
          },

          message:
            "Please provide a valid email address",
        },
      },

      branchId: {
        type: String,
        trim: true,
        default: "",
        maxlength: [
          100,
          "Branch ID cannot exceed 100 characters",
        ],
      },

      phoneNumber: {
        type: String,
        trim: true,
        default: "",
        maxlength: [
          50,
          "Phone number cannot exceed 50 characters",
        ],
      },

      address: {
        type: String,
        trim: true,
        default: "",
        maxlength: [
          500,
          "Address cannot exceed 500 characters",
        ],
      },

      description: {
        type: String,
        trim: true,
        default: "",
        maxlength: [
          1000,
          "Description cannot exceed 1000 characters",
        ],
      },

      percentages: {
        type: [
          customerPercentageSchema,
        ],
        default: [],
        set:
          normalizePercentageItems,
      },

      balance: {
        type: Number,
        default: 0,
        min: [
          0,
          "Customer balance cannot be negative",
        ],
        validate: {
          validator(value) {
            return (
              Number.isFinite(
                Number(value),
              ) &&
              Number(value) >= 0
            );
          },

          message:
            "Customer balance must be a valid non-negative number",
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

/*
|--------------------------------------------------------------------------
| Repair old percentage data when loading
|--------------------------------------------------------------------------
*/

customerSchema.pre(
  "init",
  function repairLegacyCustomer(
    rawDocument,
  ) {
    if (
      rawDocument &&
      rawDocument.percentages !==
        undefined
    ) {
      rawDocument.percentages =
        normalizePercentageItems(
          rawDocument.percentages,
        );
    }
  },
);

/*
|--------------------------------------------------------------------------
| Normalize customer fields
|--------------------------------------------------------------------------
*/

customerSchema.pre(
  "validate",
  function normalizeCustomer() {
    if (
      typeof this.username ===
      "string"
    ) {
      this.username =
        this.username
          .replace(/\s+/g, " ")
          .trim();
    }

    if (
      this.email === undefined ||
      this.email === null
    ) {
      this.email = undefined;
    } else if (
      typeof this.email ===
      "string"
    ) {
      const normalizedEmail =
        this.email
          .trim()
          .toLowerCase();

      this.email =
        normalizedEmail ||
        undefined;
    }

    const textFields = [
      "branchId",
      "phoneNumber",
      "address",
      "description",
      "createdBy",
      "updatedBy",
    ];

    for (
      const fieldName of
      textFields
    ) {
      if (
        typeof this[
          fieldName
        ] === "string"
      ) {
        this[fieldName] =
          this[fieldName].trim();
      }
    }

    if (
      this.balance !== null &&
      this.balance !== undefined
    ) {
      this.balance =
        Number(this.balance);
    }

    this.percentages =
      normalizePercentageItems(
        this.percentages,
      );
  },
);

/*
|--------------------------------------------------------------------------
| Indexes
|--------------------------------------------------------------------------
*/

customerSchema.index({
  username: 1,
});

customerSchema.index({
  email: 1,
});

customerSchema.index({
  status: 1,
  createdAt: -1,
});

const Customer =
  mongoose.models.Customer ||
  mongoose.model(
    "Customer",
    customerSchema,
  );

export {
  normalizePercentageItems,
};

export default Customer;