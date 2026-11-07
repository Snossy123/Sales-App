# Application date picker

`AppDatePicker` replaces 60 date inputs across the application. `AppDateTimePicker` replaces the date portion of 11 datetime-local inputs. Existing `DateTimeInput12h` time controls are retained.

## Usage

```tsx
<AppDatePicker
  id="due-date"
  name="due_date"
  value={dueDate}
  onChange={setDueDate}
  minDate="2026-01-01"
  maxDate="2027-12-31"
  required
  error={errors.due_date}
  weekStartsOn={6}
  className={inputClass}
/>
```

- Controlled values and change callbacks use `YYYY-MM-DD` strings; empty values use `''`. Display uses `DD/MM/YYYY`. Parse/serialize helpers use local date components without UTC conversion.
- Date/time controls preserve `YYYY-MM-DDTHH:mm` wall-clock strings and existing times when dates change. Choosing a date for an empty date/time field initializes time to `00:00`; the time remains editable.
- The native form validation bridge preserves required/min/max validation and named FormData submission. Validation focuses the visible trigger and displays an associated error. Existing state-based business validation remains in place. For React Hook Form, use `Controller` with `value`, `onChange`, `onBlur`, and `error`.
- `min`/`max` aliases are supported, as are disabled, placeholder, error, clearable, monthYearSelection, and weekStartsOn (0 = Sunday, 6 = Saturday; default 6).
- Language/direction follow the document's `lang`/`dir`, including changes while mounted. Explicit `lang` and `dir` overrides are available. Arabic uses Gregorian month/weekday names and translated navigation labels with Latin digits.
- Month/year dropdowns default to 1900–2100 and expand to include saved dates. Explicit date constraints define the navigation bounds when supplied.
- Floating UI provides a body portal, viewport flipping/shifting, automatic scroll/resize updates, available-height scrolling, outside dismissal, and focus management. DayPicker provides keyboard date navigation. Escape closes the popup without closing the parent modal.
- Colors use the existing surface, outline, primary, and error tokens. No separate theme system or backend changes were introduced.

## New files

- `src/components/AppDatePicker.tsx` — reusable date input and popup
- `src/components/AppDatePicker.css` — shared calendar, trigger, and datetime layout styles
- `src/components/AppDateTimePicker.tsx` — existing local date/time contract with the shared calendar
- `src/lib/dateOnly.ts` — Gregorian date-only parsing, formatting, and serialization
- `src/components/AppDatePicker.test.ts` and `src/lib/dateOnly.test.ts` — 8 regression tests

## Dependencies

Runtime: `react-day-picker`, `@floating-ui/react`. Test-only: `jsdom`, `@types/jsdom`. Package manifest and lockfile updated. No shadcn components were present, so this uses DayPicker directly with the existing Tailwind tokens.

## Verification

- TypeScript and Vite production build pass (existing chunk-size and mixed-import warnings remain).
- All 8 added tests pass: Arabic/English, language changes, keyboard navigation, focus return, Escape in a modal, portal rendering, constraints, clearing/disabled state, native validation and FormData, datetime preservation, date-only round trips and invalid dates.
- Headless Chrome verification passes at 320px, 768px, and 1440px in Arabic RTL and English LTR. The picker is placed at the bottom edge of the viewport inside an overflow-hidden table inside a modal; the portal fits the viewport, selection updates immediately, and the popup closes. This is an isolated fixture using the real component, not an authenticated end-to-end test of every application page.
- New component/helper files pass ESLint. Repository-wide lint reports existing violations elsewhere in the app.
- Full suite: 230 passed, 1 unrelated failure in `src/lib/contractKinds.test.ts`, expecting a different Arabic approval label. Neither that test nor its implementation was changed.

## Updated UI files

- `src/components/DateTimeInput12h.tsx`
- `src/components/FilterBar.tsx`
- `src/components/contracts/ContractFollowUpTab.tsx`
- `src/components/contracts/ContractProblemWizard.tsx`
- `src/components/contracts/PaymentVerificationPanel.tsx`
- `src/components/customers/CustomerLegacyDevicesFields.tsx`
- `src/components/installments/InstallmentCollectionPanel.tsx`
- `src/components/pos/CashInstallmentScheduleEditor.tsx`
- `src/components/pos/DeviceLineCard.tsx`
- `src/components/pos/PosContractHeader.tsx`
- `src/components/pos/PosOwnershipTransferFeesSection.tsx`
- `src/components/services/ServiceContractHeader.tsx`
- `src/components/services/ServiceLineCard.tsx`
- `src/components/services/ServicePaymentSection.tsx`
- `src/modules/accounting/pages/AccountLedgerPage.tsx`
- `src/modules/accounting/pages/AccountingSettingsPage.tsx`
- `src/modules/accounting/pages/JournalEntriesPage.tsx`
- `src/modules/accounting/pages/ReportsPage.tsx`
- `src/modules/accounting/pages/TransfersPage.tsx`
- `src/modules/admin/pages/AdminActivityLogPage.tsx`
- `src/modules/crm/components/CallLogFormModal.tsx`
- `src/modules/crm/components/ceo-dashboard/CeoPeriodToggle.tsx`
- `src/modules/crm/pages/CrmActivitiesPage.tsx`
- `src/modules/crm/pages/CrmCallLogsPage.tsx`
- `src/modules/crm/pages/CrmLeaderboardPage.tsx`
- `src/modules/crm/pages/CrmOwnerDetailPage.tsx`
- `src/modules/crm/pages/CrmOwnerPipelinePage.tsx`
- `src/modules/crm/pages/CrmReportsPage.tsx`
- `src/modules/crm/pages/CrmTasksPage.tsx`
- `src/modules/hrm/components/SalesTargetFormModal.tsx`
- `src/modules/hrm/pages/HrmAllowancesPage.tsx`
- `src/modules/hrm/pages/HrmAttendancePage.tsx`
- `src/modules/hrm/pages/HrmEmployeeDetailPage.tsx`
- `src/modules/hrm/pages/HrmHolidaysPage.tsx`
- `src/modules/hrm/pages/HrmLeavesPage.tsx`
- `src/modules/hrm/pages/HrmReportsPage.tsx`
- `src/modules/hrm/pages/HrmShiftsPage.tsx`
- `src/modules/pricing/pages/PromotionsPage.tsx`
- `src/modules/sales/flow/steps/IntakeStep.tsx`
- `src/modules/support/components/CompleteTaskModal.tsx`
- `src/pages/BranchInventoryPage.tsx`
- `src/pages/DailyBranchReportPage.tsx`
- `src/pages/ReviewCollectionDetailPage.tsx`
