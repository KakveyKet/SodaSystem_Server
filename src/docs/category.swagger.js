export const categorySchemas = {
  CategoryRequest: {
    type: 'object',
    required: ['name'],
    properties: {
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

  Category: {
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

export const categoryPaths = {
  '/api/categories': {
    get: {
      tags: ['Categories'],
      summary: 'Get categories with pagination',
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
            example: 'slot'
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
          description: 'Categories fetched successfully'
        }
      }
    },

    post: {
      tags: ['Categories'],
      summary: 'Create category',
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
              $ref: '#/components/schemas/CategoryRequest'
            }
          }
        }
      },
      responses: {
        201: {
          description: 'Category created successfully'
        },
        400: {
          description: 'Validation error'
        }
      }
    }
  },

  '/api/categories/{id}': {
    get: {
      tags: ['Categories'],
      summary: 'Get category by ID',
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
          example: '6a531710edde8f5b833a54de'
        }
      ],
      responses: {
        200: {
          description: 'Category fetched successfully'
        },
        404: {
          description: 'Category not found'
        }
      }
    },

    put: {
      tags: ['Categories'],
      summary: 'Update category',
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
          example: '6a531710edde8f5b833a54de'
        }
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/CategoryRequest'
            }
          }
        }
      },
      responses: {
        200: {
          description: 'Category updated successfully'
        },
        404: {
          description: 'Category not found'
        }
      }
    },

    delete: {
      tags: ['Categories'],
      summary: 'Delete category',
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
          example: '6a531710edde8f5b833a54de'
        }
      ],
      responses: {
        200: {
          description: 'Category deleted successfully'
        },
        404: {
          description: 'Category not found'
        }
      }
    }
  }
};