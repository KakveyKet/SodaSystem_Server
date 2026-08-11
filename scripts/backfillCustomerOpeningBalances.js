import mongoose from "mongoose";
import dotenv from "dotenv";

import Customer from "../src/models/Customer.js";
import CustomerTransaction from "../src/models/CustomerTransaction.js";

dotenv.config();

/*
|--------------------------------------------------------------------------
| OPTIONAL opening balance backfill
|--------------------------------------------------------------------------
|
| Use this only for balances that existed BEFORE the ledger fix.
|
| It creates one opening deposit for an eligible customer.
| It cannot reconstruct the real historical deposits.
|
*/

const run = async () => {
  try {
    const mongoUri =
      process.env.MONGO_URI ||
      "mongodb://127.0.0.1:27017/finace_ms";

    await mongoose.connect(
      mongoUri,
    );

    console.log(
      `Connected: ${mongoose.connection.name}`,
    );

    const customers =
      await Customer.find({
        balance: {
          $gt: 0,
        },
      }).lean();

    let inserted = 0;
    let skipped = 0;

    for (const customer of customers) {
      const anyTransaction =
        await CustomerTransaction.exists({
          customerId:
            customer._id,
        });

      if (anyTransaction) {
        console.log(
          `Skip ${customer.username}: transaction history already exists`,
        );

        skipped += 1;
        continue;
      }

      const balance =
        Number(
          customer.balance ||
          0,
        );

      await CustomerTransaction.create({
        customerId:
          customer._id,

        operation:
          "deposit",

        source:
          "opening_balance_backfill",

        requestedOperation:
          "backfill",

        amount:
          balance,

        oldBalance:
          0,

        newBalance:
          balance,

        transactionDate:
          customer.createdAt ||
          new Date(),

        description:
          "Opening balance backfill",

        createdBy:
          "Migration",
      });

      inserted += 1;

      console.log(
        `Inserted ${customer.username}: ${balance}`,
      );
    }

    console.log("");
    console.log(
      `Inserted: ${inserted}`,
    );
    console.log(
      `Skipped: ${skipped}`,
    );
  } catch (error) {
    console.error(
      "Backfill failed:",
      error,
    );

    process.exitCode = 1;
  } finally {
    await mongoose
      .disconnect()
      .catch(() => {});
  }
};

run();
