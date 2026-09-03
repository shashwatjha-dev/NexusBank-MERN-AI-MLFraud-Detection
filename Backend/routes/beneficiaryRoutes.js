import { Router } from "express";
import { requireAuth, attachFreshUser } from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validate.js";
import {
  createBeneficiarySchema,
  updateBeneficiarySchema,
  beneficiaryIdParamSchema,
} from "../validators/bankingValidators.js";
import {
  listBeneficiaries,
  createBeneficiary,
  updateBeneficiary,
  deleteBeneficiary,
} from "../controllers/beneficiaryController.js";

const router = Router();
router.use(requireAuth);

router.get("/", listBeneficiaries);

router.post(
  "/",
  attachFreshUser,
  validate({ body: createBeneficiarySchema }),
  createBeneficiary
);

router.put(
  "/:id",
  attachFreshUser,
  validate({
    params: beneficiaryIdParamSchema,
    body: updateBeneficiarySchema,
  }),
  updateBeneficiary
);

router.delete(
  "/:id",
  attachFreshUser,
  validate({ params: beneficiaryIdParamSchema }),
  deleteBeneficiary
);

export default router;