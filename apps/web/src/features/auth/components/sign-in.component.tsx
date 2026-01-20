import { Button } from "@repo/ui";
import { IconLogin2 } from "@tabler/icons-react";
import { useAuth } from "react-oidc-context";

export const SignIn = () => {
  const auth = useAuth();

  return (
    <Button
      onClick={() => auth.signinRedirect()}
      className="bg-bcgov-blue hover:bg-bcgov-blue/80"
    >
      <IconLogin2 />
      Sign In
    </Button>
  );
};
