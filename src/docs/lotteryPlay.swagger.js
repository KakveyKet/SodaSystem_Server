export const lotteryPlaySchemas = {
  LotteryPlayCreateRequest: {
    type: 'object',
    required: ['categoryId', 'productId', 'title'],
    properties: {
      categoryId: {
        type: 'string',
        example: '6a531710edde8f5b833a54de'
      },
      productId: {
        type: 'string',
        example: '66a123456789abcdef123456'
      },
      title: {
        type: 'string',
        example: 'Morning Lottery Play'
      },
      twoDigitNumber: {
        type: 'number',
        example: 12
      },
      threeDigitNumber: {
        type: 'number',
        example: 123
      },
      winTwoNumberType: {
        type: 'number',
        example: 1
      },
      winThreeNumberType: {
        type: 'number',
        example: 1
      },
      twoDigitAmount: {
        type: 'number',
        example: 10
      },
      threeDigitAmount: {
        type: 'number',
        example: 20
      },
      isTwoNumber: {
        type: 'boolean',
        example: true
      },
      isThreeNumber: {
        type: 'boolean',
        example: true
      },
      checkedStatus: {
        type: 'boolean',
        example: false,
        description: 'true = checked in invoice, false = unchecked'
      }
    }
  },

  LotteryPlayUpdateRequest: {
    type: 'object',
    properties: {
      categoryId: {
        type: 'string',
        example: '6a531710edde8f5b833a54de'
      },
      productId: {
        type: 'string',
        example: '66a123456789abcdef123456'
      },
      title: {
        type: 'string',
        example: 'Morning Lottery Play Updated'
      },
      twoDigitNumber: {
        type: 'number',
        example: 45
      },
      threeDigitNumber: {
        type: 'number',
        example: 456
      },
      winTwoNumberType: {
        type: 'number',
        example: 1
      },
      winThreeNumberType: {
        type: 'number',
        example: 1
      },
      twoDigitAmount: {
        type: 'number',
        example: 15
      },
      threeDigitAmount: {
        type: 'number',
        example: 25
      },
      isTwoNumber: {
        type: 'boolean',
        example: true
      },
      isThreeNumber: {
        type: 'boolean',
        example: true
      },
      checkedStatus: {
        type: 'boolean',
        example: false
      }
    }
  },

  LotteryPlayCheckedStatusRequest: {
    type: 'object',
    required: ['checkedStatus'],
    properties: {
      checkedStatus: {
        type: 'boolean',
        example: true,
        description: 'true = checked, false = unchecked'
      }
    }
  },

  LotteryPlay: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        example: '66c123456789abcdef123456'
      },
      categoryId: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            example: '6a531710edde8f5b833a54de'
          },
          name: {
            type: 'string',
            example: 'Slot Games'
          },
          description: {
            type: 'string',
            example: 'Category for lottery products'
          },
          status: {
            type: 'boolean',
            example: true
          }
        }
      },
      productId: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            example: '66a123456789abcdef123456'
          },
          name: {
            type: 'string',
            example: 'Product A'
          },
          winMultiplier: {
            type: 'number',
            example: 2
          },
          description: {
            type: 'string',
            example: 'Product description'
          },
          status: {
            type: 'boolean',
            example: true
          }
        }
      },
      title: {
        type: 'string',
        example: 'Morning Lottery Play'
      },
      twoDigitNumber: {
        type: 'number',
        nullable: true,
        example: 12
      },
      threeDigitNumber: {
        type: 'number',
        nullable: true,
        example: 123
      },
      winTwoNumberType: {
        type: 'number',
        example: 1
      },
      winThreeNumberType: {
        type: 'number',
        example: 1
      },
      twoDigitAmount: {
        type: 'number',
        example: 10
      },
      threeDigitAmount: {
        type: 'number',
        example: 20
      },
      isTwoNumber: {
        type: 'boolean',
        example: true
      },
      isThreeNumber: {
        type: 'boolean',
        example: true
      },
      totalAmount: {
        type: 'number',
        example: 30
      },
      checkedStatus: {
        type: 'boolean',
        example: false
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

export const lotteryPlayPaths = {
  '/api/lottery-plays': {
    get: {
      tags: ['Lottery Plays'],
      summary: 'Get lottery plays with pagination',
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
            example: 'Morning'
          }
        },
        {
          name: 'categoryId',
          in: 'query',
          schema: {
            type: 'string',
            example: '6a531710edde8f5b833a54de'
          }
        },
        {
          name: 'productId',
          in: 'query',
          schema: {
            type: 'string',
            example: '66a123456789abcdef123456'
          }
        },
        {
          name: 'checkedStatus',
          in: 'query',
          schema: {
            type: 'boolean',
            example: false
          }
        },
        {
          name: 'isTwoNumber',
          in: 'query',
          schema: {
            type: 'boolean',
            example: true
          }
        },
        {
          name: 'isThreeNumber',
          in: 'query',
          schema: {
            type: 'boolean',
            example: true
          }
        }
      ],
      responses: {
        200: {
          description: 'Lottery plays fetched successfully',
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
                    example: 'Lottery plays fetched successfully'
                  },
                  data: {
                    type: 'array',
                    items: {
                      $ref: '#/components/schemas/LotteryPlay'
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
          description: 'Invalid query ID'
        },
        401: {
          description: 'Unauthorized'
        }
      }
    },

    post: {
      tags: ['Lottery Plays'],
      summary: 'Create lottery play',
      description:
        'Create lottery play. totalAmount is calculated from twoDigitAmount + threeDigitAmount.',
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
              $ref: '#/components/schemas/LotteryPlayCreateRequest'
            }
          }
        }
      },
      responses: {
        201: {
          description: 'Lottery play created successfully',
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
                    example: 'Lottery play created successfully'
                  },
                  data: {
                    $ref: '#/components/schemas/LotteryPlay'
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

  '/api/lottery-plays/{id}': {
    get: {
      tags: ['Lottery Plays'],
      summary: 'Get lottery play by ID',
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
          description: 'Lottery play fetched successfully',
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
                    example: 'Lottery play fetched successfully'
                  },
                  data: {
                    $ref: '#/components/schemas/LotteryPlay'
                  }
                }
              }
            }
          }
        },
        400: {
          description: 'Invalid lottery play ID'
        },
        401: {
          description: 'Unauthorized'
        },
        404: {
          description: 'Lottery play not found'
        }
      }
    },

    put: {
      tags: ['Lottery Plays'],
      summary: 'Update lottery play',
      description:
        'Update lottery play. totalAmount is recalculated from twoDigitAmount + threeDigitAmount.',
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
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/LotteryPlayUpdateRequest'
            }
          }
        }
      },
      responses: {
        200: {
          description: 'Lottery play updated successfully',
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
                    example: 'Lottery play updated successfully'
                  },
                  data: {
                    $ref: '#/components/schemas/LotteryPlay'
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
          description: 'Lottery play not found'
        }
      }
    },

    delete: {
      tags: ['Lottery Plays'],
      summary: 'Delete lottery play',
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
          description: 'Lottery play deleted successfully'
        },
        400: {
          description: 'Invalid lottery play ID'
        },
        401: {
          description: 'Unauthorized'
        },
        404: {
          description: 'Lottery play not found'
        }
      }
    }
  },

  '/api/lottery-plays/{id}/checked-status': {
    patch: {
      tags: ['Lottery Plays'],
      summary: 'Update lottery play checked status',
      description:
        'Remark checked or unchecked in invoice. true = checked, false = unchecked.',
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
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/LotteryPlayCheckedStatusRequest'
            }
          }
        }
      },
      responses: {
        200: {
          description: 'Lottery play checked status updated successfully',
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
                    example: 'Lottery play checked status updated successfully'
                  },
                  data: {
                    $ref: '#/components/schemas/LotteryPlay'
                  }
                }
              }
            }
          }
        },
        400: {
          description: 'Invalid lottery play ID or checkedStatus is not boolean'
        },
        401: {
          description: 'Unauthorized'
        },
        404: {
          description: 'Lottery play not found'
        }
      }
    }
  }
};