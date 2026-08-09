import mongoose from "mongoose";
import dotenv from "dotenv";

import Rate from "../src/models/Rate.js";

/*
|--------------------------------------------------------------------------
| Environment
|--------------------------------------------------------------------------
*/

dotenv.config();

/*
|--------------------------------------------------------------------------
| Seeder configuration
|--------------------------------------------------------------------------
*/

const START_RATE = 65;
const END_RATE = 109;

/*
|--------------------------------------------------------------------------
| Generate rates
|--------------------------------------------------------------------------
|
| Result:
|
| 65%
| 66%
| 67%
| ...
| 108%
| 109%
|
*/

const generateRates = () => {
  const rates = [];

  for (let number = START_RATE; number <= END_RATE; number += 1) {
    rates.push({
      name: `${number}%`,
      number,
      status: true,
    });
  }

  return rates;
};

/*
|--------------------------------------------------------------------------
| Connect MongoDB
|--------------------------------------------------------------------------
*/

const connectDatabase = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is missing from .env");
  }

  await mongoose.connect(process.env.MONGO_URI);

  console.log(`MongoDB connected: ${mongoose.connection.host}`);

  console.log(`Database: ${mongoose.connection.name}`);
};

/*
|--------------------------------------------------------------------------
| Seed rates
|--------------------------------------------------------------------------
*/

const seedRates = async () => {
  try {
    console.log("");
    console.log("======================================");
    console.log(" Rate Seeder");
    console.log("======================================");

    await connectDatabase();

    const rates = generateRates();

    console.log(`Preparing ${rates.length} rates...`);

    /*
    |--------------------------------------------------------------------------
    | Upsert
    |--------------------------------------------------------------------------
    |
    | We use number as the identifier.
    |
    | Existing:
    |   65 -> update
    |
    | Missing:
    |   65 -> create
    |
    | This prevents duplicate rate records when the seeder is run again.
    |
    */

    const operations = rates.map((rate) => ({
      updateOne: {
        filter: {
          number: rate.number,
        },

        update: {
          $set: {
            name: rate.name,

            number: rate.number,

            status: true,
          },
        },

        upsert: true,
      },
    }));

    const result = await Rate.bulkWrite(operations, {
      ordered: false,
    });

    /*
    |--------------------------------------------------------------------------
    | Seeder result
    |--------------------------------------------------------------------------
    */

    console.log("");
    console.log("Rate seeding completed successfully.");

    console.log("--------------------------------------");

    console.log(`Range: ${START_RATE}% - ${END_RATE}%`);

    console.log(`Expected rates: ${rates.length}`);

    console.log(`Inserted: ${result.upsertedCount || 0}`);

    console.log(`Matched: ${result.matchedCount || 0}`);

    console.log(`Modified: ${result.modifiedCount || 0}`);

    /*
    |--------------------------------------------------------------------------
    | Verify database
    |--------------------------------------------------------------------------
    */

    const databaseRates = await Rate.find({
      number: {
        $gte: START_RATE,

        $lte: END_RATE,
      },
    })
      .sort({
        number: 1,
      })
      .lean();

    console.log(
      `Database contains ${databaseRates.length} rates between ${START_RATE}% and ${END_RATE}%.`,
    );

    console.log("");

    console.log(databaseRates.map((rate) => `${rate.number}%`).join(", "));

    console.log("");
    console.log("======================================");

    await mongoose.disconnect();

    process.exit(0);
  } catch (error) {
    console.error("");
    console.error("Rate seeding failed:");

    console.error(error);

    try {
      await mongoose.disconnect();
    } catch {
      // Ignore disconnect error.
    }

    process.exit(1);
  }
};

/*
|--------------------------------------------------------------------------
| Execute
|--------------------------------------------------------------------------
*/

seedRates();
