
CREATE POLICY "Admins can delete messages"
  ON messages FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete direct_messages"
  ON direct_messages FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
