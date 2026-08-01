export const lotteryChiefBalanceSchemas = {
  LotteryChiefBalanceAddWinRequest: {
    type: 'object',
    required: ['branchId', 'amount'],
    properties: {
      branchId: {
        type: 'string',
        example: 'BR001'
      },
      invoiceIds: {
        type: 'array',
        items: {
          type: 'string'
        },
        example: ['INV001', 'INV002']
      },
      amount: {
        type: 'number',
        example: 500
      }
    }
  },

  LotteryChiefBalanceStatusRequest: {
    type: 'object',
    required: ['status'],
    properties: {
      status: {
        type: 'boolean',
        example: true
      }
    }
  },

  LotteryChiefBalance: {
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
      lastChiefExpenseId: {
        type: 'string',
        nullable: true,
        example: '66b123456789abcdef123456'
      },
      invoiceIds: {
        type: 'array',
        items: {
          type: 'string'
        },
        example: ['INV001', 'INV002']
      },
      amount: {
        type: 'number',
        example: 500
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
  }
};

export const lotteryChiefBalancePaths = {
  '/api/lottery-chief-balances': {
    get: {
      tags: ['Lottery Chief Balances'],
      summary: 'Get lottery chief balances with pagination',
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
          description: 'Lottery chief balances fetched successfully',
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
                    example: 'Lottery chief balances fetched successfully'
                  },
                  data: {
                    type: 'array',
                    items: {
                      $ref: '#/components/schemas/LotteryChiefBalance'
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
    }
  },

  '/api/lottery-chief-balances/add-win': {
    post: {
      tags: ['Lottery Chief Balances'],
      summary: 'Add lottery chief win amount',
      description:
        'This API inserts amount only when lottery chief wins. It increases lotteryChiefBalance.amount by branchId.',
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
              $ref: '#/components/schemas/LotteryChiefBalanceAddWinRequest'
            }
          }
        }
      },
      responses: {
        200: {
          description: 'Lottery chief win amount added successfully',
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
                    example: 'Lottery chief win amount added successfully'
                  },
                  data: {
                    $ref: '#/components/schemas/LotteryChiefBalance'
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

  '/api/lottery-chief-balances/{id}': {
    get: {
      tags: ['Lottery Chief Balances'],
      summary: 'Get lottery chief balance by ID',
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
          description: 'Lottery chief balance fetched successfully',
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
                    example: 'Lottery chief balance fetched successfully'
                  },
                  data: {
                    $ref: '#/components/schemas/LotteryChiefBalance'
                  }
                }
              }
            }
          }
        },
        400: {
          description: 'Invalid lottery chief balance ID'
        },
        401: {
          description: 'Unauthorized'
        },
        404: {
          description: 'Lottery chief balance not found'
        }
      }
    }
  },

  '/api/lottery-chief-balances/{id}/status': {
    patch: {
      tags: ['Lottery Chief Balances'],
      summary: 'Update lottery chief balance status',
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
              $ref: '#/components/schemas/LotteryChiefBalanceStatusRequest'
            }
          }
        }
      },
      responses: {
        200: {
          description: 'Lottery chief balance status updated successfully',
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
                    example: 'Lottery chief balance status updated successfully'
                  },
                  data: {
                    $ref: '#/components/schemas/LotteryChiefBalance'
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
          description: 'Lottery chief balance not found'
        }
      }
    }
  }
};