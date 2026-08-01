export const userPaths = {
  '/api/users/me': {
    get: {
      tags: ['Users'],
      summary: 'Get current logged-in user',
      security: [
        {
          bearerAuth: []
        }
      ],
      responses: {
        200: {
          description: 'Current user fetched successfully'
        },
        401: {
          description: 'Unauthorized'
        }
      }
    }
  }
};