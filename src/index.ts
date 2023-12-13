import {
  $update,
  $query,
  Record,
  StableBTreeMap,
  Vec,
  match,
  Result,
  nat64,
  ic,
  Opt,
  Principal
} from "azle";
import { v4 as uuidv4 } from "uuid";

// Define the FuelPump type for storing fuel pump information
type FuelPump = Record<{
  id: string;
  pumpNumber: number;
  fuelType: string;
  fuelQuantity: number;
  status: string;
  transactions: Vec<Transaction>;
  createdAt: nat64;
  updatedAt: Opt<nat64>;
}>;

// Define the FuelPumpPayload type for creating or updating fuel pumps
type FuelPumpPayload = Record<{
  pumpNumber: number;
  fuelType: string;
  fuelQuantity: number;
}>;

// Define the Transaction type for recording fuel dispensing transactions
type Transaction = Record<{
  timestamp: nat64;
  quantityDispensed: number;
  user: Principal;
}>;

// Create StableBTreeMap to store fuel pumps
const fuelPumpStorage = new StableBTreeMap<string, FuelPump>(0, 44, 1024);

$update;
// Function to create a new fuel pump
export function createFuelPump(payload: FuelPumpPayload): Result<FuelPump, string> {
  // Payload Validation
  if (!payload.pumpNumber || !payload.fuelType || !payload.fuelQuantity) {
    return Result.Err<FuelPump, string>("Invalid payload");
  }

  // Input Validation
  if (payload.fuelQuantity <= 0) {
    throw new Error("Fuel quantity must be greater than zero.");
  }

  // Create a new fuel pump record
  const fuelPump: FuelPump = {
    id: uuidv4(),
    createdAt: ic.time(),
    updatedAt: Opt.None,
    status: "Active",
    transactions: [],
    pumpNumber: payload.pumpNumber,
    fuelType: payload.fuelType,
    fuelQuantity: payload.fuelQuantity,
  };

  
  try {
    fuelPumpStorage.insert(fuelPump.id, fuelPump);
    return Result.Ok<FuelPump, string>(fuelPump);
  } catch (error) {
    return Result.Err<FuelPump, string>("Failed to create fuel pump");
  }
}

$query;
// Function to get a fuel pump by ID
export function getFuelPump(id: string): Result<FuelPump, string> {
  // Parameter Validation
  if (typeof id !== 'string') {
    return Result.Err<FuelPump, string>('Invalid ID parameter.');
  }

  return match(fuelPumpStorage.get(id), {
    Some: (pump) => Result.Ok<FuelPump, string>(pump),
    None: () => Result.Err<FuelPump, string>(`Fuel Pump with ID=${id} not found.`),
  });
}

$query;
// Function to get all fuel pumps
export function getAllFuelPumps(): Result<Vec<FuelPump>, string> {
  try {
    // Return all fuel pumps
    return Result.Ok(fuelPumpStorage.values());
  } catch (error) {
    return Result.Err(`Error retrieving fuel pumps: ${error}`);
  }
}

$update;
// Function to update a fuel pump
export function updateFuelPump(id: string, payload: FuelPumpPayload): Result<FuelPump, string> {
  // Payload Validation
  if (!payload.pumpNumber || !payload.fuelType || !payload.fuelQuantity) {
    return Result.Err<FuelPump, string>("Invalid payload");
  }

  // Parameter Validation
  if (typeof id !== 'string') {
    return Result.Err<FuelPump, string>('Invalid ID parameter.');
  }

  return match(fuelPumpStorage.get(id), {
    Some: (existingPump) => {
      // Selective Update
      const updatedPump: FuelPump = {
        ...existingPump,
        ...payload,
        updatedAt: Opt.Some(ic.time()),
      };

      try {
        fuelPumpStorage.insert(updatedPump.id, updatedPump);
        return Result.Ok<FuelPump, string>(updatedPump);
      } catch (error) {
        return Result.Err<FuelPump, string>(`Failed to update Fuel Pump with ID=${id}. Error: ${error}`);
      }
    },
    None: () => Result.Err<FuelPump, string>(`Fuel Pump with ID=${id} not found.`),
  });
}

$update;
// Function to delete a fuel pump by ID
export function deleteFuelPump(id: string): Result<FuelPump, string> {
  // Parameter Validation
  if (typeof id !== 'string') {
    return Result.Err<FuelPump, string>('Invalid ID parameter.');
  }

  return match(fuelPumpStorage.get(id), {
    Some: (existingPump) => {
      // Remove the fuel pump from the storage
      fuelPumpStorage.remove(id);
      return Result.Ok<FuelPump, string>(existingPump);
    },
    None: () => Result.Err<FuelPump, string>(`Fuel Pump with ID=${id} not found.`),
  });
}

$update;
// Function to dispense fuel from a fuel pump
export function dispenseFuel(id: string, quantity: number): Result<FuelPump, string> {
  return match(fuelPumpStorage.get(id), {
    Some: (fuelPump) => {
      // Status Check
      if (fuelPump.status !== "Active") {
        return Result.Err<FuelPump, string>(`Fuel Pump with ID=${id} is not active.`);
      }

      // Quantity Check
      if (fuelPump.fuelQuantity < quantity) {
        return Result.Err<FuelPump, string>(`Insufficient fuel quantity in Pump ID=${id}.`);
      }

      // Update fuel quantity
      fuelPump.fuelQuantity -= quantity;

      // Add transaction record
      fuelPump.transactions.push({
        timestamp: ic.time(),
        quantityDispensed: quantity,
        user: ic.caller(),
      });

      try {
        fuelPumpStorage.insert(fuelPump.id, fuelPump);
        return Result.Ok<FuelPump, string>(fuelPump);
      } catch (error) {
        return Result.Err<FuelPump, string>(`Failed to update Fuel Pump with ID=${id}. Error: ${error}`);
      }
    },
    None: () => Result.Err<FuelPump, string>(`Fuel Pump with ID=${id} not found.`),
  });
}

$query;
// Function to get all transactions of a fuel pump
export function getFuelPumpTransactions(id: string): Result<Vec<Transaction>, string> {
  // Parameter Validation
  if (typeof id !== 'string') {
    return Result.Err<Vec<Transaction>, string>('Invalid ID parameter.');
  }

  return match(fuelPumpStorage.get(id), {
    Some: (fuelPump) => Result.Ok<Vec<Transaction>, string>(fuelPump.transactions),
    None: () => Result.Err<Vec<Transaction>, string>(`Fuel Pump with ID=${id} not found.`),
  });
}

$update;
// Function to set the status of a fuel pump
export function setFuelPumpStatus(id: string, status: string): Result<FuelPump, string> {
  // Parameter Validation
  if (typeof id !== 'string') {
    return Result.Err<FuelPump, string>('Invalid ID parameter.');
  }

  return match(fuelPumpStorage.get(id), {
    Some: (fuelPump) => {
      // Update status
      fuelPump.status = status;

      try {
        fuelPumpStorage.insert(id, fuelPump);
        return Result.Ok<FuelPump, string>(fuelPump);
      } catch (error) {
        return Result.Err<FuelPump, string>(`Failed to update Fuel Pump with ID=${id}. Error: ${error}`);
      }
    },
    None: () => Result.Err<FuelPump, string>(`Fuel Pump with ID=${id} not found.`),
  });
}

// Cryptographic utility for generating random values
globalThis.crypto = {
  //@ts-ignore
  getRandomValues: () => {
    let array = new Uint8Array(32);

    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }

    return array;
  },
};

