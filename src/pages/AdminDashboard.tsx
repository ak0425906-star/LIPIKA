import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, BookOpen, GraduationCap, LogOut, Search, Plus, Trash2, Upload, X, ChevronDown, Shield, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import { getCurrentUser, isAuthenticated, logout, getAdminStudents, adminUploadTrainingByRoll, type UserOut } from "@/lib/api";

interface TeacherSubjectMapping {
  teacher: string;
  subjects: string[];
}

interface StudentData {
  rollNumber: string;
  name: string;
  department: string;
  password: string;
  images: string[];
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [teacherSubjects, setTeacherSubjects] = useState<TeacherSubjectMapping[]>([]);
  const [allSubjects, setAllSubjects] = useState<string[]>([]);
  const [students, setStudents] = useState<StudentData[]>([]);
  const [selectedBox, setSelectedBox] = useState<"teachers" | "assign" | "students" | null>(null);

  // Assign subject state
  const [selectedSubjectForAssign, setSelectedSubjectForAssign] = useState<string | null>(null);
  const [showAddTeacherDropdown, setShowAddTeacherDropdown] = useState(false);
  const [teacherSearch, setTeacherSearch] = useState("");

  // Student management
  const [uploadingForStudent, setUploadingForStudent] = useState<string | null>(null);
  const [studentSearch, setStudentSearch] = useState("");
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isAuthenticated()) { navigate("/"); return; }
    const user = getCurrentUser();
    if (!user || user.role !== "admin") { navigate("/"); return; }

    const loadData = async () => {
      try {
        const apiStudents = await getAdminStudents();
        if (apiStudents && apiStudents.length > 0) {
          setStudents(apiStudents.map((s) => ({
            rollNumber: s.roll_number || s.email.split("@")[0],
            name: s.name,
            department: s.department || "",
            password: "••••••••", // Passwords should come from API
            images: [],
          })));
        }
      } catch {
        // Start with empty data
      }
      setLoading(false);
    };
    loadData();
  }, [navigate]);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const togglePasswordVisibility = (rollNumber: string) => {
    setVisiblePasswords((prev) => {
      const next = new Set(prev);
      if (next.has(rollNumber)) {
        next.delete(rollNumber);
      } else {
        next.add(rollNumber);
      }
      return next;
    });
  };

  // Subject assignment helpers
  const getTeachersForSubject = (subject: string) =>
    teacherSubjects.filter((ts) => ts.subjects.includes(subject));

  const allTeacherNames = teacherSubjects.map((ts) => ts.teacher);
  const filteredTeachersForAdd = useMemo(() => {
    if (!selectedSubjectForAssign) return [];
    const assigned = getTeachersForSubject(selectedSubjectForAssign).map((t) => t.teacher);
    const available = allTeacherNames.filter((t) => !assigned.includes(t));
    if (!teacherSearch.trim()) return available;
    return available.filter((t) => t.toLowerCase().includes(teacherSearch.toLowerCase()));
  }, [selectedSubjectForAssign, teacherSearch, teacherSubjects]);

  const addTeacherToSubject = (teacherName: string) => {
    if (!selectedSubjectForAssign) return;
    setTeacherSubjects((prev) =>
      prev.map((ts) =>
        ts.teacher === teacherName
          ? { ...ts, subjects: [...ts.subjects, selectedSubjectForAssign] }
          : ts
      )
    );
    setShowAddTeacherDropdown(false);
    setTeacherSearch("");
  };

  // Student management
  const handleDeleteImage = (rollNumber: string, imgIndex: number) => {
    setStudents((prev) =>
      prev.map((s) =>
        s.rollNumber === rollNumber
          ? { ...s, images: s.images.filter((_, i) => i !== imgIndex) }
          : s
      )
    );
  };

  const handleUploadForStudent = async (rollNumber: string, files: FileList | null) => {
    if (!files) return;
    setUploadingForStudent(rollNumber);
    const newImages: string[] = [];
    for (const file of Array.from(files)) {
      if (file.type.startsWith("image/")) {
        newImages.push(URL.createObjectURL(file));
        try {
          await adminUploadTrainingByRoll(rollNumber, file);
        } catch {
          // Continue with local preview
        }
      }
    }
    setStudents((prev) =>
      prev.map((s) =>
        s.rollNumber === rollNumber
          ? { ...s, images: [...s.images, ...newImages] }
          : s
      )
    );
    setUploadingForStudent(null);
  };

  const filteredStudents = useMemo(() => {
    if (!studentSearch.trim()) return students;
    const q = studentSearch.toLowerCase();
    return students.filter((s) => s.name.toLowerCase().includes(q) || s.rollNumber.toLowerCase().includes(q));
  }, [students, studentSearch]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading admin dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-6 py-10">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-8 flex flex-col gap-5">
          <div className="flex justify-center">
            <h1 className="text-4xl font-extrabold tracking-widest text-primary drop-shadow-md">
              L<span className="text-foreground">I</span>P<span className="text-foreground">I</span>K<span className="text-foreground">A</span>
            </h1>
          </div>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-lg">
                <Shield className="h-7 w-7 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight text-foreground">Admin Panel</h2>
                <p className="text-sm text-muted-foreground">Department Head</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout} className="text-muted-foreground hover:text-foreground">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </motion.div>

        {/* Three Big Boxes */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.15 }} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card
            className={`border-0 shadow-md cursor-pointer transition-all hover:shadow-lg ${selectedBox === "teachers" ? "ring-2 ring-primary" : ""}`}
            onClick={() => setSelectedBox(selectedBox === "teachers" ? null : "teachers")}
          >
            <CardContent className="p-6 flex flex-col items-center gap-3">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <span className="text-base font-bold text-foreground text-center">Teachers & Subjects</span>
              <span className="text-xs text-muted-foreground text-center">View all teachers with their assigned subjects</span>
              <span className="text-2xl font-bold text-primary">{teacherSubjects.length}</span>
            </CardContent>
          </Card>

          <Card
            className={`border-0 shadow-md cursor-pointer transition-all hover:shadow-lg ${selectedBox === "assign" ? "ring-2 ring-primary" : ""}`}
            onClick={() => setSelectedBox(selectedBox === "assign" ? null : "assign")}
          >
            <CardContent className="p-6 flex flex-col items-center gap-3">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10">
                <BookOpen className="h-8 w-8 text-emerald-500" />
              </div>
              <span className="text-base font-bold text-foreground text-center">Assign Subjects</span>
              <span className="text-xs text-muted-foreground text-center">Manage subject-teacher assignments</span>
              <span className="text-2xl font-bold text-emerald-500">{allSubjects.length}</span>
            </CardContent>
          </Card>

          <Card
            className={`border-0 shadow-md cursor-pointer transition-all hover:shadow-lg ${selectedBox === "students" ? "ring-2 ring-primary" : ""}`}
            onClick={() => setSelectedBox(selectedBox === "students" ? null : "students")}
          >
            <CardContent className="p-6 flex flex-col items-center gap-3">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10">
                <GraduationCap className="h-8 w-8 text-amber-500" />
              </div>
              <span className="text-base font-bold text-foreground text-center">Student Test Data</span>
              <span className="text-xs text-muted-foreground text-center">View & manage student training images</span>
              <span className="text-2xl font-bold text-amber-500">{students.length}</span>
            </CardContent>
          </Card>
        </motion.div>

        {/* Expanded Panel */}
        <AnimatePresence mode="wait">
          {/* Teachers & Subjects Panel */}
          {selectedBox === "teachers" && (
            <motion.div key="teachers" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
              <Card className="border-0 shadow-lg">
                <CardContent className="p-6">
                  <h3 className="text-lg font-bold text-foreground mb-4">All Teachers & Their Subjects</h3>
                  {teacherSubjects.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No teachers registered yet. Teachers will appear here after they create accounts.</p>
                  ) : (
                    <div className="space-y-3">
                      {teacherSubjects.map((ts, i) => (
                        <div key={i} className="flex items-center justify-between rounded-xl bg-secondary/40 px-4 py-3">
                          <div>
                            <p className="text-sm font-semibold text-foreground">{ts.teacher}</p>
                            <p className="text-xs text-muted-foreground">{ts.subjects.length > 0 ? ts.subjects.join(", ") : "No subjects assigned"}</p>
                          </div>
                          <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-lg">
                            {ts.subjects.length} subject{ts.subjects.length !== 1 ? "s" : ""}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Assign Subjects Panel */}
          {selectedBox === "assign" && (
            <motion.div key="assign" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
              <Card className="border-0 shadow-lg">
                <CardContent className="p-6">
                  <h3 className="text-lg font-bold text-foreground mb-4">Subject-Teacher Management</h3>
                  {allSubjects.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No subjects configured yet. Add subjects through your backend to see them here.</p>
                  ) : (
                    <div className="space-y-3">
                      {allSubjects.map((subject, i) => {
                        const teachers = getTeachersForSubject(subject);
                        const isExpanded = selectedSubjectForAssign === subject;
                        return (
                          <div key={i}>
                            <div
                              className={`flex items-center justify-between rounded-xl px-4 py-3 cursor-pointer transition-colors ${isExpanded ? "bg-primary/10 ring-1 ring-primary" : "bg-secondary/40 hover:bg-secondary/60"}`}
                              onClick={() => { setSelectedSubjectForAssign(isExpanded ? null : subject); setShowAddTeacherDropdown(false); }}
                            >
                              <div>
                                <p className="text-sm font-semibold text-foreground">{subject}</p>
                                <p className="text-xs text-muted-foreground">{teachers.length} teacher{teachers.length !== 1 ? "s" : ""} assigned</p>
                              </div>
                              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                            </div>

                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                                  <div className="mt-2 rounded-xl bg-card border border-border p-4 space-y-2">
                                    {teachers.map((t, ti) => (
                                      <div key={ti} className="flex items-center justify-between rounded-lg bg-secondary/30 px-3 py-2">
                                        <span className="text-sm text-foreground">{t.teacher}</span>
                                      </div>
                                    ))}

                                    {!showAddTeacherDropdown ? (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full rounded-xl border-dashed border-primary/30 text-primary"
                                        onClick={(e) => { e.stopPropagation(); setShowAddTeacherDropdown(true); }}
                                      >
                                        <Plus className="h-4 w-4 mr-1" /> Add Teacher
                                      </Button>
                                    ) : (
                                      <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                                        <div className="relative">
                                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                          <Input
                                            placeholder="Search teacher..."
                                            value={teacherSearch}
                                            onChange={(e) => setTeacherSearch(e.target.value)}
                                            className="pl-9 h-9 rounded-xl bg-secondary/50 border-0 text-sm"
                                            autoFocus
                                          />
                                        </div>
                                        <div className="max-h-32 overflow-y-auto space-y-1">
                                          {filteredTeachersForAdd.length === 0 ? (
                                            <p className="text-xs text-muted-foreground text-center py-2">No available teachers</p>
                                          ) : (
                                            filteredTeachersForAdd.map((name, ni) => (
                                              <div
                                                key={ni}
                                                className="flex items-center justify-between rounded-lg bg-secondary/30 px-3 py-2 cursor-pointer hover:bg-primary/10 transition-colors"
                                                onClick={() => addTeacherToSubject(name)}
                                              >
                                                <span className="text-sm text-foreground">{name}</span>
                                                <Plus className="h-3 w-3 text-primary" />
                                              </div>
                                            ))
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Students Panel */}
          {selectedBox === "students" && (
            <motion.div key="students" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
              <Card className="border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-foreground">Student Test Data</h3>
                    <div className="relative w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search students..."
                        value={studentSearch}
                        onChange={(e) => setStudentSearch(e.target.value)}
                        className="pl-9 h-9 rounded-xl bg-secondary/50 border-0 text-sm"
                      />
                    </div>
                  </div>

                  {filteredStudents.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No students registered yet.</p>
                  ) : (
                    <div className="space-y-4">
                      {filteredStudents.map((student, i) => (
                        <div key={i} className="rounded-xl bg-secondary/40 p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <p className="text-sm font-semibold text-foreground">{student.name}</p>
                              <p className="text-xs text-muted-foreground">{student.rollNumber} • {student.department}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-muted-foreground">Password:</span>
                                <span className="text-xs font-mono text-foreground">
                                  {visiblePasswords.has(student.rollNumber) ? student.password : "••••••••"}
                                </span>
                                <button
                                  onClick={() => togglePasswordVisibility(student.rollNumber)}
                                  className="text-muted-foreground hover:text-foreground transition-colors"
                                >
                                  {visiblePasswords.has(student.rollNumber) ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                </button>
                              </div>
                            </div>
                            <div className="flex gap-1">
                              <input
                                type="file"
                                accept="image/*"
                                multiple
                                className="hidden"
                                id={`upload-${student.rollNumber}`}
                                onChange={(e) => handleUploadForStudent(student.rollNumber, e.target.files)}
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2 text-primary"
                                onClick={() => document.getElementById(`upload-${student.rollNumber}`)?.click()}
                              >
                                <Upload className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>

                          {student.images.length > 0 ? (
                            <div className="grid grid-cols-4 gap-2">
                              {student.images.map((img, imgIdx) => (
                                <div key={imgIdx} className="relative group">
                                  <img src={img} alt={`Test ${imgIdx + 1}`} className="h-20 w-full rounded-lg object-cover" />
                                  <button
                                    onClick={() => handleDeleteImage(student.rollNumber, imgIdx)}
                                    className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground italic">No test data images uploaded yet.</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AdminDashboard;
