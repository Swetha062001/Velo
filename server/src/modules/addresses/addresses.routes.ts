import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { validate } from '../../middleware/validate.js';
import { addressesController } from './addresses.controller.js';
import {
  addressIdParamSchema,
  createAddressSchema,
  updateAddressSchema,
} from './addresses.schemas.js';

/** Mounted at /users/me/addresses — always the signed-in user's own addresses. */
export const addressesRouter = Router();

addressesRouter.use(authenticate);

addressesRouter.get('/', addressesController.list);
addressesRouter.post('/', validate({ body: createAddressSchema }), addressesController.create);
addressesRouter.patch(
  '/:id',
  validate({ params: addressIdParamSchema, body: updateAddressSchema }),
  addressesController.update,
);
addressesRouter.delete(
  '/:id',
  validate({ params: addressIdParamSchema }),
  addressesController.remove,
);
