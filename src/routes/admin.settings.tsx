import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getAdminSettings, updateAdminSettings } from "@/lib/admin.functions";
import { useAdminText } from "@/lib/i18n-admin";
import { ActionButton, Badge, PageHeading, Panel } from "@/components/admin/AdminUI";

export const Route = createFileRoute("/admin/settings")({
  component: AdminSettings,
});

function AdminSettings() {
  const a = useAdminText();
  const fetchSettings = useServerFn(getAdminSettings);
  const saveSettings = useServerFn(updateAdminSettings);
  const queryClient = useQueryClient();
  const { data, isPending } = useQuery({ queryKey: ["admin", "settings"], queryFn: () => fetchSettings() });

  const [enabled, setEnabled] = useState(false);
  const [rate, setRate] = useState("3.75");
  const [minPayment, setMinPayment] = useState("10");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!data) return;
    setEnabled(data.paybis_enabled);
    setRate(String(data.usd_rate_sar));
    setMinPayment(String(data.min_payment_usd));
  }, [data]);

  const mutation = useMutation({
    mutationFn: () =>
      saveSettings({
        data: { paybis_enabled: enabled, usd_rate_sar: Number(rate), min_payment_usd: Number(minPayment) },
      }),
    onSuccess: async (result) => {
      setMessage(result.ok ? a.saved : a.errGeneric);
      if (result.ok) await queryClient.invalidateQueries({ queryKey: ["admin", "settings"] });
    },
    onError: () => setMessage(a.errGeneric),
  });

  if (isPending) return <p className="text-sm text-muted-foreground">{a.loading}</p>;

  return (
    <div className="space-y-5">
      <PageHeading title={a.navSettings} subtitle={a.settingsSub} />

      <Panel title={a.paybisStatus}>
        <div className="space-y-4 text-sm">
          <label className="flex min-h-11 items-center gap-3">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(event) => setEnabled(event.target.checked)}
              className="size-5 rounded border-input accent-[hsl(var(--primary))]"
            />
            <span className="font-semibold text-foreground">{enabled ? a.enabled : a.disabled}</span>
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">{a.usdRate}</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={rate}
                onChange={(event) => setRate(event.target.value)}
                className="min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">{a.minPayment}</span>
              <input
                type="number"
                step="1"
                min="0"
                value={minPayment}
                onChange={(event) => setMinPayment(event.target.value)}
                className="min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <ActionButton tone="primary" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
              {a.save}
            </ActionButton>
            {message ? <span className="text-sm font-semibold text-muted-foreground">{message}</span> : null}
          </div>
        </div>
      </Panel>

      <Panel title={a.walletDestination}>
        <div className="space-y-3 text-sm">
          <div className="flex flex-wrap items-center gap-3">
            <Badge tone={data?.wallet_configured ? "good" : "warn"}>
              {data?.wallet_configured ? a.walletConfigured : a.walletMissing}
            </Badge>
            {data?.wallet_masked ? <span className="font-mono text-xs text-muted-foreground">{data.wallet_masked}</span> : null}
          </div>
          <dl className="grid gap-2 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{a.cryptoAsset}</dt>
              <dd className="font-semibold text-foreground">{data?.crypto_asset ?? "USDT"}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{a.cryptoNetwork}</dt>
              <dd className="font-semibold text-foreground">{data?.crypto_network ?? "TRC20"}</dd>
            </div>
          </dl>
          <p className="text-xs text-muted-foreground">{a.walletNote}</p>
        </div>
      </Panel>
    </div>
  );
}
