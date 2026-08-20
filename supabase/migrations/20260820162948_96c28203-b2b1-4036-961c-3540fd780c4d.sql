CREATE OR REPLACE FUNCTION public.admin_create_user(_email text, _password text, _display_name text DEFAULT NULL::text, _plan_code text DEFAULT NULL::text, _role app_role DEFAULT 'user'::app_role, _status subscription_status DEFAULT 'activa'::subscription_status)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'extensions'
AS $function$
declare
  new_id uuid := gen_random_uuid();
  plan_row public.plans%rowtype;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'No tienes permisos de administrador';
  end if;
  if _role = 'owner' and not public.has_role(auth.uid(), 'owner') then
    raise exception 'Solo un owner puede crear otro owner';
  end if;
  if _password is null or length(_password) < 6 then
    raise exception 'La contraseña debe tener al menos 6 caracteres';
  end if;
  if _email is null or position('@' in _email) = 0 then
    raise exception 'Correo no válido';
  end if;
  if exists (select 1 from auth.users where email = lower(_email)) then
    raise exception 'Ya existe una cuenta con ese correo';
  end if;

  if _plan_code is not null then
    select * into plan_row from public.plans where code = _plan_code;
    if not found then
      raise exception 'Plan no válido: %', _plan_code;
    end if;
  else
    select * into plan_row from public.plans
     where is_active order by sort_order limit 1;
    if not found then
      raise exception 'No hay ningún plan activo al que asignar la cuenta';
    end if;
  end if;

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
    confirmation_token, recovery_token, email_change_token_new, email_change,
    email_change_token_current, phone_change, phone_change_token, reauthentication_token
  ) values (
    '00000000-0000-0000-0000-000000000000', new_id, 'authenticated', 'authenticated',
    lower(_email), extensions.crypt(_password, extensions.gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('display_name', coalesce(nullif(_display_name,''), split_part(_email,'@',1))),
    '', '', '', '', '', '', '', ''
  );

  insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (new_id::text, new_id,
    jsonb_build_object('sub', new_id::text, 'email', lower(_email), 'email_verified', true, 'phone_verified', false),
    'email', now(), now(), now());

  -- La ficha de cuenta y los ajustes pueden no existir si el disparador de
  -- registro no se ejecuta en esta ruta: los aseguramos aquí.
  insert into public.profiles (id, email, display_name)
  values (new_id, lower(_email), coalesce(nullif(_display_name,''), split_part(_email,'@',1)))
  on conflict (id) do nothing;

  insert into public.user_settings (user_id) values (new_id)
  on conflict do nothing;

  if _role <> 'user' then
    insert into public.user_roles (user_id, role) values (new_id, _role)
    on conflict (user_id, role) do nothing;
  end if;

  insert into public.subscriptions (user_id, plan_id, status, started_at, renews_at)
  values (new_id, plan_row.id, _status, now(),
          now() + make_interval(months => coalesce(plan_row.months, 1)));

  return new_id;
end $function$;