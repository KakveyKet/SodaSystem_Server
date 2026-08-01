export const productSchemas = {
  ProductCreateRequest: {
    type: 'object',
    required: ['categoryId', 'name', 'winMultiplier'],
    properties: {
      categoryId: {
        type: 'string',
        example: '6a531710edde8f5b833a54de'
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

  ProductUpdateRequest: {
    type: 'object',
    properties: {
      categoryId: {
        type: 'string',
        example: '6a531710edde8f5b833a54de'
      },
      name: {
        type: 'string',
        example: 'Product A Updated'
      },
      winMultiplier: {
        type: 'number',
        example: 3
      },
      description: {
        type: 'string',
        example: 'Updated product description'
      },
      status: {
        type: 'boolean',
        example: false
      }
    }
  },

  Product: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        example: '66a123456789abcdef123456'
      },
      category: {
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
            example: 'Category for slot game products'
          },
          status: {
            type: 'boolean',
            example: true
          }
        }
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

export const productPaths = {
  '/api/products': {
    get: {
      tags: ['Products'],
      summary: 'Get products with pagination',
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
            example: 'product'
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
          description: 'Products fetched successfully',
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
                    example: 'Products fetched successfully'
                  },
                  data: {
                    type: 'array',
                    items: {
                      $ref: '#/components/schemas/Product'
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
      tags: ['Products'],
      summary: 'Create product',
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
              $ref: '#/components/schemas/ProductCreateRequest'
            }
          }
        }
      },
      responses: {
        201: {
          description: 'Product created successfully',
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
                    example: 'Product created successfully'
                  },
                  data: {
                    $ref: '#/components/schemas/Product'
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

  '/api/products/{id}': {
    get: {
      tags: ['Products'],
      summary: 'Get product by ID',
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
          description: 'Product fetched successfully',
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
                    example: 'Product fetched successfully'
                  },
                  data: {
                    $ref: '#/components/schemas/Product'
                  }
                }
              }
            }
          }
        },
        400: {
          description: 'Invalid product ID'
        },
        401: {
          description: 'Unauthorized'
        },
        404: {
          description: 'Product not found'
        }
      }
    },

    put: {
      tags: ['Products'],
      summary: 'Update product',
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
              $ref: '#/components/schemas/ProductUpdateRequest'
            }
          }
        }
      },
      responses: {
        200: {
          description: 'Product updated successfully',
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
                    example: 'Product updated successfully'
                  },
                  data: {
                    $ref: '#/components/schemas/Product'
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
          description: 'Product not found'
        }
      }
    },

    delete: {
      tags: ['Products'],
      summary: 'Delete product',
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
          description: 'Product deleted successfully'
        },
        400: {
          description: 'Invalid product ID'
        },
        401: {
          description: 'Unauthorized'
        },
        404: {
          description: 'Product not found'
        }
      }
    }
  }
};