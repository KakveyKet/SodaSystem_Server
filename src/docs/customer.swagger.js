export const customerSchemas = {
  CustomerCreateRequest: {
    type: 'object',
    required: ['branchId', 'username'],
    properties: {
      branchId: {
        type: 'string',
        example: 'BR001'
      },
      username: {
        type: 'string',
        example: 'Customer A'
      },
      phoneNumber: {
        type: 'string',
        example: '012345678'
      },
      address: {
        type: 'string',
        example: 'Phnom Penh'
      },
      description: {
        type: 'string',
        example: 'Customer description'
      },
      percentages: {
        type: 'array',
        items: {
          type: 'object'
        },
        example: [
          {
            productId: '66a123456789abcdef123456',
            percentage: 10
          },
          {
            productId: '66b123456789abcdef123456',
            percentage: 15
          }
        ]
      },
      status: {
        type: 'boolean',
        example: true
      }
    }
  },

  CustomerUpdateRequest: {
    type: 'object',
    properties: {
      branchId: {
        type: 'string',
        example: 'BR001'
      },
      username: {
        type: 'string',
        example: 'Customer A Updated'
      },
      phoneNumber: {
        type: 'string',
        example: '098765432'
      },
      address: {
        type: 'string',
        example: 'Siem Reap'
      },
      description: {
        type: 'string',
        example: 'Updated customer description'
      },
      percentages: {
        type: 'array',
        items: {
          type: 'object'
        },
        example: [
          {
            productId: '66a123456789abcdef123456',
            percentage: 20
          }
        ]
      },
      status: {
        type: 'boolean',
        example: false
      }
    }
  },

  Customer: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        example: '66a123456789abcdef123456'
      },
      branchId: {
        type: 'string',
        example: 'BR001'
      },
      username: {
        type: 'string',
        example: 'Customer A'
      },
      phoneNumber: {
        type: 'string',
        example: '012345678'
      },
      address: {
        type: 'string',
        example: 'Phnom Penh'
      },
      description: {
        type: 'string',
        example: 'Customer description'
      },
      percentages: {
        type: 'array',
        items: {
          type: 'object'
        },
        example: [
          {
            productId: '66a123456789abcdef123456',
            percentage: 10
          }
        ]
      },
      balance: {
        type: 'number',
        example: 100
      },
      status: {
        type: 'boolean',
        example: true
      },
      createdBy: {
        type: 'string',
        example: 'Super Admin'
      },
      updatedBy: {
        type: 'string',
        example: 'Super Admin'
      },
      createdAt: {
        type: 'string',
        format: 'date-time'
      },
      updatedAt: {
        type: 'string',
        format: 'date-time'
      }
    }
  },

  DepositRequest: {
    type: 'object',
    required: ['amount'],
    properties: {
      amount: {
        type: 'number',
        example: 100
      },
      note: {
        type: 'string',
        example: 'First deposit'
      }
    }
  },

  CustomerTransaction: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        example: '66a123456789abcdef123456'
      },
      customerId: {
        type: 'string',
        example: '66b123456789abcdef123456'
      },
      type: {
        type: 'string',
        enum: ['deposit', 'withdraw'],
        example: 'deposit'
      },
      amount: {
        type: 'number',
        example: 100
      },
      beforeBalance: {
        type: 'number',
        example: 0
      },
      afterBalance: {
        type: 'number',
        example: 100
      },
      note: {
        type: 'string',
        example: 'First deposit'
      },
      createdBy: {
        type: 'string',
        example: 'Super Admin'
      },
      createdAt: {
        type: 'string',
        format: 'date-time'
      },
      updatedAt: {
        type: 'string',
        format: 'date-time'
      }
    }
  }
};

