import mongoose from "mongoose";

import Category from "../models/Category.js";
import Customer from "../models/Customer.js";
import LotteryPlay from "../models/LotteryPlay.js";
import Product from "../models/Product.js";

const MAX_PAGE_LIMIT = 100;

/*
|--------------------------------------------------------------------------
| Error helpers
|--------------------------------------------------------------------------
*/

const createHttpError = (
  message,
  statusCode = 400
) => {
  const error = new Error(message);

  error.statusCode = statusCode;

  return error;
};

const handleControllerError = (
  error,
  res,
  fallbackMessage
) => {
  console.error(
    `${fallbackMessage}:`,
    error
  );

  if (error.statusCode) {
    return res
      .status(error.statusCode)
      .json({
        success: false,
        message: error.message,
      });
  }

  if (
    error.name ===
    "CastError"
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid invoice ID",
    });
  }

  if (
    error.name ===
    "MissingSchemaError"
  ) {
    return res.status(500).json({
      success: false,

      message:
        "A referenced invoice model has not been registered",
    });
  }

  return res.status(500).json({
    success: false,
    message: fallbackMessage,
  });
};

/*
|--------------------------------------------------------------------------
| General helpers
|--------------------------------------------------------------------------
*/

const escapeRegex = (
  value = ""
) => {
  return String(value).replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
};

const parsePositiveInteger = (
  value,
  fallback
) => {
  const parsed =
    Number.parseInt(value, 10);

  if (
    !Number.isInteger(parsed) ||
    parsed <= 0
  ) {
    return fallback;
  }

  return parsed;
};

const parseStartDate = (
  value
) => {
  if (!value) {
    return null;
  }

  const date = new Date(
    `${value}T00:00:00.000`
  );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return null;
  }

  return date;
};

const parseEndDate = (
  value
) => {
  if (!value) {
    return null;
  }

  const date = new Date(
    `${value}T23:59:59.999`
  );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return null;
  }

  return date;
};

/*
|--------------------------------------------------------------------------
| Invoice population
|--------------------------------------------------------------------------
|
| Explicit model values guarantee that Mongoose knows which model to use.
|
*/

const populateInvoice = (
  query
) => {
  return query.populate([
    {
      path: "customerId",
      model: Customer,

      select:
        "username email branchId phoneNumber balance status",
    },

    {
      path: "categoryIds",
      model: Category,

      select:
        "name description status",
    },

    {
      path: "productIds",
      model: Product,

      select:
        "name description status winMultiplier",
    },
  ]);
};

/*
|--------------------------------------------------------------------------
| Resolve logged-in Customer
|--------------------------------------------------------------------------
*/

const getLoggedInCustomer =
  async (
    req
  ) => {
    if (
      req.user?.role !==
      "customer"
    ) {
      throw createHttpError(
        "Only customer accounts can access customer invoices",
        403
      );
    }

    const customer =
      await Customer.findOne({
        userId: req.user._id,
      })
        .select(
          "_id userId username email branchId phoneNumber balance status"
        )
        .lean();

    if (!customer) {
      throw createHttpError(
        "Customer profile is not linked to this account",
        404
      );
    }

    if (
      customer.status ===
      false
    ) {
      throw createHttpError(
        "Customer account is inactive",
        403
      );
    }

    return customer;
  };

/*
|--------------------------------------------------------------------------
| GET /api/customer-invoices
|--------------------------------------------------------------------------
|
| The Customer ID comes from the authenticated account.
| The frontend cannot request another customer's invoices.
|
*/

const getMyInvoices =
  async (
    req,
    res
  ) => {
    try {
      const customer =
        await getLoggedInCustomer(
          req
        );

      const page =
        parsePositiveInteger(
          req.query.page,
          1
        );

      const limit =
        Math.min(
          parsePositiveInteger(
            req.query.limit,
            10
          ),
          MAX_PAGE_LIMIT
        );

      const skip =
        (page - 1) *
        limit;

      const filter = {
        customerId:
          customer._id,
      };

      /*
      |--------------------------------------------------------------------------
      | Search
      |--------------------------------------------------------------------------
      */

      const search =
        String(
          req.query.search ||
          ""
        ).trim();

      if (search) {
        const safeSearch =
          escapeRegex(search);

        filter.$or = [
          {
            title: {
              $regex:
                safeSearch,

              $options: "i",
            },
          },

          {
            "rows.rowTitle": {
              $regex:
                safeSearch,

              $options: "i",
            },
          },
        ];
      }

      /*
      |--------------------------------------------------------------------------
      | Date range
      |--------------------------------------------------------------------------
      */

      const dateFrom =
        parseStartDate(
          req.query.dateFrom
        );

      const dateTo =
        parseEndDate(
          req.query.dateTo
        );

      if (
        dateFrom ||
        dateTo
      ) {
        filter.playDate = {};

        if (dateFrom) {
          filter.playDate.$gte =
            dateFrom;
        }

        if (dateTo) {
          filter.playDate.$lte =
            dateTo;
        }
      }

      /*
      |--------------------------------------------------------------------------
      | Fetch invoices
      |--------------------------------------------------------------------------
      */

      const [
        invoices,
        total,
      ] = await Promise.all([
        populateInvoice(
          LotteryPlay.find(
            filter
          )
        )
          .sort({
            playDate: -1,
            createdAt: -1,
            _id: -1,
          })
          .skip(skip)
          .limit(limit)
          .lean(),

        LotteryPlay.countDocuments(
          filter
        ),
      ]);

      return res.status(200).json({
        success: true,

        data:
          invoices,

        customer: {
          id:
            customer._id.toString(),

          username:
            customer.username,

          balance:
            Number(
              customer.balance ||
              0
            ),
        },

        pagination: {
          page,
          limit,
          total,

          pages:
            Math.max(
              Math.ceil(
                total /
                  limit
              ),
              1
            ),
        },
      });
    } catch (error) {
      return handleControllerError(
        error,
        res,
        "Could not fetch customer invoices"
      );
    }
  };

/*
|--------------------------------------------------------------------------
| GET /api/customer-invoices/:id
|--------------------------------------------------------------------------
|
| Returns the invoice only when its customerId matches the logged-in
| Customer.
|
*/

const getMyInvoiceById =
  async (
    req,
    res
  ) => {
    try {
      const customer =
        await getLoggedInCustomer(
          req
        );

      const invoiceId =
        String(
          req.params.id ||
          ""
        ).trim();

      if (
        !mongoose.isValidObjectId(
          invoiceId
        )
      ) {
        throw createHttpError(
          "Invalid invoice ID",
          400
        );
      }

      const invoice =
        await populateInvoice(
          LotteryPlay.findOne({
            _id:
              invoiceId,

            customerId:
              customer._id,
          })
        ).lean();

      if (!invoice) {
        throw createHttpError(
          "Invoice was not found or does not belong to this customer",
          404
        );
      }

      return res.status(200).json({
        success: true,
        data: invoice,
      });
    } catch (error) {
      return handleControllerError(
        error,
        res,
        "Could not fetch invoice details"
      );
    }
  };

export {
  getMyInvoices,
  getMyInvoiceById,
};