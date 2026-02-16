import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
} from "amazon-cognito-identity-js";

export class CognitoAuthError extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message);
    this.name = "CognitoAuthError";
  }
}

let userPool: CognitoUserPool | null = null;

function getUserPool(): CognitoUserPool {
  if (userPool) return userPool;

  const userPoolId = process.env.COGNITO_USER_POOL_ID;
  const clientId = process.env.COGNITO_CLIENT_ID;

  if (!userPoolId || !clientId) {
    throw new CognitoAuthError(
      "Cognito is not configured. Set COGNITO_USER_POOL_ID and COGNITO_CLIENT_ID.",
      "CONFIGURATION_ERROR"
    );
  }

  userPool = new CognitoUserPool({
    UserPoolId: userPoolId,
    ClientId: clientId,
  });

  return userPool;
}

interface CognitoAuthResult {
  sub: string;
  email: string;
  name: string;
  role: string;
}

export async function authenticateWithCognito(
  email: string,
  password: string
): Promise<CognitoAuthResult> {
  const pool = getUserPool();

  const cognitoUser = new CognitoUser({
    Username: email,
    Pool: pool,
  });

  const authDetails = new AuthenticationDetails({
    Username: email,
    Password: password,
  });

  return new Promise((resolve, reject) => {
    cognitoUser.authenticateUser(authDetails, {
      onSuccess(session) {
        const idToken = session.getIdToken();
        const payload = idToken.decodePayload();

        resolve({
          sub: payload["sub"] as string,
          email: (payload["email"] as string) || email,
          name: (payload["name"] as string) || email,
          role: (payload["custom:role"] as string) || "VIEWER",
        });
      },
      onFailure(err: Error & { code?: string }) {
        const code = err.code || "UNKNOWN_ERROR";
        const messages: Record<string, string> = {
          NotAuthorizedException: "Invalid email or password",
          UserNotFoundException: "No account found with this email",
          UserNotConfirmedException: "Account not confirmed. Check your email.",
          PasswordResetRequiredException: "Password reset required. Contact your admin.",
          TooManyRequestsException: "Too many attempts. Please try again later.",
        };

        reject(
          new CognitoAuthError(
            messages[code] || `Authentication failed: ${err.message}`,
            code
          )
        );
      },
      newPasswordRequired() {
        reject(
          new CognitoAuthError(
            "Password change required. Contact your admin to set a permanent password.",
            "NEW_PASSWORD_REQUIRED"
          )
        );
      },
    });
  });
}
