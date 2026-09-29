import { AuthLanding } from "./components/auth-landing";

type HomeProps = {
  searchParams: Promise<{ denied?: string }>;
};

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  return <AuthLanding deniedReason={params.denied} />;
}
