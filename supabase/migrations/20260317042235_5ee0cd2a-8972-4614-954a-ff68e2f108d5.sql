
CREATE TABLE public.semester_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  semester INT NOT NULL,
  teacher_name TEXT NOT NULL,
  subject_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.semester_subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view semester subjects"
ON public.semester_subjects
FOR SELECT
TO authenticated
USING (true);

INSERT INTO public.semester_subjects (semester, teacher_name, subject_name) VALUES
  (6, 'Dr. JISHA ISAAC', 'Software Testing'),
  (6, 'Dr. PRADEEPA P', 'Free And Open Source Software'),
  (6, 'Dr. RESMI V', 'Software Testing'),
  (6, 'Dr. ANITHA K L', 'Computer Networks'),
  (6, 'Ms. TINU C PHILIP', 'Information Security');
