-- Signed-out visitors may only call the two registration helpers.
do $do$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig, p.proname, t.typname as rettype
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace join pg_type t on t.oid = p.prorettype
    where n.nspname = 'public'
  loop
    if f.proname not in ('lookup_sponsor', 'list_public_offices') then
      execute format('revoke execute on function %s from public, anon', f.sig);
    end if;
    -- Trigger functions are never called directly by users.
    if f.rettype = 'trigger' then
      execute format('revoke execute on function %s from authenticated', f.sig);
    end if;
  end loop;
end
$do$;

-- Pin search_path on the remaining helper functions.
alter function public.set_updated_at() set search_path = public;
alter function public.profiles_prevent_cycle() set search_path = public;
alter function public.audit_logs_immutable() set search_path = public;
alter function public.distance_m(double precision, double precision, double precision, double precision) set search_path = public;
alter function public.evaluation_dates(date) set search_path = public;
alter function public.current_evaluation_period(date) set search_path = public;
alter function public.next_evaluation_date(date) set search_path = public;
alter function public.evaluations_guard() set search_path = public;
alter function public.ftx_immutable() set search_path = public;
alter function public.payment_approvals_immutable() set search_path = public;
alter function public.already_notified_today(uuid, text, text) set search_path = public;
