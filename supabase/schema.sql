-- OwnMars schema — run in Supabase SQL editor

create table if not exists plots (
  slug text primary key,
  name text not null,
  tier text not null check (tier in ('S', 'A', 'B')),
  lon double precision not null,
  lat double precision not null,
  current_price_cents integer not null default 100,
  owner_name text,
  owner_url text,
  war_cry text,
  owner_email text,
  click_count integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists bids (
  id uuid primary key default gen_random_uuid(),
  plot_slug text not null references plots(slug),
  amount_cents integer not null,
  payer_email text,
  payment_provider text not null,
  provider_ref text,
  status text not null default 'pending' check (status in ('pending', 'paid', 'superseded')),
  created_at timestamptz not null default now()
);

create index if not exists bids_plot_slug_idx on bids (plot_slug, created_at desc);

alter table plots enable row level security;
alter table bids enable row level security;

drop policy if exists plots_public_read on plots;
create policy plots_public_read on plots for select using (true);

drop policy if exists bids_no_public on bids;
create policy bids_no_public on bids for select using (false);

alter table plots replica identity full;

-- Enable in Supabase: Database → Replication → plots
-- alter publication supabase_realtime add table plots;

create or replace function claim_plot(
  p_slug text,
  p_amount_cents integer,
  p_owner_name text,
  p_owner_url text,
  p_war_cry text,
  p_owner_email text,
  p_provider text,
  p_provider_ref text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plot plots%rowtype;
  v_min integer;
  v_outbid boolean;
begin
  select * into v_plot from plots where slug = p_slug for update;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  v_min := case
    when v_plot.owner_name is null then 100
    else v_plot.current_price_cents + 100
  end;

  if p_amount_cents < v_min then
    insert into bids (plot_slug, amount_cents, payer_email, payment_provider, provider_ref, status)
    values (p_slug, p_amount_cents, p_owner_email, p_provider, p_provider_ref, 'superseded');
    return jsonb_build_object('ok', false, 'reason', 'stale', 'min', v_min);
  end if;

  v_outbid := v_plot.owner_name is not null;

  update plots set
    current_price_cents = p_amount_cents,
    owner_name = p_owner_name,
    owner_url = p_owner_url,
    war_cry = p_war_cry,
    owner_email = p_owner_email,
    updated_at = now()
  where slug = p_slug;

  insert into bids (plot_slug, amount_cents, payer_email, payment_provider, provider_ref, status)
  values (p_slug, p_amount_cents, p_owner_email, p_provider, p_provider_ref, 'paid');

  return jsonb_build_object(
    'ok', true,
    'outbid', v_outbid,
    'previous_email', v_plot.owner_email,
    'previous_name', v_plot.owner_name,
    'plot_name', v_plot.name
  );
end;
$$;

create or replace function increment_plot_clicks(p_slug text)
returns void
language sql
security definer
set search_path = public
as $$
  update plots set click_count = click_count + 1 where slug = p_slug;
$$;
