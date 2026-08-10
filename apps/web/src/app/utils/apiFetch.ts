const API_URL = 'http://localhost:5000/api/v1';

type UserType = 'candidate' | 'employer'| 'login' ;

// Detect logged-in ecosystem user
function getActiveUserType(): UserType {
  const employerToken = localStorage.getItem('employer_token');

  const candidateToken = localStorage.getItem('candidate_token');

  if (employerToken) {
    return 'employer';
  }

  if (candidateToken) {
    return 'candidate';
  }

  return 'login';
}

export async function apiFetch(endpoint: string, options: any = {}) {
  const userType = getActiveUserType();

  const tokenKey = `${userType}_token`;

  const refreshTokenKey = `${userType}_refresh_token`;

  let token = localStorage.getItem(tokenKey);

  const isFormData = options.body instanceof FormData;

  const buildHeaders = (accessToken?: string) => {
    return {
      ...options.headers,

      ...(accessToken
        ? {
            Authorization: `Bearer ${accessToken}`,
          }
        : {}),

      ...(isFormData
        ? {}
        : {
            'Content-Type': 'application/json',
          }),
    };
  };

  let response = await fetch(
    `${API_URL}${endpoint}`,

    {
      ...options,

      headers: buildHeaders(token || undefined),
    },
  );

  // Access token expired
  if (response.status === 401) {
    console.log('Token expired. Refreshing...');

    const refreshToken = localStorage.getItem(refreshTokenKey);

    if (!refreshToken) {
      logout(userType);

      return response;
    }

    const refreshResponse = await fetch(
      `${API_URL}/auth/refresh-token`,

      {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json',
        },

        body: JSON.stringify({
          refreshToken,
        }),
      },
    );

    if (!refreshResponse.ok) {
      logout(userType);

      return response;
    }

    const refreshData = await refreshResponse.json();

    const newAccessToken = refreshData.data.accessToken;

    const newRefreshToken = refreshData.data.refreshToken;

    localStorage.setItem(
      tokenKey,

      newAccessToken,
    );

    localStorage.setItem(
      refreshTokenKey,

      newRefreshToken,
    );

    // Retry original API call

    response = await fetch(
      `${API_URL}${endpoint}`,

      {
        ...options,

        headers: {
          ...options.headers,

          Authorization: `Bearer ${newAccessToken}`,

          ...(isFormData
            ? {}
            : {
                'Content-Type': 'application/json',
              }),
        },
      },
    );
  }

  return response;
}

function logout(userType: UserType) {
  if (userType === 'employer') {
    localStorage.removeItem('employer_token');

    localStorage.removeItem('employer_refresh_token');

    window.location.href = '/employer-login';
  } else {
    localStorage.removeItem('candidate_token');

    localStorage.removeItem('candidate_refresh_token');

    window.location.href = '/candidate-login';
  }
}
