### Task 6: Frontend — contract tab + status label

**Files:**
- Modify: `Sales-App/src/lib/customerContracts.ts` (`installmentStatusLabel` / normalize helpers)
- Modify: `Sales-App/src/components/contracts/ContractInstallmentsTab.tsx`
- Modify: `Sales-App/src/api/types.ts` (InstallmentItem fields if typed)
- Test: `Sales-App/src/lib/customerContracts.test.ts` (add cases if file exists)

**Interfaces:**
- Consumes: API `is_ownership_transferred`, plan `transfer_origin` when present on nested plans/items
- Produces: UI label **تم نقل ملكية**; transfer tab sections from transfer invoice data

- [ ] **Step 1: Failing unit test** for label when `ownership_transferred_at` / flag set → `تم نقل ملكية`

- [ ] **Step 2: Implement label**

Prefer checking `is_ownership_transferred` or `ownership_transferred_at` before suspended/paid in `installmentStatusLabel` (extend signature or overload with item fields).

- [ ] **Step 3: Update `ContractInstallmentsTab`**

- Split `feeItems` / `transferredBalanceItems` using plan `transfer_origin` when available; fallback: items on transfer invoice without origin = fees; with origin `transferred_balance` = copied.
- Remove second table that loads collectable rows from `invoice.source_invoice` as “منقولة للمالك الجديد”.
- Keep `OwnershipTransferSourceLink` as **read-only history** link to original contract.
- Banner copy: أقساط الجهاز المتبقية تُجمَّد على التعاقد الأصلي وتُنسخ على عقد النقل عند التأكيد.

- [ ] **Step 4: Hide Collect on frozen rows** in any contract UI that lists source items (if still shown historically, disable collect — collection page already excludes them).

- [ ] **Step 5: Run**

```bash
cd Sales-App && npm test -- src/lib/customerContracts.test.ts
```

---

