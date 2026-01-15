import { Button } from "@repo/ui";
import { useAuth } from "react-oidc-context";

export const SignIn = () => {
  const auth = useAuth();

  return (
    <Button
      onClick={() => auth.signinRedirect()}
      className="bg-green-500 hover:bg-green-700"
    >
      Sign In
    </Button>
  );
};
