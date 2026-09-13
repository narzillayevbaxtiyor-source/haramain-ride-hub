import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listPassengers, setPassengerStatus } from "@/lib/admin.functions";
import { useAdminText } from "@/lib/i18n-admin";
import { ActionButton, Badge, Cell, EmptyRow, PageHeading, Panel, Row, SearchBox, Table } from "@/components/admin/AdminUI";

export const Route = createFileRoute("/admin/passengers")({
  component: AdminPassengers,
});

function AdminPassengers() {
  const a = useAdminText();
  const fetchPassengers = useServerFn(listPassengers);
  const changeStatus = useServerFn(setPassengerStatus);
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data, isPending } = useQuery({ queryKey: ["admin", "passengers"], queryFn: () => fetchPassengers() });

  const mutation = useMutation({
    mutationFn: (input: { passengerId: string; status: "active" | "suspended" }) => changeStatus({ data: input }),
    onSuccess: async (result) => {
      if (!result.ok) {
        setError(a.errGeneric);
        return;
      }
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: () => setError(a.errGeneric),
  });

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return data ?? [];
    return (data ?? []).filter((row) =>
      [row.name, row.email, row.phone].some((field) => (field ?? "").toLowerCase().includes(needle)),
    );
  }, [data, query]);

  return (
    <div>
      <PageHeading title={a.navPassengers} subtitle={a.passengersSub} />
      {error ? (
        <p role="alert" className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
          {error}
        </p>
      ) : null}
      <Panel action={<SearchBox value={query} onChange={setQuery} placeholder={a.searchPassengers} label={a.search} />}>
        <Table head={[a.name, a.email, a.phone, a.bookingsCount, a.completed, a.cancelled, a.accountStatus, ""]}>
          {isPending ? (
            <EmptyRow span={8} label={a.loading} />
          ) : rows.length === 0 ? (
            <EmptyRow span={8} label={a.none} />
          ) : (
            rows.map((row) => (
              <Row key={row.id}>
                <Cell bold>{row.name ?? "—"}</Cell>
                <Cell>{row.email ?? "—"}</Cell>
                <Cell>{row.phone ?? "—"}</Cell>
                <Cell>{row.bookings}</Cell>
                <Cell>{row.completed}</Cell>
                <Cell>{row.cancelled}</Cell>
                <Cell>
                  <Badge tone={row.account_status === "suspended" ? "bad" : "good"}>
                    {row.account_status === "suspended" ? a.stAccountSuspended : a.stAccountActive}
                  </Badge>
                </Cell>
                <Cell>
                  <ActionButton
                    tone={row.account_status === "suspended" ? "primary" : "danger"}
                    disabled={mutation.isPending}
                    onClick={() =>
                      mutation.mutate({
                        passengerId: row.id,
                        status: row.account_status === "suspended" ? "active" : "suspended",
                      })
                    }
                  >
                    {row.account_status === "suspended" ? a.reactivate : a.suspend}
                  </ActionButton>
                </Cell>
              </Row>
            ))
          )}
        </Table>
      </Panel>
    </div>
  );
}
