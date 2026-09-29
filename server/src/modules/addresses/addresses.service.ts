import { withTransaction } from '../../db/index.js';
import { AppError } from '../../utils/AppError.js';
import { addressesRepository, type AddressRow } from './addresses.repository.js';
import type { CreateAddressInput, UpdateAddressInput } from './addresses.schemas.js';

export const MAX_ADDRESSES = 10;

export interface AddressDto {
  id: string;
  fullName: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
}

export function toAddressDto(row: AddressRow): AddressDto {
  return {
    id: row.id,
    fullName: row.full_name,
    phone: row.phone,
    line1: row.line1,
    line2: row.line2,
    city: row.city,
    state: row.state,
    postalCode: row.postal_code,
    country: row.country,
    isDefault: row.is_default,
  };
}

const notFound = () => AppError.notFound('Address not found');

export const addressesService = {
  async list(userId: string) {
    return (await addressesRepository.list(userId)).map(toAddressDto);
  },

  /** The first address is always the default; `isDefault: true` moves the default to it. */
  create(userId: string, input: CreateAddressInput) {
    return withTransaction(async (client) => {
      const count = await addressesRepository.count(userId, client);
      if (count >= MAX_ADDRESSES) {
        throw new AppError(409, 'ADDRESS_LIMIT', `You can save up to ${MAX_ADDRESSES} addresses`);
      }
      const makeDefault = count === 0 || input.isDefault === true;
      if (makeDefault) {
        await client.query(
          `UPDATE addresses SET is_default = false WHERE user_id = $1 AND is_default`,
          [userId],
        );
      }
      return toAddressDto(await addressesRepository.create(userId, input, makeDefault, client));
    });
  },

  update(userId: string, id: string, input: UpdateAddressInput) {
    return withTransaction(async (client) => {
      const updated = await addressesRepository.update(userId, id, input, client);
      if (!updated) throw notFound();
      // Un-setting the default isn't allowed directly — choose another address as default instead.
      if (input.isDefault === true && !updated.is_default) {
        await addressesRepository.setDefault(userId, id, client);
        updated.is_default = true;
      }
      return toAddressDto(updated);
    });
  },

  remove(userId: string, id: string) {
    return withTransaction(async (client) => {
      const deleted = await addressesRepository.delete(userId, id, client);
      if (!deleted) throw notFound();
      if (deleted.is_default) await addressesRepository.promoteNewest(userId, client);
    });
  },

  async requireOwned(userId: string, id: string) {
    const address = await addressesRepository.findOwned(userId, id);
    if (!address) throw notFound();
    return address;
  },
};
