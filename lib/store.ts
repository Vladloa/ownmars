import fs from "fs";
import path from "path";
import { PLOT_CATALOG, START_PRICE_CENTS } from "./plots-catalog";
import { createServiceClient } from "./supabase";
import { hasSupabase } from "./env";
import { minBidCents } from "./pricing";
import { normalizeUrl } from "./url";
import type { ClaimPayload, ClaimResult, PlotRecord } from "./types";

type FileState = {
  plots: PlotRecord[];
};

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "plots.json");

function catalogDefaults(): PlotRecord[] {
  return PLOT_CATALOG.map((p) => ({
    ...p,
    currentPriceCents: START_PRICE_CENTS,
    ownerName: null,
    ownerUrl: null,
    warCry: null,
    ownerEmail: null,
    clickCount: 0,
    updatedAt: new Date(0).toISOString(),
  }));
}

function mergeCatalog(stored: PlotRecord[] | undefined): PlotRecord[] {
  const bySlug = new Map((stored ?? []).map((p) => [p.slug, p]));
  return catalogDefaults().map((base) => {
    const extra = bySlug.get(base.slug);
    if (!extra) return base;
    return {
      ...base,
      currentPriceCents: extra.currentPriceCents,
      ownerName: extra.ownerName,
      ownerUrl: extra.ownerUrl,
      warCry: extra.warCry,
      ownerEmail: extra.ownerEmail,
      clickCount: extra.clickCount,
      updatedAt: extra.updatedAt,
    };
  });
}

function readFileState(): FileState {
  try {
    if (!fs.existsSync(DATA_FILE)) return { plots: catalogDefaults() };
    const parsed = JSON.parse(fs.readFileSync(DATA_FILE, "utf8")) as FileState;
    return { plots: mergeCatalog(parsed.plots) };
  } catch {
    return { plots: catalogDefaults() };
  }
}

function writeFileState(state: FileState) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2));
}

function rowToPlot(row: Record<string, unknown>): PlotRecord {
  const slug = String(row.slug);
  const catalog = PLOT_CATALOG.find((p) => p.slug === slug);
  return {
    slug,
    name: String(row.name ?? catalog?.name ?? slug),
    tier: (row.tier as PlotRecord["tier"]) ?? catalog?.tier ?? "B",
    lon: Number(row.lon ?? catalog?.lon ?? 0),
    lat: Number(row.lat ?? catalog?.lat ?? 0),
    currentPriceCents: Number(row.current_price_cents ?? START_PRICE_CENTS),
    ownerName: (row.owner_name as string | null) ?? null,
    ownerUrl: (row.owner_url as string | null) ?? null,
    warCry: (row.war_cry as string | null) ?? null,
    ownerEmail: (row.owner_email as string | null) ?? null,
    clickCount: Number(row.click_count ?? 0),
    updatedAt: String(row.updated_at ?? new Date().toISOString()),
  };
}

export async function listPlots(): Promise<PlotRecord[]> {
  if (hasSupabase()) {
    const sb = createServiceClient();
    if (sb) {
      const { data, error } = await sb.from("plots").select("*").order("name");
      if (error) throw error;
      if (data && data.length) return data.map(rowToPlot);
    }
  }
  return readFileState().plots;
}

export async function getPlot(slug: string): Promise<PlotRecord | null> {
  const plots = await listPlots();
  return plots.find((p) => p.slug === slug) ?? null;
}

export async function claimPlot(payload: ClaimPayload): Promise<ClaimResult> {
  const name = payload.ownerName.trim();
  const url = normalizeUrl(payload.ownerUrl);
  const warCry = payload.warCry.trim().slice(0, 60);
  const email = payload.ownerEmail.trim().toLowerCase();
  if (!name || !url || payload.amountCents < START_PRICE_CENTS) {
    return { ok: false, reason: "invalid" };
  }

  if (hasSupabase()) {
    const sb = createServiceClient();
    if (sb) {
      const { data, error } = await sb.rpc("claim_plot", {
        p_slug: payload.slug,
        p_amount_cents: payload.amountCents,
        p_owner_name: name,
        p_owner_url: url,
        p_war_cry: warCry,
        p_owner_email: email,
        p_provider: payload.provider,
        p_provider_ref: payload.providerRef,
      });
      if (error) throw error;
      const result = data as {
        ok?: boolean;
        reason?: string;
        outbid?: boolean;
        previous_email?: string | null;
        previous_name?: string | null;
      };
      if (!result?.ok) {
        return { ok: false, reason: (result?.reason as "stale" | "not_found") || "stale" };
      }
      const plot = await getPlot(payload.slug);
      if (!plot) return { ok: false, reason: "not_found" };
      return {
        ok: true,
        plot,
        previousEmail: result.previous_email ?? null,
        previousName: result.previous_name ?? null,
        outbid: Boolean(result.outbid),
      };
    }
  }

  const state = readFileState();
  const index = state.plots.findIndex((p) => p.slug === payload.slug);
  if (index < 0) return { ok: false, reason: "not_found" };
  const current = state.plots[index];
  const min = minBidCents(current);
  if (payload.amountCents < min) return { ok: false, reason: "stale" };
  const previousEmail = current.ownerEmail;
  const previousName = current.ownerName;
  const outbid = Boolean(current.ownerName);
  const next: PlotRecord = {
    ...current,
    currentPriceCents: payload.amountCents,
    ownerName: name,
    ownerUrl: url,
    warCry: warCry || null,
    ownerEmail: email || null,
    updatedAt: new Date().toISOString(),
  };
  state.plots[index] = next;
  writeFileState(state);
  return { ok: true, plot: next, previousEmail, previousName, outbid };
}

export async function incrementClicks(slug: string) {
  if (hasSupabase()) {
    const sb = createServiceClient();
    if (sb) {
      await sb.rpc("increment_plot_clicks", { p_slug: slug });
      return;
    }
  }
  const state = readFileState();
  const plot = state.plots.find((p) => p.slug === slug);
  if (plot) {
    plot.clickCount += 1;
    writeFileState(state);
  }
}
