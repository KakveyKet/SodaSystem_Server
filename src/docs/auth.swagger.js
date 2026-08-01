export const authSchemas = {
  RegisterRequest: {
    type: 'object',
    required: ['name', 'email', 'password'],
    properties: {
      name: {
        type: 'string',
        example: 'Kakvey'
      },
      email: {
        type: 'string',
        example: 'user@example.com'
      },
      password: {
        type: 'string',
        example: 'Password@123'
      }
    }
  },

  LoginRequest: {
    type: 'object',
    required: ['email', 'password'],
    properties: {
      email: {
        type: 'string',
        example: 'admin@example.com'
      },
      password: {
        type: 'string',
        example: 'Admin@12345'
      }
    }
  }
};

export const authPaths = {
  '/api/auth/register': {
    post: {
      tags: ['Auth'],
      summary: 'Register new user',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/RegisterRequest'
            }
          }
        }
      },
      responses: {
        201: {
          description: 'User registered successfully'
        },
        400: {
          description: 'Validation error'
        }
      }
    }
  },

  '/api/auth/login': {
    post: {
      tags: ['Auth'],
      summary: 'Login user or super admin',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/LoginRequest'
            }
          }
        }
      },
      responses: {
        200: {
          description: 'Login successfully'
        },
        401: {
          description: 'Invalid email or password'
        }
      }
    }
  },

  '/api/auth/logout': {
    post: {
      tags: ['Auth'],
      summary: 'Logout user',
      responses: {
        200: {
          description: 'Logged out successfully'
        }
      }
    }
  }
};