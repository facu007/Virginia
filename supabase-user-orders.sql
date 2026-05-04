-- ══════════════════════════════════════════════════════════════
-- VIRGINIA OFICIAL — HISTORIAL DE PEDIDOS USUARIO
-- Ejecutar en: Supabase → SQL Editor → New Query → Run
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_my_orders(p_user_id BIGINT, p_password TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_user_id AND password = p_password) THEN
    RETURN '{"ok":false,"reason":"unauthorized"}'::JSONB;
  END IF;
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', o.id,
      'items', o.items,
      'total', o.total,
      'status', o.status,
      'created_at', o.created_at,
      'shipping_company', o.shipping_company
    ) ORDER BY o.created_at DESC
  ), '[]'::JSONB) INTO result FROM orders o WHERE o.user_id = p_user_id;
  RETURN jsonb_build_object('ok', true, 'orders', result);
END;
$$;
