import type { Request, Response } from 'express';
import { currentUser } from '../../middleware/authenticate.js';
import { created, noContent, ok } from '../../utils/respond.js';
import type { CreateAddressInput, UpdateAddressInput } from './addresses.schemas.js';
import { addressesService } from './addresses.service.js';

type IdParams = { id: string };

export const addressesController = {
  async list(req: Request, res: Response) {
    ok(res, await addressesService.list(currentUser(req).id));
  },

  async create(req: Request<unknown, unknown, CreateAddressInput>, res: Response) {
    created(res, await addressesService.create(currentUser(req).id, req.body));
  },

  async update(req: Request<IdParams, unknown, UpdateAddressInput>, res: Response) {
    ok(res, await addressesService.update(currentUser(req).id, req.params.id, req.body));
  },

  async remove(req: Request<IdParams>, res: Response) {
    await addressesService.remove(currentUser(req).id, req.params.id);
    noContent(res);
  },
};
