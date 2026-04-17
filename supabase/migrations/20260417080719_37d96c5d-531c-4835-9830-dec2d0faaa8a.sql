DO $$
DECLARE
  v_owner_id uuid;
  v_national text := '1098080268';
  v_password text := '602396';
  v_email text;
BEGIN
  SELECT id, email INTO v_owner_id, v_email FROM auth.users ORDER BY created_at ASC LIMIT 1;
  IF v_owner_id IS NULL THEN RAISE EXCEPTION 'No owner user found'; END IF;

  -- Set national_id on profile
  UPDATE public.profiles
     SET national_id = v_national,
         updated_at = now()
   WHERE user_id = v_owner_id;

  -- Reset password and store national_id in user metadata
  UPDATE auth.users
     SET encrypted_password = crypt(v_password, gen_salt('bf')),
         raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('national_id', v_national),
         updated_at = now(),
         email_confirmed_at = COALESCE(email_confirmed_at, now())
   WHERE id = v_owner_id;
END $$;