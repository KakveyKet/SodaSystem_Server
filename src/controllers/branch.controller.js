import mongoose from "mongoose";

import Branch from "../models/Branch.js";
import Customer from "../models/Customer.js";

const MAX_PAGE_LIMIT = 500;

const createHttpError = (
  message,
  statusCode = 400,
) => {
  const error =
    new Error(message);

  error.statusCode =
    statusCode;

  return error;
};

const sendError = (
  error,
  res,
  fallbackMessage,
) => {
  console.error(
    `${fallbackMessage}:`,
    error,
  );

  if (
    error.statusCode
  ) {
    return res
      .status(
        error.statusCode,
      )
      .json({
        success:
          false,

        message:
          error.message,
      });
  }

  if (
    error.name ===
    "ValidationError"
  ) {
    return res
      .status(400)
      .json({
        success:
          false,

        message:
          Object.values(
            error.errors ||
              {},
          )[0]
            ?.message ||
          "Branch validation failed",
      });
  }

  if (
    error.code ===
    11000
  ) {
    return res
      .status(409)
      .json({
        success:
          false,

        message:
          "Branch code already exists",
      });
  }

  return res
    .status(500)
    .json({
      success:
        false,

      message:
        fallbackMessage,
    });
};

const getActorName = (
  req,
) => {
  return String(
    req.user
      ?.username ||
      req.user?.name ||
      req.user?.email ||
      "System",
  ).trim();
};

const escapeRegex = (
  value = "",
) => {
  return String(
    value,
  ).replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&",
  );
};

const parsePositiveInteger = (
  value,
  fallback,
) => {
  const parsed =
    Number.parseInt(
      value,
      10,
    );

  return Number.isInteger(
    parsed,
  ) &&
    parsed > 0
    ? parsed
    : fallback;
};

const normalizeBoolean = (
  value,
  fallback = true,
) => {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return fallback;
  }

  if (
    [
      true,
      "true",
      1,
      "1",
    ].includes(value)
  ) {
    return true;
  }

  if (
    [
      false,
      "false",
      0,
      "0",
    ].includes(value)
  ) {
    return false;
  }

  throw createHttpError(
    "Status must be true or false",
    400,
  );
};

const normalizeText = (
  value,
  fieldName,
  maxLength,
  required = false,
) => {
  const text =
    String(
      value ?? "",
    ).trim();

  if (
    required &&
    !text
  ) {
    throw createHttpError(
      `${fieldName} is required`,
      400,
    );
  }

  if (
    text.length >
    maxLength
  ) {
    throw createHttpError(
      `${fieldName} cannot exceed ${maxLength} characters`,
      400,
    );
  }

  return text;
};

const validateBranchId = (
  value,
) => {
  if (
    !value ||
    !mongoose.isValidObjectId(
      value,
    )
  ) {
    throw createHttpError(
      "Branch ID is invalid",
      400,
    );
  }

  return String(value);
};

const getBranches = async (
  req,
  res,
) => {
  try {
    const page =
      parsePositiveInteger(
        req.query.page,
        1,
      );

    const limit =
      Math.min(
        parsePositiveInteger(
          req.query.limit,
          20,
        ),
        MAX_PAGE_LIMIT,
      );

    const skip =
      (page - 1) *
      limit;

    const filter = {};

    const search =
      String(
        req.query.search ||
          "",
      ).trim();

    if (search) {
      const safe =
        escapeRegex(
          search,
        );

      filter.$or = [
        {
          name: {
            $regex:
              safe,

            $options:
              "i",
          },
        },

        {
          code: {
            $regex:
              safe,

            $options:
              "i",
          },
        },

        {
          phoneNumber: {
            $regex:
              safe,

            $options:
              "i",
          },
        },

        {
          address: {
            $regex:
              safe,

            $options:
              "i",
          },
        },
      ];
    }

    if (
      req.query.status !==
      undefined &&
      req.query.status !==
      ""
    ) {
      filter.status =
        normalizeBoolean(
          req.query.status,
        );
    }

    const [
      branches,
      total,
    ] =
      await Promise.all([
        Branch.find(
          filter,
        )
          .sort({
            createdAt:
              -1,

            _id:
              -1,
          })
          .skip(skip)
          .limit(limit)
          .lean(),

        Branch.countDocuments(
          filter,
        ),
      ]);

    return res
      .status(200)
      .json({
        success:
          true,

        data:
          branches,

        pagination: {
          page,
          limit,
          total,

          totalPages:
            Math.max(
              Math.ceil(
                total /
                  limit,
              ),
              1,
            ),
        },
      });
  } catch (error) {
    return sendError(
      error,
      res,
      "Could not fetch branches",
    );
  }
};

const getBranchById =
  async (
    req,
    res,
  ) => {
    try {
      const branchId =
        validateBranchId(
          req.params.id,
        );

      const branch =
        await Branch.findById(
          branchId,
        ).lean();

      if (!branch) {
        throw createHttpError(
          "Branch not found",
          404,
        );
      }

      return res
        .status(200)
        .json({
          success:
            true,

          data:
            branch,
        });
    } catch (error) {
      return sendError(
        error,
        res,
        "Could not fetch branch",
      );
    }
  };

