import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listActivity } from "@/lib/admin.functions";
import { useAdminText } from "@/lib/i18n-admin";
import { Cell, EmptyRow, PageHeading, Panel, Row, Table, dateTime, shortId } from "@/components/admin/AdminUI";

export const Route = createFileRoute("/admin/activity")({
  component: AdminActivity,
});

function AdminActivity() {
  const a = useAdminText();
  const fetchActivity = useServerFn(listActivity);
  const { data, isPending } = useQuery({ queryKey: ["admin", "activity"], queryFn: () => fetchActivity() });

  return (
    <div>
      <PageHeading title={a.navActivity} subtitle={a.activitySub} />
      <Panel>
        <Table head={[a.when, a.admin, a.action, a.target]}>
          {isPending ? (
            <EmptyRow span={4} label={a.loading} />
          ) : (data ?? []).length === 0 ? (
            <EmptyRow span={4} label={a.none} />
          ) : (
            (data ?? []).map((row) => (
              <Row key={row.id}>
                <Cell>{dateTime(row.created_at)}</Cell>
                <Cell bold>{row.admin_name ?? "—"}</Cell>
                <Cell bold>{row.action}</Cell>
                <Cell>
                  {row.target_table}
                  {row.target_id ? ` · ${shortId(row.target_id)}` : ""}
                </Cell>
              </Row>
            ))
          )}
        </Table>
      </Panel>
    </div>
  );
}
