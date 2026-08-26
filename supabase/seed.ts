import { PLOT_CATALOG } from "../lib/plots-catalog";

const rows = PLOT_CATALOG.map(
  (p) =>
    `('${p.slug.replace(/'/g, "''")}', '${p.name.replace(/'/g, "''")}', '${p.tier}', ${p.lon}, ${p.lat}, 100)`
);

export const seedSql = `insert into plots (slug, name, tier, lon, lat, current_price_cents)
values
${rows.join(",\n")}
on conflict (slug) do nothing;
`;
