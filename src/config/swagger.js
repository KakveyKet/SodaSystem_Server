import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

const swaggerOptions = {
  definition: {
    openapi: "3.0.0",

    info: {
      title: "Express Mongoose JWT API",
      version: "1.0.0",
      description:
        "API documentation for Auth, Products, Categories and Customers",
    },

    servers: [
      {
        url: "http://localhost:5000",
        description: "Local Development Server",
      },
    ],

    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },

      schemas: {
        LoginRequest: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: {
              type: "string",
              example: "admin@example.com",
            },
            password: {
              type: "string",
              example: "Admin@12345",
            },
          },
        },

        RegisterRequest: {
          type: "object",
          required: ["name", "email", "password"],
          properties: {
            name: {
              type: "string",
              example: "Kakvey",
            },
            email: {
              type: "string",
              example: "user@example.com",
            },
            password: {
              type: "string",
              example: "Password@123",
            },
          },
        },

        ProductRequest: {
          type: "object",
          required: ["name", "winMultiplier"],
          properties: {
            name: {
              type: "string",
              example: "Product A",
            },
            winMultiplier: {
              type: "number",
              example: 2,
            },
            description: {
              type: "string",
              example: "Product description",
            },
            status: {
              type: "boolean",
              example: true,
            },
          },
        },

        CategoryRequest: {
          type: "object",
          required: ["name"],
          properties: {
            name: {
              type: "string",
              example: "Slot Games",
            },
            description: {
              type: "string",
              example: "Category description",
            },
            status: {
              type: "boolean",
              example: true,
            },
          },
        },

        CustomerRequest: {
          type: "object",
          required: ["branchId", "username"],
          properties: {
            branchId: {
              type: "string",
              example: "BR001",
            },
            username: {
              type: "string",
              example: "Customer A",
            },
            phoneNumber: {
              type: "string",
              example: "012345678",
            },
            address: {
              type: "string",
              example: "Phnom Penh",
            },
            description: {
              type: "string",
              example: "Customer description",
            },
            percentages: {
              type: "array",
              items: {
                type: "object",
              },
              example: [
                {
                  productId: "66a123456789abcdef123456",
                  percentage: 10,
                },
              ],
            },
            status: {
              type: "boolean",
              example: true,
            },
          },
        },
      },
    },

    paths: {
      "/api/auth/register": {
        post: {
          tags: ["Auth"],
          summary: "Register new user",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/RegisterRequest",
                },
              },
            },
          },
          responses: {
            201: {
              description: "User registered successfully",
            },
            400: {
              description: "Validation error",
            },
          },
        },
      },

      "/api/auth/login": {
        post: {
          tags: ["Auth"],
          summary: "Login user or super admin",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/LoginRequest",
                },
              },
            },
          },
          responses: {
            200: {
              description: "Login successfully",
            },
            401: {
              description: "Invalid email or password",
            },
          },
        },
      },

      "/api/auth/logout": {
        post: {
          tags: ["Auth"],
          summary: "Logout user",
          responses: {
            200: {
              description: "Logged out successfully",
            },
          },
        },
      },

      "/api/users/me": {
        get: {
          tags: ["Users"],
          summary: "Get current logged in user",
          security: [
            {
              bearerAuth: [],
            },
          ],
          responses: {
            200: {
              description: "Current user fetched successfully",
            },
            401: {
              description: "Unauthorized",
            },
          },
        },
      },

      "/api/products": {
        get: {
          tags: ["Products"],
          summary: "Get products with pagination",
          security: [
            {
              bearerAuth: [],
            },
          ],
          parameters: [
            {
              name: "page",
              in: "query",
              schema: {
                type: "integer",
                example: 1,
              },
            },
            {
              name: "limit",
              in: "query",
              schema: {
                type: "integer",
                example: 10,
              },
            },
            {
              name: "search",
              in: "query",
              schema: {
                type: "string",
                example: "product",
              },
            },
            {
              name: "status",
              in: "query",
              schema: {
                type: "boolean",
                example: true,
              },
            },
          ],
          responses: {
            200: {
              description: "Products fetched successfully",
            },
          },
        },

        post: {
          tags: ["Products"],
          summary: "Create product",
          security: [
            {
              bearerAuth: [],
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ProductRequest",
                },
              },
            },
          },
          responses: {
            201: {
              description: "Product created successfully",
            },
          },
        },
      },

      "/api/products/{id}": {
        get: {
          tags: ["Products"],
          summary: "Get product by ID",
          security: [
            {
              bearerAuth: [],
            },
          ],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: {
                type: "string",
              },
            },
          ],
          responses: {
            200: {
              description: "Product fetched successfully",
            },
            404: {
              description: "Product not found",
            },
          },
        },

        put: {
          tags: ["Products"],
          summary: "Update product",
          security: [
            {
              bearerAuth: [],
            },
          ],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: {
                type: "string",
              },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ProductRequest",
                },
              },
            },
          },
          responses: {
            200: {
              description: "Product updated successfully",
            },
          },
        },

        delete: {
          tags: ["Products"],
          summary: "Delete product",
          security: [
            {
              bearerAuth: [],
            },
          ],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: {
                type: "string",
              },
            },
          ],
          responses: {
            200: {
              description: "Product deleted successfully",
            },
          },
        },
      },

      "/api/categories": {
        get: {
          tags: ["Categories"],
          summary: "Get categories with pagination",
          security: [
            {
              bearerAuth: [],
            },
          ],
          parameters: [
            {
              name: "page",
              in: "query",
              schema: {
                type: "integer",
                example: 1,
              },
            },
            {
              name: "limit",
              in: "query",
              schema: {
                type: "integer",
                example: 10,
              },
            },
            {
              name: "search",
              in: "query",
              schema: {
                type: "string",
                example: "slot",
              },
            },
            {
              name: "status",
              in: "query",
              schema: {
                type: "boolean",
                example: true,
              },
            },
          ],
          responses: {
            200: {
              description: "Categories fetched successfully",
            },
          },
        },

        post: {
          tags: ["Categories"],
          summary: "Create category",
          security: [
            {
              bearerAuth: [],
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/CategoryRequest",
                },
              },
            },
          },
          responses: {
            201: {
              description: "Category created successfully",
            },
          },
        },
      },

      "/api/categories/{id}": {
        get: {
          tags: ["Categories"],
          summary: "Get category by ID",
          security: [
            {
              bearerAuth: [],
            },
          ],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: {
                type: "string",
              },
            },
          ],
          responses: {
            200: {
              description: "Category fetched successfully",
            },
            404: {
              description: "Category not found",
            },
          },
        },

        put: {
          tags: ["Categories"],
          summary: "Update category",
          security: [
            {
              bearerAuth: [],
            },
          ],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: {
                type: "string",
              },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/CategoryRequest",
                },
              },
            },
          },
          responses: {
            200: {
              description: "Category updated successfully",
            },
          },
        },

        delete: {
          tags: ["Categories"],
          summary: "Delete category",
          security: [
            {
              bearerAuth: [],
            },
          ],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: {
                type: "string",
              },
            },
          ],
          responses: {
            200: {
              description: "Category deleted successfully",
            },
          },
        },
      },

      "/api/customers": {
        get: {
          tags: ["Customers"],
          summary: "Get customers with pagination",
          security: [
            {
              bearerAuth: [],
            },
          ],
          parameters: [
            {
              name: "page",
              in: "query",
              schema: {
                type: "integer",
                example: 1,
              },
            },
            {
              name: "limit",
              in: "query",
              schema: {
                type: "integer",
                example: 10,
              },
            },
            {
              name: "search",
              in: "query",
              schema: {
                type: "string",
                example: "customer",
              },
            },
            {
              name: "branchId",
              in: "query",
              schema: {
                type: "string",
                example: "BR001",
              },
            },
            {
              name: "status",
              in: "query",
              schema: {
                type: "boolean",
                example: true,
              },
            },
          ],
          responses: {
            200: {
              description: "Customers fetched successfully",
            },
          },
        },

        post: {
          tags: ["Customers"],
          summary: "Create customer",
          security: [
            {
              bearerAuth: [],
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/CustomerRequest",
                },
              },
            },
          },
          responses: {
            201: {
              description: "Customer created successfully",
            },
          },
        },
      },

      "/api/customers/{id}": {
        get: {
          tags: ["Customers"],
          summary: "Get customer by ID",
          security: [
            {
              bearerAuth: [],
            },
          ],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: {
                type: "string",
              },
            },
          ],
          responses: {
            200: {
              description: "Customer fetched successfully",
            },
            404: {
              description: "Customer not found",
            },
          },
        },

        put: {
          tags: ["Customers"],
          summary: "Update customer",
          security: [
            {
              bearerAuth: [],
            },
          ],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: {
                type: "string",
              },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/CustomerRequest",
                },
              },
            },
          },
          responses: {
            200: {
              description: "Customer updated successfully",
            },
          },
        },

        delete: {
          tags: ["Customers"],
          summary: "Delete customer",
          security: [
            {
              bearerAuth: [],
            },
          ],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: {
                type: "string",
              },
            },
          ],
          responses: {
            200: {
              description: "Customer deleted successfully",
            },
          },
        },
      },
    },
  },

  apis: [],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

const swaggerUiOptions = {
  explorer: true,
  customSiteTitle: "Backend API Documentation",
};

export { swaggerUi, swaggerSpec, swaggerUiOptions };
