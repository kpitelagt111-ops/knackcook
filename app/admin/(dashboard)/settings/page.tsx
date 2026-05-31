import type { ReactNode } from "react";
import { Button, Card, CardBody, CardHeader, cn, Input } from "@/components/ui";
import { requireRole } from "@/lib/auth/guards";
import {
  type AffiliateTagsMap,
  getSettings,
  parseAffiliateTags,
  parseBoolean,
  parseString,
  SETTING_KEYS,
} from "@/lib/settings";
import { saveAffiliateTagsSetting, saveBooleanSetting, saveStringSetting } from "./actions";

export const dynamic = "force-dynamic";

const INPUT_CLASS =
  "block w-full rounded-xl border border-border-strong bg-surface px-4 text-sm text-foreground placeholder:text-subtle shadow-[inset_0_1px_2px_rgb(48_30_18_/_0.04)] transition-colors outline-none hover:border-ember-300 dark:hover:border-ember-500/70 focus-visible:border-ember-400 focus-visible:ring-2 focus-visible:ring-ember-400/30";

function safeParseString(raw: unknown, fallback: string): string {
  try {
    return parseString(raw);
  } catch {
    return fallback;
  }
}

function safeParseBoolean(raw: unknown, fallback: boolean): boolean {
  try {
    return parseBoolean(raw);
  } catch {
    return fallback;
  }
}

function safeParseAffiliateTags(raw: unknown, fallback: AffiliateTagsMap): AffiliateTagsMap {
  try {
    return parseAffiliateTags(raw);
  } catch {
    return fallback;
  }
}

export default async function SettingsPage() {
  await requireRole("SUPER_ADMIN");

  const values = await getSettings([
    SETTING_KEYS.gaMeasurementId,
    SETTING_KEYS.gaEnabled,
    SETTING_KEYS.creatorsApiEnabled,
    SETTING_KEYS.affiliateTags,
    SETTING_KEYS.disclosureText,
  ]);

  const gaMeasurementId = safeParseString(values[SETTING_KEYS.gaMeasurementId], "");
  const gaEnabled = safeParseBoolean(values[SETTING_KEYS.gaEnabled], false);
  const creatorsApiEnabled = safeParseBoolean(values[SETTING_KEYS.creatorsApiEnabled], false);
  const affiliateTags = safeParseAffiliateTags(values[SETTING_KEYS.affiliateTags], {
    en: "knackcook-20",
  });
  const disclosureText = safeParseString(
    values[SETTING_KEYS.disclosureText],
    "As an Amazon Associate we earn from qualifying purchases.",
  );

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-3">
        <span className="inline-flex items-center gap-2 text-[0.7rem] font-medium uppercase tracking-[0.22em] text-ember-600">
          <span className="rule-ember" />
          Configuration
        </span>
        <h1 className="font-display text-4xl font-medium tracking-tight text-foreground">
          Settings
        </h1>
        <p className="max-w-2xl text-sm text-muted">
          Global site configuration. Changes are recorded in the audit log.
        </p>
      </header>

      <SettingCard
        title="Google Analytics — Measurement ID"
        description="GA4 ID injected after consent. Leave empty to disable analytics."
      >
        <form action={saveStringSetting} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <input type="hidden" name="key" value={SETTING_KEYS.gaMeasurementId} />
          <div className="flex-1">
            <label
              className="block text-[0.7rem] font-medium uppercase tracking-[0.18em] text-muted"
              htmlFor="ga-measurement-id"
            >
              ga.measurementId
            </label>
            <Input
              id="ga-measurement-id"
              name="value"
              type="text"
              defaultValue={gaMeasurementId}
              placeholder="G-XXXXXXXXXX"
              className="mt-1.5 font-mono"
            />
          </div>
          <SaveButton />
        </form>
      </SettingCard>

      <SettingCard
        title="Google Analytics — Enabled"
        description="Master switch for the GA4 loader. Requires a Measurement ID."
      >
        <BooleanForm settingKey={SETTING_KEYS.gaEnabled} current={gaEnabled} />
      </SettingCard>

      <SettingCard
        title="Creators API — Enabled"
        description="Use Amazon Creators API for live prices. Only enable once approved (≥10 sales / 30 days)."
      >
        <BooleanForm settingKey={SETTING_KEYS.creatorsApiEnabled} current={creatorsApiEnabled} />
      </SettingCard>

      <SettingCard
        title="Affiliate tags (per locale)"
        description='JSON map of locale → Associates tag, e.g. {"en":"knackcook-20"}.'
      >
        <form action={saveAffiliateTagsSetting} className="flex flex-col gap-3">
          <label
            className="block text-[0.7rem] font-medium uppercase tracking-[0.18em] text-muted"
            htmlFor="affiliate-tags"
          >
            affiliate.tags
          </label>
          <textarea
            id="affiliate-tags"
            name="value"
            rows={5}
            defaultValue={JSON.stringify(affiliateTags, null, 2)}
            className={cn(INPUT_CLASS, "py-3 font-mono leading-relaxed")}
          />
          <div className="flex justify-end">
            <SaveButton />
          </div>
        </form>
      </SettingCard>

      <SettingCard
        title="Affiliate disclosure text"
        description="Shown in the footer and near CTAs. Mandatory under Amazon Associates rules."
      >
        <form action={saveStringSetting} className="flex flex-col gap-3">
          <input type="hidden" name="key" value={SETTING_KEYS.disclosureText} />
          <label
            className="block text-[0.7rem] font-medium uppercase tracking-[0.18em] text-muted"
            htmlFor="disclosure-text"
          >
            disclosure.text
          </label>
          <textarea
            id="disclosure-text"
            name="value"
            rows={3}
            defaultValue={disclosureText}
            className={cn(INPUT_CLASS, "py-3 leading-relaxed")}
          />
          <div className="flex justify-end">
            <SaveButton />
          </div>
        </form>
      </SettingCard>
    </div>
  );
}

function SettingCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Card variant="default">
      <CardHeader>
        <h2 className="font-display text-lg font-medium tracking-tight text-foreground">{title}</h2>
        <p className="text-xs text-muted">{description}</p>
      </CardHeader>
      <CardBody>{children}</CardBody>
    </Card>
  );
}

function BooleanForm({ settingKey, current }: { settingKey: string; current: boolean }) {
  return (
    <form action={saveBooleanSetting} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="key" value={settingKey} />
      <select
        name="value"
        defaultValue={current ? "true" : "false"}
        aria-label="Enable or disable"
        className={cn(INPUT_CLASS, "h-11 max-w-[12rem]")}
      >
        <option value="true">Enabled</option>
        <option value="false">Disabled</option>
      </select>
      <SaveButton />
    </form>
  );
}

function SaveButton() {
  return (
    <Button type="submit" size="md">
      Save
    </Button>
  );
}
