export const gql = async <T = any>(
  query: string,
  variables?: Record<string, any>,
  headers?: Record<string, any>
): Promise<T> => {
  let requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // If auth headers provided, use those
  if (headers) {
    requestHeaders = {
      ...requestHeaders,
      ...headers,
      'x-hasura-admin-secret': process.env.HASURA_GRAPHQL_ADMIN_SECRET || '',
    };
  } else {
    // Fallback to admin secret only if no auth headers
    requestHeaders = {
      ...requestHeaders,
      'x-hasura-admin-secret': process.env.HASURA_GRAPHQL_ADMIN_SECRET || '',
    };
  }

  const response = await fetch(
    process.env.HASURA_GRAPHQL_URL || 'http://hasura:8080/v1/graphql',
    {
      method: 'POST',
      headers: requestHeaders,
      body: JSON.stringify({
        query,
        variables,
      }),
    }
  );
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  const { data, errors } = await response.json();
  if (errors) {
    throw new Error(errors.map((e: any) => e.message).join(', '));
  }
  return data;
};