import swaggerUi from 'swagger-ui-express';

import { authPaths, authSchemas } from './auth.swagger.js';
import { userPaths } from './user.swagger.js';
import { categoryPaths, categorySchemas } from './category.swagger.js';
import { productPaths, productSchemas } from './product.swagger.js';
import { customerPaths, customerSchemas } from './customer.swagger.js';

import {
  lotteryChiefBalancePaths,
  lotteryChiefBalanceSchemas
} from './lotteryChiefBalance.swagger.js';

import {
  chiefExpensePaths,
  chiefExpenseSchemas
} from './chiefExpense.swagger.js';

import {
  lotteryPlayPaths,
  lotteryPlaySchemas
} from './lotteryPlay.swagger.js';

const swaggerSpec = {
  openapi: '3.0.0',

  info: {
    title: 'Express Mongoose JWT API',
    version: '1.0.0',
    description:
      'API documentation for Auth, Users, Products, Categories, Customers, Lottery Chief Balances, Chief Expenses, and Lottery Plays'
  },

  servers: [
    {
      url: 'http://localhost:5000',
      description: 'Local Development Server'
    }
  ],

  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    },

    schemas: {
      ...authSchemas,
      ...categorySchemas,
      ...productSchemas,
      ...customerSchemas,
      ...lotteryChiefBalanceSchemas,
      ...chiefExpenseSchemas,
      ...lotteryPlaySchemas
    }
  },

  paths: {
    ...authPaths,
    ...userPaths,
    ...categoryPaths,
    ...productPaths,
    ...customerPaths,
    ...lotteryChiefBalancePaths,
    ...chiefExpensePaths,
    ...lotteryPlayPaths
  }
};

const swaggerUiOptions = {
  explorer: true,
  customSiteTitle: 'Backend API Documentation'
};

export { swaggerUi, swaggerSpec, swaggerUiOptions };