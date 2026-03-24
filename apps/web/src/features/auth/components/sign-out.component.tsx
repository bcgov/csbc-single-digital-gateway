import { Button } from "@repo/ui";
import { IconLogout } from "@tabler/icons-react";
import { useBcscAuth } from "../auth.context";

export const SignOut = () => {
  const auth = useBcscAuth();

  return (
    <Button
      onClick={() => auth.logout()}
      className="bg-danger hover:bg-danger/80"
    >
      <IconLogout />
      Sign Out
    </Button>
  );
};
