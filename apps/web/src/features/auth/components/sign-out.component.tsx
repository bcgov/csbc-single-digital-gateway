import { Button } from "@repo/ui";
import { useAuth } from "react-oidc-context";

export const SignOut = () => {
  const auth = useAuth();

  return (
    <Button
      onClick={() => auth.signoutRedirect()}
      className="bg-red-500 hover:bg-red-700"
    >
      Sign Out
    </Button>
  );
};
