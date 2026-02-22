-- Script para corrigir políticas RLS (Row-Level Security)
-- Execute este código no Editor SQL do Supabase

-- 1. Primeiro, vamos verificar se as tabelas existem e têm RLS habilitado
-- Se RLS estiver habilitado, precisamos criar políticas apropriadas

-- Para a tabela order_items, precisamos permitir inserções para usuários autenticados
-- Isso permite que qualquer usuário autenticado crie order_items

-- Opção 1: Permitir inserção para qualquer usuário autenticado (recomendado para apps de e-commerce)
CREATE POLICY "允许已认证用户插入订单项目" ON public.order_items
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Opção 2: Se você quiser permitir para anon também (menos seguro)
-- CREATE POLICY "允许任何人插入订单项目" ON public.order_items
-- FOR INSERT
-- TO anon, authenticated
-- WITH CHECK (true);

-- Também precisamos garantir que a leitura funcione corretamente
-- Política para visualização de itens do pedido
CREATE POLICY "允许用户查看自己的订单项目" ON public.order_items
FOR SELECT
TO authenticated
USING (
  order_id IN (
    SELECT id FROM orders 
    WHERE user_id = auth.uid()
  )
);

-- Se precisar de políticas adicionais para orders:
CREATE POLICY "允许用户查看自己的订单" ON public.orders
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "允许已认证用户创建订单" ON public.orders
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Se quiser permitir que admins vejam todos os pedidos:
-- CREATE POLICY "允许管理员查看所有订单" ON public.orders
-- FOR SELECT
-- TO authenticated
-- USING (
--   EXISTS (
--     SELECT 1 FROM user_roles
--     WHERE user_id = auth.uid() AND role = 'admin'
--   )
-- );

-- Verificar políticas criadas
SELECT policyname, tablename 
FROM pg_policies 
WHERE schemaname = 'public';
