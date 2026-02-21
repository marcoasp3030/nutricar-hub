
-- Table to track LGPD consent given by users
CREATE TABLE public.lgpd_consents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  consent_type TEXT NOT NULL DEFAULT 'terms_and_privacy',
  consented_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT,
  version TEXT NOT NULL DEFAULT '1.0',
  revoked_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.lgpd_consents ENABLE ROW LEVEL SECURITY;

-- Users can view their own consents
CREATE POLICY "Users can view own consents"
ON public.lgpd_consents FOR SELECT
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

-- Users can insert their own consents
CREATE POLICY "Users can insert own consents"
ON public.lgpd_consents FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admins can manage all consents
CREATE POLICY "Admins can manage consents"
ON public.lgpd_consents FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Table to track data deletion/exclusion requests
CREATE TABLE public.lgpd_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  request_type TEXT NOT NULL DEFAULT 'data_deletion',
  status TEXT NOT NULL DEFAULT 'pending',
  reason TEXT,
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID,
  admin_notes TEXT,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.lgpd_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own requests
CREATE POLICY "Users can view own requests"
ON public.lgpd_requests FOR SELECT
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

-- Users can insert their own requests
CREATE POLICY "Users can insert own requests"
ON public.lgpd_requests FOR INSERT
WITH CHECK (auth.uid() = user_id AND status = 'pending');

-- Admins can manage all requests
CREATE POLICY "Admins can manage requests"
ON public.lgpd_requests FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));
