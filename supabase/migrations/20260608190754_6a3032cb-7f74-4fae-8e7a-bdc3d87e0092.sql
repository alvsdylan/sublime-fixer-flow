
-- Status enum
CREATE TYPE public.repair_status AS ENUM ('todo', 'in_progress', 'corrected', 'finished');

-- Cards
CREATE TABLE public.repair_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_name TEXT NOT NULL,
  order_number TEXT NOT NULL,
  description TEXT NOT NULL,
  art_link TEXT,
  attendant_name TEXT NOT NULL,
  image_url TEXT,
  status public.repair_status NOT NULL DEFAULT 'todo',
  position INTEGER NOT NULL DEFAULT 0,
  request_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_repair_cards_status ON public.repair_cards(status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.repair_cards TO anon, authenticated;
GRANT ALL ON public.repair_cards TO service_role;

ALTER TABLE public.repair_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public access to repair cards" ON public.repair_cards FOR ALL USING (true) WITH CHECK (true);

-- History
CREATE TABLE public.repair_card_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  card_id UUID NOT NULL REFERENCES public.repair_cards(id) ON DELETE CASCADE,
  from_status public.repair_status,
  to_status public.repair_status NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_history_card_id ON public.repair_card_history(card_id, changed_at DESC);

GRANT SELECT, INSERT ON public.repair_card_history TO anon, authenticated;
GRANT ALL ON public.repair_card_history TO service_role;

ALTER TABLE public.repair_card_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read history" ON public.repair_card_history FOR SELECT USING (true);
CREATE POLICY "Public insert history" ON public.repair_card_history FOR INSERT WITH CHECK (true);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_repair_cards_updated_at
BEFORE UPDATE ON public.repair_cards
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-log status changes
CREATE OR REPLACE FUNCTION public.log_repair_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.repair_card_history(card_id, from_status, to_status)
    VALUES (NEW.id, OLD.status, NEW.status);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_repair_status_change
AFTER UPDATE ON public.repair_cards
FOR EACH ROW EXECUTE FUNCTION public.log_repair_status_change();

-- Log initial creation
CREATE OR REPLACE FUNCTION public.log_repair_creation()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.repair_card_history(card_id, from_status, to_status)
  VALUES (NEW.id, NULL, NEW.status);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_repair_creation
AFTER INSERT ON public.repair_cards
FOR EACH ROW EXECUTE FUNCTION public.log_repair_creation();
