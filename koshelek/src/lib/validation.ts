import { z } from "zod";

// NOTE: these base schemas intentionally avoid `.default()` on any field.
// They are reused via `.partial()` for PATCH/update routes, and zod applies
// `.default()` even for keys omitted from a partial update — which would
// silently reset fields (e.g. stage, isMandatory) to their default on every
// edit. Defaults are instead applied explicitly at each create call site.

export const transactionSchema = z.object({
  type: z.enum(["INCOME", "EXPENSE"]),
  categoryId: z.string().min(1).nullable().optional(),
  subcategory: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  amount: z.coerce.number().positive("Сумма должна быть больше нуля"),
  date: z.coerce.date(),
  isMandatory: z.boolean().optional(),
  isRecurring: z.boolean().optional(),
  recurrenceDay: z.coerce.number().int().min(1).max(31).optional().nullable(),
  paymentMethod: z.string().optional().nullable(),
  accountId: z.string().optional().nullable(),
  status: z.enum(["PLANNED", "DONE", "OVERDUE"]).optional(),
  comment: z.string().optional().nullable(),
});

export const creditSchema = z.object({
  bank: z.string().min(1, "Укажите банк"),
  name: z.string().min(1, "Укажите название"),
  principal: z.coerce.number().positive(),
  currentBalance: z.coerce.number().min(0),
  monthlyPayment: z.coerce.number().positive(),
  interestRate: z.coerce.number().min(0),
  apr: z.coerce.number().min(0).optional().nullable(),
  paymentDay: z.coerce.number().int().min(1).max(31),
  remainingPayments: z.coerce.number().int().min(0),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  paymentType: z.enum(["ANNUITY", "DIFFERENTIATED"]).optional(),
  earlyRepaymentAllowed: z.boolean().optional(),
  comment: z.string().optional().nullable(),
});

export const goalSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  targetAmount: z.coerce.number().positive(),
  savedAmount: z.coerce.number().min(0).optional(),
  targetDate: z.coerce.date().optional().nullable(),
  comment: z.string().optional().nullable(),
});

export const contractSchema = z.object({
  announcementNumber: z.string().optional().nullable(),
  contractNumber: z.string().optional().nullable(),
  title: z.string().min(1, "Укажите название"),
  customer: z.string().optional().nullable(),
  supplier: z.string().optional().nullable(),
  bin: z.string().optional().nullable(),
  amount: z.coerce.number().positive(),
  signDate: z.coerce.date().optional().nullable(),
  startDate: z.coerce.date().optional().nullable(),
  endDate: z.coerce.date().optional().nullable(),
  subject: z.string().optional().nullable(),
  procurementMethod: z.string().optional().nullable(),
  stage: z
    .enum(["WON", "SIGNED", "ACTIVE", "PREPARATION", "DELIVERY", "ACT", "PAYMENT", "EXECUTED", "CLOSED", "WARRANTY"])
    .optional(),
  warrantyStart: z.coerce.date().optional().nullable(),
  warrantyEnd: z.coerce.date().optional().nullable(),
  comment: z.string().optional().nullable(),
});

export const commentSchema = z.object({
  entityType: z.enum([
    "INCOME",
    "EXPENSE",
    "CREDIT",
    "GOAL",
    "CONTRACT",
    "CONTRACT_CHANGE",
    "ACT",
    "PAYMENT",
    "TASK",
    "DOCUMENT",
    "AI_RECOMMENDATION",
  ]),
  entityId: z.string().min(1),
  text: z.string().min(1, "Комментарий не может быть пустым"),
});

export const taskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  dueDate: z.coerce.date().optional().nullable(),
  priority: z.enum(["TODAY", "WEEK", "LATER"]).optional(),
});
