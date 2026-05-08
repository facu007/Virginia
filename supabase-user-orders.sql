-- ============================================================
-- VIRGINIA OFICIAL | HISTORIAL DE PEDIDOS DEL USUARIO
-- Ejecutar despues de supabase-security.sql
-- ============================================================

DROP FUNCTION IF EXISTS get_my_orders(BIGINT, TEXT);
DROP FUNCTION IF EXISTS get_my_orders(TEXT);
CREATE OR REPLACE FUNCTION get_my_orders(p_session_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_user_id BIGINT;
  v_orders JSONB;
BEGIN
  v_user_id := session_user_id(p_session_token, FALSE);
  IF v_user_id IS NULL THEN
    RETURN '{"ok":false,"reason":"unauthorized"}'::JSONB;
  END IF;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', o.id,
        'items', o.items,
        'total', o.total,
        'status', o.status,
        'created_at', o.created_at,
        'shipping_company', o.shipping_company,
        'notes', o.notes
      )
      ORDER BY o.created_at DESC
    ),
    '[]'::JSONB
  )
  INTO v_orders
  FROM orders o
  WHERE o.user_id = v_user_id;

  RETURN jsonb_build_object('ok', true, 'orders', v_orders);
END;
$function$;

GRANT EXECUTE ON FUNCTION get_my_orders(TEXT) TO anon, authenticated;