const createBranch =
  async (
    req,
    res,
  ) => {
    try {
      const name =
        normalizeText(
          req.body.name,
          "Branch name",
          150,
          true,
        );

      const code =
        normalizeText(
          req.body.code,
          "Branch code",
          50,
          true,
        ).toUpperCase();

      const existing =
        await Branch.findOne({
          code,
        }).lean();

      if (existing) {
        throw createHttpError(
          "Branch code already exists",
          409,
        );
      }

      const actor =
        getActorName(
          req,
        );

      const branch =
        await Branch.create({
          name,
          code,

          phoneNumber:
            normalizeText(
              req.body
                .phoneNumber,
              "Phone number",
              50,
            ),

          address:
            normalizeText(
              req.body
                .address,
              "Address",
              500,
            ),

          description:
            normalizeText(
              req.body
                .description,
              "Description",
              1000,
            ),

          status:
            normalizeBoolean(
              req.body
                .status,
              true,
            ),

          createdBy:
            actor,

          updatedBy:
            actor,
        });

      return res
        .status(201)
        .json({
          success:
            true,

          message:
            "Branch created successfully",

          data:
            branch,
        });
    } catch (error) {
      return sendError(
        error,
        res,
        "Could not create branch",
      );
    }
  };

const updateBranch =
  async (
    req,
    res,
  ) => {
    try {
      const branchId =
        validateBranchId(
          req.params.id,
        );

      const branch =
        await Branch.findById(
          branchId,
        );

      if (!branch) {
        throw createHttpError(
          "Branch not found",
          404,
        );
      }

      if (
        Object.prototype.hasOwnProperty.call(
          req.body,
          "name",
        )
      ) {
        branch.name =
          normalizeText(
            req.body.name,
            "Branch name",
            150,
            true,
          );
      }

      if (
        Object.prototype.hasOwnProperty.call(
          req.body,
          "code",
        )
      ) {
        const code =
          normalizeText(
            req.body.code,
            "Branch code",
            50,
            true,
          ).toUpperCase();

        const duplicate =
          await Branch.findOne({
            _id: {
              $ne:
                branch._id,
            },

            code,
          }).lean();

        if (duplicate) {
          throw createHttpError(
            "Branch code already exists",
            409,
          );
        }

        branch.code =
          code;
      }

      if (
        Object.prototype.hasOwnProperty.call(
          req.body,
          "phoneNumber",
        )
      ) {
        branch.phoneNumber =
          normalizeText(
            req.body
              .phoneNumber,
            "Phone number",
            50,
          );
      }

      if (
        Object.prototype.hasOwnProperty.call(
          req.body,
          "address",
        )
      ) {
        branch.address =
          normalizeText(
            req.body
              .address,
            "Address",
            500,
          );
      }

      if (
        Object.prototype.hasOwnProperty.call(
          req.body,
          "description",
        )
      ) {
        branch.description =
          normalizeText(
            req.body
              .description,
            "Description",
            1000,
          );
      }

      if (
        Object.prototype.hasOwnProperty.call(
          req.body,
          "status",
        )
      ) {
        branch.status =
          normalizeBoolean(
            req.body
              .status,
          );
      }

      branch.updatedBy =
        getActorName(
          req,
        );

      await branch.save();

      return res
        .status(200)
        .json({
          success:
            true,

          message:
            "Branch updated successfully",

          data:
            branch,
        });
    } catch (error) {
      return sendError(
        error,
        res,
        "Could not update branch",
      );
    }
  };

const updateBranchStatus =
  async (
    req,
    res,
  ) => {
    try {
      const branchId =
        validateBranchId(
          req.params.id,
        );

      const branch =
        await Branch.findById(
          branchId,
        );

      if (!branch) {
        throw createHttpError(
          "Branch not found",
          404,
        );
      }

      branch.status =
        normalizeBoolean(
          req.body.status,
        );

      branch.updatedBy =
        getActorName(
          req,
        );

      await branch.save();

      return res
        .status(200)
        .json({
          success:
            true,

          message:
            branch.status
              ? "Branch activated successfully"
              : "Branch deactivated successfully",

          data:
            branch,
        });
    } catch (error) {
      return sendError(
        error,
        res,
        "Could not update branch status",
      );
    }
  };

const deleteBranch =
  async (
    req,
    res,
  ) => {
    try {
      const branchId =
        validateBranchId(
          req.params.id,
        );

      const branch =
        await Branch.findById(
          branchId,
        );

      if (!branch) {
        throw createHttpError(
          "Branch not found",
          404,
        );
      }

      const customerCount =
        await Customer.countDocuments({
          $or: [
            {
              branch:
                branch._id,
            },

            {
              branchId:
                branch.code,
            },
          ],
        });

      if (
        customerCount > 0
      ) {
        throw createHttpError(
          `This branch is assigned to ${customerCount} customer(s). Reassign those customers before deleting the branch.`,
          409,
        );
      }

      await branch.deleteOne();

      return res
        .status(200)
        .json({
          success:
            true,

          message:
            "Branch deleted successfully",
        });
    } catch (error) {
      return sendError(
        error,
        res,
        "Could not delete branch",
      );
    }
  };

export {
  getBranches,
  getBranchById,
  createBranch,
  updateBranch,
  updateBranchStatus,
  deleteBranch,
};
