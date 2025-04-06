export const getUsers = `
  query GetUsers {
    events {
      created_at
      id
    }
    subscriptions {
      created_at
    }
  }
`;