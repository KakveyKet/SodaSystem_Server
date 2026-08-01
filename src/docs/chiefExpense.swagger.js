export const chiefExpenseSchemas = {
  ChiefExpenseCreateRequest: {
    type: 'object',
    required: ['branchId', 'customerId', 'amount'],
    properties: {
      branchId: {
        type: 'string',
        example: 'BR001'
      },
      customerId: {
        type: 'string',
        example: '66a123456789abcdef123456'
      },
      paymentDate: {
        type: 'string',
        format: 'date',
        example: '2026-07-15'
      },
      amount: {
        type: 'number',
        example: 100
      },
      description: {
        type: 'string',
        example: 'Pay customer back from lottery chief balance'
      }
    }
  },

  ChiefExpense: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        example: '66c123456789abcdef123456'
      },
      branchId: {
        type: 'string',
        example: 'BR001'
      },
      customerId: {
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
          balance: {
            type: 'number',
            example: 100
          },
          status: {
            type: 'boolean',
            example: true
          }
        }
      },
      paymentDate: {
        type: 'string',
        format: 'date-time'
      },
      amount: {
        type: 'number',
        example: 100
      },
      description: {
        type: 'string',
        example: 'Pay customer back from lottery chief balance'
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

export const chiefExpensePaths = {
  '/api/chief-expenses': {
    get: {
      tags: ['Chief Expenses'],
      summary: 'Get chief expenses with pagination',
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
          name: 'branchId',
          in: 'query',
          schema: {
            type: 'string',
            example: 'BR001'
          }
        },
        {
          name: 'customerId',
          in: 'query',
          schema: {
            type: 'string',
            example: '66a123456789abcdef123456'
          }
        },
        {
          name: 'search',
          in: 'query',
          schema: {
            type: 'string',
            example: 'Pay customer'
          }
        }
      ],
      responses: {
        200: {
          description: 'Chief expenses fetched successfully',
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
                    example: 'Chief expenses fetched successfully'
                  },
                  data: {
                    type: 'array',
                    items: {
                      $ref: '#/components/schemas/ChiefExpense'
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
        }
      }
    },

    post: {
      tags: ['Chief Expenses'],
      summary: 'Create chief expense',
      description:
        'This API records payment from lottery chief back to customer and deducts the amount from lotteryChiefBalance.amount.',
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
              $ref: '#/components/schemas/ChiefExpenseCreateRequest'
            }
          }
        }
      },
      responses: {
        201: {
          description:
            'Chief expense created successfully and lottery chief balance deducted',
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
                    example:
                      'Chief expense created successfully and lottery chief balance deducted'
                  },
                  data: {
                    type: 'object',
                    properties: {
                      expense: {
                        $ref: '#/components/schemas/ChiefExpense'
                      },
                      lotteryChiefBalance: {
                        $ref: '#/components/schemas/LotteryChiefBalance'
                      }
                    }
                  }
                }
              }
            }
          }
        },
        400: {
          description:
            'Validation error or lottery chief balance is not enough'
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

  '/api/chief-expenses/{id}': {
    get: {
      tags: ['Chief Expenses'],
      summary: 'Get chief expense by ID',
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
          example: '66c123456789abcdef123456'
        }
      ],
      responses: {
        200: {
          description: 'Chief expense fetched successfully',
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
                    example: 'Chief expense fetched successfully'
                  },
                  data: {
                    $ref: '#/components/schemas/ChiefExpense'
                  }
                }
              }
            }
          }
        },
        400: {
          description: 'Invalid chief expense ID'
        },
        401: {
          description: 'Unauthorized'
        },
        404: {
          description: 'Chief expense not found'
        }
      }
    }
  }
};