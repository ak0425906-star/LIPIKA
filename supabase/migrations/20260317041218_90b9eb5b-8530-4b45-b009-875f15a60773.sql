
CREATE TABLE public.teacher_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  subject_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, subject_name)
);

ALTER TABLE public.teacher_subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can view their own subjects"
ON public.teacher_subjects
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Teachers can insert their own subjects"
ON public.teacher_subjects
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Teachers can delete their own subjects"
ON public.teacher_subjects
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
