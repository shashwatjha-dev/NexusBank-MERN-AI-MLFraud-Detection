import {
  getPpfSummary,
  listPpfContributions,
  openPpf,
  contribute,
} from "../services/ppfService.js";
import { ok, created } from "../middleware/response.js";
import { recordAudit } from "../services/auditService.js";

export async function getSummary(req, res, next) {
  try {
    return ok(res, await getPpfSummary(req.user.userId));
  } catch (error) { return next(error); }
}

export async function listContributions(req, res, next) {
  try {
    const items = await listPpfContributions(req.user.userId, { limit: 200 });
    return ok(res, items);
  } catch (error) { return next(error); }
}

export async function open(req, res, next) {
  try {
    const ppf = await openPpf({ userId: req.user.userId });
    await recordAudit({
      actor: req.user.userId, targetUser: req.user.userId,
      action: "PPF_OPENED",
      metadata: { ppfId: String(ppf._id) },
      requestId: req.requestId, ipAddress: req.ip,
    });
    return created(res, ppf, "PPF account opened.");
  } catch (error) { return next(error); }
}

export async function makeContribution(req, res, next) {
  try {
    const { sourceAccountId, amountPaise, note } = req.body;
    const result = await contribute({
      userId: req.user.userId,
      sourceAccountId,
      amountPaise,
      note,
    });
    await recordAudit({
      actor: req.user.userId, targetUser: req.user.userId,
      action: "PPF_CONTRIBUTED",
      metadata: {
        amountPaise: result.contribution.amountPaise,
        ppfId: String(result.ppf._id),
      },
      requestId: req.requestId, ipAddress: req.ip,
    });
    return created(res, result, "PPF contribution recorded.");
  } catch (error) { return next(error); }
}