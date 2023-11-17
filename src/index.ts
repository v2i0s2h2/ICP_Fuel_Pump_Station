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
  Principal,
} from "azle";
import { v4 as uuidv4 } from "uuid";


type FuelPump = Record<{
  id: string;
  pumpNumber: number;
  fuelType: string;  // (FuelType = "Regular" | "Premium" | "Diesel")
  fuelQuantity: number;
  status: string; // (status = 'active'| 'maintainence'| 'out of service')
  transactions: Vec<Transaction>;
  createdAt: nat64;
  updatedAt: Opt<nat64>;
}>;

type FuelPumpPayload = Record<{
  pumpNumber: number;
  fuelType: string;
  fuelQuantity: number;
}>;

type Transaction = Record<{
  timestamp: nat64;
    quantityDispensed: number;
    user: Principal;
}>;


const fuelPumpStorage = new StableBTreeMap<string, FuelPump>(0, 44, 1024);

$update;
export function createFuelPump(payload: FuelPumpPayload): Result<FuelPump, string> {
  const fuelPump: FuelPump = {
    id: uuidv4(),
    createdAt: ic.time(),
    updatedAt: Opt.None,
    status: "Active",
    transactions: [],
    ...payload,
  };

  fuelPumpStorage.insert(fuelPump.id, fuelPump);
  return Result.Ok<FuelPump, string>(fuelPump);
}

$query;
export function getFuelPump(id: string): Result<FuelPump, string> {
  return match(fuelPumpStorage.get(id), {
    Some: (pump) => Result.Ok<FuelPump, string>(pump),
    None: () => Result.Err<FuelPump, string>(`Fuel Pump with ID=${id} not found.`),
  });
}

$query;
export function getAllFuelPumps(): Result<Vec<FuelPump>, string> {
  return Result.Ok(fuelPumpStorage.values());
}

$update;
export function updateFuelPump(id: string, payload: FuelPumpPayload): Result<FuelPump, string> {
  return match(fuelPumpStorage.get(id), {
    Some: (existingPump) => {
      const updatedPump: FuelPump = {
        ...existingPump,
        ...payload,
        updatedAt: Opt.Some(ic.time()),
      };

      fuelPumpStorage.insert(updatedPump.id, updatedPump);
      return Result.Ok<FuelPump, string>(updatedPump);
    },
    None: () => Result.Err<FuelPump, string>(`Fuel Pump with ID=${id} not found.`),
  });
}

$update;
export function deleteFuelPump(id: string): Result<FuelPump, string> {
  return match(fuelPumpStorage.get(id), {
    Some: (existingPump) => {
      fuelPumpStorage.remove(id);
      return Result.Ok<FuelPump, string>(existingPump);
    },
    None: () => Result.Err<FuelPump, string>(`Fuel Pump with ID=${id} not found.`),
  });
}

$update;
export function dispenseFuel(id: string, quantity: number): Result<FuelPump, string> {
  return match(fuelPumpStorage.get(id), {
    Some: (fuelPump) => {
      
      fuelPump.fuelQuantity -= quantity;

      fuelPump.transactions.push({
        timestamp: ic.time(),
        quantityDispensed: quantity,
        user: ic.caller(),
      });

      fuelPumpStorage.insert(fuelPump.id, fuelPump);
      return Result.Ok<FuelPump, string>(fuelPump);
    },
    None: () => Result.Err<FuelPump, string>(`Fuel Pump with ID=${id} not found.`),
  });
}

$query;
export function getFuelPumpTransactions(id: string): Result<Vec<Transaction>, string> {
  return match(fuelPumpStorage.get(id), {
    Some: (fuelPump) => Result.Ok<Vec<Transaction>, string>(fuelPump.transactions),
    None: () => Result.Err<Vec<Transaction>, string>(`Fuel Pump with ID=${id} not found.`),
  });
}

$update;
export function setFuelPumpStatus(id: string, status: string): Result<FuelPump, string> {
  return match(fuelPumpStorage.get(id), {
    Some: (fuelPump) => {
      fuelPump.status = status;
      fuelPumpStorage.insert(id, fuelPump);
      return Result.Ok<FuelPump, string>(fuelPump);
    },
    None: () => Result.Err<FuelPump, string>(`Fuel Pump with ID=${id} not found.`),
  });
}

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

