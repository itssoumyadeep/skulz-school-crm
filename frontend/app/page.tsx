import { SignInScreen } from "./components/sign-in-screen";

type HomeProps = {
  searchParams: Promise<{ denied?: string }>;
};

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  return <SignInScreen deniedReason={params.denied} />;
}
