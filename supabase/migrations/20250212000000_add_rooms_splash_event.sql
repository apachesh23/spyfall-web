-- Добавляем в Rooms поле для текущего баннера (realtime показ у всех в комнате)
ALTER TABLE public.rooms
ADD COLUMN IF NOT EXISTS splash_event jsonb DEFAULT NULL;

COMMENT ON COLUMN public.rooms.splash_event IS 'Текущее событие баннера: { type, countdownSeconds?, at }. NULL = не показывать.';
