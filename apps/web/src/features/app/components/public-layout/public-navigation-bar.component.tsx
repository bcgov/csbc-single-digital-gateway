import { SignIn } from "../../../auth/components/sign-in.component";
import { Container } from "../container.component";

export const PublicNavigationBar = () => {
  return (
    <Container>
      <div className="flex flex-row justify-between py-4 items-center">
        <div>
          <h1 className="text-xl font-extrabold">Single Digital Gateway</h1>
        </div>
        <div className="flex flex-row gap-2">
          <SignIn />
        </div>
      </div>
    </Container>
  );
};
