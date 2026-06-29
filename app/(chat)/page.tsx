export const dynamic = "force-dynamic";

import { resolveSessionFromHeaders } from "@/lib/session";
import { getFullCustomerData } from "@/lib/db/pas";
import { CustomerApp } from "@/components/app/customer-app";

export default async function HomePage() {
  const identity = await resolveSessionFromHeaders();
  const isAuthenticated = !!identity.userId;
  const data = isAuthenticated
    ? await getFullCustomerData(identity.userId!)
    : null;
  const firstName = data?.customer.firstName ?? null;

  return (
    <CustomerApp
      data={data}
      firstName={firstName}
      isAuthenticated={isAuthenticated}
    />
  );
}
