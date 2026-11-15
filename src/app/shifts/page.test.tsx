import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor, act } from "@testing-library/react";
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

  it("asks to acknowledge when publish rejects warnings the roster did not list", async () => {
    const user = userEvent.setup();
    const err = Object.assign(new Error("conflict"), {
      isAxiosError: true,
      response: { data: { detail: { error_code: "shift_plan.warnings_not_acknowledged", message: "raw" } } },
    });
    api.publishShiftPlan.mockRejectedValueOnce(err).mockResolvedValueOnce({ publication_id: "p1", changed_cells: 1 });
    api.getRoster.mockResolvedValue(roster({ pending_changes: 1 }));
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Publicar (1)" }));
    const confirm = await screen.findByRole("button", { name: "Publicar" });
    expect(screen.queryByLabelText(/Entiendo los avisos/)).not.toBeInTheDocument();
    await user.click(confirm);

    expect(await screen.findByText("Hay avisos en el cuadrante: confírmalos para publicar.")).toBeInTheDocument();
    expect(confirm).toBeDisabled();
    expect(api.publishShiftPlan).toHaveBeenCalledWith(expect.objectContaining({ acknowledge_warnings: false }));

    await user.click(screen.getByLabelText(/Entiendo los avisos/));
    await user.click(confirm);
    await waitFor(() =>
      expect(api.publishShiftPlan).toHaveBeenLastCalledWith(expect.objectContaining({ acknowledge_warnings: true }))
    );
  });

  it("loads company-wide warnings when a work center is filtered", async () => {
    const user = userEvent.setup();
    api.getWorkCenters.mockResolvedValue([{ id: "wc1", company_id: "c1", name: "Norte" }]);
    api.getRoster.mockImplementation((params: { work_center_id?: string }) =>
      Promise.resolve(
        roster({
          pending_changes: 1,
          warnings: params.work_center_id
            ? []
            : [{ worker_id: "w1", date: "2026-11-10", code: "rest_under_12h", message: "x" }],
        })
      )
    );
    renderPage();
    await screen.findByRole("option", { name: "Norte" });
    await user.selectOptions(screen.getAllByRole("combobox")[1], "wc1");
    await user.click(await screen.findByRole("button", { name: "Publicar (1)" }));

    expect(await screen.findByRole("dialog", { name: "Publicar cuadrante" })).toHaveTextContent("Menos de 12 horas de descanso");
    const last = api.getRoster.mock.calls.at(-1)?.[0] as { work_center_id?: string };
    expect(last.work_center_id).toBeUndefined();
  });

  it("does not paint a roster from another company", async () => {
    api.getRoster.mockResolvedValue(roster({ company_id: "other", pending_changes: 1 }));
    renderPage();
    await waitFor(() => expect(api.getRoster).toHaveBeenCalled());
    await act(async () => {
      await api.getRoster.mock.results[0]?.value;
    });
    expect(screen.queryByText("Ana Ruiz")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Publicar (0)" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Copiar semana anterior" })).toBeDisabled();
    expect(api.publishShiftPlan).not.toHaveBeenCalled();
  });

  it("drops a roster response that arrives after the company changed", async () => {
    const user = userEvent.setup();
    let resolveLate: (value: Roster) => void = () => {};
    const late = new Promise<Roster>((resolve) => {
      resolveLate = resolve;
    });
    api.getCompanies.mockResolvedValue([company, { ...company, id: "c2", name: "Beta" }]);
    api.getRoster.mockImplementation((params: { company_id: string }) => {
      if (params.company_id === "c1") return late;
      return Promise.resolve(
        roster({
          company_id: "c2",
          workers: [{ id: "w2", first_name: "Bea", last_name: "Sol", cells: {}, planned_minutes: 0, pending_dates: [] }],
        })
      );
    });
    renderPage();
    await screen.findByRole("option", { name: "Beta" });
    await user.selectOptions(screen.getAllByRole("combobox")[0], "c2");

    expect(await screen.findByText("Bea Sol")).toBeInTheDocument();
    resolveLate(roster());
    await Promise.resolve();
    expect(screen.queryByText("Ana Ruiz")).not.toBeInTheDocument();
    expect(screen.getByText("Bea Sol")).toBeInTheDocument();
  });
});