export const customerPaths = {
  '/api/customers': {
    get: {
      tags: ['Customers'],
      summary: 'Get customers with pagination',
      security: [
        {
          bearerAuth: []
        }
      ],
      parameters: [
        {
          name: 'page',
          in: 'query',
          schema: {
            type: 'integer',
            example: 1
          }
        },
        {
          name: 'limit',
          in: 'query',
          schema: {
            type: 'integer',
            example: 10
          }
        },
        {
          name: 'search',
          in: 'query',
          schema: {
            type: 'string',
            example: 'customer'
          }
        },
        {
          name: 'branchId',
          in: 'query',
          schema: {
            type: 'string',
            example: 'BR001'
          }
        },
        {
          name: 'status',
          in: 'query',
          schema: {
            type: 'boolean',
            example: true
          }
        }
      ],
      responses: {
        200: {
          description: 'Customers fetched successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: {
                    type: 'boolean',
                    example: true
                  },
                  message: {
                    type: 'string',
                    example: 'Customers fetched successfully'
                  },
                  data: {
                    type: 'array',
                    items: {
                      $ref: '#/components/schemas/Customer'
                    }
                  },
                  pagination: {
                    type: 'object',
                    properties: {
                      total: {
                        type: 'integer',
                        example: 1
                      },
                      page: {
                        type: 'integer',
                        example: 1
                      },
                      limit: {
                        type: 'integer',
                        example: 10
                      },
                      totalPages: {
                        type: 'integer',
                        example: 1
                      },
                      hasNextPage: {
                        type: 'boolean',
                        example: false
                      },
                      hasPreviousPage: {
                        type: 'boolean',
                        example: false
                      }
                    }
                  }
                }
              }
            }
          }
        },
        401: {
          description: 'Unauthorized'
        }
      }
    },

    post: {
      tags: ['Customers'],
      summary: 'Create customer',
      security: [
        {
          bearerAuth: []
        }
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/CustomerCreateRequest'
            }
          }
        }
      },
      responses: {
        201: {
          description: 'Customer created successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: {
                    type: 'boolean',
                    example: true
                  },
                  message: {
                    type: 'string',
                    example: 'Customer created successfully'
                  },
                  data: {
                    $ref: '#/components/schemas/Customer'
                  }
                }
              }
            }
          }
        },
        400: {
          description: 'Validation error'
        },
        401: {
          description: 'Unauthorized'
        }
      }
    }
  },

  '/api/customers/{id}': {
    get: {
      tags: ['Customers'],
      summary: 'Get customer by ID',
      security: [
        {
          bearerAuth: []
        }
      ],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: {
            type: 'string'
          },
          example: '66a123456789abcdef123456'
        }
      ],
      responses: {
        200: {
          description: 'Customer fetched successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: {
                    type: 'boolean',
                    example: true
                  },
                  message: {
                    type: 'string',
                    example: 'Customer fetched successfully'
                  },
                  data: {
                    $ref: '#/components/schemas/Customer'
                  }
                }
              }
            }
          }
        },
        400: {
          description: 'Invalid customer ID'
        },
        401: {
          description: 'Unauthorized'
        },
        404: {
          description: 'Customer not found'
        }
      }
    },

    put: {
      tags: ['Customers'],
      summary: 'Update customer',
      security: [
        {
          bearerAuth: []
        }
      ],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: {
            type: 'string'
          },
          example: '66a123456789abcdef123456'
        }
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/CustomerUpdateRequest'
            }
          }
        }
      },
      responses: {
        200: {
          description: 'Customer updated successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: {
                    type: 'boolean',
                    example: true
                  },
                  message: {
                    type: 'string',
                    example: 'Customer updated successfully'
                  },
                  data: {
                    $ref: '#/components/schemas/Customer'
                  }
                }
              }
            }
          }
        },
        400: {
          description: 'Validation error'
        },
        401: {
          description: 'Unauthorized'
        },
        404: {
          description: 'Customer not found'
        }
      }
    },

    delete: {
      tags: ['Customers'],
      summary: 'Delete customer',
      security: [
        {
          bearerAuth: []
        }
      ],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: {
            type: 'string'
          },
          example: '66a123456789abcdef123456'
        }
      ],
      responses: {
        200: {
          description: 'Customer deleted successfully'
        },
        400: {
          description: 'Invalid customer ID'
        },
        401: {
          description: 'Unauthorized'
        },
        404: {
          description: 'Customer not found'
        }
      }
    }
  },

  '/api/customers/{id}/deposit': {
    post: {
      tags: ['Customers'],
      summary: 'Deposit money to customer balance',
      security: [
        {
          bearerAuth: []
        }
      ],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: {
            type: 'string'
          },
          example: '66a123456789abcdef123456'
        }
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/DepositRequest'
            }
          }
        }
      },
      responses: {
        200: {
          description: 'Deposit completed successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: {
                    type: 'boolean',
                    example: true
                  },
                  message: {
                    type: 'string',
                    example: 'Deposit completed successfully'
                  },
                  data: {
                    type: 'object',
                    properties: {
                      customer: {
                        $ref: '#/components/schemas/Customer'
                      },
                      transaction: {
                        $ref: '#/components/schemas/CustomerTransaction'
                      }
                    }
                  }
                }
              }
            }
          }
        },
        400: {
          description: 'Invalid customer ID or amount'
        },
        401: {
          description: 'Unauthorized'
        },
        404: {
          description: 'Customer not found'
        }
      }
    }
  },

  '/api/customers/{id}/transactions': {
    get: {
      tags: ['Customers'],
      summary: 'Get customer transaction history',
      security: [
        {
          bearerAuth: []
        }
      ],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: {
            type: 'string'
          },
          example: '66a123456789abcdef123456'
        },
        {
          name: 'page',
          in: 'query',
          schema: {
            type: 'integer',
            example: 1
          }
        },
        {
          name: 'limit',
          in: 'query',
          schema: {
            type: 'integer',
            example: 10
          }
        },
        {
          name: 'type',
          in: 'query',
          schema: {
            type: 'string',
            enum: ['deposit', 'withdraw'],
            example: 'deposit'
          }
        }
      ],
      responses: {
        200: {
          description: 'Customer transactions fetched successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: {
                    type: 'boolean',
                    example: true
                  },
                  message: {
                    type: 'string',
                    example: 'Customer transactions fetched successfully'
                  },
                  data: {
                    type: 'array',
                    items: {
                      $ref: '#/components/schemas/CustomerTransaction'
                    }
                  },
                  pagination: {
                    type: 'object',
                    properties: {
                      total: {
                        type: 'integer',
                        example: 1
                      },
                      page: {
                        type: 'integer',
                        example: 1
                      },
                      limit: {
                        type: 'integer',
                        example: 10
                      },
                      totalPages: {
                        type: 'integer',
                        example: 1
                      },
                      hasNextPage: {
                        type: 'boolean',
                        example: false
                      },
                      hasPreviousPage: {
                        type: 'boolean',
                        example: false
                      }
                    }
                  }
                }
              }
            }
          }
        },
        400: {
          description: 'Invalid customer ID'
        },
        401: {
          description: 'Unauthorized'
        },
        404: {
          description: 'Customer not found'
        }
      }
    }
  }
};