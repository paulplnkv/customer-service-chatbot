// Serializable customer summary passed from the server page into the client
// mobile app shell. Mirrors the shape returned by getFullCustomerData.

export type AppVehicle = {
  plate: string;
  vin: string;
  year: number;
  make: string;
  model: string;
  value: string | null;
  seats: number | null;
  use: string | null;
};

export type AppClaim = {
  claimNumber: string;
  status: string;
  type: string;
  description: string | null;
  amount: string | null;
  dateOfIncident: string;
  dateFiled: string;
  dateResolved: string | null;
  paymentDate: string | null;
  paymentStatus: string | null;
};

export type AppPolicy = {
  policyNumber: string;
  type: string;
  status: string;
  startDate: string;
  endDate: string;
  premium: string;
  deductible: string;
  vehicles: AppVehicle[];
  claims: AppClaim[];
};

export type AppCustomerData = {
  customer: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
    address: string | null;
  };
  policies: AppPolicy[];
};
