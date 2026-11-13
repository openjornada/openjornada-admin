import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import es from "../../../messages/es.json";
import type { Roster } from "@/lib/api-client";
import ShiftsPage from "./page";

vi.mock("@/components/AppWrapper", () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("react-hot-toast", () => ({ default: { success: vi.fn(), error: vi.fn() } }));

const api = vi.hoisted(() => ({
  getCompanies: vi.fn(),
  getCompany: vi.fn(),
  getShiftTypes: vi.fn(),
  getWorkCenters: vi.fn(),
  getRoster: vi.fn(),
  putShiftCell: vi.fn(),
  publishShiftPlan: vi.fn(),
  getAbsenceCalendar: vi.fn(),
}));
vi.mock("@/lib/api-client", () => ({ apiClient: api }));

const company = { id: "c1", name: "Acme", absence_management_enabled: false, shift_planning_enabled: true };
const type = { id: "t1", company_id: "c1", name: "Tarde", short_code: "T", color: "#ff0000", start_time: "14:00", end_time: "22:00", break_minutes: 30 };

const roster = (over: Partial<Roster> = {}): Roster => ({
  company_id: "c1", start_date: "", end_date: "", pending_changes: 0, warnings: [],
  workers: [{ id: "w1", first_name: "Ana", last_name: "Ruiz", cells: {}, planned_minutes: 0, pending_dates: [] }],
  ...over,
});

function renderPage() {
  return render(
    <NextIntlClientProvider locale="es" messages={es}>
      <ShiftsPage />
    </NextIntlClientProvider>
  );
}

const anyCell = () => screen.findAllByTestId(/^cell-w1-/).then((c) => c[2]);

describe("ShiftsPage", () => {
  beforeEach(() => {
    Object.values(api).forEach((f) => f.mockReset());
    api.getCompanies.mockResolvedValue([company]);
    api.getCompany.mockResolvedValue(company);
    api.getShiftTypes.mockResolvedValue([type]);
    api.getWorkCenters.mockResolvedValue([]);
    api.getRoster.mockResolvedValue(roster());
    api.getAbsenceCalendar.mockResolvedValue([]);
  });
  afterEach(cleanup);

  it("assigns the selected palette type with one click and refreshes pending changes", async () => {
    const user = userEvent.setup();
    api.putShiftCell.mockResolvedValue([]);
    renderPage();
    await user.click(await screen.findByRole("button", { name: /Tarde/ }));
    const cell = await anyCell();
    const date = cell.getAttribute("data-testid")!.replace("cell-w1-", "");
    api.getRoster.mockResolvedValue(
      roster({ pending_changes: 1, workers: [{ id: "w1", first_name: "Ana", last_name: "Ruiz", planned_minutes: 450, cells: {}, pending_dates: [date] }] })
    );
    await user.click(cell);

    await waitFor(() =>
      expect(api.putShiftCell).toHaveBeenCalledWith({ company_id: "c1", worker_id: "w1", date, shifts: [{ shift_type_id: "t1" }] })
    );
    expect(await screen.findByRole("button", { name: "Publicar (1)" })).toBeEnabled();
    expect(await screen.findAllByLabelText("Cambio sin publicar")).toHaveLength(1);
  });

  it("lists warnings in the publish dialog and requires acknowledging them", async () => {
    const user = userEvent.setup();
    api.publishShiftPlan.mockResolvedValue({ publication_id: "p1", changed_cells: 2 });
    api.getRoster.mockResolvedValue(
      roster({ pending_changes: 2, warnings: [{ worker_id: "w1", date: "2026-11-10", code: "rest_under_12h", message: "x" }] })
    );
    renderPage();
    await user.click(await screen.findByRole("button", { name: "Publicar (2)" }));

    const dialog = await screen.findByRole("dialog", { name: "Publicar cuadrante" });
    expect(dialog).toHaveTextContent("Ana Ruiz");
    expect(dialog).toHaveTextContent("Menos de 12 horas de descanso");
    expect(dialog).toHaveTextContent("toda la empresa");
    expect(screen.getByLabelText("Avisar por correo")).toBeChecked();

    const confirm = screen.getByRole("button", { name: "Publicar" });
    expect(confirm).toBeDisabled();
    await user.click(screen.getByLabelText(/Entiendo los avisos/));
    expect(confirm).toBeEnabled();
    await user.click(confirm);

    await waitFor(() =>
      expect(api.publishShiftPlan).toHaveBeenCalledWith(
        expect.objectContaining({ company_id: "c1", acknowledge_warnings: true, notify: true })
      )
    );
  });
});
